import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SharedBudgetsService } from '../shared-budgets.service';
import { UsersService } from '../../users/users.service';
import { MailService } from '../../mail/mail.service';

/**
 * Unit tests for SharedBudgetsService (Requirement 5 — shared budgets).
 *
 * All TypeORM repositories, the DataSource transaction, UsersService and
 * MailService are mocked so the tests exercise service logic only — no
 * database or real mail transport.
 */
describe('SharedBudgetsService — unit tests', () => {
  let service: SharedBudgetsService;

  let budgetsRepo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOneBy: jest.Mock;
  };
  let membersRepo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOneBy: jest.Mock;
  };
  let invitationsRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findOneBy: jest.Mock;
  };
  let usersService: { findByEmail: jest.Mock };
  let mailService: { sendBudgetInvitation: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  /** Transaction manager used inside dataSource.transaction. */
  const manager = {
    create: jest.fn((_entity: unknown, data: unknown) => ({ ...(data as object) })),
    save: jest.fn((entity: unknown) => Promise.resolve(entity)),
  };

  beforeEach(() => {
    budgetsRepo = {
      create: jest.fn((data: unknown) => ({ ...(data as object) })),
      save: jest.fn((entity: unknown) => Promise.resolve(entity)),
      find: jest.fn(),
      findOneBy: jest.fn(),
    };
    membersRepo = {
      create: jest.fn((data: unknown) => ({ ...(data as object) })),
      save: jest.fn((entity: unknown) => Promise.resolve(entity)),
      find: jest.fn(),
      findOneBy: jest.fn(),
    };
    invitationsRepo = {
      create: jest.fn((data: unknown) => ({ ...(data as object) })),
      save: jest.fn((entity: unknown) => Promise.resolve(entity)),
      findOneBy: jest.fn(),
    };
    usersService = { findByEmail: jest.fn() };
    mailService = { sendBudgetInvitation: jest.fn().mockResolvedValue(undefined) };

    manager.create.mockClear();
    manager.save.mockClear();
    manager.save.mockImplementation((entity: unknown) => Promise.resolve(entity));
    dataSource = {
      transaction: jest.fn((cb: (m: typeof manager) => unknown) => cb(manager)),
    };

    service = new SharedBudgetsService(
      budgetsRepo as never,
      membersRepo as never,
      invitationsRepo as never,
      usersService as unknown as UsersService,
      mailService as unknown as MailService,
      dataSource as never,
    );
  });

  describe('createBudget', () => {
    it('creates the budget and registers the creator as owner member', async () => {
      manager.save
        .mockResolvedValueOnce({ id: 'budget-1', name: 'Casa' }) // budget
        .mockResolvedValueOnce({
          budgetId: 'budget-1',
          userId: 'user-1',
          role: 'owner',
        }); // owner member

      const result = await service.createBudget('user-1', {
        name: 'Casa',
        monthlyLimit: 1500,
      });

      // Budget created with the formatted limit
      expect(manager.create).toHaveBeenNthCalledWith(1, expect.anything(), {
        name: 'Casa',
        monthlyLimit: '1500.00',
      });
      // Owner member created with role 'owner' and the new budget id
      expect(manager.create).toHaveBeenNthCalledWith(2, expect.anything(), {
        budgetId: 'budget-1',
        userId: 'user-1',
        role: 'owner',
      });
      expect(result).toEqual({ id: 'budget-1', name: 'Casa' });
    });

    it('stores a null limit when none is supplied', async () => {
      manager.save
        .mockResolvedValueOnce({ id: 'budget-2', name: 'Viaje' })
        .mockResolvedValueOnce({});

      await service.createBudget('user-1', { name: 'Viaje' });

      expect(manager.create).toHaveBeenNthCalledWith(1, expect.anything(), {
        name: 'Viaje',
        monthlyLimit: null,
      });
    });
  });

  describe('inviteMember', () => {
    it('throws ForbiddenException when the caller is a non-owner member', async () => {
      membersRepo.findOneBy.mockResolvedValue({
        budgetId: 'budget-1',
        userId: 'user-2',
        role: 'member',
      });

      await expect(
        service.inviteMember('user-2', 'budget-1', {
          inviteeEmail: 'friend@example.com',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(invitationsRepo.save).not.toHaveBeenCalled();
      expect(mailService.sendBudgetInvitation).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the caller is not a member at all', async () => {
      membersRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.inviteMember('user-9', 'budget-1', {
          inviteeEmail: 'friend@example.com',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects an email that maps to no registered user (Requirement 5.3)', async () => {
      membersRepo.findOneBy.mockResolvedValue({ role: 'owner' });
      budgetsRepo.findOneBy.mockResolvedValue({ id: 'budget-1', name: 'Casa' });
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.inviteMember('user-1', 'budget-1', {
          inviteeEmail: 'ghost@example.com',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(invitationsRepo.save).not.toHaveBeenCalled();
    });

    it('owner invite creates a pending invitation and sends an email', async () => {
      membersRepo.findOneBy.mockResolvedValue({ role: 'owner' });
      budgetsRepo.findOneBy.mockResolvedValue({ id: 'budget-1', name: 'Casa' });
      usersService.findByEmail.mockResolvedValue({
        id: 'user-2',
        email: 'friend@example.com',
      });
      invitationsRepo.save.mockImplementation((inv: Record<string, unknown>) =>
        Promise.resolve({ id: 'inv-1', ...inv }),
      );

      const result = await service.inviteMember('user-1', 'budget-1', {
        inviteeEmail: 'friend@example.com',
      });

      const created = invitationsRepo.create.mock.calls[0]?.[0];
      expect(created.status).toBe('pending');
      expect(created.budgetId).toBe('budget-1');
      expect(created.inviterId).toBe('user-1');
      expect(created.inviteeEmail).toBe('friend@example.com');
      // Expires roughly 7 days out
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const delta = created.expiresAt.getTime() - Date.now();
      expect(delta).toBeGreaterThan(sevenDaysMs - 5000);
      expect(delta).toBeLessThanOrEqual(sevenDaysMs + 5000);

      expect(mailService.sendBudgetInvitation).toHaveBeenCalledWith(
        'friend@example.com',
        'Casa',
        'inv-1',
      );
      expect(result.id).toBe('inv-1');
    });
  });

  describe('acceptInvitation', () => {
    const future = () => new Date(Date.now() + 60_000);
    const past = () => new Date(Date.now() - 60_000);

    it('rejects an expired invitation and marks it expired', async () => {
      invitationsRepo.findOneBy.mockResolvedValue({
        id: 'inv-1',
        budgetId: 'budget-1',
        inviteeEmail: 'friend@example.com',
        status: 'pending',
        expiresAt: past(),
      });

      await expect(
        service.acceptInvitation('user-2', 'friend@example.com', 'inv-1'),
      ).rejects.toBeInstanceOf(BadRequestException);

      const saved = invitationsRepo.save.mock.calls[0]?.[0];
      expect(saved.status).toBe('expired');
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('rejects a non-pending invitation', async () => {
      invitationsRepo.findOneBy.mockResolvedValue({
        id: 'inv-1',
        status: 'accepted',
        inviteeEmail: 'friend@example.com',
        expiresAt: future(),
      });

      await expect(
        service.acceptInvitation('user-2', 'friend@example.com', 'inv-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when the authenticated email does not match the invitee', async () => {
      invitationsRepo.findOneBy.mockResolvedValue({
        id: 'inv-1',
        status: 'pending',
        inviteeEmail: 'friend@example.com',
        expiresAt: future(),
      });

      await expect(
        service.acceptInvitation('user-3', 'someone-else@example.com', 'inv-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('creates a member and marks the invitation accepted', async () => {
      const invitation = {
        id: 'inv-1',
        budgetId: 'budget-1',
        inviteeEmail: 'friend@example.com',
        status: 'pending',
        expiresAt: future(),
      };
      invitationsRepo.findOneBy.mockResolvedValue(invitation);

      const result = await service.acceptInvitation(
        'user-2',
        'friend@example.com',
        'inv-1',
      );

      // Member created with role 'member'
      expect(manager.create).toHaveBeenCalledWith(expect.anything(), {
        budgetId: 'budget-1',
        userId: 'user-2',
        role: 'member',
      });
      // Invitation flipped to accepted and persisted inside the transaction
      expect(invitation.status).toBe('accepted');
      expect(result).toEqual({
        budgetId: 'budget-1',
        userId: 'user-2',
        role: 'member',
      });
    });

    it('matches the invitee email case-insensitively', async () => {
      invitationsRepo.findOneBy.mockResolvedValue({
        id: 'inv-1',
        budgetId: 'budget-1',
        inviteeEmail: 'Friend@Example.com',
        status: 'pending',
        expiresAt: future(),
      });

      await expect(
        service.acceptInvitation('user-2', 'friend@example.com', 'inv-1'),
      ).resolves.toMatchObject({ role: 'member' });
    });
  });

  describe('rejectInvitation', () => {
    it('sets a pending invitation to rejected', async () => {
      const invitation = {
        id: 'inv-1',
        inviteeEmail: 'friend@example.com',
        status: 'pending',
      };
      invitationsRepo.findOneBy.mockResolvedValue(invitation);
      invitationsRepo.save.mockImplementation((i: unknown) => Promise.resolve(i));

      const result = await service.rejectInvitation(
        'friend@example.com',
        'inv-1',
      );

      expect(result.status).toBe('rejected');
    });

    it('throws NotFoundException when the invitation does not exist', async () => {
      invitationsRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.rejectInvitation('friend@example.com', 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listMembers', () => {
    it('throws ForbiddenException when the caller is not a member', async () => {
      membersRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.listMembers('user-9', 'budget-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns members for a budget the caller belongs to', async () => {
      membersRepo.findOneBy.mockResolvedValue({ role: 'owner' });
      membersRepo.find.mockResolvedValue([{ userId: 'user-1', role: 'owner' }]);

      const result = await service.listMembers('user-1', 'budget-1');

      expect(membersRepo.find).toHaveBeenCalledWith({
        where: { budgetId: 'budget-1' },
      });
      expect(result).toHaveLength(1);
    });
  });
});
