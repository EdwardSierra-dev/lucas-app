/**
 * Shared Axios instance for the Lucas API.
 *
 * Base URL points at the NestJS backend `/api/v1` prefix (see design.md —
 * API Endpoints). The base URL is read from an Expo public env var so it can
 * be overridden per environment; it falls back to localhost for development.
 *
 * Interceptors (design.md — Authentication Errors):
 *   • Request: attaches `Authorization: Bearer <accessToken>` from the auth
 *     store when a token is present.
 *   • Response: on a 401 it attempts a single silent refresh via the stored
 *     refresh token, then retries the original request once. If the refresh
 *     fails (or there is no refresh token) the auth store is cleared so the
 *     app can redirect to login.
 *
 * The refresh request uses a bare axios call (not this instance) so it can
 * never recurse through these interceptors — that keeps a failing refresh
 * from triggering another refresh.
 */
import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '../store/authStore';

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
});

/** Shape returned by POST /auth/refresh. */
interface RefreshResponse {
  accessToken: string;
}

/**
 * Exchange the stored refresh token for a fresh access token and persist it in
 * the auth store. Uses a bare axios instance so it bypasses the interceptors
 * below (no recursion). Returns the new access token, or `null` when there is
 * no refresh token / the refresh fails — callers treat `null` as "logged out".
 */
export async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setAccessToken, clearTokens } =
    useAuthStore.getState();

  if (!refreshToken) {
    clearTokens();
    return null;
  }

  try {
    const { data } = await axios.post<RefreshResponse>(
      `${BASE_URL}/auth/refresh`,
      { refreshToken },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15_000 },
    );
    setAccessToken(data.accessToken);
    return data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

// --- Request interceptor: attach bearer token ------------------------------
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return config;
});

// --- Response interceptor: silent refresh on 401 --------------------------
/** Original request config annotated with our one-shot retry flag. */
interface RetryableConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryableConfig | undefined;
    const status = error.response?.status;

    // Only handle 401s, and only once per request. Never retry the refresh
    // endpoint itself (guards against an infinite refresh loop).
    const isRefreshCall = original?.url?.includes('/auth/refresh') ?? false;

    if (status === 401 && original && !original._retry && !isRefreshCall) {
      original._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers = {
          ...(original.headers ?? {}),
          Authorization: `Bearer ${newToken}`,
        };
        return api(original);
      }
    }

    return Promise.reject(error);
  },
);
