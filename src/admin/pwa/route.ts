/**
 * How the admin service worker treats a request. Mirrors `route()` in
 * public/admin-sw.js — keep the two identical (route.test.ts compares them).
 *
 * - 'skip'  → not handled; the browser fetches as normal (Supabase, POSTs, public pages).
 * - 'page'  → admin page load: network-first, cached copy, then the offline page.
 * - 'asset' → hashed build file: cache-first.
 */
export type SwRoute = 'skip' | 'page' | 'asset';

export function route(url: URL, origin: string, method: string, mode: string): SwRoute {
  if (method !== 'GET' || url.origin !== origin) return 'skip';
  if (mode === 'navigate') {
    return url.pathname === '/admin' || url.pathname.startsWith('/admin/') ? 'page' : 'skip';
  }
  if (url.pathname.startsWith('/assets/')) return 'asset';
  return 'skip';
}
