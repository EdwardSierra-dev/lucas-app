import {
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/**
 * Payload for configuring a new monthly expense slot (user_expenses row).
 *
 * - `categoryId` — the category the slot is attached to (predefined or custom).
 * - `amount` — optional configured amount. Validated to the NUMERIC(14,2)
 *   positive range (Property P11-aligned bounds) when provided.
 * - `paymentDay` — optional day of month the expense is due. Must be 1–28
 *   (Property P7) to remain valid in every calendar month.
 */
export class CreateUserExpenseDto {
  @IsUUID()
  categoryId: string;

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
}
