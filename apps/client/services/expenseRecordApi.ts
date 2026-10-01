/**
 * Expense record API — React Query hooks for logging personal financial
 * entries (Requirement 5.x — expense records).
 *
 * Server state (the user's logged expense records) is owned by the React Query
 * cache under the ['expense-records'] key. All requests go through the shared
 * `api` axios instance (bearer token + silent-refresh interceptors from
 * `services/api.ts`).
 *
 * Backend endpoints (task 10.2):
 *   • GET    /expenses/records            → useExpenseRecords (optional filter)
 *   • POST   /expenses/records            → useCreateExpenseRecord
 *   • PATCH  /expenses/records/:id         → useUpdateExpenseRecord
 *   • DELETE /expenses/records/:id         → useDeleteExpenseRecord
 *
 * Mutations invalidate ['expense-records'] on success so the list stays in
 * sync with the server. Monetary columns are serialised by the backend as
 * fixed-precision strings (NUMERIC); we keep `amount` as a `string` on the
 * client and parse where needed (e.g. via utils/money).
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

// --- Client-side types (mirror server / @lucas/types) ----------------------

/** A logged expense record returned by the backend. */
export interface ExpenseRecord {
  id: string;
  userId: string;
  categoryId: string;
  /** null when the record is not attached to a shared budget. */
  budgetId: string | null;
  /** Fixed-precision string. */
  amount: string;
  description: string | null;
  /** YYYY-MM-DD. */
  expenseDate: string;
  createdAt: string;
}

// --- Query filter -----------------------------------------------------------

/** Optional query filter for GET /expenses/records. */
export interface ExpenseRecordFilter {
  /** Inclusive lower bound, YYYY-MM-DD. */
  from?: string;
  /** Inclusive upper bound, YYYY-MM-DD. */
  to?: string;
  categoryId?: string;
}

// --- Mutation payloads ------------------------------------------------------

/** Body for POST /expenses/records (mirrors CreateExpenseRecordDto). */
export interface CreateExpenseRecordPayload {
  categoryId: string;
  /** Must be > 0, <= 999,999,999.99, with at most 2 decimals. */
  amount: number;
  description?: string;
  /** Optional YYYY-MM-DD; backend defaults to today when omitted. */
  expenseDate?: string;
  budgetId?: string;
}

/** Body for PATCH /expenses/records/:id. */
export interface UpdateExpenseRecordPayload {
  id: string;
  categoryId?: string;
  amount?: number;
  description?: string;
  expenseDate?: string;
  budgetId?: string;
}

// --- Error alias ------------------------------------------------------------

export type ExpenseRecordApiError = AxiosError<ApiErrorBody>;

// --- Query keys -------------------------------------------------------------

export const expenseRecordsQueryKey = ['expense-records'] as const;

/** Key that also captures the active filter so distinct filters cache apart. */
export function expenseRecordsFilterKey(
  filter?: ExpenseRecordFilter,
): readonly unknown[] {
  return [...expenseRecordsQueryKey, filter ?? {}] as const;
}

// --- Queries ----------------------------------------------------------------

async function fetchExpenseRecords(
  filter?: ExpenseRecordFilter,
): Promise<ExpenseRecord[]> {
  const params: Record<string, string> = {};
  if (filter?.from) params.from = filter.from;
  if (filter?.to) params.to = filter.to;
  if (filter?.categoryId) params.categoryId = filter.categoryId;

  const { data } = await api.get<ExpenseRecord[]>('/expenses/records', {
    params,
  });
  return data;
}

/**
 * List the authenticated user's expense records (GET /expenses/records).
 * An optional filter narrows the results by date range and/or category.
 */
export function useExpenseRecords(
  filter?: ExpenseRecordFilter,
): UseQueryResult<ExpenseRecord[], ExpenseRecordApiError> {
  return useQuery<ExpenseRecord[], ExpenseRecordApiError>({
    queryKey: expenseRecordsFilterKey(filter),
    queryFn: () => fetchExpenseRecords(filter),
  });
}

// --- Mutations --------------------------------------------------------------

async function createExpenseRecordRequest(
  payload: CreateExpenseRecordPayload,
): Promise<ExpenseRecord> {
  const { data } = await api.post<ExpenseRecord>('/expenses/records', payload);
  return data;
}

/** Log a new expense record (POST /expenses/records); refreshes the list. */
export function useCreateExpenseRecord(): UseMutationResult<
  ExpenseRecord,
  ExpenseRecordApiError,
  CreateExpenseRecordPayload
> {
  const queryClient = useQueryClient();
  return useMutation<
    ExpenseRecord,
    ExpenseRecordApiError,
    CreateExpenseRecordPayload
  >({
    mutationFn: createExpenseRecordRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expenseRecordsQueryKey });
    },
  });
}

async function updateExpenseRecordRequest({
  id,
  ...body
}: UpdateExpenseRecordPayload): Promise<ExpenseRecord> {
  const { data } = await api.patch<ExpenseRecord>(
    `/expenses/records/${id}`,
    body,
  );
  return data;
}

/** Edit an expense record (PATCH /expenses/records/:id); refreshes the list. */
export function useUpdateExpenseRecord(): UseMutationResult<
  ExpenseRecord,
  ExpenseRecordApiError,
  UpdateExpenseRecordPayload
> {
  const queryClient = useQueryClient();
  return useMutation<
    ExpenseRecord,
    ExpenseRecordApiError,
    UpdateExpenseRecordPayload
  >({
    mutationFn: updateExpenseRecordRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expenseRecordsQueryKey });
    },
  });
}

async function deleteExpenseRecordRequest(id: string): Promise<void> {
  await api.delete(`/expenses/records/${id}`);
}

/** Delete an expense record (DELETE /expenses/records/:id); refreshes list. */
export function useDeleteExpenseRecord(): UseMutationResult<
  void,
  ExpenseRecordApiError,
  string
> {
  const queryClient = useQueryClient();
  return useMutation<void, ExpenseRecordApiError, string>({
    mutationFn: deleteExpenseRecordRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expenseRecordsQueryKey });
    },
  });
}
