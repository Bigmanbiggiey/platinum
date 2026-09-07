import { Head } from 'vite-react-ssg';
import { AdminApp } from './AdminApp';

/**
 * Entry for the `/admin/*` route (routes.tsx) — a separate lazy chunk, excluded from
 * the static prerender (main.tsx `includedRoutes`) and always `noindex`.
 *
 * NOTE: served from `index.html` (see vercel.json rewrite), so a hard load of `/admin`
 * hydrates the home markup then swaps to the admin — a benign hydration warning in
 * dev. A dedicated admin entry is a later cleanup (docs/phase-2-remaining.md).
 */
export function Component() {
  return (
    <>
      <Head>
        <meta name="robots" content="noindex,nofollow" />
        <title>Admin — Platinum Point Automotive Engineering</title>
      </Head>
      <AdminApp />
    </>
  );
}

export default Component;
