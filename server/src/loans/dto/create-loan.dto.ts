import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { LoanSource } from '../entities/loan.entity';

/**
 * Payload for creating a loan record.
 *
 * Field-shape validation lives here (types, ranges). The source-specific
 * "required field" rules (bank requires cuota; person requires capital +
 * interest + installments) are enforced in `LoansService.create`, so a single
 * place reports which fields are invalid (Property P18, Req 7.3/7.6/7.7/7.8).
 */
export class CreateLoanDto {
  @IsIn(['bank', 'person'])
  source: LoanSource;

  // Bank loan only — cuota. Must be strictly positive when present (Req 7.3).
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999_999_999.99)
  installmentAmount?: number;

  // Person loan only — capital. Must be strictly positive when present (Req 7.6).
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999_999_999.99)
  capital?: number;

  // Person loan — interest per installment. Must be ≥ 0 when present (Req 7.7).
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999_999_999.99)
  interestPerInstallment?: number;

  // Total installments (plazo). Must be ≥ 1 when present (Req 7.8).
  @IsOptional()
  @IsInt()
  @Min(1)
  totalInstallments?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  installmentsPaid?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsDateString()
  startDate: string;
}
