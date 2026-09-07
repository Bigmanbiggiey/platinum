/**
 * Post-build: remove `<link rel="modulepreload" ... admin-*.js>` hints that
 * vite-react-ssg injects into the prerendered PUBLIC html.
 *
 * The admin is a deliberate, lazily-loaded, noindex chunk (ADR-0010). Public
 * visitors — often on mobile data (risk R-10) — should never prefetch it. The admin
 * route still works: its chunk loads on demand when `/admin` is visited.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = 'dist';
const PRELOAD_RE = /\s*<link\b[^>]*rel="modulepreload"[^>]*\/assets\/admin-[^">]*"[^>]*>/g;

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

let changed = 0;
for (const file of await htmlFiles(DIST)) {
  const html = await readFile(file, 'utf8');
  const next = html.replace(PRELOAD_RE, '');
  if (next !== html) {
    await writeFile(file, next);
    changed += 1;
    console.log(`[strip-admin-preload] cleaned ${file}`);
  }
}
console.log(`[strip-admin-preload] done (${changed} file${changed === 1 ? '' : 's'})`);
