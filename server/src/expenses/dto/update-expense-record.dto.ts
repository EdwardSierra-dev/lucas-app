import {
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Payload for updating an existing expense record. All fields are optional so
 * callers may patch only the attributes they want to change.
 *
 * - `amount` — new logged amount (positive NUMERIC(14,2) range, Property P11).
 * - `description` — new free text, capped at 255 chars.
 * - `expenseDate` — new ISO date for the entry.
 */
export class UpdateExpenseRecordDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999999999.99)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsDateString()
  expenseDate?: string;
}
