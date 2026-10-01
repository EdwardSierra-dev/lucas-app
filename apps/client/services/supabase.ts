/**
 * Supabase client singleton for the Lucas app.
 *
 * Credentials are read from Expo public env vars (see design.md — Tech Stack:
 * "In-app notifications → Supabase Realtime channels"). Public env vars are
 * inlined by the Expo bundler at build time, so they are available via
 * `process.env`. We fall back to `expo-constants` `extra` for cases where the
 * values are provided through app config instead.
 *
 * The client is created lazily and cached. When the URL / anon key are not
 * configured (e.g. in a bare test environment) `getSupabase()` returns `null`
 * and `supabase` is `null`, so callers can no-op gracefully instead of
 * throwing at import time. This keeps unit tests runnable without real
 * credentials.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

/** Reads a public config value from `process.env` first, then expo-constants. */
function readEnv(key: string): string | undefined {
  const fromProcess = process.env[key];
  if (fromProcess) return fromProcess;

  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const fromExtra = extra[key];
  return typeof fromExtra === 'string' && fromExtra.length > 0
    ? fromExtra
    : undefined;
}

const SUPABASE_URL = readEnv('EXPO_PUBLIC_SUPABASE_URL');
const SUPABASE_ANON_KEY = readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');

let client: SupabaseClient | null = null;

/**
 * Returns the cached Supabase client, creating it on first use. Returns `null`
 * when the URL / anon key are not configured so callers (e.g. the realtime
 * notification hook) can skip subscribing instead of crashing.
 */
export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      // React Native has no persistent URL session to detect.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return client;
}

/** `true` when the Supabase URL and anon key are configured. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * The Supabase client singleton, or `null` when not configured. Prefer
 * `getSupabase()` in code paths that need lazy initialization; this export is
 * convenient for modules that only read it at call time.
 */
export const supabase: SupabaseClient | null = getSupabase();
