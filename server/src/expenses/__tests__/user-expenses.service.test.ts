import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UserExpensesService } from '../user-expenses.service';
import { UserExpense } from '../entities/user-expense.entity';

// ---------------------------------------------------------------------------
// A minimal in-memory stand-in for the TypeORM repository. Only the methods
// the service actually calls are implemented. `create` echoes its input (as
// TypeORM does) and `save` returns the entity with a generated id.
// ---------------------------------------------------------------------------
function makeRepoMock() {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((data: Partial<UserExpense>) => ({ ...data })),
    save: jest.fn((entity: UserExpense) => ({ ...entity, id: entity.id ?? 'generated-id' })),
    remove: jest.fn(),
  };
}

type RepoMock = ReturnType<typeof makeRepoMock>;

const USER_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const CATEGORY = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const SLOT_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

describe('UserExpensesService (Requirements 3.1 – 3.10)', () => {
  let repo: RepoMock;
  let service: UserExpensesService;

  beforeEach(() => {
    repo = makeRepoMock();
    service = new UserExpensesService(
      repo as unknown as Repository<UserExpense>,
    );
  });

  // -------------------------------------------------------------------------
  // findAll — scoping to the requesting user
  // -------------------------------------------------------------------------
  describe('findAll', () => {
    it("queries only the requesting user's slots with the category joined", async () => {
      const slots = [{ id: SLOT_ID, userId: USER_A }] as UserExpense[];
      repo.find.mockResolvedValue(slots);

      const result = await service.findAll(USER_A);

      expect(repo.find).toHaveBeenCalledWith({
        where: { userId: USER_A },
        relations: { category: true },
        order: { createdAt: 'DESC' },
      });
      expect(result).toBe(slots);
    });

    it('returns an empty list when the user has no slots', async () => {
      repo.find.mockResolvedValue([]);
      await expect(service.findAll(USER_A)).resolves.toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // create — duplicate rejection + amount normalisation
  // -------------------------------------------------------------------------
  describe('create', () => {
    it('persists a new slot when no duplicate exists', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.create(USER_A, {
        categoryId: CATEGORY,
        amount: 49.9,
        paymentDay: 15,
      });

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { userId: USER_A, categoryId: CATEGORY },
      });
      expect(repo.create).toHaveBeenCalledWith({
        userId: USER_A,
        categoryId: CATEGORY,
        amount: '49.90',
        paymentDay: 15,
        isActive: true,
      });
      expect(repo.save).toHaveBeenCalled();
      expect(result.id).toBe('generated-id');
    });

    it('stores null amount/paymentDay when they are omitted', async () => {
      repo.findOne.mockResolvedValue(null);

      await service.create(USER_A, { categoryId: CATEGORY });

      expect(repo.create).toHaveBeenCalledWith({
        userId: USER_A,
        categoryId: CATEGORY,
        amount: null,
        paymentDay: null,
        isActive: true,
      });
    });

    it('rejects a duplicate (userId, categoryId) with ConflictException', async () => {
      repo.findOne.mockResolvedValue({ id: SLOT_ID } as UserExpense);

      await expect(
        service.create(USER_A, { categoryId: CATEGORY }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // update — ownership + partial patch
  // -------------------------------------------------------------------------
  describe('update', () => {
    it('updates only the provided fields of an owned slot', async () => {
      const slot = {
        id: SLOT_ID,
        userId: USER_A,
        amount: '10.00',
        paymentDay: 5,
        isActive: true,
      } as UserExpense;
      repo.findOne.mockResolvedValue(slot);

      await service.update(USER_A, SLOT_ID, { amount: 20, isActive: false });

      expect(slot.amount).toBe('20.00');
      expect(slot.paymentDay).toBe(5); // untouched
      expect(slot.isActive).toBe(false);
      expect(repo.save).toHaveBeenCalledWith(slot);
    });

    it('throws NotFoundException when the slot is not owned by the user', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.update(USER_B, SLOT_ID, { paymentDay: 10 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: SLOT_ID, userId: USER_B },
      });
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // remove — ownership
  // -------------------------------------------------------------------------
  describe('remove', () => {
    it('removes an owned slot', async () => {
      const slot = { id: SLOT_ID, userId: USER_A } as UserExpense;
      repo.findOne.mockResolvedValue(slot);

      await service.remove(USER_A, SLOT_ID);

      expect(repo.remove).toHaveBeenCalledWith(slot);
    });

    it('throws NotFoundException when deleting a slot the user does not own', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove(USER_B, SLOT_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repo.remove).not.toHaveBeenCalled();
    });
  });
});
