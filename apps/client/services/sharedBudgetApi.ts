/**
 * Shared budget API — React Query hooks for the Budget_Manager (Requirement 5).
 *
 * Exposes the client-side shared-budget flows backed by the NestJS
 * SharedBudgetsModule (see server/src/shared-budgets). Queries own the server
 * state (budgets, members, incomes, expenses) and mutations invalidate the
 * relevant query keys on success so the UI stays consistent after a change.
 *
 * Query key layout:
 *   • ['budgets']                        — the user's budgets (useBudgets)
 *   • ['budget', id, 'members']          — a budget's members
 *   • ['budget', id, 'incomes']          — a budget's income entries
 *   • ['budget', id, 'expenses']         — a budget's expense records
 *
 * All requests go through the shared `api` axios instance, which attaches the
 * bearer token and performs silent refresh on 401 (see services/api.ts).
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

// ---------------------------------------------------------------------------
// Types — client-side shapes mirroring the backend JSON responses.
// Numeric money columns are serialised as fixed-precision strings by the API
// (NUMERIC(14,2)); dates serialise as ISO strings. We keep those as `string`
// on the client and parse where needed (e.g. via utils/money).
// ---------------------------------------------------------------------------

export type BudgetMemberRole = 'owner' | 'member';

export type BudgetInvitationStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'expired';

/** A shared budget (GET /budgets, POST /budgets, PATCH /budgets/:id/limit). */
export interface SharedBudget {
  id: string;
  name: string | null;
  /** Fixed-precision string, or null when no limit is configured. */
  monthlyLimit: string | null;
  /** True once the over-limit alert has fired for the current cycle. */
  limitNotified: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A membership row (GET /budgets/:id/members, POST /invitations/:id/accept). */
export interface BudgetMember {
  budgetId: string;
  userId: string;
  role: BudgetMemberRole;
  joinedAt: string;
}

/** A pending/resolved invitation (POST /budgets/:id/invitations, reject). */
export interface BudgetInvitation {
  id: string;
  budgetId: string;
  inviterId: string;
  inviteeEmail: string;
  status: BudgetInvitationStatus;
  createdAt: string;
  expiresAt: string;
}

/** An income entry (GET/POST /budgets/:id/incomes). */
export interface BudgetIncome {
  id: string;
  budgetId: string;
  userId: string;
  /** Fixed-precision string. */
  amount: string;
  description: string | null;
  /** YYYY-MM-DD. */
  incomeDate: string;
  createdAt: string;
}

/** A shared expense record (GET/POST /budgets/:id/expenses). */
export interface BudgetExpense {
  id: string;
  userId: string;
  categoryId: string;
  budgetId: string | null;
  /** Fixed-precision string. */
  amount: string;
  description: string | null;
  /** YYYY-MM-DD. */
  expenseDate: string;
  createdAt: string;
}

/**
 * Response for POST /budgets/:id/expenses.
 *
 * `limitExceeded` reflects whether the budget's month-to-date total is over
 * the configured monthly limit after this expense (Requirement 5.12). The
 * screen uses it to surface the once-per-cycle over-limit alert.
 */
export interface AddBudgetExpenseResponse {
  expense: BudgetExpense;
  limitExceeded: boolean;
}

// --- Mutation payloads ------------------------------------------------------

export interface CreateBudgetPayload {
  name: string;
  monthlyLimit?: number;
}

export interface InviteMemberPayload {
  inviteeEmail: string;
}

export interface AddIncomePayload {
  amount: number;
  description?: string;
  /** Optional YYYY-MM-DD; backend defaults to today when omitted. */
  incomeDate?: string;
}

export interface AddBudgetExpensePayload {
  categoryId: string;
  amount: number;
  description?: string;
  /** Optional YYYY-MM-DD; backend defaults to today when omitted. */
  expenseDate?: string;
}

export interface SetLimitPayload {
  /** Positive amount to set the limit, or `null` to clear it. */
  monthlyLimit: number | null;
}

/** Standard error shape returned by the NestJS backend. */
export type BudgetApiError = AxiosError<ApiErrorBody>;

// ---------------------------------------------------------------------------
// Query key helpers
// ---------------------------------------------------------------------------

export const budgetKeys = {
  all: ['budgets'] as const,
  members: (budgetId: string) => ['budget', budgetId, 'members'] as const,
  incomes: (budgetId: string) => ['budget', budgetId, 'incomes'] as const,
  expenses: (budgetId: string) => ['budget', budgetId, 'expenses'] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

async function fetchBudgets(): Promise<SharedBudget[]> {
  const { data } = await api.get<SharedBudget[]>('/budgets');
  return data;
}

/** List the shared budgets the authenticated user belongs to (GET /budgets). */
export function useBudgets(): UseQueryResult<SharedBudget[], BudgetApiError> {
  return useQuery<SharedBudget[], BudgetApiError>({
    queryKey: budgetKeys.all,
    queryFn: fetchBudgets,
  });
}

async function fetchMembers(budgetId: string): Promise<BudgetMember[]> {
  const { data } = await api.get<BudgetMember[]>(
    `/budgets/${budgetId}/members`,
  );
  return data;
}

/** List a budget's members (GET /budgets/:id/members). */
export function useBudgetMembers(
  budgetId: string,
): UseQueryResult<BudgetMember[], BudgetApiError> {
  return useQuery<BudgetMember[], BudgetApiError>({
    queryKey: budgetKeys.members(budgetId),
    queryFn: () => fetchMembers(budgetId),
    enabled: Boolean(budgetId),
  });
}

async function fetchIncomes(budgetId: string): Promise<BudgetIncome[]> {
  const { data } = await api.get<BudgetIncome[]>(
    `/budgets/${budgetId}/incomes`,
  );
  return data;
}

/** List a budget's income entries (GET /budgets/:id/incomes). */
export function useBudgetIncomes(
  budgetId: string,
): UseQueryResult<BudgetIncome[], BudgetApiError> {
  return useQuery<BudgetIncome[], BudgetApiError>({
    queryKey: budgetKeys.incomes(budgetId),
    queryFn: () => fetchIncomes(budgetId),
    enabled: Boolean(budgetId),
  });
}

async function fetchExpenses(budgetId: string): Promise<BudgetExpense[]> {
  const { data } = await api.get<BudgetExpense[]>(
    `/budgets/${budgetId}/expenses`,
  );
  return data;
}

/** List a budget's expense records (GET /budgets/:id/expenses). */
export function useBudgetExpenses(
  budgetId: string,
): UseQueryResult<BudgetExpense[], BudgetApiError> {
  return useQuery<BudgetExpense[], BudgetApiError>({
    queryKey: budgetKeys.expenses(budgetId),
    queryFn: () => fetchExpenses(budgetId),
    enabled: Boolean(budgetId),
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

async function createBudgetRequest(
  payload: CreateBudgetPayload,
): Promise<SharedBudget> {
  const { data } = await api.post<SharedBudget>('/budgets', payload);
  return data;
}

/** Create a shared budget (POST /budgets); refreshes the budget list. */
export function useCreateBudget(): UseMutationResult<
  SharedBudget,
  BudgetApiError,
  CreateBudgetPayload
> {
  const queryClient = useQueryClient();
  return useMutation<SharedBudget, BudgetApiError, CreateBudgetPayload>({
    mutationFn: createBudgetRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: budgetKeys.all });
    },
  });
}

async function inviteMemberRequest(
  budgetId: string,
  payload: InviteMemberPayload,
): Promise<BudgetInvitation> {
  const { data } = await api.post<BudgetInvitation>(
    `/budgets/${budgetId}/invitations`,
    payload,
  );
  return data;
}

/** Invite a member by email (POST /budgets/:id/invitations). */
export function useInviteMember(
  budgetId: string,
): UseMutationResult<BudgetInvitation, BudgetApiError, InviteMemberPayload> {
  const queryClient = useQueryClient();
  return useMutation<BudgetInvitation, BudgetApiError, InviteMemberPayload>({
    mutationFn: (payload) => inviteMemberRequest(budgetId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: budgetKeys.members(budgetId),
      });
    },
  });
}

async function acceptInvitationRequest(
  invitationId: string,
): Promise<BudgetMember> {
  const { data } = await api.post<BudgetMember>(
    `/invitations/${invitationId}/accept`,
  );
  return data;
}

/**
 * Accept an invitation (POST /invitations/:id/accept). Joining a budget
 * changes the user's budget list and the budget's membership, so both are
 * invalidated.
 */
export function useAcceptInvitation(): UseMutationResult<
  BudgetMember,
  BudgetApiError,
  string
> {
  const queryClient = useQueryClient();
  return useMutation<BudgetMember, BudgetApiError, string>({
    mutationFn: acceptInvitationRequest,
    onSuccess: (member) => {
      void queryClient.invalidateQueries({ queryKey: budgetKeys.all });
      void queryClient.invalidateQueries({
        queryKey: budgetKeys.members(member.budgetId),
      });
    },
  });
}

async function rejectInvitationRequest(
  invitationId: string,
): Promise<BudgetInvitation> {
  const { data } = await api.post<BudgetInvitation>(
    `/invitations/${invitationId}/reject`,
  );
  return data;
}

/** Reject an invitation (POST /invitations/:id/reject). */
export function useRejectInvitation(): UseMutationResult<
  BudgetInvitation,
  BudgetApiError,
  string
> {
  return useMutation<BudgetInvitation, BudgetApiError, string>({
    mutationFn: rejectInvitationRequest,
  });
}

async function addIncomeRequest(
  budgetId: string,
  payload: AddIncomePayload,
): Promise<BudgetIncome> {
  const { data } = await api.post<BudgetIncome>(
    `/budgets/${budgetId}/incomes`,
    payload,
  );
  return data;
}

/** Add an income entry (POST /budgets/:id/incomes); refreshes incomes. */
export function useAddIncome(
  budgetId: string,
): UseMutationResult<BudgetIncome, BudgetApiError, AddIncomePayload> {
  const queryClient = useQueryClient();
  return useMutation<BudgetIncome, BudgetApiError, AddIncomePayload>({
    mutationFn: (payload) => addIncomeRequest(budgetId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: budgetKeys.incomes(budgetId),
      });
    },
  });
}

async function addBudgetExpenseRequest(
  budgetId: string,
  payload: AddBudgetExpensePayload,
): Promise<AddBudgetExpenseResponse> {
  const { data } = await api.post<AddBudgetExpenseResponse>(
    `/budgets/${budgetId}/expenses`,
    payload,
  );
  return data;
}

/**
 * Add a shared expense (POST /budgets/:id/expenses); refreshes expenses.
 *
 * The resolved value carries `limitExceeded` so the screen can surface the
 * once-per-cycle over-limit alert (Requirement 5.12).
 */
export function useAddBudgetExpense(
  budgetId: string,
): UseMutationResult<
  AddBudgetExpenseResponse,
  BudgetApiError,
  AddBudgetExpensePayload
> {
  const queryClient = useQueryClient();
  return useMutation<
    AddBudgetExpenseResponse,
    BudgetApiError,
    AddBudgetExpensePayload
  >({
    mutationFn: (payload) => addBudgetExpenseRequest(budgetId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: budgetKeys.expenses(budgetId),
      });
    },
  });
}

async function setLimitRequest(
  budgetId: string,
  payload: SetLimitPayload,
): Promise<SharedBudget> {
  const { data } = await api.patch<SharedBudget>(
    `/budgets/${budgetId}/limit`,
    payload,
  );
  return data;
}

/**
 * Set or clear the monthly spending limit (PATCH /budgets/:id/limit); refreshes
 * the budget list so the updated limit is reflected everywhere.
 */
export function useSetLimit(
  budgetId: string,
): UseMutationResult<SharedBudget, BudgetApiError, SetLimitPayload> {
  const queryClient = useQueryClient();
  return useMutation<SharedBudget, BudgetApiError, SetLimitPayload>({
    mutationFn: (payload) => setLimitRequest(budgetId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: budgetKeys.all });
    },
  });
}
