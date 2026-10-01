/**
 * Property-based tests for loan validation and computation.
 *
 * Feature: lucas-app-v1
 *  - P18: installmentsPaid is always within [0, totalInstallments]; a loan with
 *         installmentsPaid > totalInstallments is rejected.
 *  - P19: registering a payment increments installmentsPaid by 1 and never
 *         exceeds totalInstallments.
 *  - P20: loan computations (loanTotalRepayment, loanRemainingInstallments,
 *         loanOutstandingAmount) are correct per the shared definitions.
 *
 * Validates: Requirements 7.3, 7.5, 7.6, 7.7, 7.8, 7.9 (loans)
 */

import * as fc from 'fast-check';
import { BadRequestException } from '@nestjs/common';
import {
  loanOutstandingAmount,
  loanRemainingInstallments,
  loanTotalRepayment,
  type LoanComputable,
} from '../loan.calculations';
import { LoansService } from '../loans.service';
import { CreateLoanDto } from '../dto/create-loan.dto';

/**
 * Structural stand-in for the Loan entity (mirrors loans.service.test.ts), so
 * we never import the TypeORM entity class into the test.
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

const USER = 'user-uuid-1';

/** Build a mocked TypeORM repository matching the service's usage. */
function makeRepo() {
  return {
    createQueryBuilder: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn((loan) => Promise.resolve({ id: 'loan-1', ...loan })),
    findOne: jest.fn(),
    remove: jest.fn().mockResolvedValue(undefined),
  };
}

// ---------------------------------------------------------------------------
// Generators — keep money values as integer "cents" to avoid float noise.
// ---------------------------------------------------------------------------

// 1..360 installments.
const totalInstallmentsArb = fc.integer({ min: 1, max: 360 });

// A bank loan computable: installmentAmount in cents, paid in [0, total].
const bankLoanArb = totalInstallmentsArb.chain((total) =>
  fc.record({
    source: fc.constant<'bank'>('bank'),
    installmentAmount: fc.integer({ min: 1, max: 100_000_00 }),
    capital: fc.constant<number | null>(null),
    interestPerInstallment: fc.constant<number | null>(null),
    totalInstallments: fc.constant(total),
    installmentsPaid: fc.integer({ min: 0, max: total }),
  }),
);

// A person loan computable: capital & interest in cents, paid in [0, total].
const personLoanArb = totalInstallmentsArb.chain((total) =>
  fc.record({
    source: fc.constant<'person'>('person'),
    installmentAmount: fc.constant<number | null>(null),
    capital: fc.integer({ min: 1, max: 100_000_00 }),
    interestPerInstallment: fc.integer({ min: 0, max: 10_000_00 }),
    totalInstallments: fc.constant(total),
    installmentsPaid: fc.integer({ min: 0, max: total }),
  }),
);

describe('P20: loan computations are correct (Req 7.5, 7.9)', () => {
  it('bank loan: totalRepayment, outstanding and remaining match the definitions', () => {
    // Validates: Requirements 7.5, 7.9
    fc.assert(
      fc.property(bankLoanArb, (loan: LoanComputable) => {
        const total = loan.totalInstallments ?? 0;
        const paid = loan.installmentsPaid;
        const amount = loan.installmentAmount ?? 0;

        expect(loanTotalRepayment(loan)).toBe(amount * total);
        expect(loanRemainingInstallments(loan)).toBe(total - paid);
        expect(loanOutstandingAmount(loan)).toBe(amount * (total - paid));
        // Valid inputs (paid <= total) ⇒ remaining is never negative.
        expect(loanRemainingInstallments(loan)).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 200 },
    );
  });

  it('person loan: totalRepayment, outstanding and remaining match the definitions', () => {
    // Validates: Requirements 7.5, 7.9
    fc.assert(
      fc.property(personLoanArb, (loan: LoanComputable) => {
        const total = loan.totalInstallments ?? 0;
        const paid = loan.installmentsPaid;
        const capital = loan.capital ?? 0;
        const interest = loan.interestPerInstallment ?? 0;

        expect(loanTotalRepayment(loan)).toBe(capital + interest * total);
        expect(loanRemainingInstallments(loan)).toBe(total - paid);
        expect(loanOutstandingAmount(loan)).toBe(interest * (total - paid));
        expect(loanRemainingInstallments(loan)).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 200 },
    );
  });
});

describe('P18: installmentsPaid bounds are enforced on create (Req 7.3/7.6/7.8)', () => {
  it('rejects a loan whose installmentsPaid exceeds totalInstallments', async () => {
    // Validates: Requirements 7.8
    await fc.assert(
      fc.asyncProperty(
        totalInstallmentsArb,
        fc.integer({ min: 1, max: 1000 }),
        async (total, over) => {
          const repo = makeRepo();
          const service = new LoansService(repo as never);
          const dto: CreateLoanDto = {
            source: 'bank',
            installmentAmount: 100,
            totalInstallments: total,
            installmentsPaid: total + over, // strictly greater than total
            startDate: '2024-01-01',
          } as CreateLoanDto;

          await expect(service.create(USER, dto)).rejects.toBeInstanceOf(
            BadRequestException,
          );
          expect(repo.save).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('creates successfully when installmentsPaid is within [0, totalInstallments]', async () => {
    // Validates: Requirements 7.3, 7.8
    await fc.assert(
      fc.asyncProperty(
        totalInstallmentsArb.chain((total) =>
          fc.record({
            total: fc.constant(total),
            paid: fc.integer({ min: 0, max: total }),
          }),
        ),
        async ({ total, paid }) => {
          const repo = makeRepo();
          const service = new LoansService(repo as never);
          const dto: CreateLoanDto = {
            source: 'bank',
            installmentAmount: 100,
            totalInstallments: total,
            installmentsPaid: paid,
            startDate: '2024-01-01',
          } as CreateLoanDto;

          const result = await service.create(USER, dto);
          expect(repo.save).toHaveBeenCalledTimes(1);
          expect(result.installmentsPaid).toBe(paid);
          expect(result.installmentsPaid).toBeGreaterThanOrEqual(0);
          expect(result.installmentsPaid).toBeLessThanOrEqual(total);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('P19: registerInstallment increments by 1 and never over-pays (Req 7.9)', () => {
  const storedLoan = (total: number, paid: number): TestLoan => ({
    id: 'loan-1',
    userId: USER,
    source: 'bank',
    installmentAmount: 100,
    capital: null,
    interestPerInstallment: null,
    totalInstallments: total,
    installmentsPaid: paid,
    description: null,
    startDate: '2024-01-01',
  });

  it('increments installmentsPaid by exactly 1 and never exceeds total when k < total', async () => {
    // Validates: Requirements 7.9
    await fc.assert(
      fc.asyncProperty(
        // total >= 1 and k in [0, total-1] so there is room to pay.
        fc.integer({ min: 1, max: 360 }).chain((total) =>
          fc.record({
            total: fc.constant(total),
            k: fc.integer({ min: 0, max: total - 1 }),
          }),
        ),
        async ({ total, k }) => {
          const repo = makeRepo();
          repo.findOne.mockResolvedValue(storedLoan(total, k));
          const service = new LoansService(repo as never);

          const result = await service.registerInstallment(USER, 'loan-1');

          expect(result.installmentsPaid).toBe(k + 1);
          expect(result.installmentsPaid).toBeLessThanOrEqual(total);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects registerInstallment when already at total (no over-payment)', async () => {
    // Validates: Requirements 7.9
    await fc.assert(
      fc.asyncProperty(totalInstallmentsArb, async (total) => {
        const repo = makeRepo();
        repo.findOne.mockResolvedValue(storedLoan(total, total));
        const service = new LoansService(repo as never);

        await expect(
          service.registerInstallment(USER, 'loan-1'),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(repo.save).not.toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  });
});
