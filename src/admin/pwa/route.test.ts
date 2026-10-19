import { readFileSync } from 'node:fs';
import { route, type SwRoute } from './route';

const ORIGIN = 'https://platinum-point.vercel.app';
const CASES: [url: string, method: string, mode: string, expected: SwRoute][] = [
  [`${ORIGIN}/admin`, 'GET', 'navigate', 'page'],
  [`${ORIGIN}/admin/jobs/42`, 'GET', 'navigate', 'page'],
  [`${ORIGIN}/admin?x=1`, 'GET', 'navigate', 'page'],
  [`${ORIGIN}/`, 'GET', 'navigate', 'skip'],
  [`${ORIGIN}/services`, 'GET', 'navigate', 'skip'],
  [`${ORIGIN}/administrator`, 'GET', 'navigate', 'skip'],
  [`${ORIGIN}/assets/admin-abc123.js`, 'GET', 'no-cors', 'asset'],
  [`${ORIGIN}/assets/index-abc123.css`, 'GET', 'cors', 'asset'],
  [`${ORIGIN}/admin.webmanifest`, 'GET', 'cors', 'skip'],
  [`${ORIGIN}/assets/admin-abc123.js`, 'POST', 'cors', 'skip'],
  ['https://abc.supabase.co/rest/v1/job?select=*', 'GET', 'cors', 'skip'],
  ['https://abc.supabase.co/auth/v1/token', 'POST', 'cors', 'skip'],
  ['https://abc.supabase.co/storage/v1/object/public/media/a.jpg', 'GET', 'no-cors', 'skip'],
];

/** The copy inside public/admin-sw.js, evaluated as-is. */
function swRoute(): typeof route {
  const src = readFileSync('public/admin-sw.js', 'utf8');
  const fn = src.match(/function route\([\s\S]*?\n\}/)?.[0];
  if (!fn) throw new Error('route() not found in public/admin-sw.js');
  return new Function(`${fn}; return route;`)() as typeof route;
}

describe('admin service worker routing', () => {
  it.each(CASES)('%s %s (%s) → %s', (url, method, mode, expected) => {
    expect(route(new URL(url), ORIGIN, method, mode)).toBe(expected);
  });

  it('public/admin-sw.js routes exactly like src/admin/pwa/route.ts', () => {
    const sw = swRoute();
    for (const [url, method, mode, expected] of CASES) {
      expect(sw(new URL(url), ORIGIN, method, mode)).toBe(expected);
    }
  });
});
