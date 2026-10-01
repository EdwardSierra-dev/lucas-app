/**
 * Property-based tests for payment day validation on CreateUserExpenseDto.
 *
 * Feature: lucas-app-v1, Property 7: Payment day validation accepts 1–28, rejects all others
 *
 * paymentDay is @IsOptional @IsInt @Min(1) @Max(28) — it must be an integer in
 * [1, 28] to remain a valid day in every calendar month, or omitted entirely.
 *
 * Validates: Requirements 2.8, 3.5
 */

import 'reflect-metadata';
import * as fc from 'fast-check';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateUserExpenseDto } from '../dto/create-user-expense.dto';

/**
 * Validate a candidate paymentDay against the DTO and return the constraints
 * object recorded for the `paymentDay` property (or undefined if no error).
 */
async function paymentDayConstraints(
  categoryId: string,
  paymentDay: unknown,
): Promise<Record<string, string> | undefined> {
  const dto = plainToInstance(CreateUserExpenseDto, { categoryId, paymentDay });
  const errors = await validate(dto);
  return errors.find((e) => e.property === 'paymentDay')?.constraints;
}

describe('P7: Payment day validation accepts 1–28, rejects all others', () => {
  it('P7a — accepts any integer paymentDay in [1, 28]', async () => {
    // Validates: Requirements 2.8, 3.5
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.integer({ min: 1, max: 28 }),
        async (categoryId, paymentDay) => {
          const constraints = await paymentDayConstraints(
            categoryId,
            paymentDay,
          );
          expect(constraints).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P7b — rejects integers below 1 or above 28', async () => {
    // Validates: Requirements 2.8, 3.5
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.oneof(fc.integer({ max: 0 }), fc.integer({ min: 29 })),
        async (categoryId, paymentDay) => {
          const constraints = await paymentDayConstraints(
            categoryId,
            paymentDay,
          );
          expect(constraints).toBeDefined();
          // Out-of-range integers trip the min or max constraint.
          const keys = Object.keys(constraints ?? {});
          expect(keys.some((k) => k === 'min' || k === 'max')).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P7c — rejects non-integer numbers', async () => {
    // Validates: Requirements 2.8, 3.5
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc
          .float({
            min: 1,
            max: 28,
            noNaN: true,
            noDefaultInfinity: true,
          })
          .filter((n) => !Number.isInteger(n)),
        async (categoryId, paymentDay) => {
          const constraints = await paymentDayConstraints(
            categoryId,
            paymentDay,
          );
          expect(constraints).toBeDefined();
          expect(Object.keys(constraints ?? {})).toContain('isInt');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('treats an omitted paymentDay as valid (optional field)', async () => {
    // Validates: Requirements 2.8, 3.5 — paymentDay is @IsOptional
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (categoryId) => {
        const dto = plainToInstance(CreateUserExpenseDto, { categoryId });
        const errors = await validate(dto);
        const paymentDayError = errors.find((e) => e.property === 'paymentDay');
        expect(paymentDayError).toBeUndefined();
      }),
      { numRuns: 50 },
    );
  });
});
