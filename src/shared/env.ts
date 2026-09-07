/**
 * Environment access. Only the Supabase URL + anon key are needed in Phase 1, and
 * both are safe to expose to the browser (RLS is the security boundary — ADR-0004).
 * Real values live in `.env.local`, which is git-ignored.
 */

export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

/** Returns the Supabase env, or `null` if it has not been configured yet. */
export function getSupabaseEnv(): SupabaseEnv | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export const isSupabaseConfigured = (): boolean => getSupabaseEnv() !== null;
