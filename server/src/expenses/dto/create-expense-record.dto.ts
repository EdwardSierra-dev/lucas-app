import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Payload for logging a new dated expense record (expense_records row).
 *
 * - `categoryId` — the category the entry is attached to (predefined/custom).
 * - `amount` — the logged amount. Validated to the positive NUMERIC(14,2)
 *   range 0.01–999,999,999.99 (Property P11 financial entry validation).
 * - `description` — optional free text, capped at 255 chars (matches column).
 * - `expenseDate` — optional ISO date; the service defaults to today when
 *   omitted.
 * - `budgetId` — optional shared budget association.
 */
export class CreateExpenseRecordDto {
  @IsUUID()
  categoryId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999999999.99)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsDateString()
  expenseDate?: string;

  @IsOptional()
  @IsUUID()
  budgetId?: string;
}
