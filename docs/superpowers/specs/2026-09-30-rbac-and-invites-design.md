# RBAC (owner / staff) + shareable staff invites — design

> **Status:** DRAFT — awaiting review. Decisions below were made in chat on 2026-09-30.
> Builds on: Jobs J1 (`2026-09-30-jobs-work-orders-design.md`), the owner-profile
> lookup fix (`fix/owner-profile-lookup`), the no-access sign-out fix
> (`fix/admin-no-access-signout`) and the self-promotion hotfix
> (`20260930140000_guard_profile_privileges.sql`, already applied to the live project).

## 1. Problems

1. **Everyone active is a full admin.** `public.is_admin()` gives any active profile
   full read/write on every table (CMS, CRM, requests, jobs, settings). "Staff" differs
   from "owner" only on the Team page.
2. **Staff invites produce `localhost` links.** `admin-invite` asks Supabase for an
   invite link whose redirect is `<request Origin>/admin/reset`. Supabase only honours
   redirects on the project's allow-list and otherwise falls back to the project Site
   URL — still `http://localhost:3000`. Inviting from a local dev server makes it
   `localhost` outright.
3. **Invites are also blocked for the owner.** `admin-invite` checks the caller with the
   same unfiltered `profile … maybeSingle()` query that locked the owner out of the
   admin; with two profiles it returns 403.
4. **One-time links die in chat apps.** WhatsApp / email scanners pre-open links for
   previews, which can consume a one-time Supabase verify link before the person taps it.
5. **No attribution.** Nothing records which person did what on a job.

## 2. Decisions (chat, 2026-09-30)

| # | Question | Decision |
|---|---|---|
| D1 | Roles | **Owner + Staff** (keep the existing `profile.role` values). |
| D2 | Staff access | **Jobs & (job) schedule only.** No requests, clients, website content, settings, team, notifications. |
| D3 | What staff see on a job | **Vehicle details and job details only** — no client name/phone, no linked request, **no costs**. |
| D4 | Attribution | Every staff action on a job is recorded with **who did it**, shown on the owner's dashboard and the job. |
| D5 | Job creation | **Staff can check in walk-ins** from vehicle details alone; the owner links a client later. **Only the owner deletes** jobs. |
| D6 | Staff schedule | **Job schedule only** (booked date, vehicle, job number). The booking-request Schedule stays owner-only. |
| D7 | Invite email | **Opens the owner's own email app** (`mailto:` with the link pre-filled). No server email. |
| D8 | Activation | **Accepting an invite gives access immediately** (the owner's invite is the approval). |
| D9 | Invite delivery | Copy link · Share on WhatsApp · Email — one link, never `localhost`. |

## 3. Permission matrix

| Area | Owner | Staff |
|---|---|---|
| Dashboard (counts, recent requests, **job activity feed**) | ✅ | — (lands on Jobs) |
| Notifications | ✅ | — |
| Requests, Schedule (booking requests) | ✅ | — |
| Clients | ✅ | — |
| Vehicles | ✅ all | 👁 + ✏️ only vehicles on a job; ➕ new vehicle for a walk-in (no client) |
| Jobs — list, view, check-in, diagnosis, repair, photos, parts (name + qty), labour hours, complete / re-open | ✅ | ✅ |
| Jobs — create | ✅ (any, incl. from a request) | ✅ walk-in only (no client, no request) |
| Jobs — delete, cancel | ✅ | — |
| Jobs — client & linked request shown | ✅ | — (hidden and unreadable) |
| Costs (labour cost, part costs, cost summary) | ✅ | — (unreadable) |
| Job schedule (agenda of jobs by booked date) | ✅ | ✅ |
| Job activity (who did what) | ✅ all | 👁 on jobs they can see |
| Website content, media library, settings | ✅ | — (job photo uploads only) |
| Team & invites | ✅ | — |

Everything is enforced in **Postgres (RLS + triggers)**; the admin UI mirrors it (menu,
routes, buttons) so staff never see controls that would fail.

## 4. Data model changes (migration R-1)

### 4.1 Role helpers
- Keep `public.is_admin()` (active profile) and `public.is_owner()`.
- Add `public.is_staff()` = active profile with `role = 'staff'` (security definer,
  `search_path = ''`).

### 4.2 Owner-only tables
Replace each `"<table>: admin all"` policy with `"<table>: owner all"` (`is_owner()`)
on: `service_request`, `client`, `notification`, `service`, `portfolio_project`,
`portfolio_media`, `testimonial`, `content_block`, `service_area`, `partner`,
`site_settings`. (Anon policies unchanged.)

### 4.3 Vehicles
- `vehicle.client_id` becomes **nullable** (walk-ins); FK stays `on delete cascade`.
- Policies: owner all; staff **select/update** vehicles referenced by any `job`; staff
  **insert** only with `client_id is null`. A trigger stops staff changing `client_id`.

### 4.4 Jobs
- `job`: owner all. Staff **select** all jobs; **insert** only with
  `client_id is null and service_request_id is null`; **update** allowed, but a trigger
  (same pattern as the profile guard) stops non-owners changing `client_id`,
  `service_request_id`, or setting `status = 'cancelled'`. No staff delete.
- `job_finding`, `job_photo`, `job_part`: `is_admin()` CRUD (staff need it to work),
  scoped to existing jobs.
- **Costs move out of staff-readable rows** (RLS is per row, not per column, and owner
  and staff share the `authenticated` Postgres role):
  - `job.labour_cost_kes` → new owner-only table `job_cost (job_id pk, labour_cost_kes)`.
  - `job_part.cost_kes` → new owner-only table `job_part_cost (part_id pk, cost_kes)`.
  - Migration copies existing values, then drops the old columns. `labour_hours` and
    part `quantity` stay on the shared rows (staff record them).
- `job.client_id` stays readable as a uuid for staff, but the `client` table is
  owner-only, so names/phones never reach them (embeds return `null`).

### 4.5 Media for job photos
- `media`: owner all; staff **insert** (with `created_by = auth.uid()`, default
  `auth.uid()`), **select** rows they created or that a `job_photo` references.
- Storage `public-media`: insert stays `is_admin()` (staff upload job photos);
  update/delete become owner-only; read stays admin-only (C1 fix).

### 4.6 Job activity log
New table `job_activity`:

| Column | Notes |
|---|---|
| `id` uuid pk, `job_id` → job **on delete cascade**, `created_at` | |
| `actor_id` uuid → auth.users (null = system) | `auth.uid()` at the time |
| `actor_name` text | snapshot of `profile.display_name` / email, so history survives renames and removals |
| `actor_role` text | `owner` / `staff` snapshot |
| `action` text | `checked_in`, `status_changed`, `finding_added`, `finding_updated`, `photo_added`, `photo_removed`, `part_added`, `part_removed`, `labour_updated`, `consent_changed` |
| `detail` jsonb | e.g. `{from, to}`, finding title, photo count |

- Written **only** by `AFTER` triggers on `job`, `job_finding`, `job_photo`, `job_part`
  (security definer; no insert/update/delete grants to any client role), so entries
  can't be skipped or forged from the browser.
- Consecutive photo uploads by the same person on the same job within 2 minutes are
  merged into one entry with a count ("added 3 after photos").
- RLS: owner reads all; staff read entries for jobs they can see.

## 5. Admin UI changes (R-2)

- **Auth context** exposes `role`; new `<RequireOwner>` guard for owner-only routes
  (renders the no-access screen with sign-out for staff).
- **Nav:** owner unchanged (+ nothing new); staff see **Jobs** and **Schedule** only,
  and land on `/admin/jobs` instead of the Dashboard.
- **Job pages for staff:** hide client name/link, "request" link, costs (labour cost
  input, part cost input, cost summary), Cancel, Delete; New job = walk-in form with
  vehicle fields only (no client picker).
- **Job page (everyone):** an **Activity** section/tab listing the job's timeline.
- **Dashboard (owner):** new **Recent job activity** card — last 20 entries:
  *"Kevin · staff — added 2 after photos · PP-2026-0042 · 2014 Toyota Fielder · 10 min ago"*,
  each linking to the job.
- **Schedule for staff:** an agenda of jobs by `booked_at` (job number, vehicle,
  status) — no customer data. Owner keeps the booking Schedule (and can see the job
  agenda too).

## 6. Invites (R-3)

### 6.1 Link that never points at localhost and survives link previews
- `admin-invite` builds the link itself from a **configured** base URL:
  `${ADMIN_SITE_URL}/admin/accept-invite?token_hash=<hashed_token>&type=invite`
  (`hashed_token` comes from `auth.admin.generateLink`). New secret
  `ADMIN_SITE_URL` (staging: `https://platinum-point.vercel.app`; later the production
  domain). No `Origin` header, no Supabase Site URL fallback.
- `/admin/accept-invite` (admin SPA, outside `RequireAuth`): **opening it consumes
  nothing.** It shows "You've been invited to the Platinum Point admin" and a
  password form. On submit: `auth.verifyOtp({ type, token_hash })` → then
  `auth.updateUser({ password })` → into the admin. Expired/used link → a clear
  message ("Ask the owner for a new invite link").
- Existing account (e.g. re-inviting `ndiranguh02@gmail.com`): the function issues a
  `recovery` token instead; the same page handles `type=recovery` ("Set a new
  password").

### 6.2 Owner check fixed
`admin-invite` identifies the caller with `auth.getUser()` and reads **that user's**
profile (`.eq('user_id', user.id)`), mirroring the `getProfile` fix.

### 6.3 Role + activation
- Invite form gets a **Role** select (Staff default, Owner).
- The function (service role) sets the new profile to the chosen role and
  **`is_active = true`** (D8). The profile guard allows this because it only restricts
  `authenticated` callers.

### 6.4 Team page
After "Create invite": the link plus **Copy link**, **Share on WhatsApp**
(`https://wa.me/?text=<message + link>`), **Email** (`mailto:<email>?subject=…&body=…`).
A note says the link expires (see 6.5) and can be regenerated.

### 6.5 Configuration the owner does once (Supabase dashboard)
- Authentication → URL Configuration: **Site URL** = `https://platinum-point.vercel.app`
  (so any remaining Supabase-built emails, e.g. "Forgot password", stop pointing at
  localhost); **Redirect URLs** add `https://platinum-point.vercel.app/admin/**` and
  `http://localhost:5173/admin/**`.
- Authentication → Email: raise **email OTP / link expiry** to 86400 s (24 h) so a
  WhatsApp'd link survives a working day (default is 1 h).
- `npx supabase secrets set ADMIN_SITE_URL=https://platinum-point.vercel.app`.

## 7. Security notes

- All permissions are enforced in the database; UI hiding is convenience only.
- Staff can never read `client`, `service_request`, `job_cost`, `job_part_cost`,
  `notification`, `site_settings`, or other staff/owner profiles beyond their own.
- Attribution rows are trigger-written only; clients cannot insert, edit or delete them.
- Token-hash links are one-time and expire; the accept page never auto-consumes them.

## 8. Testing

- SQL test `supabase/tests/rbac.sql` (throwaway owner + staff users, always rolled
  back): staff can/can't read/write every table in §3; staff can't create a job with a
  client or request, can't cancel/delete, can't change `client_id`; staff can't read
  `job_cost`/`job_part_cost`/`client`; owner can do everything; activity rows are
  written with the right actor and can't be inserted directly.
- Extend `profile_guard.sql` if needed; keep `jobs_j1.sql` green.
- Vitest: `RequireOwner`, nav by role, job page hides costs/client for staff,
  accept-invite page (verify → set password → enter; expired-link message), invite
  share links (WhatsApp/mailto encoding).
- Manual (staging): invite a staff member via WhatsApp link → accept on a phone →
  staff sees Jobs + Schedule only → records a repair with photos → owner dashboard
  shows "<name> · staff — …".

## 9. Delivery

| Package | Contents |
|---|---|
| **R-A Invites** (first — invites are broken today) | §6: `admin-invite` fix + link builder + role/activation, accept page, Team page share options, config steps. |
| **R-B RBAC** | §4.1–4.5 migration + §5 UI gating (nav, guards, staff job view, walk-in form, costs split). |
| **R-C Attribution** | §4.6 activity log + dashboard feed + job Activity section. |

Each package gets its own plan, branch and PR; migrations need your OK before `db push`.

## 10. Open items

1. Pending PRs (`fix/owner-profile-lookup`, `fix/admin-no-access-signout`,
   `fix/enquiry-confirmation-apostrophe`, `fix/profile-self-promotion`) should be
   merged before R-A starts — R-A/R-B touch the same auth files.
2. Staff display names: the Team page should require a display name on invite so the
   activity feed reads "Kevin", not an email.
