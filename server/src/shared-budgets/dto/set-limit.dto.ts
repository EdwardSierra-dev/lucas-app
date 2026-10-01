import { IsNumber, Max, Min, ValidateIf } from 'class-validator';

/**
 * DTO for PATCH /budgets/:id/limit (Requirements 5.10, 5.11).
 *
 * Validation:
 *  - monthlyLimit: accepts `null` to clear the limit. When a value is
 *    supplied it must be a positive amount within the NUMERIC(14,2) range
 *    (0.01 ≤ limit ≤ 999,999,999.99) with at most 2 decimal places.
 *
 * `@ValidateIf` skips the numeric validators when the value is `null`, so a
 * client can explicitly clear the limit while still rejecting out-of-range
 * numbers.
 */
export class SetLimitDto {
  @ValidateIf((_, value) => value !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999999999.99)
  monthlyLimit: number | null;
}
