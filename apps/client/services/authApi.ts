/**
 * Auth API — React Query hooks for the Auth_Service (Requirement 1).
 *
 * Exposes the client-side auth flows backed by the NestJS AuthModule:
 *   • useRegister — POST /auth/register
 *   • useLogin    — POST /auth/login  → stores tokens + user in authStore
 *   • useLogout   — POST /auth/logout → clears authStore
 *   • refreshAccessToken — helper (re-exported from api.ts) used by both the
 *     response interceptor and any explicit refresh needs.
 */
import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { api, refreshAccessToken } from './api';
import { useAuthStore } from '../store/authStore';
import type { RegisterPayload } from './registrationSchema';
import type { LoginPayload } from './loginSchema';

/** Shape returned by POST /auth/register (confirmation email dispatched). */
export interface RegisterResponse {
  id: string;
  email: string;
  emailVerified: boolean;
}

/** Shape returned by POST /auth/login. */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

/** Standard error body returned by the NestJS backend. */
export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export type RegisterError = AxiosError<ApiErrorBody>;
export type LoginError = AxiosError<ApiErrorBody>;
export type LogoutError = AxiosError<ApiErrorBody>;

// Re-export so callers (and tests) can trigger a refresh without importing api.
export { refreshAccessToken };

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

async function loginRequest(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', payload);
  return data;
}

/**
 * React Query mutation to sign in.
 *
 * On success it stores the token pair and a minimal user profile in the auth
 * store. We don't get the user id back from /auth/login, so the id is left
 * empty and the email is taken from the submitted form (a later /auth/me call
 * can hydrate the full profile). A 401 surfaces invalid credentials.
 */
export function useLogin(): UseMutationResult<
  LoginResponse,
  LoginError,
  LoginPayload
> {
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation<LoginResponse, LoginError, LoginPayload>({
    mutationFn: loginRequest,
    onSuccess: (data, variables) => {
      setTokens(data.accessToken, data.refreshToken);
      setUser({ id: '', email: variables.email });
    },
  });
}

async function logoutRequest(): Promise<void> {
  await api.post('/auth/logout');
}

/**
 * React Query mutation to sign out.
 *
 * Clears local auth state regardless of the server outcome: even if the
 * logout call fails (e.g. the token is already invalid) the user should end
 * up logged out locally, so tokens are cleared in both success and error.
 */
export function useLogout(): UseMutationResult<void, LogoutError, void> {
  const clearTokens = useAuthStore((s) => s.clearTokens);

  return useMutation<void, LogoutError, void>({
    mutationFn: logoutRequest,
    onSuccess: () => {
      clearTokens();
    },
    onError: () => {
      clearTokens();
    },
  });
}
