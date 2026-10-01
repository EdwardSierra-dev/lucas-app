/**
 * Client-side Supabase Realtime subscription for in-app notifications.
 *
 * The backend inserts rows into the `notifications` table (see design.md —
 * Notification System Design). Supabase Realtime fires a `postgres_changes`
 * event on INSERT, which this hook delivers to the current user without
 * polling (Req 5.4 — budget invitations received ≤ 30 s).
 *
 * Usage:
 *   useNotificationSubscription(userId, (row) => {
 *     // bump NotificationBadge count / invalidate the notifications query
 *   });
 *
 * Behaviour:
 *   • `userId === null` → no subscription (user not authenticated).
 *   • Supabase not configured → no-op (keeps tests runnable without creds).
 *   • Re-subscribes when `userId` changes; always removes the channel on
 *     unmount / dependency change.
 */
import { useEffect, useRef } from 'react';
import type {
  RealtimePostgresInsertPayload,
  RealtimeChannel,
} from '@supabase/supabase-js';
import type { NotificationType } from '@lucas/types';
import { getSupabase } from './supabase';

/**
 * A row from the `notifications` table, matching the columns defined in
 * design.md (`notifications` schema).
 */
export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  channel: 'in_app' | 'push' | 'email';
  read: boolean;
  sent_at: string | null;
  created_at: string;
}

/** Callback invoked with the newly inserted notification row. */
export type OnNotificationInsert = (notification: NotificationRow) => void;

/**
 * Subscribes to INSERT events on the `notifications` table for the given
 * `userId`, invoking `onInsert` with each new row. Cleans up the channel on
 * unmount or when `userId` changes. No-ops when `userId` is `null` or Supabase
 * is not configured.
 */
export function useNotificationSubscription(
  userId: string | null,
  onInsert: OnNotificationInsert,
): void {
  // Keep the latest callback in a ref so changing it does not tear down and
  // recreate the subscription on every render.
  const onInsertRef = useRef<OnNotificationInsert>(onInsert);
  onInsertRef.current = onInsert;

  useEffect(() => {
    if (!userId) return;

    const supabase = getSupabase();
    if (!supabase) return;

    const channel: RealtimeChannel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresInsertPayload<NotificationRow>) => {
          onInsertRef.current(payload.new);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);
}
