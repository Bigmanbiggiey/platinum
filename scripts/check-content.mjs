/**
 * Post-build guard: fail the build if Supabase is configured but the prerendered
 * pages came out empty.
 *
 * Content queries degrade to empty values on error (src/shared/content/queries.ts),
 * so a build that cannot reach Supabase still succeeds — and would replace the live
 * site with one that has no services, copy or settings. Failing here keeps the last
 * good deployment live instead.
 *
 * - "Configured" = the built client bundle contains a Supabase project URL. Builds
 *   without Supabase env (CI, fresh clones) are skipped, so they stay green.
 * - Checks the data each page was prerendered with (`__staticRouterHydrationData`):
 *   /services must have at least one service, and the home page must have site
 *   settings.
 * - Set SKIP_CONTENT_CHECK=1 to bypass deliberately (e.g. a genuinely empty DB).
 */
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = 'dist';

if (process.env.SKIP_CONTENT_CHECK) {
  console.log('[check-content] skipped (SKIP_CONTENT_CHECK is set).');
  process.exit(0);
}

async function bundleHasSupabase() {
  const dir = join(DIST, 'assets');
  for (const name of await readdir(dir)) {
    if (!name.endsWith('.js')) continue;
    if (/https:\/\/[a-z0-9]+\.supabase\.co/.test(await readFile(join(dir, name), 'utf8'))) {
      return true;
    }
  }
  return false;
}

/** The route loader data a prerendered page was built with, merged across routes. */
async function loaderData(file) {
  const html = await readFile(join(DIST, file), 'utf8');
  const m = html.match(/__staticRouterHydrationData = JSON\.parse\(("(?:[^"\\]|\\.)*")\)/);
  if (!m) throw new Error(`${file}: no prerendered loader data found`);
  const { loaderData: byRoute } = JSON.parse(JSON.parse(m[1]));
  return Object.assign({}, ...Object.values(byRoute ?? {}).filter(Boolean));
}

if (!(await bundleHasSupabase())) {
  console.log('[check-content] Supabase not configured for this build — skipped.');
  process.exit(0);
}

const problems = [];
const services = (await loaderData('services.html')).services;
if (!Array.isArray(services) || services.length === 0) {
  problems.push('/services was built with no services');
}
const home = await loaderData('index.html');
if (!home.settings) problems.push('the home page was built with no site settings');

if (problems.length) {
  console.error(
    `[check-content] FAILED: ${problems.join('; ')}.\n` +
      'Supabase is configured, so the content queries most likely failed during the build ' +
      '(look for "[content] query failed" above). Failing so the current live site stays up.\n' +
      'If the database really is empty, rebuild with SKIP_CONTENT_CHECK=1.',
  );
  process.exit(1);
}
console.log(`[check-content] OK — ${services.length} services, site settings present.`);
