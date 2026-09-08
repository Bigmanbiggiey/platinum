// Platinum Point — customer booking email (Phase 3 WP11).
//
// Called by the admin Schedule view after Confirm / Decline. Sends the customer an
// email via Resend if configured; otherwise returns { ok:true, sent:false } so the
// admin can tell the owner it wasn't delivered.
//
// Secrets: SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY (injected),
//   RESEND_API_KEY?, RESEND_FROM? (default onboarding@resend.dev)

import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ ok: false, error: 'method-not-allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
  const { data: me } = await caller.from('profile').select('is_active').maybeSingle();
  if (!me?.is_active) return json({ ok: false, error: 'forbidden' }, 403);

  const { requestId, kind } = (await req.json().catch(() => ({}))) as {
    requestId?: string;
    kind?: 'confirmed' | 'declined';
  };
  if (!requestId || !kind) return json({ ok: false, error: 'bad-input' }, 422);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const { data: r } = await admin
    .from('service_request')
    .select('contact_name, contact_email, requested_date, requested_time_window')
    .eq('id', requestId)
    .maybeSingle();
  if (!r) return json({ ok: false, error: 'not-found' }, 404);
  if (!r.contact_email) return json({ ok: true, sent: false, reason: 'no-email' });

  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return json({ ok: true, sent: false, reason: 'not-configured' });

  const when = [r.requested_date, r.requested_time_window].filter(Boolean).join(' · ');
  const subject =
    kind === 'confirmed'
      ? 'Your booking with Platinum Point is confirmed'
      : 'About your Platinum Point booking request';
  const text =
    kind === 'confirmed'
      ? `Hi ${r.contact_name},\n\nYour booking with Platinum Point Automotive Engineering is confirmed${
          when ? ` for ${when}` : ''
        }. We'll see you then. Reply or call +254 722 322870 if anything changes.\n\n— Platinum Point`
      : `Hi ${r.contact_name},\n\nThanks for your booking request. We're not able to make that time — please call or WhatsApp +254 722 322870 and we'll find one that works.\n\n— Platinum Point`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: Deno.env.get('RESEND_FROM') ?? 'onboarding@resend.dev',
        to: r.contact_email,
        subject,
        text,
      }),
    });
    return json({ ok: res.ok, sent: res.ok });
  } catch (err) {
    return json({ ok: false, sent: false, error: String(err) }, 502);
  }
});
