/**
 * Pure loan computation helpers.
 *
 * These mirror the shared implementations in `@lucas/types`
 * (`loanTotalRepayment`, `loanRemainingInstallments`, `loanOutstandingAmount`).
 * They are duplicated locally to keep the server `tsc` build clean, avoiding
 * the current `@lucas/types` path-resolution issue during compilation.
 *
 * Req 7.5, 7.9
 */

export type LoanSource = 'bank' | 'person';

/**
 * Minimal shape required by the loan computations. Both the TypeORM `Loan`
 * entity and the shared `Loan` interface are structurally compatible with it.
 */
export interface LoanComputable {
  source: LoanSource;
  installmentAmount?: number | null; // bank only
  capital?: number | null; // person only
  interestPerInstallment?: number | null;
  totalInstallments?: number | null;
  installmentsPaid: number;
}

/**
 * Total repayment amount for a loan.
 *  - Bank loan:   installmentAmount × totalInstallments
 *  - Person loan: capital + (interestPerInstallment × totalInstallments)
 *
 * Req 7.5
 */
export function loanTotalRepayment(loan: LoanComputable): number {
  if (loan.source === 'bank') {
    return (loan.installmentAmount ?? 0) * (loan.totalInstallments ?? 0);
  }
  return (
    (loan.capital ?? 0) +
    (loan.interestPerInstallment ?? 0) * (loan.totalInstallments ?? 0)
  );
}

/**
 * Number of installments still to be paid: totalInstallments − installmentsPaid.
 * Req 7.9
 */
export function loanRemainingInstallments(loan: LoanComputable): number {
  return (loan.totalInstallments ?? 0) - loan.installmentsPaid;
}

/**
 * Outstanding monetary amount for a loan.
 *  - Bank loan:   installmentAmount × remainingInstallments
 *  - Person loan: interestPerInstallment × remainingInstallments
 *
 * Req 7.9
 */
export function loanOutstandingAmount(loan: LoanComputable): number {
  const remaining = loanRemainingInstallments(loan);
  if (loan.source === 'bank') {
    return (loan.installmentAmount ?? 0) * remaining;
  }
  return (loan.interestPerInstallment ?? 0) * remaining;
}
