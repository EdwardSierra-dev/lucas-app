/**
 * Unit tests for the Supabase Realtime in-app notification hook.
 *
 * The Supabase client is mocked so the test asserts on the subscription wiring
 * (channel / on / subscribe / removeChannel) rather than hitting a real
 * backend. Verifies:
 *   • with a userId it subscribes to INSERT events on `notifications` with the
 *     correct `user_id=eq.<id>` filter and forwards the new row to onInsert;
 *   • it removes the channel on unmount;
 *   • with a null userId it does not subscribe.
 *
 * Validates: Requirements 5.4
 */
import { renderHook } from '@testing-library/react-native';

import {
  useNotificationSubscription,
  type NotificationRow,
} from '../realtimeNotifications';
import { getSupabase } from '../supabase';

jest.mock('../supabase');

const mockedGetSupabase = getSupabase as jest.MockedFunction<
  typeof getSupabase
>;

type InsertHandler = (payload: { new: NotificationRow }) => void;

interface MockChannel {
  on: jest.Mock;
  subscribe: jest.Mock;
}

/** Builds a mock Supabase client capturing the registered INSERT handler. */
function buildMockClient(): {
  client: { channel: jest.Mock; removeChannel: jest.Mock };
  channel: MockChannel;
  getHandler: () => InsertHandler;
} {
  let handler: InsertHandler | undefined;

  const channel: MockChannel = {
    on: jest.fn((_event: string, _filter: unknown, cb: InsertHandler) => {
      handler = cb;
      return channel; // chainable
    }),
    subscribe: jest.fn(() => channel),
  };

  const client = {
    channel: jest.fn(() => channel),
    removeChannel: jest.fn(() => Promise.resolve('ok')),
  };

  return {
    client,
    channel,
    getHandler: () => {
      if (!handler) throw new Error('INSERT handler was never registered');
      return handler;
    },
  };
}

const sampleRow: NotificationRow = {
  id: 'notif-1',
  user_id: 'user-123',
  type: 'budget_invitation',
  payload: { budgetId: 'b-1', inviterName: 'Ana', invitationId: 'inv-1' },
  channel: 'in_app',
  read: false,
  sent_at: null,
  created_at: '2024-01-01T00:00:00.000Z',
};

afterEach(() => {
  jest.clearAllMocks();
});

describe('useNotificationSubscription', () => {
  it('subscribes to INSERT events with the correct user filter', () => {
    const mock = buildMockClient();
    mockedGetSupabase.mockReturnValue(
      mock.client as unknown as ReturnType<typeof getSupabase>,
    );
    const onInsert = jest.fn();

    renderHook(() => useNotificationSubscription('user-123', onInsert));

    expect(mock.client.channel).toHaveBeenCalledWith('notifications:user-123');
    expect(mock.channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: 'user_id=eq.user-123',
      },
      expect.any(Function),
    );
    expect(mock.channel.subscribe).toHaveBeenCalledTimes(1);
  });

  it('forwards the inserted row to the onInsert callback', () => {
    const mock = buildMockClient();
    mockedGetSupabase.mockReturnValue(
      mock.client as unknown as ReturnType<typeof getSupabase>,
    );
    const onInsert = jest.fn();

    renderHook(() => useNotificationSubscription('user-123', onInsert));

    // Simulate Supabase firing the postgres_changes INSERT event.
    mock.getHandler()({ new: sampleRow });

    expect(onInsert).toHaveBeenCalledTimes(1);
    expect(onInsert).toHaveBeenCalledWith(sampleRow);
  });

  it('removes the channel on unmount', () => {
    const mock = buildMockClient();
    mockedGetSupabase.mockReturnValue(
      mock.client as unknown as ReturnType<typeof getSupabase>,
    );

    const { unmount } = renderHook(() =>
      useNotificationSubscription('user-123', jest.fn()),
    );

    expect(mock.client.removeChannel).not.toHaveBeenCalled();

    unmount();

    expect(mock.client.removeChannel).toHaveBeenCalledTimes(1);
    expect(mock.client.removeChannel).toHaveBeenCalledWith(mock.channel);
  });

  it('does not subscribe when userId is null', () => {
    const mock = buildMockClient();
    mockedGetSupabase.mockReturnValue(
      mock.client as unknown as ReturnType<typeof getSupabase>,
    );

    renderHook(() => useNotificationSubscription(null, jest.fn()));

    expect(mock.client.channel).not.toHaveBeenCalled();
  });

  it('no-ops when Supabase is not configured', () => {
    mockedGetSupabase.mockReturnValue(null);
    const onInsert = jest.fn();

    // Should not throw even with a valid userId.
    expect(() =>
      renderHook(() => useNotificationSubscription('user-123', onInsert)),
    ).not.toThrow();
    expect(onInsert).not.toHaveBeenCalled();
  });
});
