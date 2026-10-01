/**
 * Unit tests for the auth store (Requirement 1 — auth client state).
 *
 * Verifies the core token lifecycle: setTokens flips the store into an
 * authenticated state, and clearTokens resets everything back to signed-out.
 */
import { useAuthStore } from '../authStore';

describe('authStore', () => {
  beforeEach(() => {
    // Start each test from a known, signed-out baseline.
    useAuthStore.getState().clearTokens();
  });

  it('setTokens stores tokens and marks the user authenticated', () => {
    useAuthStore.getState().setTokens('access-123', 'refresh-456');

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('access-123');
    expect(state.refreshToken).toBe('refresh-456');
    expect(state.isAuthenticated).toBe(true);
  });

  it('clearTokens resets tokens and authentication flag', () => {
    useAuthStore.getState().setTokens('access-123', 'refresh-456');
    useAuthStore.getState().setUser({ id: 'u1', email: 'a@b.com' });

    useAuthStore.getState().clearTokens();

    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });
});
