// Platinum Point Automotive Engineering — public form submission handler (ADR-0006, ADR-0008)
//
// The ONLY path that writes to `service_request` / `testimonial`. anon has no direct
// insert. Runs on Supabase Edge Functions (Deno).
//
// Layers:
//   1. Honeypot + submit-timing check (always on, no dependency).
//   2. Cloudflare Turnstile verification — active only when TURNSTILE_SECRET is set.
//   3. Field validation.
//   4. Insert with the service-role key (RLS-exempt); status/source forced server-side.
//   5. Best-effort owner email via Resend — active only when RESEND_API_KEY + NOTIFY_EMAIL
//      are set. Email failure never fails the request.
//
// Secrets (set with `npx supabase secrets set ...`):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (injected by the platform)
//   TURNSTILE_SECRET      (optional)
//   RESEND_API_KEY        (optional)
//   RESEND_FROM           (optional, default onboarding@resend.dev)
//   NOTIFY_EMAIL          (optional, the owner's inbox)
//   ALLOWED_ORIGIN        (optional, default '*')

import { createClient } from 'jsr:@supabase/supabase-js@2';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*';
const MIN_ELAPSED_MS = 1500; // faster than this = almost certainly a bot

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

type Kind = 'service_request' | 'testimonial';

const REQUEST_TYPES = new Set([
  'booking',
  'general_repair',
  'diagnostics',
  'maintenance',
  'assessment',
  'road_test',
  'mechanical_inspection',
  'pre_purchase_inspection',
  'engineering',
  'other',
  'general_contact',
]);

const str = (v: unknown, max = 2000): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length === 0 || t.length > max ? null : t;
};

async function verifyTurnstile(token: unknown): Promise<boolean> {
  const secret = Deno.env.get('TURNSTILE_SECRET');
  if (!secret) return true; // not configured yet — honeypot + timing still apply
  if (typeof token !== 'string' || !token) return false;
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
  });
  const out = (await res.json()) as { success?: boolean };
  return out.success === true;
}

async function notifyOwner(kind: Kind, row: Record<string, unknown>): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const to = Deno.env.get('NOTIFY_EMAIL');
  if (!apiKey || !to) return;
  const from = Deno.env.get('RESEND_FROM') ?? 'onboarding@resend.dev';
  const subject =
    kind === 'testimonial'
      ? 'New testimonial (pending) — Platinum Point'
      : `New ${String(row.request_type)} request — Platinum Point`;
  const lines = Object.entries(row)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join('\n');
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, text: `${subject}\n\n${lines}` }),
    });
  } catch (err) {
    console.error('notifyOwner failed (non-fatal):', err);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, error: 'method-not-allowed' }, 405);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: 'bad-json' }, 400);
  }

  // 1. Honeypot + timing. A hit is answered with 200 so bots learn nothing.
  if (typeof body.hp === 'string' && body.hp.trim() !== '') return json({ ok: true });
  if (typeof body.elapsedMs === 'number' && body.elapsedMs < MIN_ELAPSED_MS) {
    return json({ ok: true });
  }

  // 2. Turnstile (if configured)
  if (!(await verifyTurnstile(body.turnstileToken))) {
    return json({ ok: false, error: 'challenge-failed' }, 400);
  }

  const kind = body.kind as Kind;
  const p = (body.payload ?? {}) as Record<string, unknown>;
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  if (kind === 'testimonial') {
    const first_name = str(p.first_name, 80);
    const vehicle_label = str(p.vehicle_label, 120);
    const comment = str(p.comment, 2000);
    const rating =
      typeof p.rating === 'number' && p.rating >= 1 && p.rating <= 5 ? Math.round(p.rating) : null;
    if (!first_name || !vehicle_label || !comment || p.consent !== true) {
      return json({ ok: false, error: 'validation' }, 422);
    }
    const { error } = await supabase.from('testimonial').insert({
      first_name,
      vehicle_label,
      comment,
      rating,
      consent: true,
      source: 'public_form',
      status: 'pending',
    });
    if (error) return json({ ok: false, error: 'insert-failed' }, 500);
    await notifyOwner('testimonial', { first_name, vehicle_label, rating, comment });
    return json({ ok: true });
  }

  if (kind === 'service_request') {
    const request_type = typeof p.request_type === 'string' ? p.request_type : '';
    if (!REQUEST_TYPES.has(request_type)) return json({ ok: false, error: 'bad-request-type' }, 422);
    const contact_name = str(p.contact_name, 120);
    const contact_phone = str(p.contact_phone, 40);
    if (!contact_name || !contact_phone || p.consent !== true) {
      return json({ ok: false, error: 'validation' }, 422);
    }
    const row = {
      request_type,
      status: 'new' as const,
      contact_name,
      contact_phone,
      contact_whatsapp: str(p.contact_whatsapp, 40),
      contact_email: str(p.contact_email, 160),
      vehicle_description: str(p.vehicle_description, 500),
      area: str(p.area, 160),
      requested_date:
        typeof p.requested_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.requested_date)
          ? p.requested_date
          : null,
      requested_time_window: str(p.requested_time_window, 80),
      message: str(p.message, 2000),
      consent: true,
      source: str(p.source, 60) ?? 'public_form',
    };
    const { error } = await supabase.from('service_request').insert(row);
    if (error) return json({ ok: false, error: 'insert-failed' }, 500);
    await notifyOwner('service_request', row);
    return json({ ok: true });
  }

  return json({ ok: false, error: 'unknown-kind' }, 400);
});
