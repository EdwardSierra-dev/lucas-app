import { IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';

/**
 * DTO for POST /budgets.
 *
 * Validation (Requirement 5):
 *  - name:         required, 1–100 characters.
 *  - monthlyLimit: optional; when supplied it must be a positive amount within
 *                  the NUMERIC(14,2) range enforced by the database
 *                  (0.01 ≤ limit ≤ 999,999,999.99).
 */
export class CreateBudgetDto {
  @IsString()
  @Length(1, 100)
  name: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999999999.99)
  monthlyLimit?: number;
}
