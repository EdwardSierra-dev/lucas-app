import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LoansService } from '../loans.service';
import { CreateLoanDto } from '../dto/create-loan.dto';

/**
 * Structural stand-in for the Loan entity so the test does not import the
 * TypeORM entity class (whose decorator-populated fields would otherwise trip
 * strict property-initialization during ts-jest compilation).
 */
interface TestLoan {
  id: string;
  userId: string;
  source: 'bank' | 'person';
  installmentAmount: number | null;
  capital: number | null;
  interestPerInstallment: number | null;
  totalInstallments: number | null;
  installmentsPaid: number;
  description: string | null;
  startDate: string;
}

/**
 * Unit tests for LoansService (Requirements 7.3, 7.5, 7.6, 7.7, 7.8, 7.9).
 * The TypeORM repository is mocked so the tests exercise only service logic —
 * no database access.
 */
describe('LoansService — unit tests', () => {
  let service: LoansService;
  let repo: {
    createQueryBuilder: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
  };

  const USER = 'user-uuid-1';

  // Query-builder stub whose terminal getMany resolves to the supplied rows.
  const makeQueryBuilder = (rows: TestLoan[]) => {
    const qb: Record<string, jest.Mock> = {};
    for (const method of ['where', 'andWhere', 'orderBy', 'addOrderBy']) {
      qb[method] = jest.fn().mockReturnValue(qb);
    }
    qb.getMany = jest.fn().mockResolvedValue(rows);
    return qb;
  };

  beforeEach(() => {
    repo = {
      createQueryBuilder: jest.fn(),
      // create echoes the entity-like object back (as TypeORM does)
      create: jest.fn((data) => data),
      // save assigns an id and returns the stored row
      save: jest.fn((loan) => Promise.resolve({ id: 'loan-1', ...loan })),
      findOne: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    service = new LoansService(repo as never);
  });

  describe('create — source-specific validation (Property P18)', () => {
    it('throws when a bank loan is missing installmentAmount (Req 7.3)', async () => {
      const dto: CreateLoanDto = {
        source: 'bank',
        startDate: '2024-01-01',
      } as CreateLoanDto;

      await expect(service.create(USER, dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('throws when a person loan is missing capital/interest/installments', async () => {
      const dto: CreateLoanDto = {
        source: 'person',
        startDate: '2024-01-01',
      } as CreateLoanDto;

      await expect(service.create(USER, dto)).rejects.toMatchObject({
        response: {
          invalidFields: expect.arrayContaining([
            'capital',
            'interestPerInstallment',
            'totalInstallments',
          ]),
        },
      });
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('creates a person loan and computes totalRepayment = capital + interest × N (Req 7.5)', async () => {
      const dto: CreateLoanDto = {
        source: 'person',
        capital: 1000,
        interestPerInstallment: 50,
        totalInstallments: 10,
        startDate: '2024-01-01',
      } as CreateLoanDto;

      const result = await service.create(USER, dto);

      expect(repo.save).toHaveBeenCalledTimes(1);
      // 1000 + 50 × 10 = 1500
      expect(result.totalRepayment).toBe(1500);
      // No installments paid yet → remaining = 10, outstanding = 50 × 10 = 500
      expect(result.remainingInstallments).toBe(10);
      expect(result.outstandingAmount).toBe(500);
      // Bank-only field left null for a person loan
      expect(result.installmentAmount).toBeNull();
    });

    it('creates a bank loan with only installmentAmount populated', async () => {
      const dto: CreateLoanDto = {
        source: 'bank',
        installmentAmount: 200,
        totalInstallments: 12,
        startDate: '2024-01-01',
      } as CreateLoanDto;

      const result = await service.create(USER, dto);

      // Bank total = 200 × 12 = 2400
      expect(result.totalRepayment).toBe(2400);
      expect(result.capital).toBeNull();
      expect(result.interestPerInstallment).toBeNull();
    });
  });

  describe('update / registerInstallment — installmentsPaid bounds (Property P18/P19)', () => {
    const storedLoan = (): TestLoan => ({
      id: 'loan-1',
      userId: USER,
      source: 'bank',
      installmentAmount: 100,
      capital: null,
      interestPerInstallment: null,
      totalInstallments: 5,
      installmentsPaid: 2,
      description: null,
      startDate: '2024-01-01',
    });

    it('throws when installmentsPaid exceeds totalInstallments', async () => {
      repo.findOne.mockResolvedValue(storedLoan());

      await expect(
        service.update(USER, 'loan-1', { installmentsPaid: 6 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('registerInstallment increments installmentsPaid by one', async () => {
      repo.findOne.mockResolvedValue(storedLoan());

      const result = await service.registerInstallment(USER, 'loan-1');

      expect(result.installmentsPaid).toBe(3);
      // remaining = 5 − 3 = 2; outstanding = 100 × 2 = 200
      expect(result.remainingInstallments).toBe(2);
      expect(result.outstandingAmount).toBe(200);
    });

    it('registerInstallment throws when already at total installments', async () => {
      repo.findOne.mockResolvedValue({ ...storedLoan(), installmentsPaid: 5 });

      await expect(
        service.registerInstallment(USER, 'loan-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFound when the loan is not owned by the user', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.registerInstallment(USER, 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listForUser — GET returns computed fields (Req 7.9)', () => {
    it('returns active loans enriched with computed values', async () => {
      const rows: TestLoan[] = [
        {
          id: 'loan-1',
          userId: USER,
          source: 'person',
          installmentAmount: null,
          capital: 1000,
          interestPerInstallment: 50,
          totalInstallments: 10,
          installmentsPaid: 4,
          description: 'friend loan',
          startDate: '2024-01-01',
        },
      ];
      repo.createQueryBuilder.mockReturnValue(makeQueryBuilder(rows));

      const result = await service.listForUser(USER);

      expect(result).toHaveLength(1);
      // total = 1000 + 50 × 10 = 1500
      expect(result[0]?.totalRepayment).toBe(1500);
      // remaining = 10 − 4 = 6
      expect(result[0]?.remainingInstallments).toBe(6);
      // person outstanding = 50 × 6 = 300
      expect(result[0]?.outstandingAmount).toBe(300);
    });

    it('returns an empty array when the user has no active loans', async () => {
      repo.createQueryBuilder.mockReturnValue(makeQueryBuilder([]));

      const result = await service.listForUser(USER);
      expect(result).toEqual([]);
    });
  });

  describe('remove', () => {
    it('removes a loan owned by the user', async () => {
      const loan = {
        id: 'loan-1',
        userId: USER,
      };
      repo.findOne.mockResolvedValue(loan);

      await service.remove(USER, 'loan-1');
      expect(repo.remove).toHaveBeenCalledWith(loan);
    });

    it('throws NotFound when the loan does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove(USER, 'nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
