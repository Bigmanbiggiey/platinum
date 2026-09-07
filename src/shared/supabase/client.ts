import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from '../env';

/**
 * Lazily-created Supabase browser client. Returns `null` until the project URL + anon
 * key are set (env). Used with the anon key for public reads (RLS-gated) and, once an
 * admin signs in, it carries their session for authenticated CRUD.
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
