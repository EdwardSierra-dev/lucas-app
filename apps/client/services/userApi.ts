/**
 * User API — React Query hooks for the authenticated user's own profile,
 * backed by the NestJS UsersController:
 *   • useMe            — GET  /users/me  → hydrates id / displayName in authStore
 *   • useUpdateProfile — PATCH /users/me → persists the name + updates authStore
 *
 * Both go through the shared `api` axios instance, so they inherit the bearer
 * token and the silent-refresh-on-401 behaviour from `services/api.ts`.
 */
import {
  useMutation,
  UseMutationResult,
  useQuery,
  UseQueryResult,
} from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { api } from './api';
import { useAuthStore } from '../store/authStore';
import type { ApiErrorBody } from './authApi';

/** Profile shape returned by the server (SafeUser — no password hash). */
export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  currency: string;
  vehicleOwner: boolean;
  emailVerified: boolean;
  onboardingDone: boolean;
}

/** Payload accepted by PATCH /users/me. */
export interface UpdateProfilePayload {
  displayName: string;
}

export type UpdateProfileError = AxiosError<ApiErrorBody>;

async function fetchMe(): Promise<UserProfile> {
  const { data } = await api.get<UserProfile>('/users/me');
  return data;
}

/**
 * Fetch the current user's profile and keep the auth store's `user` in sync.
 *
 * `/auth/login` only returns tokens, so right after sign-in the store holds a
 * placeholder user (`id: ''`, no name). Calling this hydrates the real id and
 * display name used by the dashboard greeting and realtime subscriptions.
 *
 * Pass `enabled` so callers only fetch once authenticated.
 */
export function useMe(enabled = true): UseQueryResult<UserProfile, AxiosError> {
  const setUser = useAuthStore((s) => s.setUser);

  return useQuery<UserProfile, AxiosError>({
    queryKey: ['users', 'me'],
    queryFn: async () => {
      const profile = await fetchMe();
      setUser({
        id: profile.id,
        email: profile.email,
        displayName: profile.displayName,
      });
      return profile;
    },
    enabled,
  });
}

async function updateProfileRequest(
  payload: UpdateProfilePayload,
): Promise<UserProfile> {
  const { data } = await api.patch<UserProfile>('/users/me', payload);
  return data;
}

/**
 * Update the current user's display name.
 *
 * On success it writes the fresh profile back into the auth store so every
 * consumer (dashboard greeting, header) reflects the new name immediately —
 * no refetch or app reload required (single source of truth: authStore).
 */
export function useUpdateProfile(): UseMutationResult<
  UserProfile,
  UpdateProfileError,
  UpdateProfilePayload
> {
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation<UserProfile, UpdateProfileError, UpdateProfilePayload>({
    mutationFn: updateProfileRequest,
    onSuccess: (profile) => {
      setUser({
        id: profile.id,
        email: profile.email,
        displayName: profile.displayName,
      });
    },
  });
}
