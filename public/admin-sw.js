/**
 * Admin service worker — scope /admin only (docs/superpowers/plans/2026-10-19-admin-pwa.md).
 *
 * - Admin page loads: network-first; offline → last cached admin page → offline page.
 * - /assets/* (content-hashed, immutable): cache-first.
 * - Everything else — Supabase, any non-GET, public pages — is never touched.
 *
 * __BUILD_ID__ is replaced at build time (scripts/stamp-admin-sw.mjs), so every deploy
 * gets fresh caches and the old ones are deleted on activate.
 *
 * Kill switch: replace this file with one whose activate handler deletes every
 * `pms-admin-*` cache and calls self.registration.unregister() (docs/decisions.md).
 */
const VERSION = '__BUILD_ID__';
const PREFIX = 'pms-admin-';
const ASSETS = `${PREFIX}assets-${VERSION}`;
const PAGES = `${PREFIX}pages-${VERSION}`;
// Extensionless: vercel.json `cleanUrls` redirects *.html, and a redirected response
// can't answer a navigation.
const OFFLINE = '/admin-offline';

/** Keep identical to src/admin/pwa/route.ts. */
function route(url, origin, method, mode) {
  if (method !== 'GET' || url.origin !== origin) return 'skip';
  if (mode === 'navigate') {
    return url.pathname === '/admin' || url.pathname.startsWith('/admin/') ? 'page' : 'skip';
  }
  if (url.pathname.startsWith('/assets/')) return 'asset';
  return 'skip';
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => cache.add(OFFLINE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith(PREFIX) && k !== ASSETS && k !== PAGES)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function page(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    // Every admin URL serves the same admin.html, so one cached copy covers them all.
    if (response.ok) await cache.put('/admin', response.clone());
    return response;
  } catch {
    return (await cache.match('/admin')) ?? (await cache.match(OFFLINE)) ?? Response.error();
  }
}

async function asset(request) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const kind = route(new URL(request.url), self.location.origin, request.method, request.mode);
  if (kind === 'page') event.respondWith(page(request));
  else if (kind === 'asset') event.respondWith(asset(request));
});
