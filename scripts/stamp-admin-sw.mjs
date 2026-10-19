/**
 * Post-build: stamp dist/admin-sw.js with this build's id, and check that only the
 * admin links the manifest / service worker (docs/superpowers/plans/2026-10-19-admin-pwa.md).
 *
 * - The SW names its caches after the id, so each deploy starts with fresh caches and
 *   deletes the previous ones on activate. Vercel's commit SHA when there is one,
 *   else a timestamp (local builds).
 * - The public site must never be installable or SW-controlled: any HTML in dist/ other
 *   than the admin's own two pages that mentions either file fails the build.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = 'dist';
const SW = join(DIST, 'admin-sw.js');
const PLACEHOLDER = '__BUILD_ID__';
const ADMIN_PAGES = new Set([join(DIST, 'admin.html'), join(DIST, 'admin-offline.html')]);

const id = (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 12) || Date.now().toString(36);
const sw = await readFile(SW, 'utf8');
if (!sw.includes(PLACEHOLDER)) {
  throw new Error(`[stamp-admin-sw] ${SW} has no ${PLACEHOLDER} placeholder`);
}
await writeFile(SW, sw.replaceAll(PLACEHOLDER, id));
console.log(`[stamp-admin-sw] ${SW} stamped with build id ${id}.`);

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const leaks = [];
for (const file of await htmlFiles(DIST)) {
  if (ADMIN_PAGES.has(file)) continue;
  const html = await readFile(file, 'utf8');
  if (html.includes('admin.webmanifest') || html.includes('admin-sw.js')) leaks.push(file);
}
if (leaks.length) {
  throw new Error(`[stamp-admin-sw] public pages reference the admin PWA: ${leaks.join(', ')}`);
}
console.log('[stamp-admin-sw] public pages carry no manifest or service worker.');
