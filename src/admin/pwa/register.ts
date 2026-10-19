/**
 * Register the admin service worker (public/admin-sw.js), scoped to /admin so it can
 * never control a public page. Production only: in `vite` dev a SW would cache
 * unhashed modules and fight HMR. Failures are logged, never thrown — the admin works
 * the same without it.
 */
export function registerAdminServiceWorker(
  isProd: boolean = import.meta.env.PROD,
  nav: Navigator = navigator,
): void {
  if (!isProd || !('serviceWorker' in nav)) return;
  const register = () =>
    nav.serviceWorker
      .register('/admin-sw.js', { scope: '/admin' })
      .catch((err: unknown) => console.warn('[admin-sw] registration failed', err));
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
