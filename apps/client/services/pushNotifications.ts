import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

/**
 * Configure how notifications behave when received while the app is in the
 * foreground. Showing an alert ensures the user sees payment / expiry reminders
 * even when actively using the app.
 *
 * This is a no-op on web, where expo-notifications foreground handling is not
 * supported, so we guard it to avoid runtime errors in that environment.
 */
if (Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: true,
      }),
    });
  } catch {
    // Setting the handler can throw in constrained environments (e.g. tests
    // without the native module). Degrade gracefully — foreground handling is
    // non-critical for token registration.
  }
}

/**
 * Reads the EAS project id from the Expo config when available. getExpoPushTokenAsync
 * requires a projectId in modern Expo/EAS setups; when absent we return undefined
 * and let the caller invoke the API without it.
 */
function getProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  return extra?.eas?.projectId;
}

/**
 * Requests notification permissions and, if granted, obtains the Expo push token
 * for this device.
 *
 * @returns the Expo push token string, or `null` when running on web, when the
 * user denies permission, or when token acquisition fails (e.g. device offline).
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push tokens are not supported on web — degrade gracefully.
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const projectId = getProjectId();
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    return tokenResponse.data ?? null;
  } catch {
    // Network failures, missing credentials, or unavailable native module should
    // not crash the app. The caller treats null as "no token available".
    return null;
  }
}

/**
 * Hook that registers for push notifications on mount and exposes the resulting
 * Expo push token.
 *
 * TODO: Once a backend endpoint for persisting push tokens exists (e.g.
 * `PATCH /users/me/push-token`), POST the returned token so the server can
 * target this device. No such endpoint is defined yet, so for now the token is
 * only held in local state and surfaced to callers.
 *
 * @returns the Expo push token once registered, or `null` while pending / unavailable.
 */
export function usePushRegistration(): string | null {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void registerForPushNotifications().then((result) => {
      if (isMounted && result) {
        setToken(result);
        // TODO: persist `result` to the backend via PATCH /users/me/push-token
        // when that endpoint becomes available.
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return token;
}
