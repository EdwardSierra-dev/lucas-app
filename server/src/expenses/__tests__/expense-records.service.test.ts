import { NotFoundException } from '@nestjs/common';
import {
  Between,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { ExpenseRecordsService } from '../expense-records.service';
import { ExpenseRecord } from '../entities/expense-record.entity';

// ---------------------------------------------------------------------------
// A minimal in-memory stand-in for the TypeORM repository. Only the methods
// the service actually calls are implemented. `create` echoes its input (as
// TypeORM does) and `save` returns the entity with a generated id.
// ---------------------------------------------------------------------------
function makeRepoMock() {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((data: Partial<ExpenseRecord>) => ({ ...data })),
    save: jest.fn((entity: ExpenseRecord) => ({
      ...entity,
      id: entity.id ?? 'generated-id',
    })),
    remove: jest.fn(),
  };
}

type RepoMock = ReturnType<typeof makeRepoMock>;

const USER_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const CATEGORY = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const BUDGET = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const RECORD_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

describe('ExpenseRecordsService (Requirements 5.x, Property P11)', () => {
  let repo: RepoMock;
  let service: ExpenseRecordsService;

  beforeEach(() => {
    repo = makeRepoMock();
    service = new ExpenseRecordsService(
      repo as unknown as Repository<ExpenseRecord>,
    );
  });

  // -------------------------------------------------------------------------
  // findAll — scoping to the requesting user + optional filters
  // -------------------------------------------------------------------------
  describe('findAll', () => {
    it("queries only the requesting user's records, newest first", async () => {
      const records = [{ id: RECORD_ID, userId: USER_A }] as ExpenseRecord[];
      repo.find.mockResolvedValue(records);

      const result = await service.findAll(USER_A);

      expect(repo.find).toHaveBeenCalledWith({
        where: { userId: USER_A },
        relations: { category: true },
        order: { expenseDate: 'DESC' },
      });
      expect(result).toBe(records);
    });

    it('filters by categoryId when provided', async () => {
      repo.find.mockResolvedValue([]);

      await service.findAll(USER_A, { categoryId: CATEGORY });

      expect(repo.find).toHaveBeenCalledWith({
        where: { userId: USER_A, categoryId: CATEGORY },
        relations: { category: true },
        order: { expenseDate: 'DESC' },
      });
    });

    it('filters by an inclusive date range when both from and to are given', async () => {
      repo.find.mockResolvedValue([]);

      await service.findAll(USER_A, { from: '2024-01-01', to: '2024-01-31' });

      expect(repo.find).toHaveBeenCalledWith({
        where: {
          userId: USER_A,
          expenseDate: Between('2024-01-01', '2024-01-31'),
        },
        relations: { category: true },
        order: { expenseDate: 'DESC' },
      });
    });

    it('filters by a lower bound when only from is given', async () => {
      repo.find.mockResolvedValue([]);

      await service.findAll(USER_A, { from: '2024-01-01' });

      expect(repo.find).toHaveBeenCalledWith({
        where: {
          userId: USER_A,
          expenseDate: MoreThanOrEqual('2024-01-01'),
        },
        relations: { category: true },
        order: { expenseDate: 'DESC' },
      });
    });

    it('filters by an upper bound when only to is given', async () => {
      repo.find.mockResolvedValue([]);

      await service.findAll(USER_A, { to: '2024-01-31' });

      expect(repo.find).toHaveBeenCalledWith({
        where: {
          userId: USER_A,
          expenseDate: LessThanOrEqual('2024-01-31'),
        },
        relations: { category: true },
        order: { expenseDate: 'DESC' },
      });
    });

    it('returns an empty list when the user has no records', async () => {
      repo.find.mockResolvedValue([]);
      await expect(service.findAll(USER_A)).resolves.toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // create — amount normalisation + date default
  // -------------------------------------------------------------------------
  describe('create', () => {
    it('stores amount with exactly 2 decimals and the provided fields', async () => {
      const result = await service.create(USER_A, {
        categoryId: CATEGORY,
        amount: 49.9,
        description: 'Groceries',
        expenseDate: '2024-02-15',
        budgetId: BUDGET,
      });

      expect(repo.create).toHaveBeenCalledWith({
        userId: USER_A,
        categoryId: CATEGORY,
        budgetId: BUDGET,
        amount: '49.90',
        description: 'Groceries',
        expenseDate: '2024-02-15',
      });
      expect(repo.save).toHaveBeenCalled();
      expect(result.id).toBe('generated-id');
    });

    it('defaults expenseDate to today and nullifies optional fields when omitted', async () => {
      const today = new Date().toISOString().slice(0, 10);

      await service.create(USER_A, {
        categoryId: CATEGORY,
        amount: 1234.5,
      });

      expect(repo.create).toHaveBeenCalledWith({
        userId: USER_A,
        categoryId: CATEGORY,
        budgetId: null,
        amount: '1234.50',
        description: null,
        expenseDate: today,
      });
    });

    it('normalises amounts with more precision by rounding to 2 decimals', async () => {
      await service.create(USER_A, {
        categoryId: CATEGORY,
        amount: 10.005,
      });

      const created = repo.create.mock.calls[0]?.[0] as
        | Partial<ExpenseRecord>
        | undefined;
      // toFixed(2) applied — exactly 2 decimal places persisted.
      expect(created?.amount).toMatch(/^\d+\.\d{2}$/);
    });
  });

  // -------------------------------------------------------------------------
  // update — ownership + partial patch
  // -------------------------------------------------------------------------
  describe('update', () => {
    it('updates only the provided fields of an owned record', async () => {
      const record = {
        id: RECORD_ID,
        userId: USER_A,
        amount: '10.00',
        description: 'old',
        expenseDate: '2024-01-01',
      } as ExpenseRecord;
      repo.findOne.mockResolvedValue(record);

      await service.update(USER_A, RECORD_ID, { amount: 20 });

      expect(record.amount).toBe('20.00');
      expect(record.description).toBe('old'); // untouched
      expect(record.expenseDate).toBe('2024-01-01'); // untouched
      expect(repo.save).toHaveBeenCalledWith(record);
    });

    it('throws NotFoundException when the record is not owned by the user', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.update(USER_B, RECORD_ID, { amount: 10 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: RECORD_ID, userId: USER_B },
      });
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // remove — ownership
  // -------------------------------------------------------------------------
  describe('remove', () => {
    it('removes an owned record', async () => {
      const record = { id: RECORD_ID, userId: USER_A } as ExpenseRecord;
      repo.findOne.mockResolvedValue(record);

      await service.remove(USER_A, RECORD_ID);

      expect(repo.remove).toHaveBeenCalledWith(record);
    });

    it('throws NotFoundException when deleting a record the user does not own', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.remove(USER_B, RECORD_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.remove).not.toHaveBeenCalled();
    });
  });
});
