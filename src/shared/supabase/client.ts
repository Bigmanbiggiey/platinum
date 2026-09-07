import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from '../env';

/**
 * Lazily-created Supabase browser client (anon key). Returns `null` until the
 * project URL + anon key are set in `.env.local`.
 *
 * Phase 1 has NO schema — this exists only so the connection can be verified with a
 * throwaway read. Business data access arrives with the schema + RLS in Phase 2.
 */
let cached: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (cached) return cached;
  const env = getSupabaseEnv();
  if (!env) return null;
  cached = createClient(env.url, env.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return cached;
}

/**
 * Throwaway connectivity check for Phase 1. Hits the PostgREST root, which responds
 * without any tables existing. Returns a small status object for the UI.
 */
export async function checkSupabaseConnection(): Promise<
  { ok: true } | { ok: false; reason: string }
> {
  const env = getSupabaseEnv();
  if (!env) return { ok: false, reason: 'not-configured' };
  try {
    const res = await fetch(`${env.url}/rest/v1/`, {
      headers: { apikey: env.anonKey, Authorization: `Bearer ${env.anonKey}` },
    });
    return res.ok ? { ok: true } : { ok: false, reason: `http-${res.status}` };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'network-error' };
  }
}
