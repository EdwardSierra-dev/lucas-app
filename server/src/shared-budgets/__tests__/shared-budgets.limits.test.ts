import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SharedBudgetsService } from '../shared-budgets.service';
import { UsersService } from '../../users/users.service';
import { MailService } from '../../mail/mail.service';

/**
 * Unit tests for the shared-budget income, expense and monthly-limit flows
 * added in task 11.3 (Requirements 5.1, 5.6, 5.7, 5.10, 5.11, 5.12).
 *
 * The repositories, DataSource, UsersService and MailService are mocked, so
 * the tests exercise service logic only. The focus is the once-per-cycle
 * limit notification (Properties P12/P13) and member/owner authorization.
 */
describe('SharedBudgetsService — incomes, expenses and limits', () => {
  let service: SharedBudgetsService;

  let budgetsRepo: {
    save: jest.Mock;
    findOneBy: jest.Mock;
  };
  let membersRepo: { findOneBy: jest.Mock };
  let incomesRepo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };
  let expenseRecordsRepo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };

  beforeEach(() => {
    budgetsRepo = {
      save: jest.fn((entity: unknown) => Promise.resolve(entity)),
      findOneBy: jest.fn(),
    };
    membersRepo = { findOneBy: jest.fn() };
    incomesRepo = {
      create: jest.fn((data: unknown) => ({ ...(data as object) })),
      save: jest.fn((entity: unknown) => Promise.resolve(entity)),
      find: jest.fn(),
    };
    expenseRecordsRepo = {
      create: jest.fn((data: unknown) => ({ ...(data as object) })),
      save: jest.fn((entity: Record<string, unknown>) =>
        Promise.resolve({ id: 'exp-generated', ...entity }),
      ),
      find: jest.fn(),
    };

    service = new SharedBudgetsService(
      budgetsRepo as never,
      membersRepo as never,
      { findOneBy: jest.fn() } as never, // invitations repo (unused here)
      incomesRepo as never,
      expenseRecordsRepo as never,
      { findByEmail: jest.fn() } as unknown as UsersService,
      { sendBudgetInvitation: jest.fn() } as unknown as MailService,
      { transaction: jest.fn() } as never,
    );
  });

  describe('addIncome', () => {
    it('throws ForbiddenException for a non-member', async () => {
      membersRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.addIncome('intruder', 'budget-1', { amount: 100 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(incomesRepo.save).not.toHaveBeenCalled();
    });

    it('persists an income with a fixed-precision amount for a member', async () => {
      membersRepo.findOneBy.mockResolvedValue({ role: 'member' });

      await service.addIncome('user-2', 'budget-1', {
        amount: 1500,
        description: 'Salario',
        incomeDate: '2024-05-10',
      });

      expect(incomesRepo.create).toHaveBeenCalledWith({
        budgetId: 'budget-1',
        userId: 'user-2',
        amount: '1500.00',
        description: 'Salario',
        incomeDate: '2024-05-10',
      });
      expect(incomesRepo.save).toHaveBeenCalled();
    });
  });

  describe('addExpense', () => {
    it('throws ForbiddenException for a non-member', async () => {
      membersRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.addExpense('intruder', 'budget-1', {
          categoryId: 'cat-1',
          amount: 50,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(expenseRecordsRepo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the budget does not exist', async () => {
      membersRepo.findOneBy.mockResolvedValue({ role: 'member' });
      budgetsRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.addExpense('user-1', 'missing', {
          categoryId: 'cat-1',
          amount: 50,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('does not report limitExceeded when the total stays within the limit', async () => {
      membersRepo.findOneBy.mockResolvedValue({ role: 'member' });
      budgetsRepo.findOneBy.mockResolvedValue({
        id: 'budget-1',
        monthlyLimit: '1000.00',
        limitNotified: false,
      });
      // Existing + new = 300, under the 1000 limit.
      expenseRecordsRepo.find.mockResolvedValue([
        { amount: '200.00' },
        { amount: '100.00' },
      ]);

      const result = await service.addExpense('user-1', 'budget-1', {
        categoryId: 'cat-1',
        amount: 100,
        expenseDate: '2024-05-10',
      });

      expect(result.limitExceeded).toBe(false);
      expect(budgetsRepo.save).not.toHaveBeenCalled();
    });

    it('reports limitExceeded and flips limitNotified once on the first crossing (P12/P13)', async () => {
      membersRepo.findOneBy.mockResolvedValue({ role: 'member' });
      const budget = {
        id: 'budget-1',
        monthlyLimit: '1000.00',
        limitNotified: false,
      };
      budgetsRepo.findOneBy.mockResolvedValue(budget);
      // Month-to-date total of 1200 exceeds the 1000 limit.
      expenseRecordsRepo.find.mockResolvedValue([
        { amount: '900.00' },
        { amount: '300.00' },
      ]);

      const result = await service.addExpense('user-1', 'budget-1', {
        categoryId: 'cat-1',
        amount: 300,
        expenseDate: '2024-05-10',
      });

      expect(result.limitExceeded).toBe(true);
      expect(budget.limitNotified).toBe(true);
      expect(budgetsRepo.save).toHaveBeenCalledTimes(1);
    });

    it('does NOT re-trigger the notification on a second crossing', async () => {
      membersRepo.findOneBy.mockResolvedValue({ role: 'member' });
      // Already notified this cycle.
      const budget = {
        id: 'budget-1',
        monthlyLimit: '1000.00',
        limitNotified: true,
      };
      budgetsRepo.findOneBy.mockResolvedValue(budget);
      expenseRecordsRepo.find.mockResolvedValue([
        { amount: '1200.00' },
        { amount: '500.00' },
      ]);

      const result = await service.addExpense('user-1', 'budget-1', {
        categoryId: 'cat-1',
        amount: 500,
        expenseDate: '2024-05-10',
      });

      // State still reflects the breach, but no re-flip / re-save happens.
      expect(result.limitExceeded).toBe(true);
      expect(budget.limitNotified).toBe(true);
      expect(budgetsRepo.save).not.toHaveBeenCalled();
    });

    it('never reports limitExceeded when no monthly limit is set', async () => {
      membersRepo.findOneBy.mockResolvedValue({ role: 'member' });
      budgetsRepo.findOneBy.mockResolvedValue({
        id: 'budget-1',
        monthlyLimit: null,
        limitNotified: false,
      });
      expenseRecordsRepo.find.mockResolvedValue([{ amount: '5000.00' }]);

      const result = await service.addExpense('user-1', 'budget-1', {
        categoryId: 'cat-1',
        amount: 5000,
        expenseDate: '2024-05-10',
      });

      expect(result.limitExceeded).toBe(false);
      expect(budgetsRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('setLimit', () => {
    it('throws ForbiddenException when the caller is not the owner', async () => {
      membersRepo.findOneBy.mockResolvedValue({ role: 'member' });

      await expect(
        service.setLimit('user-2', 'budget-1', { monthlyLimit: 500 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(budgetsRepo.save).not.toHaveBeenCalled();
    });

    it('owner updating the limit resets limitNotified to false', async () => {
      membersRepo.findOneBy.mockResolvedValue({ role: 'owner' });
      const budget = {
        id: 'budget-1',
        monthlyLimit: '1000.00',
        limitNotified: true,
      };
      budgetsRepo.findOneBy.mockResolvedValue(budget);

      const result = await service.setLimit('user-1', 'budget-1', {
        monthlyLimit: 2000,
      });

      expect(result.monthlyLimit).toBe('2000.00');
      expect(result.limitNotified).toBe(false);
      expect(budgetsRepo.save).toHaveBeenCalledTimes(1);
    });

    it('owner clearing the limit (null) resets limitNotified', async () => {
      membersRepo.findOneBy.mockResolvedValue({ role: 'owner' });
      const budget = {
        id: 'budget-1',
        monthlyLimit: '1000.00',
        limitNotified: true,
      };
      budgetsRepo.findOneBy.mockResolvedValue(budget);

      const result = await service.setLimit('user-1', 'budget-1', {
        monthlyLimit: null,
      });

      expect(result.monthlyLimit).toBeNull();
      expect(result.limitNotified).toBe(false);
    });

    it('setting the same limit value leaves limitNotified unchanged', async () => {
      membersRepo.findOneBy.mockResolvedValue({ role: 'owner' });
      const budget = {
        id: 'budget-1',
        monthlyLimit: '1000.00',
        limitNotified: true,
      };
      budgetsRepo.findOneBy.mockResolvedValue(budget);

      const result = await service.setLimit('user-1', 'budget-1', {
        monthlyLimit: 1000,
      });

      // No change in value → notification flag preserved.
      expect(result.limitNotified).toBe(true);
    });
  });

  describe('listIncomes / listExpenses', () => {
    it('listIncomes throws ForbiddenException for a non-member', async () => {
      membersRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.listIncomes('intruder', 'budget-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('listExpenses returns records scoped to the budget for a member', async () => {
      membersRepo.findOneBy.mockResolvedValue({ role: 'member' });
      expenseRecordsRepo.find.mockResolvedValue([{ id: 'exp-1' }]);

      const result = await service.listExpenses('user-1', 'budget-1');

      expect(expenseRecordsRepo.find).toHaveBeenCalledWith({
        where: { budgetId: 'budget-1' },
        order: { expenseDate: 'DESC' },
      });
      expect(result).toHaveLength(1);
    });
  });
});
