/**
 * Auth API — React Query hooks for the Auth_Service (Requirement 1).
 *
 * NOTE: This is a minimal placeholder. Task 4.3 fleshes out token handling,
 * refresh, login, logout, and email-verification flows. For now it exposes
 * only `useRegister`, which POSTs to `/auth/register`.
 */
import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { api } from './api';
import type { RegisterPayload } from './registrationSchema';

/** Shape returned by POST /auth/register (confirmation email dispatched). */
export interface RegisterResponse {
  id: string;
  email: string;
  emailVerified: boolean;
}

/** Standard error body returned by the NestJS backend. */
export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export type RegisterError = AxiosError<ApiErrorBody>;

async function registerRequest(
  payload: RegisterPayload,
): Promise<RegisterResponse> {
  const { data } = await api.post<RegisterResponse>('/auth/register', payload);
  return data;
}

/**
 * React Query mutation to register a new account.
 *
 * On a 409 Conflict the Auth_Service reports that the email is already
 * registered (Req 1.9); callers inspect `error.response.status` to surface
 * that inline on the email field.
 */
export function useRegister(): UseMutationResult<
  RegisterResponse,
  RegisterError,
  RegisterPayload
> {
  return useMutation<RegisterResponse, RegisterError, RegisterPayload>({
    mutationFn: registerRequest,
  });
}
