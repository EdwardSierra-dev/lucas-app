import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for POST /budgets/:id/expenses (Requirements 5.7, 5.8, 5.12).
 *
 * Validation:
 *  - categoryId:  required; a UUID referencing the expense category.
 *  - amount:      required; positive within the NUMERIC(14,2) range
 *                 (0.01 ≤ amount ≤ 999,999,999.99), at most 2 decimal places.
 *  - description: optional; up to 255 characters.
 *  - expenseDate: optional ISO date (YYYY-MM-DD); defaults to today when
 *                 omitted by the service.
 */
export class AddBudgetExpenseDto {
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
}
