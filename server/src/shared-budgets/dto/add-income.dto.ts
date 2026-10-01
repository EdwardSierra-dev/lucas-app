import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * DTO for POST /budgets/:id/incomes (Requirements 5.1, 5.6, 5.8).
 *
 * Validation:
 *  - amount:      required; positive within the NUMERIC(14,2) range
 *                 (0.01 ≤ amount ≤ 999,999,999.99), at most 2 decimal places.
 *  - description: optional; up to 255 characters.
 *  - incomeDate:  optional ISO date (YYYY-MM-DD); defaults to today when
 *                 omitted by the service.
 */
export class AddIncomeDto {
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
  incomeDate?: string;
}
