/**
 * Expenses API — React Query hooks for the Expense_Configurator
 * (Requirements 2.x & 3.x — category + user-expense configuration).
 *
 * Server state (saved categories and configured expense slots) is owned by the
 * React Query cache here; the transient onboarding draft lives in
 * `store/expenseStore.ts`. All requests go through the shared `api` axios
 * instance (bearer token + silent-refresh interceptors from `services/api.ts`).
 *
 * Backend endpoints (tasks 6.2 / 7.2):
 *   • GET    /categories           → useCategories
 *   • POST   /categories           → useCreateCategory
 *   • DELETE /categories/:id        → useDeleteCategory
 *   • GET    /user-expenses        → useUserExpenses
 *   • POST   /user-expenses        → useCreateUserExpense
 *   • PATCH  /user-expenses/:id     → useUpdateUserExpense
 *   • DELETE /user-expenses/:id     → useDeleteUserExpense
 *
 * Mutations invalidate the relevant query key on success so the cache stays in
 * sync with the server.
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

/** Expense classification shared with the backend. */
export type ExpenseType =
  | 'mandatory'
  | 'optional'
  | 'vehicle'
  | 'loan'
  | 'income';

/** A predefined or user-created expense category. */
export interface Category {
  id: string;
  /** null = predefined (owned by the system, not a specific user). */
  userId: string | null;
  name: string;
  emoji: string;
  type: ExpenseType;
  isPredefined: boolean;
}

/** A configured expense "slot": a category the user selected to track. */
export interface UserExpense {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  /** Day of month (1–28) the expense is due. */
  paymentDay: number;
  isActive: boolean;
}

// --- Mutation payloads ------------------------------------------------------

/** Body for POST /categories. */
export interface CreateCategoryPayload {
  name: string;
  emoji: string;
  type: ExpenseType;
}

/** Body for POST /user-expenses. */
export interface CreateUserExpensePayload {
  categoryId: string;
  amount: number;
  paymentDay: number;
}

/** Body for PATCH /user-expenses/:id. */
export interface UpdateUserExpensePayload {
  id: string;
  amount?: number;
  paymentDay?: number;
  isActive?: boolean;
}

// --- Error alias ------------------------------------------------------------

export type ExpensesApiError = AxiosError<ApiErrorBody>;

// --- Query keys -------------------------------------------------------------

export const categoriesQueryKey = ['categories'] as const;
export const userExpensesQueryKey = ['user-expenses'] as const;

// --- Categories: queries ----------------------------------------------------

async function fetchCategories(): Promise<Category[]> {
  const { data } = await api.get<Category[]>('/categories');
  return data;
}

/** List predefined + user custom categories (GET /categories). */
export function useCategories(): UseQueryResult<Category[], ExpensesApiError> {
  return useQuery<Category[], ExpensesApiError>({
    queryKey: categoriesQueryKey,
    queryFn: fetchCategories,
  });
}

// --- Categories: mutations --------------------------------------------------

async function createCategoryRequest(
  payload: CreateCategoryPayload,
): Promise<Category> {
  const { data } = await api.post<Category>('/categories', payload);
  return data;
}

/** Create a custom category (POST /categories); invalidates ['categories']. */
export function useCreateCategory(): UseMutationResult<
  Category,
  ExpensesApiError,
  CreateCategoryPayload
> {
  const queryClient = useQueryClient();
  return useMutation<Category, ExpensesApiError, CreateCategoryPayload>({
    mutationFn: createCategoryRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
    },
  });
}

async function deleteCategoryRequest(id: string): Promise<void> {
  await api.delete(`/categories/${id}`);
}

/** Delete an own custom category (DELETE /categories/:id). */
export function useDeleteCategory(): UseMutationResult<
  void,
  ExpensesApiError,
  string
> {
  const queryClient = useQueryClient();
  return useMutation<void, ExpensesApiError, string>({
    mutationFn: deleteCategoryRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
    },
  });
}

// --- User expenses: queries -------------------------------------------------

async function fetchUserExpenses(): Promise<UserExpense[]> {
  const { data } = await api.get<UserExpense[]>('/user-expenses');
  return data;
}

/** List configured user expense slots (GET /user-expenses). */
export function useUserExpenses(): UseQueryResult<
  UserExpense[],
  ExpensesApiError
> {
  return useQuery<UserExpense[], ExpensesApiError>({
    queryKey: userExpensesQueryKey,
    queryFn: fetchUserExpenses,
  });
}

// --- User expenses: mutations -----------------------------------------------

async function createUserExpenseRequest(
  payload: CreateUserExpensePayload,
): Promise<UserExpense> {
  const { data } = await api.post<UserExpense>('/user-expenses', payload);
  return data;
}

/** Configure an expense slot (POST /user-expenses); invalidates the list. */
export function useCreateUserExpense(): UseMutationResult<
  UserExpense,
  ExpensesApiError,
  CreateUserExpensePayload
> {
  const queryClient = useQueryClient();
  return useMutation<UserExpense, ExpensesApiError, CreateUserExpensePayload>({
    mutationFn: createUserExpenseRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userExpensesQueryKey });
    },
  });
}

async function updateUserExpenseRequest({
  id,
  ...body
}: UpdateUserExpensePayload): Promise<UserExpense> {
  const { data } = await api.patch<UserExpense>(`/user-expenses/${id}`, body);
  return data;
}

/** Update an expense slot (PATCH /user-expenses/:id); invalidates the list. */
export function useUpdateUserExpense(): UseMutationResult<
  UserExpense,
  ExpensesApiError,
  UpdateUserExpensePayload
> {
  const queryClient = useQueryClient();
  return useMutation<UserExpense, ExpensesApiError, UpdateUserExpensePayload>({
    mutationFn: updateUserExpenseRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userExpensesQueryKey });
    },
  });
}

async function deleteUserExpenseRequest(id: string): Promise<void> {
  await api.delete(`/user-expenses/${id}`);
}

/** Deactivate / remove an expense slot (DELETE /user-expenses/:id). */
export function useDeleteUserExpense(): UseMutationResult<
  void,
  ExpensesApiError,
  string
> {
  const queryClient = useQueryClient();
  return useMutation<void, ExpensesApiError, string>({
    mutationFn: deleteUserExpenseRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userExpensesQueryKey });
    },
  });
}
