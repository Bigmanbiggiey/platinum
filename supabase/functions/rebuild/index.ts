// Platinum Point — publish → rebuild trigger (Phase 3 WP10, ADR-0003).
//
// Admin calls this after publishing content; it POSTs the Vercel Deploy Hook so the
// SSG site regenerates. The hook URL is a server-side secret, never in the client.
//
// Secrets: SUPABASE_URL / SUPABASE_ANON_KEY (injected), VERCEL_DEPLOY_HOOK_URL (set
//   later: `npx supabase secrets set VERCEL_DEPLOY_HOOK_URL=https://api.vercel.com/v1/integrations/deploy/...`)

import { createClient } from 'jsr:@supabase/supabase-js@2';

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

  // Caller must be an active admin.
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
  const { data: me } = await supabase.from('profile').select('is_active').maybeSingle();
  if (!me?.is_active) return json({ ok: false, error: 'forbidden' }, 403);

  const hook = Deno.env.get('VERCEL_DEPLOY_HOOK_URL');
  if (!hook) return json({ ok: true, configured: false });

  try {
    const r = await fetch(hook, { method: 'POST' });
    return json({ ok: r.ok, configured: true, status: r.status });
  } catch (err) {
    return json({ ok: false, configured: true, error: String(err) }, 502);
  }
});
