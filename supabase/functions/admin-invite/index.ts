// Platinum Point — owner-only staff invite (spec: docs/superpowers/specs/2026-09-30-rbac-and-invites-design.md §6).
//
// Creating an auth user needs the service-role key, which must never reach the
// browser. This function:
//   1. checks the caller is an ACTIVE OWNER (their own profile, by user id);
//   2. asks Supabase for a one-time token (generateLink) — `invite` for a new email,
//      `recovery` for an existing account;
//   3. builds the link itself from ADMIN_SITE_URL → /admin/accept-invite (never the
//      request Origin, never the Supabase Site URL, never localhost);
//   4. sets the profile's role + is_active = true (D8: the owner's invite is the
//      approval). The service role is not restricted by guard_profile_privileges.
// The owner shares the link (copy / WhatsApp / email) — no server email.
//
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (injected),
//   ADMIN_SITE_URL (required, e.g. https://platinum-point.vercel.app), ADMIN_ALLOWED_ORIGIN?

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getCaller } from '../_shared/caller.ts';
import {
  buildAcceptUrl,
  isAlreadyRegistered,
  parseInviteRequest,
  type InviteLinkType,
} from '../_shared/invite.ts';

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

  // 1. The caller must be an active owner — looked up by THEIR user id.
  const me = await getCaller(req);
  if (!me || !me.isActive || me.role !== 'owner') {
    return json({ ok: false, error: 'forbidden' }, 403);
  }

  // 2. Input.
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ ok: false, error: 'bad-json' }, 400);
  }
  const parsed = parseInviteRequest(raw);
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, 422);
  const { email, displayName, role } = parsed.value;
  if (me.email && email === me.email.toLowerCase()) {
    // Re-inviting yourself could change your own role — never useful, easy to get wrong.
    return json({ ok: false, error: 'cannot-invite-self' }, 422);
  }

  // Fail before creating anything if the link base isn't configured correctly.
  const siteUrl = Deno.env.get('ADMIN_SITE_URL');
  try {
    buildAcceptUrl(siteUrl, 'config-check', 'invite');
  } catch (err) {
    return json({ ok: false, error: 'not-configured', detail: (err as Error).message }, 500);
  }

  // 3. One-time token (service role). New email → invite; existing account → recovery.
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  let type: InviteLinkType = 'invite';
  let link = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { data: { display_name: displayName } },
  });
  if (link.error && isAlreadyRegistered(link.error)) {
    type = 'recovery';
    link = await admin.auth.admin.generateLink({ type: 'recovery', email });
  }
  const userId = link.data?.user?.id;
  const tokenHash = link.data?.properties?.hashed_token;
  if (link.error || !userId || !tokenHash) {
    return json({ ok: false, error: link.error?.message ?? 'link-failed' }, 400);
  }

  // 4. Role + activation (D8). handle_new_user() already created the profile row for a
  //    new user; upsert covers both paths.
  const { error: profileError } = await admin
    .from('profile')
    .upsert(
      { user_id: userId, email, display_name: displayName, role, is_active: true },
      { onConflict: 'user_id' },
    );
  if (profileError) return json({ ok: false, error: profileError.message }, 500);

  return json({
    ok: true,
    inviteUrl: buildAcceptUrl(siteUrl, tokenHash, type),
    existed: type === 'recovery',
    role,
  });
});
