/**
 * Unit tests for the `usePushRegistration` hook (push notification frontend
 * integration — Task 19.3).
 *
 * These complement the function-level tests in `pushNotifications.test.ts`
 * (which cover `registerForPushNotifications` directly). Here we exercise the
 * React hook that drives startup token registration:
 *   • returns null initially, then the Expo push token once the async
 *     registration resolves (push token registration on startup — Req 5.12);
 *   • stays null on web, where push tokens are unsupported.
 *
 * expo-notifications / expo-constants are mocked so no native module is needed.
 * The module is imported once at the top level (NOT via isolateModules) so the
 * hook shares the single React instance — rendering a hook from a second,
 * isolated module copy would trip React's "invalid hook call" guard. Platform
 * branching still works because the module reads `Platform.OS` at call time.
 *
 * Validates: Requirements 5.12
 */
import { Platform } from 'react-native';
import { renderHook, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

import { usePushRegistration } from '../pushNotifications';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: 'test-project-id' } } } },
}));

const mockedNotifications = Notifications as jest.Mocked<typeof Notifications>;

function setPlatform(os: 'android' | 'web'): void {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

describe('usePushRegistration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPlatform('android');
  });

  it('returns null initially, then the Expo push token after registration resolves', async () => {
    mockedNotifications.getPermissionsAsync.mockResolvedValue({
      status: 'granted',
    } as never);
    mockedNotifications.getExpoPushTokenAsync.mockResolvedValue({
      data: 'ExponentPushToken[hook123]',
      type: 'expo',
    } as never);

    const { result } = renderHook(() => usePushRegistration());

    // Synchronously after mount the async effect has not resolved yet.
    expect(result.current).toBeNull();

    // Once registration resolves, the hook surfaces the token.
    await waitFor(() => {
      expect(result.current).toBe('ExponentPushToken[hook123]');
    });

    expect(mockedNotifications.getExpoPushTokenAsync).toHaveBeenCalled();
  });

  it('stays null on web where push tokens are unsupported', async () => {
    setPlatform('web');

    const { result } = renderHook(() => usePushRegistration());

    expect(result.current).toBeNull();

    // Give any pending microtasks a chance to run; it must remain null and
    // never touch the notifications API on web.
    await waitFor(() => {
      expect(mockedNotifications.getPermissionsAsync).not.toHaveBeenCalled();
    });
    expect(result.current).toBeNull();
  });

  it('stays null when permission is denied', async () => {
    mockedNotifications.getPermissionsAsync.mockResolvedValue({
      status: 'denied',
    } as never);
    mockedNotifications.requestPermissionsAsync.mockResolvedValue({
      status: 'denied',
    } as never);

    const { result } = renderHook(() => usePushRegistration());

    await waitFor(() => {
      expect(mockedNotifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    expect(result.current).toBeNull();
    expect(mockedNotifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });
});
