/**
 * Property-based tests for financial entry (expense record) amount validation.
 *
 * Feature: lucas-app-v1, Property 11: Financial entry amount validation.
 *
 * P11: a financial entry amount is accepted iff it is a number with at most 2
 * decimal places in the range (0, 999999999.99].
 *
 * Validates: Requirements 5.1, 5.6, 5.7, 5.8
 */

import 'reflect-metadata';
import * as fc from 'fast-check';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateExpenseRecordDto } from '../dto/create-expense-record.dto';

const MAX_AMOUNT = 999999999.99;

/**
 * Build the DTO from a plain payload and return the `amount` property's
 * validation constraints (an object keyed by failed constraint name), or
 * `undefined` when `amount` produced no errors.
 */
async function amountConstraints(
  categoryId: string,
  amount: unknown,
): Promise<Record<string, string> | undefined> {
  const dto = plainToInstance(CreateExpenseRecordDto, { categoryId, amount });
  const errors = await validate(dto);
  return errors.find((e) => e.property === 'amount')?.constraints;
}

describe('P11: financial entry amount validation', () => {
  // -------------------------------------------------------------------------
  // P11a — ACCEPT: numbers in [0.01, 999999999.99] with <= 2 decimal places
  // -------------------------------------------------------------------------
  it('P11a: accepts amounts in (0, 999999999.99] with at most 2 decimals', async () => {
    // Validates: Requirements 5.1, 5.6
    await fc.assert(
      fc.asyncProperty(
        // Cents in [1, 99_999_999_999] → amount in [0.01, 999999999.99].
        fc.integer({ min: 1, max: 99_999_999_999 }),
        fc.uuid(),
        async (cents, categoryId) => {
          // Divide by 100 to produce a value with at most 2 decimal places.
          const amount = Math.round(cents) / 100;
          const constraints = await amountConstraints(categoryId, amount);
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
          // Negative amounts with at most 2 decimals.
          fc
            .integer({ min: 1, max: 99_999_999_999 })
            .map((cents) => -(Math.round(cents) / 100)),
        ),
        fc.uuid(),
        async (amount, categoryId) => {
          const constraints = await amountConstraints(categoryId, amount);
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
        // Values strictly above the maximum, keeping <= 2 decimals so the only
        // violated rule is @Max.
        fc
          .integer({ min: 1, max: 100_000_000_000 })
          .map((extraCents) => MAX_AMOUNT + Math.round(extraCents) / 100),
        fc.uuid(),
        async (amount, categoryId) => {
          const constraints = await amountConstraints(categoryId, amount);
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
        // Whole part within range, plus a fractional tail with 3..6 decimals
        // whose last digit is non-zero so the value genuinely has >2 decimals.
        fc.record({
          whole: fc.integer({ min: 0, max: 999_999_998 }),
          decimals: fc.integer({ min: 3, max: 6 }),
          // 1..999999 → guarantees a non-zero significant digit beyond 2 places.
          fraction: fc.integer({ min: 1, max: 999_999 }),
        }),
        fc.uuid(),
        async ({ whole, decimals, fraction }, categoryId) => {
          const frac = String(fraction % Math.pow(10, decimals)).padStart(
            decimals,
            '0',
          );
          const amount = Number(`${whole}.${frac}`);
          // Only consider cases that truly exceed 2 decimal places.
          fc.pre(amount !== Math.round(amount * 100) / 100);
          const constraints = await amountConstraints(categoryId, amount);
          expect(constraints).toBeDefined();
          expect(constraints).toHaveProperty('isNumber');
        },
      ),
      { numRuns: 200 },
    );
  });
});
