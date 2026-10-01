/**
 * Property-based tests for the shared-budget module.
 *
 * Feature: lucas-app-v1. These cover the task-level properties P11–P14 which
 * map onto the design document's shared-budget invariants:
 *
 *  - P11  → design Property 11: a budget income/expense `amount` is accepted
 *           iff it is a number with at most 2 decimal places in the range
 *           (0, 999999999.99]. Exercised at the DTO level against both
 *           AddIncomeDto and AddBudgetExpenseDto (class-validator).
 *  - P12/P13 → design Property 14: the over-limit notification fires exactly
 *           once per cycle. The first month-to-date crossing of the limit
 *           flips `limitNotified` (one save); subsequent crossings keep
 *           `limitExceeded = true` but do NOT re-flip / re-save the flag.
 *  - P14  → shared-budget authorization invariants: only a member may add
 *           income/expense (non-member → ForbiddenException); only the owner
 *           may set the limit (member → ForbiddenException).
 *
 * Validates: Requirements 5.1, 5.6, 5.7, 5.8, 5.10, 5.11, 5.12
 */

import 'reflect-metadata';
import * as fc from 'fast-check';
import { ForbiddenException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AddIncomeDto } from '../dto/add-income.dto';
import { AddBudgetExpenseDto } from '../dto/add-budget-expense.dto';
import { SharedBudgetsService } from '../shared-budgets.service';
import { UsersService } from '../../users/users.service';
import { MailService } from '../../mail/mail.service';

const MAX_AMOUNT = 999999999.99;

// ---------------------------------------------------------------------------
// P11 — amount validation at the DTO level (AddIncomeDto / AddBudgetExpenseDto)
// ---------------------------------------------------------------------------

type DtoCase = {
  name: string;
  /** Build a plain payload carrying the amount under test. */
  payload: (amount: unknown) => Record<string, unknown>;
  dtoClass: typeof AddIncomeDto | typeof AddBudgetExpenseDto;
};

const dtoCases: DtoCase[] = [
  {
    name: 'AddIncomeDto',
    payload: (amount) => ({ amount }),
    dtoClass: AddIncomeDto,
  },
  {
    name: 'AddBudgetExpenseDto',
    // categoryId must be a valid UUID so the only failing field is `amount`.
    payload: (amount) => ({
      amount,
      categoryId: '00000000-0000-4000-8000-000000000000',
    }),
    dtoClass: AddBudgetExpenseDto,
  },
];

/**
 * Validate a plain payload against the given DTO class and return the
 * `amount` property's failed constraints (keyed by constraint name), or
 * `undefined` when `amount` produced no validation errors.
 */
async function amountConstraints(
  dtoClass: DtoCase['dtoClass'],
  payload: Record<string, unknown>,
): Promise<Record<string, string> | undefined> {
  const dto = plainToInstance(dtoClass, payload);
  const errors = await validate(dto);
  return errors.find((e) => e.property === 'amount')?.constraints;
}

describe.each(dtoCases)('P11: amount validation — $name', ({ payload, dtoClass }) => {
  // -------------------------------------------------------------------------
  // P11a — ACCEPT: numbers in [0.01, 999999999.99] with <= 2 decimal places
  // -------------------------------------------------------------------------
  it('P11a: accepts amounts in (0, 999999999.99] with at most 2 decimals', async () => {
    // Validates: Requirements 5.1, 5.6, 5.7
    await fc.assert(
      fc.asyncProperty(
        // Cents in [1, 99_999_999_999] → amount in [0.01, 999999999.99].
        fc.integer({ min: 1, max: 99_999_999_999 }),
        async (cents) => {
          const amount = Math.round(cents) / 100;
          const constraints = await amountConstraints(dtoClass, payload(amount));
          expect(constraints).toBeUndefined();
        },
      ),
      { numRuns: 200 },
    );
  });

  // -------------------------------------------------------------------------
  // P11b — REJECT: amounts <= 0 (zero and negatives) fail the @Min(0.01) rule
  // -------------------------------------------------------------------------
  it('P11b: rejects amounts <= 0 with a min constraint error', async () => {
    // Validates: Requirements 5.7
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(0),
          fc
            .integer({ min: 1, max: 99_999_999_999 })
            .map((cents) => -(Math.round(cents) / 100)),
        ),
        async (amount) => {
          const constraints = await amountConstraints(dtoClass, payload(amount));
          expect(constraints).toBeDefined();
          expect(constraints).toHaveProperty('min');
        },
      ),
      { numRuns: 200 },
    );
  });

  // -------------------------------------------------------------------------
  // P11c — REJECT: amounts > 999999999.99 fail the @Max rule
  // -------------------------------------------------------------------------
  it('P11c: rejects amounts greater than 999999999.99 with a max constraint error', async () => {
    // Validates: Requirements 5.7
    await fc.assert(
      fc.asyncProperty(
        fc
          .integer({ min: 1, max: 100_000_000_000 })
          .map((extraCents) => MAX_AMOUNT + Math.round(extraCents) / 100),
        async (amount) => {
          const constraints = await amountConstraints(dtoClass, payload(amount));
          expect(constraints).toBeDefined();
          expect(constraints).toHaveProperty('max');
        },
      ),
      { numRuns: 200 },
    );
  });

  // -------------------------------------------------------------------------
  // P11d — REJECT: amounts with 3+ decimal places fail @IsNumber(maxDecimalPlaces)
  // -------------------------------------------------------------------------
  it('P11d: rejects amounts with more than 2 decimal places with an isNumber constraint error', async () => {
    // Validates: Requirements 5.8
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          whole: fc.integer({ min: 0, max: 999_999_998 }),
          decimals: fc.integer({ min: 3, max: 6 }),
          fraction: fc.integer({ min: 1, max: 999_999 }),
        }),
        async ({ whole, decimals, fraction }) => {
          const frac = String(fraction % Math.pow(10, decimals)).padStart(
            decimals,
            '0',
          );
          const amount = Number(`${whole}.${frac}`);
          // Only consider values that truly exceed 2 decimal places.
          fc.pre(amount !== Math.round(amount * 100) / 100);
          const constraints = await amountConstraints(dtoClass, payload(amount));
          expect(constraints).toBeDefined();
          expect(constraints).toHaveProperty('isNumber');
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Service-level helpers for P12/P13/P14
// ---------------------------------------------------------------------------

/**
 * A stateful budget object the mocked repositories mutate in place, mirroring
 * how TypeORM would hand back the same entity instance across reads.
 */
interface MutableBudget {
  id: string;
  monthlyLimit: string | null;
  limitNotified: boolean;
}

/**
 * Build a SharedBudgetsService wired to mock repositories. `budget` is the
 * stateful entity returned by `budgetsRepository.findOneBy`; `membership`
 * controls what `membersRepository.findOneBy` resolves to (null → non-member).
 * `existingExpenses` seeds the month-to-date lookup used by addExpense.
 *
 * The constructor argument order mirrors the real service:
 *   budgetsRepo, membersRepo, invitationsRepo, incomesRepo,
 *   expenseRecordsRepo, usersService, mailService, dataSource.
 */
function buildService(opts: {
  budget: MutableBudget | null;
  membership: { role: 'owner' | 'member' } | null;
  existingExpenses?: Array<{ amount: string }>;
}) {
  const budgetsSave = jest.fn((entity: unknown) => Promise.resolve(entity));
  const budgetsRepo = {
    findOneBy: jest.fn().mockResolvedValue(opts.budget),
    save: budgetsSave,
  };
  const membersRepo = {
    findOneBy: jest.fn().mockResolvedValue(opts.membership),
  };
  const incomesRepo = {
    create: jest.fn((data: unknown) => ({ ...(data as object) })),
    save: jest.fn((entity: unknown) => Promise.resolve(entity)),
    find: jest.fn(),
  };
  const expenseRecordsRepo = {
    create: jest.fn((data: unknown) => ({ ...(data as object) })),
    save: jest.fn((entity: Record<string, unknown>) =>
      Promise.resolve({ id: 'exp-generated', ...entity }),
    ),
    // addExpense recomputes the month-to-date total from this list. The newly
    // saved expense is appended so the running total reflects every call.
    find: jest.fn().mockImplementation(() =>
      Promise.resolve([...(opts.existingExpenses ?? [])]),
    ),
  };

  const service = new SharedBudgetsService(
    budgetsRepo as never,
    membersRepo as never,
    { findOneBy: jest.fn() } as never,
    incomesRepo as never,
    expenseRecordsRepo as never,
    { findByEmail: jest.fn() } as unknown as UsersService,
    { sendBudgetInvitation: jest.fn() } as unknown as MailService,
    { transaction: jest.fn() } as never,
  );

  return { service, budgetsRepo, expenseRecordsRepo, incomesRepo };
}

const EXPENSE_DATE = '2024-05-10';

// ---------------------------------------------------------------------------
// P12 / P13 — over-limit notification fires exactly once per cycle
// ---------------------------------------------------------------------------

describe('P12/P13: over-limit notification fires exactly once per cycle', () => {
  it('P12/P13: across any sequence of expenses crossing the limit, limitNotified flips at most once and never re-saves afterward', async () => {
    // Validates: Requirements 5.12
    await fc.assert(
      fc.asyncProperty(
        // A positive monthly limit (<= 2 decimals, within range).
        fc.integer({ min: 1, max: 10_000_00 }).map((c) => c / 100),
        // A sequence of positive expense amounts (<= 2 decimals).
        fc.array(fc.integer({ min: 1, max: 5_000_00 }).map((c) => c / 100), {
          minLength: 1,
          maxLength: 25,
        }),
        async (limit, amounts) => {
          const budget: MutableBudget = {
            id: 'budget-1',
            monthlyLimit: limit.toFixed(2),
            limitNotified: false,
          };
          // The expense list the mock reads from grows as expenses are added,
          // so monthToDateTotal reflects the running month-to-date sum.
          const existingExpenses: Array<{ amount: string }> = [];
          const { service, budgetsRepo } = buildService({
            budget,
            membership: { role: 'member' },
            existingExpenses,
          });

          let runningTotal = 0;
          let firstCrossingIndex = -1;
          const results: boolean[] = [];

          for (const amount of amounts) {
            // Mirror service behaviour: the expense is persisted first, so it
            // is part of the month-to-date total used for the limit check.
            existingExpenses.push({ amount: amount.toFixed(2) });
            runningTotal = Math.round((runningTotal + amount) * 100) / 100;

            const result = await service.addExpense('user-1', 'budget-1', {
              categoryId: '00000000-0000-4000-8000-000000000000',
              amount,
              expenseDate: EXPENSE_DATE,
            });
            results.push(result.limitExceeded);

            if (firstCrossingIndex === -1 && runningTotal > limit) {
              firstCrossingIndex = results.length - 1;
            }
          }

          // Save (the limitNotified flip) must happen AT MOST once overall.
          expect(budgetsRepo.save.mock.calls.length).toBeLessThanOrEqual(1);

          if (firstCrossingIndex === -1) {
            // Total never exceeded the limit: no breach, no save.
            expect(results.every((r) => r === false)).toBe(true);
            expect(budgetsRepo.save).not.toHaveBeenCalled();
            expect(budget.limitNotified).toBe(false);
          } else {
            // The flag flips exactly once, on (or before) the first crossing.
            expect(budgetsRepo.save).toHaveBeenCalledTimes(1);
            expect(budget.limitNotified).toBe(true);
            // Every call from the first crossing onward reports the breach
            // (totals only rise since all amounts are positive)...
            expect(
              results.slice(firstCrossingIndex).every((r) => r === true),
            ).toBe(true);
            // ...yet the flag is only ever saved once (P13: no re-trigger).
          }
        },
      ),
      { numRuns: 150 },
    );
  });
});

// ---------------------------------------------------------------------------
// P14 — authorization invariants
// ---------------------------------------------------------------------------

type Role = 'owner' | 'member' | 'none';

describe('P14: shared-budget authorization invariants', () => {
  const budget: MutableBudget = {
    id: 'budget-1',
    monthlyLimit: '1000.00',
    limitNotified: false,
  };

  const membershipFor = (role: Role) =>
    role === 'none' ? null : { role };

  it('P14a: addIncome requires membership — a non-member is always rejected', async () => {
    // Validates: Requirements 5.1
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<Role>('owner', 'member', 'none'),
        async (role) => {
          const { service, incomesRepo } = buildService({
            budget: { ...budget },
            membership: membershipFor(role),
          });

          const call = service.addIncome('user-x', 'budget-1', { amount: 100 });

          if (role === 'none') {
            await expect(call).rejects.toBeInstanceOf(ForbiddenException);
            expect(incomesRepo.save).not.toHaveBeenCalled();
          } else {
            // Any member (owner or member) is authorized.
            await expect(call).resolves.toBeDefined();
            expect(incomesRepo.save).toHaveBeenCalledTimes(1);
          }
        },
      ),
      { numRuns: 60 },
    );
  });

  it('P14b: addExpense requires membership — a non-member is always rejected', async () => {
    // Validates: Requirements 5.7
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<Role>('owner', 'member', 'none'),
        async (role) => {
          const { service, expenseRecordsRepo } = buildService({
            budget: { ...budget },
            membership: membershipFor(role),
            existingExpenses: [],
          });

          const call = service.addExpense('user-x', 'budget-1', {
            categoryId: '00000000-0000-4000-8000-000000000000',
            amount: 100,
            expenseDate: EXPENSE_DATE,
          });

          if (role === 'none') {
            await expect(call).rejects.toBeInstanceOf(ForbiddenException);
            expect(expenseRecordsRepo.save).not.toHaveBeenCalled();
          } else {
            await expect(call).resolves.toBeDefined();
            expect(expenseRecordsRepo.save).toHaveBeenCalledTimes(1);
          }
        },
      ),
      { numRuns: 60 },
    );
  });

  it('P14c: setLimit requires owner — a member or non-member is always rejected', async () => {
    // Validates: Requirements 5.10, 5.11
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<Role>('owner', 'member', 'none'),
        async (role) => {
          const { service, budgetsRepo } = buildService({
            budget: { ...budget },
            membership: membershipFor(role),
          });

          const call = service.setLimit('user-x', 'budget-1', {
            monthlyLimit: 500,
          });

          if (role === 'owner') {
            await expect(call).resolves.toBeDefined();
            expect(budgetsRepo.save).toHaveBeenCalledTimes(1);
          } else {
            // Both 'member' and 'none' are forbidden from setting the limit.
            await expect(call).rejects.toBeInstanceOf(ForbiddenException);
            expect(budgetsRepo.save).not.toHaveBeenCalled();
          }
        },
      ),
      { numRuns: 60 },
    );
  });
});
