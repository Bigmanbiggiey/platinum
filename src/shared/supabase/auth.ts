import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from './client';

/**
 * Admin authentication (ADR-0007: email + password). Thin wrappers over Supabase
 * Auth so the admin never touches the raw client for auth.
 */

export interface AdminProfile {
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: 'owner' | 'staff';
  is_active: boolean;
}

export async function getSession(): Promise<Session | null> {
  const db = getSupabaseClient();
  if (!db) return null;
  const { data } = await db.auth.getSession();
  return data.session;
}

export function onAuthChange(cb: (session: Session | null) => void): () => void {
  const db = getSupabaseClient();
  if (!db) return () => {};
  const { data } = db.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

export async function signIn(email: string, password: string): Promise<{ error: string | null }> {
  const db = getSupabaseClient();
  if (!db) return { error: 'Auth is not configured.' };
  const { error } = await db.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}

export async function signOut(): Promise<void> {
  await getSupabaseClient()?.auth.signOut();
}

export async function requestPasswordReset(email: string): Promise<{ error: string | null }> {
  const db = getSupabaseClient();
  if (!db) return { error: 'Auth is not configured.' };
  const redirectTo = `${window.location.origin}/admin/reset`;
  const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo });
  return { error: error?.message ?? null };
}

export async function updatePassword(password: string): Promise<{ error: string | null }> {
  const db = getSupabaseClient();
  if (!db) return { error: 'Auth is not configured.' };
  const { error } = await db.auth.updateUser({ password });
  return { error: error?.message ?? null };
}

export type InviteLinkType = 'invite' | 'recovery';

/**
 * Consumes a one-time invite/recovery token (from /admin/accept-invite) and signs the
 * person in. Called only when they submit the password form — never on page open, so
 * link previews in WhatsApp / email can't use the token up.
 */
export async function verifyInviteToken(
  tokenHash: string,
  type: InviteLinkType,
): Promise<{ error: string | null }> {
  const db = getSupabaseClient();
  if (!db) return { error: 'Auth is not configured.' };
  const { error } = await db.auth.verifyOtp({ type, token_hash: tokenHash });
  return { error: error?.message ?? null };
}

/**
 * Loads the signed-in user's admin profile (role, etc.). Null if they have none.
 *
 * Must filter by user id: RLS lets an owner read EVERY profile, so an unfiltered
 * `.maybeSingle()` errors as soon as a second account exists — which locked the owner
 * out ("doesn't have admin access").
 */
export async function getProfile(userId: string): Promise<AdminProfile | null> {
  const db = getSupabaseClient();
  if (!db) return null;
  const { data, error } = await db
    .from('profile')
    .select('user_id, email, display_name, role, is_active')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as AdminProfile;
}
