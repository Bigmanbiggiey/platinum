# RBAC R-A — Shareable staff invites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make staff invites work: the owner creates an invite (email + name + role), gets ONE link that never points at `localhost`, shares it by Copy / WhatsApp / Email, and the invitee opens it, sets a password and is straight into the admin.

**Architecture:** The `admin-invite` Edge Function identifies the caller by their own JWT (fixing the unfiltered-profile 403), asks Supabase for a one-time token with `auth.admin.generateLink` and builds the link itself from a configured `ADMIN_SITE_URL` secret: `${ADMIN_SITE_URL}/admin/accept-invite?token_hash=…&type=invite|recovery`. It sets the new profile's role and `is_active = true` with the service role. A new admin route `/admin/accept-invite` (outside `RequireAuth`) consumes nothing on open — only the "Set password" submit calls `auth.verifyOtp({ type, token_hash })` then `auth.updateUser({ password })`, so WhatsApp/email link previews can't burn the token. Pure logic (input parsing, link building, share URLs, error text) lives in small tested modules.

**Tech Stack:** Supabase Edge Functions (Deno, `jsr:@supabase/supabase-js@2`) · React 19 + TypeScript + React Router 6.28 · TanStack Query 5 · Tailwind v4 admin UI kit (`src/admin/components/ui.tsx`) · Vitest + React Testing Library + user-event (jsdom).

**Spec:** `docs/superpowers/specs/2026-09-30-rbac-and-invites-design.md` — this plan implements **§6 (R-3 Invites)** and **§10.2** (display name required on invite). It is delivery package **R-A** (spec §9). R-B (`2026-09-30-rbac-r-b-permissions.md`) and R-C (`2026-09-30-rbac-r-c-attribution.md`) follow.

## Global Constraints

- **Depends on (must be on `main` before starting):** `fix/owner-profile-lookup` (cbdf18a — `getProfile(userId)` filters `.eq('user_id', userId)`; already merged in PR #7), `fix/admin-no-access-signout` (fa9ff2c — `NoAccess` in `src/admin/RequireAuth.tsx`; already merged in PR #6), and **`fix/profile-self-promotion` (40dcd3d — NOT yet merged)**: migration `supabase/migrations/20260930140000_guard_profile_privileges.sql` (already applied to the live DB) + `supabase/tests/profile_guard.sql`. Merge that PR first (spec §10.1) — the live DB already has migration `20260930140000`, so any branch without the file will make `supabase db push` fail in R-B.
- **Branch:** `feature/rbac-r-a-invites` from an up-to-date `main`. Never push to `main` directly (Vercel auto-deploys `main`); open a PR only when the user asks.
- **No database migration in R-A.** The profile guard (`guard_profile_privileges`) only restricts callers whose `current_user = 'authenticated'`; the function writes profiles with the service role, so D8 (accepting gives access immediately) needs no schema change.
- **Live changes need the user.** Deploying Edge Functions, `npx supabase secrets set ADMIN_SITE_URL=…` and the Supabase dashboard settings (spec §6.5) are done **only after the user's explicit OK / by the user** — Task 6 is a STOP step.
- **Link base URL:** `ADMIN_SITE_URL` (staging: `https://platinum-point.vercel.app`; later the production domain). Must be `https://` and never `localhost`. No `Origin` header, no Supabase Site URL fallback.
- **Accept page must never consume the token on open** — only on the password submit.
- **Invite delivery:** Copy link · Share on WhatsApp (`https://wa.me/?text=<message + link>`) · Email (`mailto:<email>?subject=…&body=…`). No server-sent email (D7).
- **Invite form:** Email (required), Name (required — spec §10.2, so the R-C activity feed reads "Kevin", not an email), Role select (Staff default, Owner).
- **Follow existing admin patterns:** `getDb()` from `src/admin/lib/db.ts`, UI kit components, `font-mono` for IDs/links, `data-theme="dark"` auth-screen styling copied from `ResetPasswordPage.tsx`.
- **Edge Function code** lives under `supabase/` (ignored by ESLint and Prettier; Deno conventions). Shared function code goes in `supabase/functions/_shared/`. Files imported by Vitest must not use `Deno` globals or `jsr:` imports, and use explicit `.ts` import extensions (Deno requires them; the app tsconfig has `allowImportingTsExtensions`).
- **Verification gate for every task that touches code:** `npm run typecheck && npm run lint && npm run test` green, and `npx prettier --check <changed src files>` clean, before committing. Final task also runs `npm run build`.
- **Commit messages** end with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Until R-B ships, "staff" is still a full admin** (is_admin() everywhere). R-A only changes how people are invited and activated.

---

## File map

| File | Status | Responsibility |
|---|---|---|
| `supabase/functions/_shared/invite.ts` | Create | Pure: parse invite input, build the accept link, detect "already registered" |
| `src/admin/lib/inviteServer.test.ts` | Create | Vitest tests for `_shared/invite.ts` |
| `supabase/functions/_shared/caller.ts` | Create | Deno: identify the caller by JWT and load THEIR profile |
| `supabase/functions/admin-invite/index.ts` | Rewrite | Owner check fixed, link builder, role + activation, recovery for existing accounts |
| `supabase/functions/rebuild/index.ts` | Modify | Same caller-lookup fix (owner got 403 with 2+ profiles) |
| `supabase/functions/notify-customer/index.ts` | Modify | Same caller-lookup fix |
| `src/shared/supabase/auth.ts` | Modify | `verifyInviteToken()` + `InviteLinkType` |
| `src/admin/pages/AcceptInvitePage.tsx` + `.test.tsx` | Create | `/admin/accept-invite` — password form, verify on submit, expired/incomplete messages |
| `src/admin/AdminApp.tsx` | Modify | Route `accept-invite` outside `RequireAuth` |
| `src/admin/lib/inviteShare.ts` + `.test.ts` | Create | Share message, WhatsApp + mailto URLs, friendly error text |
| `src/admin/lib/team.ts` | Modify | `useInviteStaff` takes `{ email, displayName, role }`, returns `InviteResult` |
| `src/admin/components/InviteLinkPanel.tsx` + `.test.tsx` | Create | Link + Copy / WhatsApp / Email + expiry note |
| `src/admin/pages/TeamPage.tsx` + `.test.tsx` | Modify / Create | Required name, Role select, result panel |
| `docs/owner-guide.md`, `docs/pick-up-here.md` | Modify | How to invite; one-time config |

---

### Task 1: Pure invite helpers for the Edge Function

**Files:**
- Create: `supabase/functions/_shared/invite.ts`
- Test: `src/admin/lib/inviteServer.test.ts`

**Interfaces:**
- Produces:
  - `type InviteRole = 'owner' | 'staff'`
  - `type InviteLinkType = 'invite' | 'recovery'`
  - `interface InviteRequest { email: string; displayName: string; role: InviteRole }`
  - `parseInviteRequest(body: unknown): { ok: true; value: InviteRequest } | { ok: false; error: 'bad-email' | 'bad-name' | 'bad-role' }`
  - `buildAcceptUrl(siteUrl: string | undefined, tokenHash: string, type: InviteLinkType): string` (throws `Error` on a missing / non-https / localhost base or empty token)
  - `isAlreadyRegistered(error: { message?: string; code?: string } | null | undefined): boolean`

- [ ] **Step 1: Create the branch**

```bash
git switch main
git pull
git log --oneline -1 -- supabase/migrations/20260930140000_guard_profile_privileges.sql
```
Expected: one commit listed (the self-promotion fix is on `main`). If nothing is listed, STOP and ask the user to merge `fix/profile-self-promotion` first.

```bash
git switch -c feature/rbac-r-a-invites
```

- [ ] **Step 2: Write the failing test**

Create `src/admin/lib/inviteServer.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  buildAcceptUrl,
  isAlreadyRegistered,
  parseInviteRequest,
} from '../../../supabase/functions/_shared/invite.ts';

describe('parseInviteRequest', () => {
  it('normalises email + name and defaults the role to staff', () => {
    expect(parseInviteRequest({ email: '  Kevin@Example.COM ', display_name: ' Kevin ' })).toEqual({
      ok: true,
      value: { email: 'kevin@example.com', displayName: 'Kevin', role: 'staff' },
    });
  });

  it('accepts the owner role', () => {
    const r = parseInviteRequest({ email: 'a@b.co', display_name: 'Ann', role: 'owner' });
    expect(r).toEqual({ ok: true, value: { email: 'a@b.co', displayName: 'Ann', role: 'owner' } });
  });

  it('rejects a bad email', () => {
    expect(parseInviteRequest({ email: 'nope', display_name: 'X' })).toEqual({
      ok: false,
      error: 'bad-email',
    });
    expect(parseInviteRequest(null)).toEqual({ ok: false, error: 'bad-email' });
  });

  it('requires a display name (spec §10.2) of at most 80 characters', () => {
    expect(parseInviteRequest({ email: 'a@b.co', display_name: '   ' })).toEqual({
      ok: false,
      error: 'bad-name',
    });
    expect(parseInviteRequest({ email: 'a@b.co' })).toEqual({ ok: false, error: 'bad-name' });
    expect(parseInviteRequest({ email: 'a@b.co', display_name: 'x'.repeat(81) })).toEqual({
      ok: false,
      error: 'bad-name',
    });
  });

  it('rejects an unknown role', () => {
    expect(parseInviteRequest({ email: 'a@b.co', display_name: 'A', role: 'admin' })).toEqual({
      ok: false,
      error: 'bad-role',
    });
  });
});

describe('buildAcceptUrl', () => {
  it('builds the accept-invite link from the configured site URL', () => {
    expect(buildAcceptUrl('https://platinum-point.vercel.app', 'abc123', 'invite')).toBe(
      'https://platinum-point.vercel.app/admin/accept-invite?token_hash=abc123&type=invite',
    );
  });

  it('ignores any path or trailing slash on the base and encodes the token', () => {
    expect(buildAcceptUrl('https://example.com/some/path/', 'a b&c', 'recovery')).toBe(
      'https://example.com/admin/accept-invite?token_hash=a+b%26c&type=recovery',
    );
  });

  it('refuses a missing, invalid, non-https or localhost base URL', () => {
    expect(() => buildAcceptUrl(undefined, 't', 'invite')).toThrow(/not set/);
    expect(() => buildAcceptUrl('not a url', 't', 'invite')).toThrow(/valid URL/);
    expect(() => buildAcceptUrl('http://platinum-point.vercel.app', 't', 'invite')).toThrow(/https/);
    expect(() => buildAcceptUrl('https://localhost:5173', 't', 'invite')).toThrow(/localhost/);
    expect(() => buildAcceptUrl('https://127.0.0.1', 't', 'invite')).toThrow(/localhost/);
  });

  it('refuses an empty token', () => {
    expect(() => buildAcceptUrl('https://example.com', '', 'invite')).toThrow(/token/);
  });
});

describe('isAlreadyRegistered', () => {
  it('recognises the email_exists code or an "already" message', () => {
    expect(isAlreadyRegistered({ code: 'email_exists', message: 'x' })).toBe(true);
    expect(
      isAlreadyRegistered({ message: 'A user with this email address has already been registered' }),
    ).toBe(true);
    expect(isAlreadyRegistered({ message: 'rate limited' })).toBe(false);
    expect(isAlreadyRegistered(null)).toBe(false);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run src/admin/lib/inviteServer.test.ts`
Expected: FAIL — cannot resolve `../../../supabase/functions/_shared/invite.ts`.

- [ ] **Step 4: Write the implementation**

Create `supabase/functions/_shared/invite.ts`:

```ts
// Platinum Point — pure helpers for the admin-invite Edge Function (spec §6).
//
// No Deno globals and no jsr: imports here: this file is also imported by the Vitest
// suite (src/admin/lib/inviteServer.test.ts).

export type InviteRole = 'owner' | 'staff';
export type InviteLinkType = 'invite' | 'recovery';

export interface InviteRequest {
  email: string;
  displayName: string;
  role: InviteRole;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validates the JSON body `{ email, display_name, role? }`. */
export function parseInviteRequest(
  body: unknown,
):
  | { ok: true; value: InviteRequest }
  | { ok: false; error: 'bad-email' | 'bad-name' | 'bad-role' } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'bad-email' };
  const displayName = typeof b.display_name === 'string' ? b.display_name.trim() : '';
  if (!displayName || displayName.length > 80) return { ok: false, error: 'bad-name' };
  const role: InviteRole | null =
    b.role === undefined || b.role === 'staff' ? 'staff' : b.role === 'owner' ? 'owner' : null;
  if (!role) return { ok: false, error: 'bad-role' };
  return { ok: true, value: { email, displayName, role } };
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]']);

/**
 * `${ADMIN_SITE_URL}/admin/accept-invite?token_hash=…&type=…` — built here, never by
 * Supabase, so it can't fall back to the project Site URL (localhost) or the caller's
 * Origin. Only the origin of the configured URL is used.
 */
export function buildAcceptUrl(
  siteUrl: string | undefined,
  tokenHash: string,
  type: InviteLinkType,
): string {
  if (!siteUrl) throw new Error('ADMIN_SITE_URL is not set.');
  let base: URL;
  try {
    base = new URL(siteUrl);
  } catch {
    throw new Error('ADMIN_SITE_URL is not a valid URL.');
  }
  if (base.protocol !== 'https:') throw new Error('ADMIN_SITE_URL must use https.');
  if (LOCAL_HOSTS.has(base.hostname)) throw new Error('ADMIN_SITE_URL must not point at localhost.');
  if (!tokenHash) throw new Error('Missing token.');
  const url = new URL('/admin/accept-invite', base.origin);
  url.searchParams.set('token_hash', tokenHash);
  url.searchParams.set('type', type);
  return url.toString();
}

/** generateLink({ type: 'invite' }) fails this way when the email already has an account. */
export function isAlreadyRegistered(
  error: { message?: string; code?: string } | null | undefined,
): boolean {
  if (!error) return false;
  return error.code === 'email_exists' || /already/i.test(error.message ?? '');
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/admin/lib/inviteServer.test.ts`
Expected: PASS (all tests).

- [ ] **Step 6: Gate + commit**

```bash
npm run typecheck && npm run lint && npm run test
npx prettier --check src/admin/lib/inviteServer.test.ts
git add supabase/functions/_shared/invite.ts src/admin/lib/inviteServer.test.ts
git commit -m "feat(invites): pure helpers to parse invites and build the accept link

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Edge Functions — caller check fixed, `admin-invite` rewritten

No Deno is installed locally and the repo has no Deno test harness, so this task is verified by review here and by the live check in Task 6. The pure parts it relies on are tested in Task 1.

**Files:**
- Create: `supabase/functions/_shared/caller.ts`
- Rewrite: `supabase/functions/admin-invite/index.ts`
- Modify: `supabase/functions/rebuild/index.ts:23-29`
- Modify: `supabase/functions/notify-customer/index.ts:24-30`

**Interfaces:**
- Consumes: `parseInviteRequest`, `buildAcceptUrl`, `isAlreadyRegistered`, `InviteLinkType` (Task 1).
- Produces:
  - `getCaller(req: Request): Promise<CallerProfile | null>` with `interface CallerProfile { userId: string; email: string | null; role: 'owner' | 'staff'; isActive: boolean }` (R-B uses it to make `rebuild` / `notify-customer` owner-only).
  - HTTP contract of `admin-invite` (Task 4 relies on it): `POST { email, display_name, role? }` →
    `200 { ok: true, inviteUrl: string, existed: boolean, role: 'owner' | 'staff' }` ·
    `403 { ok: false, error: 'forbidden' }` · `400 { ok: false, error: 'bad-json' | <supabase message> }` ·
    `422 { ok: false, error: 'bad-email' | 'bad-name' | 'bad-role' | 'cannot-invite-self' }` ·
    `500 { ok: false, error: 'not-configured' | <message> }`.

- [ ] **Step 1: Create the shared caller lookup**

Create `supabase/functions/_shared/caller.ts`:

```ts
// Platinum Point — identify the signed-in caller of an Edge Function.
//
// Must filter the profile by the caller's user id: RLS lets an owner read EVERY
// profile, so an unfiltered `profile … maybeSingle()` errors as soon as a second
// account exists — which returned 403 to the owner (spec §1.3, §6.2). Mirrors the
// getProfile(userId) fix in src/shared/supabase/auth.ts.

import { createClient } from 'jsr:@supabase/supabase-js@2';

export interface CallerProfile {
  userId: string;
  email: string | null;
  role: 'owner' | 'staff';
  isActive: boolean;
}

export async function getCaller(req: Request): Promise<CallerProfile | null> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return null;

  const caller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const {
    data: { user },
  } = await caller.auth.getUser(jwt);
  if (!user) return null;

  const { data } = await caller
    .from('profile')
    .select('role, is_active, email')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!data) return null;

  return {
    userId: user.id,
    email: (data.email as string | null) ?? user.email ?? null,
    role: data.role as 'owner' | 'staff',
    isActive: data.is_active === true,
  };
}
```

- [ ] **Step 2: Rewrite `admin-invite`**

Replace the whole of `supabase/functions/admin-invite/index.ts` with:

```ts
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
```

- [ ] **Step 3: Fix the same lookup in `rebuild`**

In `supabase/functions/rebuild/index.ts`, replace the import line and the caller block. Change:

```ts
import { createClient } from 'jsr:@supabase/supabase-js@2';
```
to:
```ts
import { getCaller } from '../_shared/caller.ts';
```
and replace lines 23-29:

```ts
  // Caller must be an active admin.
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
  const { data: me } = await supabase.from('profile').select('is_active').maybeSingle();
  if (!me?.is_active) return json({ ok: false, error: 'forbidden' }, 403);
```
with:
```ts
  // Caller must be an active admin (their own profile — see _shared/caller.ts).
  const me = await getCaller(req);
  if (!me?.isActive) return json({ ok: false, error: 'forbidden' }, 403);
```

- [ ] **Step 4: Fix the same lookup in `notify-customer`**

In `supabase/functions/notify-customer/index.ts`, add after the `createClient` import line:

```ts
import { getCaller } from '../_shared/caller.ts';
```
and replace:

```ts
  const url = Deno.env.get('SUPABASE_URL')!;
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
  const { data: me } = await caller.from('profile').select('is_active').maybeSingle();
  if (!me?.is_active) return json({ ok: false, error: 'forbidden' }, 403);
```
with:
```ts
  const url = Deno.env.get('SUPABASE_URL')!;
  const me = await getCaller(req);
  if (!me?.isActive) return json({ ok: false, error: 'forbidden' }, 403);
```
(`createClient` stays imported — the service-role client below still uses it.)

- [ ] **Step 5: Self-review the three functions**

Run: `git diff --stat` and read the diff. Check: no remaining `.from('profile').select(...).maybeSingle()` without `.eq('user_id'`:

```bash
grep -rn "from('profile')" supabase/functions
```
Expected: only `_shared/caller.ts` (filtered by `user_id`) and `admin-invite/index.ts` (the service-role upsert).

- [ ] **Step 6: Commit**

```bash
git add supabase/functions
git commit -m "fix(functions): identify callers by their own profile; admin-invite builds its own link

admin-invite now: owner check by user id (was 403 with 2+ profiles), requires a
display name, takes a role, activates the profile (D8), and returns
\${ADMIN_SITE_URL}/admin/accept-invite?token_hash=…&type=invite|recovery instead of
Supabase's action_link (which fell back to localhost). rebuild and notify-customer
had the same unfiltered-profile bug.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Accept-invite page

**Files:**
- Modify: `src/shared/supabase/auth.ts` (append after `updatePassword`)
- Create: `src/admin/pages/AcceptInvitePage.tsx`
- Test: `src/admin/pages/AcceptInvitePage.test.tsx`
- Modify: `src/admin/AdminApp.tsx` (import + route after `reset`)

**Interfaces:**
- Consumes: link format from Task 2: `/admin/accept-invite?token_hash=<hash>&type=invite|recovery`; existing `updatePassword(password): Promise<{ error: string | null }>`.
- Produces:
  - `type InviteLinkType = 'invite' | 'recovery'` (exported from `src/shared/supabase/auth.ts`)
  - `verifyInviteToken(tokenHash: string, type: InviteLinkType): Promise<{ error: string | null }>`
  - `AcceptInvitePage` component, route `/admin/accept-invite`.

- [ ] **Step 1: Write the failing test**

Create `src/admin/pages/AcceptInvitePage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AcceptInvitePage } from './AcceptInvitePage';

const verifyInviteToken = vi.fn();
const updatePassword = vi.fn();
vi.mock('../../shared/supabase/auth', () => ({
  verifyInviteToken: (...a: unknown[]) => verifyInviteToken(...a),
  updatePassword: (...a: unknown[]) => updatePassword(...a),
}));

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/admin/accept-invite" element={<AcceptInvitePage />} />
        <Route path="/admin" element={<p>Admin home</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

const INVITE = '/admin/accept-invite?token_hash=abc123&type=invite';

describe('<AcceptInvitePage />', () => {
  beforeEach(() => {
    verifyInviteToken.mockReset().mockResolvedValue({ error: null });
    updatePassword.mockReset().mockResolvedValue({ error: null });
  });

  it('shows the invite and consumes nothing on open', () => {
    renderAt(INVITE);
    expect(screen.getByRole('heading', { name: /been invited/i })).toBeInTheDocument();
    expect(verifyInviteToken).not.toHaveBeenCalled();
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it('verifies the token, sets the password, then enters the admin', async () => {
    const user = userEvent.setup();
    renderAt(INVITE);
    await user.type(screen.getByLabelText('Choose a password'), 'long-enough-pw');
    await user.click(screen.getByRole('button', { name: /set password/i }));
    expect(verifyInviteToken).toHaveBeenCalledWith('abc123', 'invite');
    expect(updatePassword).toHaveBeenCalledWith('long-enough-pw');
    expect(await screen.findByText('Admin home')).toBeInTheDocument();
  });

  it('rejects a short password without touching the token', async () => {
    const user = userEvent.setup();
    renderAt(INVITE);
    await user.type(screen.getByLabelText('Choose a password'), 'short');
    await user.click(screen.getByRole('button', { name: /set password/i }));
    expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument();
    expect(verifyInviteToken).not.toHaveBeenCalled();
  });

  it('explains an expired or used link', async () => {
    verifyInviteToken.mockResolvedValue({ error: 'Email link is invalid or has expired' });
    const user = userEvent.setup();
    renderAt(INVITE);
    await user.type(screen.getByLabelText('Choose a password'), 'long-enough-pw');
    await user.click(screen.getByRole('button', { name: /set password/i }));
    expect(await screen.findByText(/ask the owner for a new invite link/i)).toBeInTheDocument();
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it('does not re-verify when only the password step failed', async () => {
    updatePassword
      .mockResolvedValueOnce({ error: 'Password is too weak' })
      .mockResolvedValueOnce({ error: null });
    const user = userEvent.setup();
    renderAt(INVITE);
    await user.type(screen.getByLabelText('Choose a password'), 'long-enough-pw');
    await user.click(screen.getByRole('button', { name: /set password/i }));
    expect(await screen.findByText('Password is too weak')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /set password/i }));
    expect(await screen.findByText('Admin home')).toBeInTheDocument();
    expect(verifyInviteToken).toHaveBeenCalledTimes(1);
    expect(updatePassword).toHaveBeenCalledTimes(2);
  });

  it('handles a recovery link for an existing account', () => {
    renderAt('/admin/accept-invite?token_hash=abc123&type=recovery');
    expect(screen.getByRole('heading', { name: 'Set a new password' })).toBeInTheDocument();
  });

  it('says so when the link is incomplete', () => {
    renderAt('/admin/accept-invite?type=invite');
    expect(screen.getByRole('heading', { name: /incomplete/i })).toBeInTheDocument();
    renderAt('/admin/accept-invite?token_hash=abc&type=magiclink');
    expect(screen.getAllByRole('heading', { name: /incomplete/i })).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/admin/pages/AcceptInvitePage.test.tsx`
Expected: FAIL — `./AcceptInvitePage` does not exist.

- [ ] **Step 3: Add `verifyInviteToken` to the auth wrapper**

In `src/shared/supabase/auth.ts`, after `updatePassword`, add:

```ts
export type InviteLinkType = 'invite' | 'recovery';

/**
 * Consumes a one-time invite/recovery token (from /admin/accept-invite) and signs the
 * person in. Called only when they submit the password form — never on page open, so
 * link previews in WhatsApp / email can't use the token up.
 */
export async function verifyInviteToken(
  tokenHash: string,
  type: InviteLinkType,
): Promise<{ error: string | null }> {
  const db = getSupabaseClient();
  if (!db) return { error: 'Auth is not configured.' };
  const { error } = await db.auth.verifyOtp({ type, token_hash: tokenHash });
  return { error: error?.message ?? null };
}
```

- [ ] **Step 4: Create the page**

Create `src/admin/pages/AcceptInvitePage.tsx`:

```tsx
import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  updatePassword,
  verifyInviteToken,
  type InviteLinkType,
} from '../../shared/supabase/auth';
import { DatumMark } from '../brand/AdminBrand';
import { PasswordInput } from '../components/PasswordInput';

const LINK_TYPES: readonly InviteLinkType[] = ['invite', 'recovery'];

/**
 * `/admin/accept-invite?token_hash=…&type=invite|recovery` (spec §6.1).
 * Opening the page consumes nothing; the token is verified only on submit.
 */
export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tokenHash = params.get('token_hash') ?? '';
  const rawType = params.get('type');
  const type = LINK_TYPES.find((t) => t === rawType);

  const [password, setPassword] = useState('');
  const [verified, setVerified] = useState(false);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!tokenHash || !type) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold tracking-tight">This link is incomplete</h1>
        <p className="text-sm text-platinum">
          Open the full link from your invite message, or ask the owner for a new invite link.
        </p>
      </Shell>
    );
  }

  if (expired) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold tracking-tight">This link has expired</h1>
        <p className="text-sm text-platinum">
          It was already used or is too old. Ask the owner for a new invite link.
        </p>
        <a href="/admin/login" className="text-sm font-semibold text-signal underline">
          Go to sign in
        </a>
      </Shell>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      if (!verified) {
        const v = await verifyInviteToken(tokenHash, type);
        if (v.error) {
          setExpired(true);
          return;
        }
        // The token is now spent; a retry after a password error must not re-verify.
        setVerified(true);
      }
      const u = await updatePassword(password);
      if (u.error) {
        setError(u.error);
        return;
      }
      navigate('/admin', { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <form onSubmit={onSubmit} className="space-y-4">
        {type === 'invite' ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight">
              You&apos;ve been invited to the Platinum Point admin
            </h1>
            <p className="text-sm text-platinum">
              Choose a password to finish setting up your account.
            </p>
          </>
        ) : (
          <h1 className="text-2xl font-bold tracking-tight">Set a new password</h1>
        )}
        <div>
          <label htmlFor="accept-password" className="block text-sm font-semibold">
            Choose a password
          </label>
          <div className="mt-1">
            <PasswordInput
              id="accept-password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
        {error && <p className="text-sm text-signal">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-signal px-4 py-2.5 text-sm font-semibold text-paper disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Set password and sign in'}
        </button>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div
      className="grid min-h-dvh place-items-center bg-graphite px-6 text-paper"
      data-theme="dark"
    >
      <div className="w-full max-w-sm space-y-4">
        <div className="flex items-center gap-3">
          <DatumMark className="h-9 w-9" />
          <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-platinum">
            Platinum Point · Admin
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add the route**

In `src/admin/AdminApp.tsx`, add the import after the `ResetPasswordPage` import:

```tsx
import { AcceptInvitePage } from './pages/AcceptInvitePage';
```
and the route after `<Route path="reset" element={<ResetPasswordPage />} />`:

```tsx
          <Route path="accept-invite" element={<AcceptInvitePage />} />
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/admin/pages/AcceptInvitePage.test.tsx`
Expected: PASS (7 tests).

- [ ] **Step 7: Gate + commit**

```bash
npm run typecheck && npm run lint && npm run test
npx prettier --check src/shared/supabase/auth.ts src/admin/pages/AcceptInvitePage.tsx src/admin/pages/AcceptInvitePage.test.tsx src/admin/AdminApp.tsx
git add src/shared/supabase/auth.ts src/admin/pages/AcceptInvitePage.tsx src/admin/pages/AcceptInvitePage.test.tsx src/admin/AdminApp.tsx
git commit -m "feat(invites): /admin/accept-invite — verify the token only when the password is set

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Share helpers + invite hook

**Files:**
- Create: `src/admin/lib/inviteShare.ts`
- Test: `src/admin/lib/inviteShare.test.ts`
- Modify: `src/admin/lib/team.ts` (replace `useInviteStaff`, lines 45-70)

**Interfaces:**
- Consumes: `admin-invite` HTTP contract (Task 2).
- Produces:
  - `inviteMessage(name: string, link: string, existed?: boolean): string`
  - `whatsappShareUrl(message: string): string`
  - `INVITE_EMAIL_SUBJECT: string` (`'Your Platinum Point admin invite'`)
  - `inviteEmailUrl(email: string, message: string): string`
  - `inviteErrorMessage(code: string | undefined): string`
  - In `team.ts`: `interface InviteInput { email: string; displayName: string; role: 'owner' | 'staff' }`, `interface InviteResult { inviteUrl: string; email: string; displayName: string; role: 'owner' | 'staff'; existed: boolean }`, `useInviteStaff()` → `UseMutationResult<InviteResult, Error, InviteInput>`.

- [ ] **Step 1: Write the failing test**

Create `src/admin/lib/inviteShare.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  INVITE_EMAIL_SUBJECT,
  inviteEmailUrl,
  inviteErrorMessage,
  inviteMessage,
  whatsappShareUrl,
} from './inviteShare';

const LINK = 'https://platinum-point.vercel.app/admin/accept-invite?token_hash=abc&type=invite';

describe('inviteMessage', () => {
  it('greets by first name and includes the link', () => {
    expect(inviteMessage('Kevin Otieno', LINK)).toBe(
      `Hi Kevin, you've been invited to the Platinum Point admin. Open this link to set your password: ${LINK}`,
    );
  });
  it('words a re-invite of an existing account as a password reset', () => {
    expect(inviteMessage('Ann', LINK, true)).toBe(
      `Hi Ann, here is your link to set a new password for the Platinum Point admin: ${LINK}`,
    );
  });
});

describe('whatsappShareUrl', () => {
  it('encodes the whole message, keeping the link intact', () => {
    const url = whatsappShareUrl(inviteMessage('Kevin', LINK));
    expect(url.startsWith('https://wa.me/?text=')).toBe(true);
    // A bare "&type=" would be cut off by wa.me — it must be encoded.
    expect(url).not.toContain('&type=');
    const text = new URL(url).searchParams.get('text');
    expect(text).toContain(LINK);
  });
});

describe('inviteEmailUrl', () => {
  it('builds a mailto with subject and body encoded', () => {
    const msg = inviteMessage('Kevin', LINK);
    const url = inviteEmailUrl(' kevin@example.com ', msg);
    expect(url.startsWith('mailto:kevin@example.com?subject=')).toBe(true);
    expect(url).not.toContain('&type=');
    const query = new URLSearchParams(url.split('?').slice(1).join('?'));
    expect(query.get('subject')).toBe(INVITE_EMAIL_SUBJECT);
    expect(query.get('body')).toBe(msg);
  });
});

describe('inviteErrorMessage', () => {
  it('maps function error codes to plain words', () => {
    expect(inviteErrorMessage('forbidden')).toMatch(/only an active owner/i);
    expect(inviteErrorMessage('not-configured')).toMatch(/ADMIN_SITE_URL/);
    expect(inviteErrorMessage('bad-name')).toMatch(/name/i);
    expect(inviteErrorMessage('bad-email')).toMatch(/email/i);
    expect(inviteErrorMessage('cannot-invite-self')).toMatch(/your own/i);
    expect(inviteErrorMessage('Something else')).toBe('Something else');
    expect(inviteErrorMessage(undefined)).toBe('Invite failed.');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/admin/lib/inviteShare.test.ts`
Expected: FAIL — `./inviteShare` does not exist.

- [ ] **Step 3: Write the helpers**

Create `src/admin/lib/inviteShare.ts`:

```ts
/** Share an invite link by WhatsApp or the owner's own email app (spec §6.4, D7, D9). */

export function inviteMessage(name: string, link: string, existed = false): string {
  const first = name.trim().split(/\s+/)[0] || 'there';
  return existed
    ? `Hi ${first}, here is your link to set a new password for the Platinum Point admin: ${link}`
    : `Hi ${first}, you've been invited to the Platinum Point admin. Open this link to set your password: ${link}`;
}

export function whatsappShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export const INVITE_EMAIL_SUBJECT = 'Your Platinum Point admin invite';

/** Opens the owner's email app with the message pre-filled. No server email. */
export function inviteEmailUrl(email: string, message: string): string {
  return `mailto:${email.trim()}?subject=${encodeURIComponent(
    INVITE_EMAIL_SUBJECT,
  )}&body=${encodeURIComponent(message)}`;
}

const ERRORS: Record<string, string> = {
  forbidden: 'Only an active owner can invite people.',
  'not-configured':
    'Invites are not set up yet: the ADMIN_SITE_URL secret is missing or invalid (see docs/pick-up-here.md).',
  'bad-email': 'Enter a valid email address.',
  'bad-name': "Enter the person's name (up to 80 characters).",
  'bad-role': 'Pick Staff or Owner.',
  'cannot-invite-self': "That's your own email — you already have access.",
};

export function inviteErrorMessage(code: string | undefined): string {
  if (!code) return 'Invite failed.';
  return ERRORS[code] ?? code;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/admin/lib/inviteShare.test.ts`
Expected: PASS.

- [ ] **Step 5: Update the invite hook**

In `src/admin/lib/team.ts`, add the import:

```ts
import { inviteErrorMessage } from './inviteShare';
```
and replace the whole `useInviteStaff` function (from `/** Calls the owner-only` to the end of the file) with:

```ts
export interface InviteInput {
  email: string;
  displayName: string;
  role: 'owner' | 'staff';
}

export interface InviteResult {
  inviteUrl: string;
  email: string;
  displayName: string;
  role: 'owner' | 'staff';
  /** The email already had an account — the link sets a new password instead. */
  existed: boolean;
}

/** Calls the owner-only `admin-invite` Edge Function; returns a shareable link. */
export function useInviteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: InviteInput): Promise<InviteResult> => {
      const env = getSupabaseEnv();
      if (!env) throw new Error('Not configured.');
      const {
        data: { session },
      } = await getDb().auth.getSession();
      const res = await fetch(`${env.url}/functions/v1/admin-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: env.anonKey,
          Authorization: `Bearer ${session?.access_token ?? env.anonKey}`,
        },
        body: JSON.stringify({
          email: input.email,
          display_name: input.displayName,
          role: input.role,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        inviteUrl?: string;
        existed?: boolean;
        error?: string;
      };
      if (!res.ok || !body.ok || !body.inviteUrl) throw new Error(inviteErrorMessage(body.error));
      return {
        inviteUrl: body.inviteUrl,
        email: input.email,
        displayName: input.displayName,
        role: input.role,
        existed: body.existed === true,
      };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  });
}
```

- [ ] **Step 6: Gate + commit**

`npm run typecheck` fails in `TeamPage.tsx` (old `useInviteStaff` call shape) — that is fixed in Task 5. Run only the unit tests and lint now:

```bash
npx vitest run src/admin/lib/inviteShare.test.ts && npm run lint
npx prettier --check src/admin/lib/inviteShare.ts src/admin/lib/inviteShare.test.ts src/admin/lib/team.ts
git add src/admin/lib/inviteShare.ts src/admin/lib/inviteShare.test.ts src/admin/lib/team.ts
git commit -m "feat(invites): WhatsApp / email share helpers; invite hook takes name + role

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Team page — name, role, share panel

**Files:**
- Create: `src/admin/components/InviteLinkPanel.tsx`
- Test: `src/admin/components/InviteLinkPanel.test.tsx`
- Modify: `src/admin/pages/TeamPage.tsx` (invite card, lines 1-80)
- Test: `src/admin/pages/TeamPage.test.tsx`

**Interfaces:**
- Consumes: `InviteResult`, `InviteInput`, `useInviteStaff`, `useTeam`, `useUpdateMember` (`src/admin/lib/team.ts`); `inviteMessage`, `whatsappShareUrl`, `inviteEmailUrl` (Task 4).
- Produces: `InviteLinkPanel({ result }: { result: InviteResult })`.

- [ ] **Step 1: Write the failing panel test**

Create `src/admin/components/InviteLinkPanel.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InviteLinkPanel } from './InviteLinkPanel';
import type { InviteResult } from '../lib/team';

const result: InviteResult = {
  inviteUrl: 'https://platinum-point.vercel.app/admin/accept-invite?token_hash=abc&type=invite',
  email: 'kevin@example.com',
  displayName: 'Kevin',
  role: 'staff',
  existed: false,
};

describe('<InviteLinkPanel />', () => {
  it('shows the link with WhatsApp and email share links', () => {
    render(<InviteLinkPanel result={result} />);
    expect(screen.getByText(result.inviteUrl)).toBeInTheDocument();
    const wa = screen.getByRole('link', { name: /whatsapp/i });
    expect(wa).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\/\?text=/));
    expect(wa).toHaveAttribute('target', '_blank');
    const email = screen.getByRole('link', { name: /email/i });
    expect(email).toHaveAttribute('href', expect.stringMatching(/^mailto:kevin@example\.com\?/));
    expect(screen.getByText(/expires/i)).toBeInTheDocument();
  });

  it('copies the link', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    render(<InviteLinkPanel result={result} />);
    await user.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(writeText).toHaveBeenCalledWith(result.inviteUrl);
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('explains a re-invite of an existing account', () => {
    render(<InviteLinkPanel result={{ ...result, existed: true }} />);
    expect(screen.getByText(/already had an account/i)).toBeInTheDocument();
  });
});
```

(`userEvent.setup()` installs a clipboard stub on `navigator.clipboard`, so the spy works in jsdom.)

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/admin/components/InviteLinkPanel.test.tsx`
Expected: FAIL — `./InviteLinkPanel` does not exist.

- [ ] **Step 3: Create the panel**

Create `src/admin/components/InviteLinkPanel.tsx`:

```tsx
import { useState } from 'react';
import { Button } from './ui';
import { inviteEmailUrl, inviteMessage, whatsappShareUrl } from '../lib/inviteShare';
import type { InviteResult } from '../lib/team';

const shareLink =
  'inline-flex items-center justify-center rounded-md border border-[color:var(--color-line)] px-3 py-1.5 text-sm font-semibold text-[color:var(--color-ink)] hover:border-signal';

/** The invite link + Copy / WhatsApp / Email (spec §6.4). */
export function InviteLinkPanel({ result }: { result: InviteResult }) {
  const [copied, setCopied] = useState(false);
  const message = inviteMessage(result.displayName, result.inviteUrl, result.existed);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.inviteUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mt-3 space-y-3 rounded border border-teal/40 bg-teal/10 p-3 text-sm">
      <p className="text-[color:var(--color-ink)]">
        {result.existed
          ? `${result.displayName} already had an account — this link lets them set a new password and sign in.`
          : `Invite for ${result.displayName} is ready. Send them this link — they choose their own password:`}
      </p>
      <code className="block break-all rounded bg-slate px-2 py-1 font-mono text-[11px]">
        {result.inviteUrl}
      </code>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void copy()}>{copied ? 'Copied' : 'Copy link'}</Button>
        <a
          className={shareLink}
          href={whatsappShareUrl(message)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Share on WhatsApp
        </a>
        <a className={shareLink} href={inviteEmailUrl(result.email, message)}>
          Email
        </a>
      </div>
      <p className="text-xs text-[color:var(--color-muted)]">
        The link works once and expires after 24 hours. If it expires, create the invite again
        to get a fresh link.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Run the panel test to verify it passes**

Run: `npx vitest run src/admin/components/InviteLinkPanel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write the failing Team page test**

Create `src/admin/pages/TeamPage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthContext, type AuthState } from '../auth/authContext';
import { TeamPage } from './TeamPage';

const mutateAsync = vi.fn();
vi.mock('../lib/team', () => ({
  useTeam: () => ({ isLoading: false, data: [] }),
  useUpdateMember: () => ({ mutate: vi.fn() }),
  useInviteStaff: () => ({ mutateAsync, isPending: false, isError: false, error: null }),
}));

const owner: AuthState = {
  loading: false,
  session: null,
  profile: {
    user_id: 'u1',
    email: 'owner@example.com',
    display_name: 'Paul',
    role: 'owner',
    is_active: true,
  },
};

describe('<TeamPage /> invite form', () => {
  beforeEach(() => mutateAsync.mockReset());

  it('requires a name and sends email, name and role', async () => {
    mutateAsync.mockResolvedValue({
      inviteUrl: 'https://platinum-point.vercel.app/admin/accept-invite?token_hash=t&type=invite',
      email: 'ann@example.com',
      displayName: 'Ann',
      role: 'owner',
      existed: false,
    });
    const user = userEvent.setup();
    render(
      <AuthContext.Provider value={owner}>
        <TeamPage />
      </AuthContext.Provider>,
    );
    expect(screen.getByLabelText('Name')).toBeRequired();
    await user.type(screen.getByLabelText('Email'), 'ann@example.com');
    await user.type(screen.getByLabelText('Name'), ' Ann ');
    await user.selectOptions(screen.getByLabelText('Role'), 'owner');
    await user.click(screen.getByRole('button', { name: 'Create invite' }));
    expect(mutateAsync).toHaveBeenCalledWith({
      email: 'ann@example.com',
      displayName: 'Ann',
      role: 'owner',
    });
    expect(await screen.findByRole('link', { name: /whatsapp/i })).toBeInTheDocument();
  });

  it('defaults the role to staff', () => {
    render(
      <AuthContext.Provider value={owner}>
        <TeamPage />
      </AuthContext.Provider>,
    );
    expect(screen.getByLabelText('Role')).toHaveValue('staff');
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run src/admin/pages/TeamPage.test.tsx`
Expected: FAIL — no element labelled `Role` / name field not required.

- [ ] **Step 7: Update the Team page**

In `src/admin/pages/TeamPage.tsx`, replace everything from the first line down to (and including) the closing `</Card>` of the invite card with:

```tsx
import { useState, type FormEvent } from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Labeled,
  PageTitle,
  Select,
  Spinner,
} from '../components/ui';
import { useAuth } from '../auth/authContext';
import { InviteLinkPanel } from '../components/InviteLinkPanel';
import {
  useInviteStaff,
  useTeam,
  useUpdateMember,
  type InviteInput,
  type InviteResult,
} from '../lib/team';

export function TeamPage() {
  const { profile } = useAuth();
  const team = useTeam();
  const invite = useInviteStaff();
  const updateMember = useUpdateMember();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<InviteInput['role']>('staff');
  const [result, setResult] = useState<InviteResult | null>(null);

  if (profile?.role !== 'owner') {
    return <EmptyState>Only the owner can manage the team.</EmptyState>;
  }

  const onInvite = async (e: FormEvent) => {
    e.preventDefault();
    setResult(null);
    try {
      const r = await invite.mutateAsync({
        email: email.trim(),
        displayName: name.trim(),
        role,
      });
      setResult(r);
      setEmail('');
      setName('');
      setRole('staff');
    } catch {
      /* invite.error is shown below */
    }
  };

  return (
    <section className="space-y-6">
      <PageTitle>Team</PageTitle>

      <Card>
        <h2 className="font-semibold text-[color:var(--color-ink)]">Invite someone</h2>
        <form
          onSubmit={onInvite}
          className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_9rem_auto] sm:items-end"
        >
          <Labeled label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Labeled>
          <Labeled label="Name">
            <Input
              required
              maxLength={80}
              placeholder="Shown in the job activity"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Labeled>
          <Labeled label="Role">
            <Select
              aria-label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value as InviteInput['role'])}
            >
              <option value="staff">Staff</option>
              <option value="owner">Owner</option>
            </Select>
          </Labeled>
          <Button variant="accent" type="submit" disabled={invite.isPending}>
            {invite.isPending ? 'Creating…' : 'Create invite'}
          </Button>
        </form>
        {invite.isError && (
          <p className="mt-2 text-sm text-signal">{(invite.error as Error).message}</p>
        )}
        {result && <InviteLinkPanel result={result} />}
      </Card>
```

Leave the members table (from `{team.isLoading ? (` to the end of the file) unchanged.

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run src/admin/pages/TeamPage.test.tsx src/admin/components/InviteLinkPanel.test.tsx`
Expected: PASS.

- [ ] **Step 9: Gate + commit**

```bash
npm run typecheck && npm run lint && npm run test
npx prettier --check src/admin/components/InviteLinkPanel.tsx src/admin/components/InviteLinkPanel.test.tsx src/admin/pages/TeamPage.tsx src/admin/pages/TeamPage.test.tsx
git add src/admin/components/InviteLinkPanel.tsx src/admin/components/InviteLinkPanel.test.tsx src/admin/pages/TeamPage.tsx src/admin/pages/TeamPage.test.tsx
git commit -m "feat(team): invite with name + role; share the link by copy, WhatsApp or email

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: STOP — owner configuration, deploy, live check

Nothing in this task runs without the user. Present the checklist, wait for "done" / "OK", then continue.

**Files:** none (live configuration only).

- [ ] **Step 1: STOP — ask the user to do the one-time Supabase settings (spec §6.5)**

Send the user this checklist and wait:

1. Supabase dashboard → **Authentication → URL Configuration**:
   - **Site URL** = `https://platinum-point.vercel.app`
   - **Redirect URLs**: add `https://platinum-point.vercel.app/admin/**` and `http://localhost:5173/admin/**`
2. Supabase dashboard → **Authentication → Email** (Email provider settings): set **Email OTP Expiration** to `86400` seconds (24 h).
3. In a terminal in the repo: `npx supabase secrets set ADMIN_SITE_URL=https://platinum-point.vercel.app`

- [ ] **Step 2: STOP — get explicit OK to deploy the three functions, then deploy**

Ask: "OK to deploy `admin-invite`, `rebuild` and `notify-customer` to the live project?" Only after a yes:

```bash
npx supabase functions deploy admin-invite
npx supabase functions deploy rebuild
npx supabase functions deploy notify-customer
```
Expected: each prints `Deployed Functions on project aonpdrqtosmqhmomghca: <name>`. (`_shared/` is bundled automatically; `verify_jwt = true` stays set in `supabase/config.toml`.)

- [ ] **Step 3: Live check (with the user, on staging after this branch is deployed, or locally via `npm run dev`)**

1. Sign in as the owner → **Team** → invite a throwaway address (e.g. a Gmail `+test` alias) with Name "Test Staff", Role Staff → **Create invite**.
   Expected: a link starting `https://platinum-point.vercel.app/admin/accept-invite?token_hash=` — never `localhost`.
2. Paste the link into a WhatsApp chat (to yourself) and let the preview load. Then open it in a private window.
   Expected: "You've been invited…" page — the preview did not use the link up.
3. Set a password → lands in the admin (Dashboard) as the new account. Team list shows **Test Staff · staff · active yes**.
4. Invite the same address again. Expected: panel says "already had an account"; the link has `type=recovery`; opening it shows "Set a new password".
5. As owner, click **Publish** somewhere that triggers rebuild (or the rebuild button) — expected: no 403 (the `rebuild` lookup fix).
6. Deactivate the throwaway account on the Team page afterwards.

Record the result in the PR description. Any failure → superpowers:systematic-debugging before changing code.

---

### Task 7: Docs + final gates

**Files:**
- Modify: `docs/owner-guide.md` (section "Adding a staff member (owner only)", lines 104-109)
- Modify: `docs/pick-up-here.md` (Phase 3 remaining-work bullet "Add the staff member")

- [ ] **Step 1: Update the owner guide**

Replace the "## Adding a staff member (owner only)" section in `docs/owner-guide.md` with:

```markdown
## Adding a staff member (owner only)

1. **Team → Invite someone** → enter their **email** and **name** (the name is what the
   job activity shows), pick **Staff** (or **Owner**) → **Create invite**.
2. Send the link with **Share on WhatsApp**, **Email** (opens your own email app) or
   **Copy link**. They open it, choose a password and are straight in — the invite is
   your approval.
3. The link works once and expires after 24 hours. If it expires, create the invite
   again for a fresh link. Inviting an email that already has an account gives them a
   "set a new password" link instead.
4. Use **Deactivate** on the Team list to switch off a login.
```

- [ ] **Step 2: Update pick-up-here**

In `docs/pick-up-here.md`, replace the bullet `- **Add the staff member:** Team → Invite (needs their email).` with:

```markdown
- **Add the staff member:** Team → Invite (email + name + role) → share the link by
  WhatsApp/email. One-time setup first (RBAC R-A): Supabase Site URL + Redirect URLs,
  Email OTP expiry 86400 s, and `npx supabase secrets set ADMIN_SITE_URL=https://platinum-point.vercel.app`.
  Until RBAC R-B ships, staff still have full admin access.
```

- [ ] **Step 3: Full gates**

```bash
npm run typecheck && npm run lint && npm run test && npm run build
npx prettier --check src
```
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add docs/owner-guide.md docs/pick-up-here.md
git commit -m "docs: how to invite staff with a shareable link (RBAC R-A)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Hand off**

Use superpowers:finishing-a-development-branch. Push / open the PR only when the user asks; the PR body ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

---

## Self-review (spec coverage)

| Spec item | Task |
|---|---|
| §1.2 / §6.1 link never localhost, built from `ADMIN_SITE_URL`, `hashed_token` | 1 (`buildAcceptUrl`), 2 |
| §6.1 accept page outside `RequireAuth`, consumes nothing on open, verify → set password → admin, expired message | 3 |
| §6.1 existing account → `recovery`, same page "Set a new password" | 2, 3 |
| §1.3 / §6.2 owner check by `auth.getUser()` + `.eq('user_id', user.id)` | 2 (`_shared/caller.ts`) |
| §6.3 Role select (Staff default, Owner); function sets role + `is_active = true` | 2, 5 |
| §6.4 Copy / WhatsApp / Email + expiry note | 4, 5 |
| §6.5 dashboard settings + secret | 6 (STOP) |
| §10.2 display name required | 1 (`bad-name`), 5 (`required`) |
| §8 Vitest: accept page (verify → set password → enter; expired), share-link encoding | 3, 4, 5 |
| §8 manual: invite via WhatsApp link → accept on a phone | 6 |
