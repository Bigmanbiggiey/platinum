/**
 * Post-build: generate dist/sitemap.xml from the prerendered HTML files.
 *
 * Includes every prerendered public page except 404. The admin is never prerendered
 * (main.tsx `includedRoutes`), so it can't leak in here.
 *
 * Origin comes from VITE_SITE_ORIGIN (placeholder until the domain is chosen — §14.2 Q13).
 */
import { readdir, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const DIST = 'dist';
const ORIGIN = (process.env.VITE_SITE_ORIGIN ?? 'https://platinumpoint.co.ke').replace(/\/$/, '');

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
const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  routes.map((r) => `  <url><loc>${ORIGIN}${r}</loc><lastmod>${today}</lastmod></url>`).join('\n') +
  `\n</urlset>\n`;

await writeFile(join(DIST, 'sitemap.xml'), xml);
console.log(`[gen-sitemap] ${routes.length} urls -> dist/sitemap.xml (origin ${ORIGIN})`);
