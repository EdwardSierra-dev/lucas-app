import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * Payload for updating a loan record. Currently supports registering installment
 * payments by setting `installmentsPaid`. The upper bound (installmentsPaid ≤
 * totalInstallments) is enforced in `LoansService.update` (Property P18/P19),
 * since it depends on the stored loan's `totalInstallments`.
 */
export class UpdateLoanDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  installmentsPaid?: number;
}
