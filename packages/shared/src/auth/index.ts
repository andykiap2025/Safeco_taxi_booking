// Authentication + the signed-in profile.
//
// Phone OTP only — CLAUDE.md: "the desk operates on verified phone numbers".
// No email, no OAuth, no social providers.
//
// Platform-agnostic on purpose (react + supabase-js only, no react-native):
// the Admin console also runs on the web.
//
// The shape here is a small external store rather than context, matching the
// pattern already used by useMockState and the driver's online toggle, so
// screens subscribe with the same mental model.

import { useSyncExternalStore } from 'react';
import { getSupabase } from '../supabase';

export type ActorRole = 'customer' | 'driver' | 'dispatcher';

export interface Profile {
  id: string;
  role: ActorRole;
  name: string;
  phone: string;
  ward?: string;
  rating?: number;
  totalRides: number;
  online: boolean;
}

export type AuthStage =
  /** Restoring a persisted session — show nothing yet, not a signed-out screen. */
  | 'loading'
  | 'signedOut'
  /** Verified, but no profiles row yet: first sign-in needs a name (the column
   *  is NOT NULL, and drivers and the Office are shown this name). */
  | 'needsProfile'
  | 'ready';

export interface AuthState {
  stage: AuthStage;
  userId?: string;
  /** E.164 phone from the verified session. */
  phone?: string;
  profile?: Profile;
  /** Set when profile loading failed — distinct from "no profile yet". */
  error?: string;
}

type Listener = () => void;

let state: AuthState = { stage: 'loading' };
const listeners = new Set<Listener>();
let watching = false;

function setState(next: AuthState) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AuthState {
  return state;
}

/** Subscribe to the authenticated session and profile. Call once at startup. */
export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Row -> Profile. The DB is snake_case; the app is camelCase. */
function toProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    role: row.role as ActorRole,
    name: row.name as string,
    phone: row.phone as string,
    ward: (row.ward as string) ?? undefined,
    rating: (row.rating as number) ?? undefined,
    totalRides: (row.total_rides as number) ?? 0,
    online: (row.online as boolean) ?? false,
  };
}

async function loadProfile(userId: string, phone?: string) {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    // A failure here is NOT "no profile" — signing the user out would lose a
    // valid session over a transient network error.
    setState({ stage: 'ready', userId, phone, error: error.message });
    return;
  }
  if (!data) {
    setState({ stage: 'needsProfile', userId, phone });
    return;
  }
  setState({ stage: 'ready', userId, phone, profile: toProfile(data) });
}

/**
 * Begin watching the auth session. Idempotent; call once at app startup after
 * initSupabase. Restores any persisted session, then tracks sign-in/sign-out.
 */
export function startAuthWatch(): void {
  if (watching) return;
  watching = true;
  const supabase = getSupabase();

  void supabase.auth.getSession().then(({ data }) => {
    const session = data.session;
    if (!session?.user) {
      setState({ stage: 'signedOut' });
      return;
    }
    void loadProfile(session.user.id, session.user.phone ?? undefined);
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    if (!session?.user) {
      setState({ stage: 'signedOut' });
      return;
    }
    void loadProfile(session.user.id, session.user.phone ?? undefined);
  });
}

/**
 * Normalise a typed number to E.164, which is what Supabase requires.
 * Accepts "415 220 8841" / "+1 415-220-8841" / "(415) 220 8841".
 */
export function toE164(input: string, defaultCountryCode = '1'): string {
  const digits = input.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  return `+${defaultCountryCode}${digits.replace(/^0+/, '')}`;
}

/** Send the six-digit code. Throws with the provider's message on failure. */
export async function sendPhoneOtp(phone: string): Promise<void> {
  const { error } = await getSupabase().auth.signInWithOtp({ phone: toE164(phone) });
  if (error) throw new Error(error.message);
}

/** Verify the code. On success the auth watcher moves the stage forward. */
export async function verifyPhoneOtp(phone: string, code: string): Promise<void> {
  const { error } = await getSupabase().auth.verifyOtp({
    phone: toE164(phone),
    token: code,
    type: 'sms',
  });
  if (error) throw new Error(error.message);
}

/**
 * Create the profile row for a freshly verified user (stage 'needsProfile').
 * Role is always 'customer': RLS rejects anything else from self-signup, and
 * driver/dispatcher accounts are provisioned by the Office.
 */
export async function createCustomerProfile(name: string): Promise<void> {
  const { userId, phone } = state;
  if (!userId) throw new Error('Not signed in.');

  const { data, error } = await getSupabase()
    .from('profiles')
    .insert({ id: userId, role: 'customer', name: name.trim(), phone: phone ?? '' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  setState({ stage: 'ready', userId, phone, profile: toProfile(data) });
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw new Error(error.message);
  setState({ stage: 'signedOut' });
}
