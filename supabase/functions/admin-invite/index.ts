// Platinum Point — owner-only staff invite (Phase 3 WP3b).
//
// Creating an auth user needs the service-role key, which must never reach the
// browser. This function does it server-side after verifying the caller is an
// authenticated `owner`. It returns an invite link for the owner to pass to the new
// staff member (no dependency on Supabase's rate-limited built-in email).
//
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (injected), ADMIN_ALLOWED_ORIGIN?

import { createClient } from 'jsr:@supabase/supabase-js@2';

const ORIGIN = Deno.env.get('ADMIN_ALLOWED_ORIGIN') ?? '*';
const cors = {
  'Access-Control-Allow-Origin': ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ ok: false, error: 'method-not-allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // 1. Verify the caller is an authenticated owner.
  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: me } = await caller.from('profile').select('role, is_active').maybeSingle();
  if (!me || !me.is_active || me.role !== 'owner') {
    return json({ ok: false, error: 'forbidden' }, 403);
  }

  // 2. Parse input.
  let body: { email?: string; display_name?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ ok: false, error: 'bad-json' }, 400);
  }
  const email = (body.email ?? '').trim().toLowerCase();
  if (!email || !email.includes('@')) return json({ ok: false, error: 'bad-email' }, 422);

  // 3. Create the user + an invite link (service role).
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const redirectTo = `${req.headers.get('Origin') ?? ''}/admin/reset`;
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      redirectTo,
      data: body.display_name ? { display_name: body.display_name } : undefined,
    },
  });
  if (error) {
    // Already exists → still useful to return a recovery link.
    if (error.message.toLowerCase().includes('already')) {
      const rec = await admin.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo } });
      if (!rec.error) return json({ ok: true, inviteUrl: rec.data.properties?.action_link, existed: true });
    }
    return json({ ok: false, error: error.message }, 400);
  }
  return json({ ok: true, inviteUrl: data.properties?.action_link });
});
