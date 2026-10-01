/**
 * Auth store (Zustand) — holds JWT access/refresh tokens and the current user
 * profile for the Auth_Service flows (Requirement 1).
 *
 * Design reference: design.md "Frontend State Management" — Zustand owns the
 * global auth state (tokens + user) while React Query owns server state. The
 * Axios interceptors in `services/api.ts` read `accessToken` from here and,
 * on a 401, call back into this store to refresh or clear tokens.
 *
 * Persistence: tokens survive app restarts via `zustand/middleware` persist.
 * On Expo/React Native the natural backing store is AsyncStorage, but we must
 * not hard-fail (type-check or runtime) when the native module isn't present
 * (e.g. plain Jest/Node). We therefore resolve a `StateStorage` adapter at
 * module load: AsyncStorage when available, otherwise an in-memory fallback.
 */
import { create } from 'zustand';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';

/** Minimal user profile kept client-side (email is sourced from the login form). */
export interface AuthUser {
  id: string;
  email: string;
  /**
   * Optional display name. Unknown right after login (/auth/login returns only
   * tokens) until hydrated from GET /users/me, and may be null if the user has
   * never set one. Used to personalize the dashboard greeting.
   */
  displayName?: string | null;
}

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  user: AuthUser | null;
  /** Store a fresh token pair (called after login / register). */
  setTokens: (accessToken: string, refreshToken: string) => void;
  /** Replace only the access token (called after a silent refresh). */
  setAccessToken: (accessToken: string) => void;
  /** Attach / update the current user profile. */
  setUser: (user: AuthUser | null) => void;
  /** Wipe all auth state (logout, or refresh failure). */
  clearTokens: () => void;
}

/**
 * In-memory `StateStorage` used when a persistent native store is unavailable.
 * Keeps the persist middleware happy without crashing in Node/Jest.
 */
function createMemoryStorage(): StateStorage {
  const map = new Map<string, string>();
  return {
    getItem: (name) => (map.has(name) ? (map.get(name) as string) : null),
    setItem: (name, value) => {
      map.set(name, value);
    },
    removeItem: (name) => {
      map.delete(name);
    },
  };
}

/**
 * Resolve the backing storage. We `require` AsyncStorage dynamically and guard
 * it so TypeScript (strict) and the Jest/Node runtime never fail when the
 * `@react-native-async-storage/async-storage` native module/types are absent.
 */
function resolveStorage(): StateStorage {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-async-storage/async-storage') as {
      default?: StateStorage;
    };
    const asyncStorage = mod?.default;
    if (
      asyncStorage &&
      typeof asyncStorage.getItem === 'function' &&
      typeof asyncStorage.setItem === 'function' &&
      typeof asyncStorage.removeItem === 'function'
    ) {
      return asyncStorage;
    }
  } catch {
    // AsyncStorage not installed / not available — fall through to memory.
  }
  return createMemoryStorage();
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      user: null,

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, isAuthenticated: true }),

      setAccessToken: (accessToken) => set({ accessToken }),

      setUser: (user) => set({ user }),

      clearTokens: () =>
        set({
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          user: null,
        }),
    }),
    {
      name: 'lucas-auth',
      storage: createJSONStorage(resolveStorage),
      // Only persist the fields worth surviving a restart; `isAuthenticated`
      // is derived from the presence of tokens on rehydrate.
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = Boolean(state.accessToken);
        }
      },
    },
  ),
);
