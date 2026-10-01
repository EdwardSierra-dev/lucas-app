import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

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

// Helper to (re)import the module after mutating Platform.OS, since the module
// reads Platform.OS at call-time inside registerForPushNotifications.
function loadModule() {
  let mod: typeof import('../pushNotifications');
  jest.isolateModules(() => {
    mod = require('../pushNotifications');
  });
  // @ts-expect-error assigned within isolateModules callback
  return mod;
}

describe('registerForPushNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
  });

  it('returns null on web without touching the notifications API', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    const { registerForPushNotifications } = loadModule();

    const result = await registerForPushNotifications();

    expect(result).toBeNull();
    expect(mockedNotifications.getPermissionsAsync).not.toHaveBeenCalled();
  });

  it('returns null when permission is denied', async () => {
    mockedNotifications.getPermissionsAsync.mockResolvedValue({
      status: 'denied',
    } as never);
    mockedNotifications.requestPermissionsAsync.mockResolvedValue({
      status: 'denied',
    } as never);
    const { registerForPushNotifications } = loadModule();

    const result = await registerForPushNotifications();

    expect(result).toBeNull();
    expect(mockedNotifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('returns the Expo push token when permission is granted', async () => {
    mockedNotifications.getPermissionsAsync.mockResolvedValue({
      status: 'granted',
    } as never);
    mockedNotifications.getExpoPushTokenAsync.mockResolvedValue({
      data: 'ExponentPushToken[abc123]',
      type: 'expo',
    } as never);
    const { registerForPushNotifications } = loadModule();

    const result = await registerForPushNotifications();

    expect(result).toBe('ExponentPushToken[abc123]');
    expect(mockedNotifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
      projectId: 'test-project-id',
    });
  });

  it('requests permission when not already granted, then returns the token', async () => {
    mockedNotifications.getPermissionsAsync.mockResolvedValue({
      status: 'undetermined',
    } as never);
    mockedNotifications.requestPermissionsAsync.mockResolvedValue({
      status: 'granted',
    } as never);
    mockedNotifications.getExpoPushTokenAsync.mockResolvedValue({
      data: 'ExponentPushToken[xyz]',
      type: 'expo',
    } as never);
    const { registerForPushNotifications } = loadModule();

    const result = await registerForPushNotifications();

    expect(mockedNotifications.requestPermissionsAsync).toHaveBeenCalled();
    expect(result).toBe('ExponentPushToken[xyz]');
  });

  it('returns null when token acquisition throws', async () => {
    mockedNotifications.getPermissionsAsync.mockResolvedValue({
      status: 'granted',
    } as never);
    mockedNotifications.getExpoPushTokenAsync.mockRejectedValue(new Error('offline'));
    const { registerForPushNotifications } = loadModule();

    const result = await registerForPushNotifications();

    expect(result).toBeNull();
  });
});
