// Platinum Motor Services — publish → rebuild trigger (Phase 3 WP10, ADR-0003).
//
// Admin calls this after publishing content; it POSTs the Vercel Deploy Hook so the
// SSG site regenerates. The hook URL is a server-side secret, never in the client.
//
// Secrets: SUPABASE_URL / SUPABASE_ANON_KEY (injected), VERCEL_DEPLOY_HOOK_URL (set
//   later: `npx supabase secrets set VERCEL_DEPLOY_HOOK_URL=https://api.vercel.com/v1/integrations/deploy/...`)

import { getCaller } from '../_shared/caller.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ ok: false, error: 'method-not-allowed' }, 405);

  // Any active team member may trigger a rebuild. A rebuild only regenerates what the
  // database already exposes publicly; publishing itself stays owner-only in the DB
  // (RBAC spec §3). Staff need this so a consent withdrawal reaches the live site.
  const me = await getCaller(req);
  if (!me?.isActive) return json({ ok: false, error: 'forbidden' }, 403);

  // Tolerate a secret pasted with the docs placeholder brackets, quotes or spaces.
  const hook = (Deno.env.get('VERCEL_DEPLOY_HOOK_URL') ?? '').trim().replace(/^[<"']+|[>"']+$/g, '');
  if (!hook) return json({ ok: true, configured: false });

  try {
    const r = await fetch(hook, { method: 'POST' });
    return json({ ok: r.ok, configured: true, status: r.status });
  } catch (err) {
    // Never echo the hook URL: it is a secret.
    return json({ ok: false, configured: true, error: (err as Error).name || 'fetch-failed' }, 502);
  }
});
