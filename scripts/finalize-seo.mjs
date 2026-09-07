/**
 * Post-build: emit dist/sitemap.xml and dist/robots.txt from the prerendered HTML.
 *
 * - Origin comes from VITE_SITE_ORIGIN (set per environment on the host).
 * - When VITE_SITE_NOINDEX is set (staging / not-yet-public), robots.txt becomes a
 *   blanket `Disallow: /` and the sitemap line is omitted. The static
 *   public/robots.txt is a dev-only fallback; this file is authoritative for builds.
 * - The admin is never prerendered (main.tsx `includedRoutes`), so it can't appear
 *   in the sitemap; it is also Disallowed in robots for good measure.
 */
import { readdir, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const DIST = 'dist';
const ORIGIN = (process.env.VITE_SITE_ORIGIN ?? 'https://platinumpoint.co.ke').replace(/\/$/, '');
const NOINDEX = Boolean(process.env.VITE_SITE_NOINDEX);

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function toRoute(file) {
  const rel = relative(DIST, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel === '404.html') return null;
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'/index.html'.length)}`;
  return `/${rel.slice(0, -'.html'.length)}`;
}

const routes = (await htmlFiles(DIST))
  .map(toRoute)
  .filter((r) => r !== null)
  .sort();
const today = new Date().toISOString().slice(0, 10);

const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  routes.map((r) => `  <url><loc>${ORIGIN}${r}</loc><lastmod>${today}</lastmod></url>`).join('\n') +
  `\n</urlset>\n`;
await writeFile(join(DIST, 'sitemap.xml'), sitemap);

const robots = NOINDEX
  ? `# Staging build (VITE_SITE_NOINDEX) — not for indexing\nUser-agent: *\nDisallow: /\n`
  : `# Platinum Point Automotive Engineering\nUser-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${ORIGIN}/sitemap.xml\n`;
await writeFile(join(DIST, 'robots.txt'), robots);

console.log(
  `[finalize-seo] ${routes.length} urls -> sitemap.xml; robots.txt = ${NOINDEX ? 'DISALLOW ALL (staging)' : 'public'} (origin ${ORIGIN})`,
);
