import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

/**
 * Payload for updating an existing expense slot. All fields are optional so
 * callers may patch only the attributes they want to change.
 *
 * - `amount` — new configured amount (NUMERIC(14,2) positive range).
 * - `paymentDay` — new due day; must be 1–28 (Property P7).
 * - `isActive` — toggle the slot active/inactive (soft deactivation).
 */
export class UpdateUserExpenseDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999999999.99)
  amount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  paymentDay?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
