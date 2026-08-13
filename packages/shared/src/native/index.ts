// RN-only Supabase bootstrap.
//
// This lives outside the package root deliberately: it imports AsyncStorage
// and react-native, and CLAUDE.md requires the root export stay
// platform-agnostic plain values (the Admin app also targets web).
//
// The caller passes url/anonKey rather than reading process.env here, because
// Expo inlines EXPO_PUBLIC_* at build time and only where the variable is
// STATICALLY referenced as `process.env.EXPO_PUBLIC_NAME` with dot notation.
// Keeping that reference in each app's own entry file is the reliable place
// for it; this module just owns the session/storage configuration.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, type AppStateStatus } from 'react-native';
import { initSupabase, getSupabase } from '../supabase';

export interface NativeSupabaseOptions {
  /** Keep the access token fresh while the app is foregrounded (default true). */
  autoRefreshOnForeground?: boolean;
}

let appStateSub: { remove: () => void } | undefined;

/**
 * Initialise the shared Supabase client for a React Native / Expo app.
 * Call once at startup, before any screen renders.
 *
 * Throws with an actionable message when the environment is not configured —
 * a missing key otherwise surfaces as an opaque 401 at the first query.
 */
export function initSupabaseNative(
  url: string | undefined,
  anonKey: string | undefined,
  options: NativeSupabaseOptions = {},
) {
  if (!url || !anonKey) {
    const missing = [!url && 'EXPO_PUBLIC_SUPABASE_URL', !anonKey && 'EXPO_PUBLIC_SUPABASE_ANON_KEY']
      .filter(Boolean)
      .join(' and ');
    throw new Error(
      `Supabase is not configured: ${missing} missing. Copy .env.example to .env in this app ` +
        `directory, fill in the project URL and anon key, then restart the dev server with ` +
        `\`npx expo start --clear\` (env values are inlined at build time, so a warm reload ` +
        `will not pick them up).`,
    );
  }

  const client = initSupabase({
    url,
    anonKey,
    options: {
      auth: {
        // AsyncStorage rather than SecureStore: a Supabase session (access +
        // refresh token) can exceed the ~2048-byte value ceiling that
        // expo-secure-store documents for iOS.
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        // No URL-based session detection on native — there is no browser
        // redirect carrying the session back.
        detectSessionInUrl: false,
      },
    },
  });

  if (options.autoRefreshOnForeground !== false) {
    appStateSub?.remove();
    // supabase-js only refreshes on a timer while the app is awake; pause it
    // in the background so a suspended app does not wake to a dead timer.
    appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        void getSupabase().auth.startAutoRefresh();
      } else {
        void getSupabase().auth.stopAutoRefresh();
      }
    });
    if (AppState.currentState === 'active') {
      void client.auth.startAutoRefresh();
    }
  }

  return client;
}

/** Tear down the AppState listener (tests / fast refresh hygiene). */
export function disposeSupabaseNative() {
  appStateSub?.remove();
  appStateSub = undefined;
}
