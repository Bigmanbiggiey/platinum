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
  // Session persistence only makes sense in the browser; during the SSG prerender
  // (Node, no localStorage) it must be off.
  const inBrowser = typeof window !== 'undefined';
  cached = createClient(env.url, env.anonKey, {
    auth: {
      persistSession: inBrowser,
      autoRefreshToken: inBrowser,
      detectSessionInUrl: inBrowser,
    },
  });
  return cached;
}

/**
 * Throwaway connectivity check for Phase 1. Probes the GoTrue health endpoint, which
 * confirms the project URL is correct and the project is reachable without needing
 * any tables (the PostgREST root `/rest/v1/` is service-role-only on current Supabase,
 * so it is not usable here). Once the schema + a public table exist (Phase 2), a real
 * `select` is the stronger check.
 */
export async function checkSupabaseConnection(): Promise<
  { ok: true } | { ok: false; reason: string }
> {
  const env = getSupabaseEnv();
  if (!env) return { ok: false, reason: 'not-configured' };
  try {
    const res = await fetch(`${env.url}/auth/v1/health`, {
      headers: { apikey: env.anonKey },
    });
    return res.ok ? { ok: true } : { ok: false, reason: `http-${res.status}` };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'network-error' };
  }
}
