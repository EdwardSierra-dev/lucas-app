// packages/types/src/index.ts
// Shared types and pure utility functions for the Lucas app monorepo.

export type LoanSource = 'bank' | 'person';
export type NotificationType =
  | 'payment_reminder'
  | 'vehicle_expiry'
  | 'budget_limit'
  | 'budget_invitation';
export type ExpenseType = 'mandatory' | 'optional' | 'vehicle' | 'loan' | 'income';

export interface MoneyAmount {
  amount: number; // stored as number, rendered with 2 decimals
  currency: string;
}

export interface Category {
  id: string;
  userId: string | null; // null = predefined
  name: string;
  emoji: string;
  type: ExpenseType;
  isPredefined: boolean;
}

export interface Loan {
  id: string;
  userId: string;
  source: LoanSource;
  installmentAmount?: number; // bank only
  capital?: number; // person only
  interestPerInstallment?: number;
  totalInstallments?: number;
  installmentsPaid: number;
  description?: string;
  startDate: string; // ISO date
}

/**
 * Computes the total repayment amount for a loan.
 *
 * - Bank loan:   installmentAmount × totalInstallments
 * - Person loan: capital + (interestPerInstallment × totalInstallments)
 *
 * Req 7.5
 */
export function loanTotalRepayment(loan: Loan): number {
  if (loan.source === 'bank') {
    return (loan.installmentAmount ?? 0) * (loan.totalInstallments ?? 0);
  }
  return (loan.capital ?? 0) + (loan.interestPerInstallment ?? 0) * (loan.totalInstallments ?? 0);
}

/**
 * Returns the number of installments still to be paid.
 * Req 7.9
 */
export function loanRemainingInstallments(loan: Loan): number {
  return (loan.totalInstallments ?? 0) - loan.installmentsPaid;
}

/**
 * Returns the outstanding monetary amount for a loan.
 *
 * - Bank loan:   installmentAmount × remainingInstallments
 * - Person loan: interestPerInstallment × remainingInstallments
 *
 * Req 7.9
 */
export function loanOutstandingAmount(loan: Loan): number {
  const remaining = loanRemainingInstallments(loan);
  if (loan.source === 'bank') return (loan.installmentAmount ?? 0) * remaining;
  return (loan.interestPerInstallment ?? 0) * remaining;
}
