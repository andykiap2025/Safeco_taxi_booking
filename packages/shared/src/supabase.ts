// Platform-agnostic Supabase client. Apps initialise it once at startup with
// their own storage/auth options (RN passes AsyncStorage; web uses defaults) —
// this module must not import anything React Native.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseInit {
  url: string;
  anonKey: string;
  options?: Parameters<typeof createClient>[2];
}

let client: SupabaseClient | undefined;

export function initSupabase({ url, anonKey, options }: SupabaseInit): SupabaseClient {
  client = createClient(url, anonKey, options);
  return client;
}

export function getSupabase(): SupabaseClient {
  if (!client) {
    throw new Error('Supabase not initialised — call initSupabase() at app startup.');
  }
  return client;
}
