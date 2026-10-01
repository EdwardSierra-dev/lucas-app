/**
 * Loans API — React Query hooks for the Loan_Module (Requirement 7).
 *
 * Server state (active loans with their derived figures) is owned by the React
 * Query cache here. All requests go through the shared `api` axios instance
 * (bearer token + silent-refresh interceptors from `services/api.ts`).
 *
 * Backend endpoints (task 16.2):
 *   • GET    /loans                   → useLoans
 *   • POST   /loans                   → useCreateLoan
 *   • PATCH  /loans/:id/installment    → useRegisterInstallment
 *   • DELETE /loans/:id                → useDeleteLoan
 *
 * The GET endpoint returns each loan with the server-computed `totalRepayment`,
 * `remainingInstallments`, and `outstandingAmount` (Req 7.5, 7.9). Mutations
 * invalidate the `['loans']` query key on success so the list stays in sync.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { api } from './api';
import type { ApiErrorBody } from './authApi';
import type { LoanPayload, LoanSource } from './loanSchema';

// --- Client-side types (mirror server / @lucas-app/types) ------------------

/** A persisted loan record returned by the API, including computed figures. */
export interface Loan {
  id: string;
  userId: string;
  source: LoanSource;
  /** Bank loans only — the per-installment amount (cuota). */
  installmentAmount?: number;
  /** Person loans only — the borrowed capital. */
  capital?: number;
  /** Person loans only — interest charged on each installment. */
  interestPerInstallment?: number;
  totalInstallments: number;
  installmentsPaid: number;
  description?: string;
  /** ISO date (YYYY-MM-DD). */
  startDate: string;

  // --- Server-computed fields (Req 7.5, 7.9) -------------------------------
  /** Total repayment: cuota × N (bank) or capital + interest × N (person). */
  totalRepayment: number;
  /** total_installments − installments_paid. */
  remainingInstallments: number;
  /** cuota × remaining (bank) or interest × remaining (person). */
  outstandingAmount: number;
}

// --- Error alias ------------------------------------------------------------

export type LoanApiError = AxiosError<ApiErrorBody>;

// --- Query keys -------------------------------------------------------------

export const loansQueryKey = ['loans'] as const;

// --- Queries ----------------------------------------------------------------

async function fetchLoans(): Promise<Loan[]> {
  const { data } = await api.get<Loan[]>('/loans');
  return data;
}

/** List active loans with computed figures (GET /loans). */
export function useLoans(): UseQueryResult<Loan[], LoanApiError> {
  return useQuery<Loan[], LoanApiError>({
    queryKey: loansQueryKey,
    queryFn: fetchLoans,
  });
}

// --- Mutations --------------------------------------------------------------

async function createLoanRequest(payload: LoanPayload): Promise<Loan> {
  const { data } = await api.post<Loan>('/loans', payload);
  return data;
}

/** Create a loan record (POST /loans); invalidates ['loans']. */
export function useCreateLoan(): UseMutationResult<
  Loan,
  LoanApiError,
  LoanPayload
> {
  const queryClient = useQueryClient();
  return useMutation<Loan, LoanApiError, LoanPayload>({
    mutationFn: createLoanRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: loansQueryKey });
    },
  });
}

async function registerInstallmentRequest(id: string): Promise<Loan> {
  const { data } = await api.patch<Loan>(`/loans/${id}/installment`);
  return data;
}

/** Register a paid installment (PATCH /loans/:id/installment); invalidates ['loans']. */
export function useRegisterInstallment(): UseMutationResult<
  Loan,
  LoanApiError,
  string
> {
  const queryClient = useQueryClient();
  return useMutation<Loan, LoanApiError, string>({
    mutationFn: registerInstallmentRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: loansQueryKey });
    },
  });
}

async function deleteLoanRequest(id: string): Promise<void> {
  await api.delete(`/loans/${id}`);
}

/** Delete a loan record (DELETE /loans/:id); invalidates ['loans']. */
export function useDeleteLoan(): UseMutationResult<void, LoanApiError, string> {
  const queryClient = useQueryClient();
  return useMutation<void, LoanApiError, string>({
    mutationFn: deleteLoanRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: loansQueryKey });
    },
  });
}
