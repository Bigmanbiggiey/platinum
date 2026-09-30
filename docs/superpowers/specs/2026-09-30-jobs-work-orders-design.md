# Jobs (work orders) → published portfolio timeline — design

> **Status:** DRAFT — design approved section-by-section in chat (2026-09-30).
> **Not approved for build.** Pulls roadmap items **P-1** (vehicle service history) and
> **P-2** (job / work-order management) forward, ahead of Phase 2 Part C (Go-Live). Per the
> phase-gated workflow this needs the owner's explicit sign-off — see ADR-0014 in
> `docs/decisions.md` (Proposed).

---

## 1. Problem

A completed repair today lives as a `service_request` with `status = completed`. If the
owner wants to show it off, they re-type the vehicle, service, date and write-up by hand in
**Content → Portfolio** — duplicate entry, no link between the two, and no record of *what
was found* or *what was fixed*. There is no per-vehicle history at all.

## 2. Goal

A **Jobs** section in the admin where the owner records a work order as it happens —
check-in → diagnosis (problems + photo evidence) → repair (fixes + "after" photos + parts)
→ completion — and, once the job is completed and the client has consented, **publishes
it with one tap** as a public portfolio entry showing that timeline and an optional client
review. Purpose: transparency and accountability to clients.

## 3. Decisions made (chat, 2026-09-30)

| # | Question | Decision |
|---|---|---|
| D1 | Scope of a job record | **Full work order** — status pipeline, findings, fixes, photos, parts, labour/costs. |
| D2 | When does a job go public? | **Owner publishes manually, after completion.** Jobs are private by default. Client consent (checkbox at check-in) is a hard precondition. |
| D3 | Relationship to Portfolio | **Linked entry.** Publishing creates a `portfolio_project` with `job_id`; the public page renders live from the job. Manual portfolio entries remain for non-job showcase work. |
| D4 | Testimonials | **Both:** one-time private review link (primary) + owner-entered on the client's behalf (fallback, labelled publicly). |
| D5 | Public vs private fields | Odometer **private**. Parts **public by name only** — no quantity field exists; any part cost is private. |
| D6 | Admin job page shape | **Tabs per stage**, fillable in any order (not a forced wizard). |

## 4. Data model

One new migration, `supabase/migrations/<ts>_jobs.sql`.

### 4.1 New enums

```sql
create type public.job_status     as enum ('checked_in', 'diagnosing', 'in_repair', 'completed', 'cancelled');
create type public.finding_outcome as enum ('pending', 'fixed', 'deferred', 'not_fixed');
create type public.job_photo_stage as enum ('check_in', 'diagnosis', 'repair');
```

### 4.2 New tables (all private; RLS = `is_admin()` full CRUD, anon nothing)

**`job`**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `job_number` | text unique not null | `PP-YYYY-NNNN`, assigned by a trigger from a per-year sequence/counter. |
| `client_id` | uuid → `client` **on delete set null** | Job survives client deletion. |
| `vehicle_id` | uuid → `vehicle` **on delete set null** | `vehicle` cascades on client delete, so this must be `set null`. |
| `vehicle_label` | text not null | **Snapshot** at check-in, e.g. `2014 Toyota Fielder` (make/model/year only — never the registration). The public page uses this, so it survives vehicle edits/deletion. Editable. |
| `service_request_id` | uuid → `service_request` on delete set null, **unique** | Null for walk-ins. |
| `service_id` | uuid → `service` on delete set null | What kind of work (drives public card label). |
| `status` | `job_status` not null default `checked_in` | |
| `booked_at` | timestamptz | Copied from the request's agreed/requested date when started from a request. |
| `checked_in_at` | timestamptz not null default now() | |
| `completed_at` | timestamptz | Set when status → `completed`; cleared if re-opened. |
| `odometer_km` | integer | **Private.** |
| `complaint` | text | Customer-reported issue (owner's words). Public on publish. |
| `public_consent` | boolean not null default false | |
| `consent_recorded_at` | timestamptz | Set by trigger when `public_consent` flips true. |
| `labour_hours` | numeric(5,2) | **Private.** |
| `labour_cost_kes` | integer | **Private.** |
| `internal_notes` | text | **Private.** |
| `created_by`, `created_at`, `updated_at` | | Standard. |

**`job_finding`** — one problem found, and its fix.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `job_id` | uuid → `job` on delete cascade | |
| `display_order` | integer not null default 100 | |
| `title` | text not null | e.g. "Worn front brake pads". |
| `diagnosis` | text | What was found / how. |
| `fix` | text | What was done. |
| `outcome` | `finding_outcome` not null default `pending` | `deferred` = client chose not to fix now. |
| `created_at`, `updated_at` | | |

**`job_photo`**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `job_id` | uuid → `job` on delete cascade | |
| `finding_id` | uuid → `job_finding` on delete set null | Null = general (e.g. check-in overview). |
| `media_id` | uuid → `media` on delete cascade | Reuses the media library + `public-media` bucket. |
| `stage` | `job_photo_stage` not null | Diagnosis photos = "before", repair photos = "after". |
| `caption` | text | |
| `is_public` | boolean not null default true | Per-photo publish toggle. |
| `display_order` | integer not null default 100 | |

**`job_part`**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `job_id` | uuid → `job` on delete cascade | |
| `finding_id` | uuid → `job_finding` on delete set null | Which fix it was used for. |
| `name` | text not null | **Public** (when the job is published). |
| `cost_kes` | integer | **Private.** Optional. No quantity field (D5). |

**`review_invite`**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `job_id` | uuid → `job` on delete cascade | |
| `token_hash` | text unique not null | SHA-256 of a 32-byte random token. The raw token is shown to the owner once and never stored. |
| `expires_at` | timestamptz not null | now() + 30 days. |
| `used_at` | timestamptz | |
| `created_by`, `created_at` | | |

Generating a new link for a job invalidates (expires) any earlier unused link for that job.

### 4.3 Changes to existing tables

- `portfolio_project.job_id uuid unique references public.job (id) on delete restrict`
  — `restrict` enforces "unpublish before deleting a published job".
- `testimonial.job_id uuid references public.job (id) on delete set null`.
- `testimonial.source` **already exists** (default `'public_form'`). Add a check
  constraint: `source in ('public_form', 'review_link', 'owner_entered')`.

### 4.4 Triggers / DB rules

- **Job number:** `before insert` assigns `job_number`.
- **Consent timestamp:** sets/clears `consent_recorded_at` with `public_consent`.
- **Consent revoked → unpublish:** `after update of public_consent` on `job`: if it becomes
  false, set `is_published = false` on the linked `portfolio_project`.
- **Publish guard:** `before insert or update` on `portfolio_project`: if `job_id` is not
  null and `is_published` is true, require the job to be `completed` **and**
  `public_consent`; otherwise raise. The UI disables the button too, but the database is
  the authority.
- **Completion side-effects:** when `job.status` → `completed`, set `completed_at` and
  move the linked `service_request` to `completed` (if it is not already `completed` or
  `closed`). Leaving `completed` clears `completed_at` and, if the job is published,
  unpublishes it.

### 4.5 Public read model

A single security-definer view (same pattern as `testimonial_public`), granted `select`
to `anon, authenticated`, and **no other anon access to any job table**:

- **`job_public`** — one row per job whose linked `portfolio_project.is_published` and
  `job.public_consent` are both true. Columns: `job_id`, `job_number`, `portfolio_slug`,
  `vehicle_label`, `service_id`, `booked_at`, `checked_in_at`, `completed_at`,
  `complaint`, and JSON aggregates:
  - `findings`: `[{title, diagnosis, fix, outcome, parts: [name…], photos: {before: […], after: […]}}]`
  - `general_photos`: check-in / unattached photos
  - each photo: `{storage_path, alt_text, caption, width, height}` — **only `is_public` photos**.
  - `testimonial`: the approved testimonial for the job (first name, vehicle label,
    rating, comment, source), if any.

**Never selected into the view:** client name/phone/email/any `client` column,
`vehicle.registration`, `vehicle.vin`, `odometer_km`, `labour_*`, `internal_notes`,
`job_part.cost_kes`, anything on `review_invite`.

**Media policy:** extend `"media: anon reads images of published work"` with a third
`exists` branch — the media row is referenced by a `job_photo` with `is_public` whose job
is in `job_public`'s condition. (The `public-media` bucket itself is already public-read;
this governs the `media` metadata rows.)

**Review-link lookup:** a security-definer function
`public.review_invite_summary(token text) returns table (vehicle_label text, service_title text, completed_at timestamptz)`,
executable by `anon`. Hashes the token; returns a row only for an unexpired, unused
invite, else zero rows. Exposes no client data.

## 5. Admin (`/admin/jobs`)

New sidebar item **Jobs**, between Requests and Schedule. Follows existing patterns
(`src/admin/lib/crud.ts` / `resources.ts`, TanStack Query, `ui.tsx` kit, mobile-first).

### 5.1 Routes

- `/admin/jobs` — list.
- `/admin/jobs/new` — walk-in: pick/create client + vehicle, then land on the job.
- `/admin/jobs/:id` — job page (tabs).

### 5.2 List

Filters: **Open** (`checked_in` / `diagnosing` / `in_repair`), **Completed**,
**Published**, **Cancelled**, All. Search by job number, client name, registration.
Newest first. Cards on mobile: job number, vehicle label, client, status, date.

### 5.3 Starting a job

- **From a request** — "Start job" on `RequestDetailPage`. Requires the request to be
  linked to a client + vehicle (reuse the existing **Convert to client** flow inline if
  not). Prefills `client_id`, `vehicle_id`, `vehicle_label`, `service_request_id`,
  `booked_at`, `complaint` (from the request message). If a job already exists for the
  request, the button becomes "Open job".
- **Walk-in** — "New job" on the list.

### 5.4 Job page — header + four tabs (any order)

**Header:** job number, vehicle label, client (link), status selector, and the Publish
panel (§5.5).

1. **Check-in** — booked / checked-in dates, odometer, complaint, check-in photos, and
   the **consent checkbox** ("Client agrees to this job being shown on our website").
2. **Diagnosis** — findings list: add / reorder / edit title + diagnosis; per-finding
   photo upload (stage `diagnosis`). Uses the phone camera (`<input type=file accept="image/*" capture="environment">`).
3. **Repair** — per finding: fix notes, outcome (fixed / deferred / not fixed), "after"
   photos (stage `repair`), parts (name + optional private cost).
4. **Wrap-up** — labour hours + cost, a private cost summary (labour + parts),
   **Mark completed**; **Generate review link** (shows the URL once; Copy, and
   "Send on WhatsApp" opening `wa.me/<client whatsapp or phone>?text=…`); **Add testimonial
   on client's behalf** (first name prefilled, vehicle label, rating, comment →
   `testimonial` with `source = owner_entered`, `status = approved`, `job_id`).

Every photo shows its **public** toggle wherever it appears.

### 5.5 Publish panel

- Disabled with a reason until `status = completed` **and** `public_consent`.
- **Publish to website** opens a preview of the public page (same component as §6.2)
  with an editable **title** (default `"<service> — <vehicle label>"`) and **summary**
  (default: first line of the complaint), plus the photo toggles.
- Confirm → insert (or re-publish) the `portfolio_project` row: `job_id`, `slug`,
  `title`, `summary`, `service_id`, `project_date = completed_at::date`,
  `cover_media_id` = first public repair photo (else first public photo),
  `is_published = true`, `vehicle_make/model/year` from the vehicle if present.
  Then `usePublish()` (existing debounced rebuild).
- **Unpublish** → `is_published = false` + rebuild. The row is kept so the slug is stable
  on re-publish.
- Any edit to a published job's public fields, photos or toggles also triggers
  `usePublish()`.

### 5.6 Integrations with existing admin

- **Client detail:** a "Jobs" list grouped by vehicle → the per-vehicle service history
  (P-1).
- **Portfolio list/edit (Content):** entries with `job_id` show a "Documented job" badge
  and **Edit in Jobs →**; the content form is read-only for them.
- **Testimonials moderation:** show the linked job number when `job_id` is set.
- **Dashboard:** "Open jobs" count.

### 5.7 Photo privacy

All job photo uploads go through a new `prepareImage(file)` step before
`useUploadMedia()`: decode → draw to canvas → re-encode as WebP/JPEG (max 2400 px long
edge). Re-encoding **strips EXIF, including GPS**, and cuts upload size on mobile data.
(Currently `src/admin/lib/storage.ts` uploads the raw file with EXIF intact — this
spec applies the fix to job photos; applying it to all uploads is recommended in the same
change.)

## 6. Public site

### 6.1 Portfolio list (`/portfolio`)

`portfolioLoader` also reads `job_public` for linked entries. Job cards show cover photo,
vehicle label, service, completed date, and a **"Documented job"** tag. Ordering: most
recent first (`project_date desc`, then `display_order`).

### 6.2 Job detail (`/portfolio/:slug`)

`portfolioDetailLoader`: if the entry has `job_id`, fetch its `job_public` row and render
a new `JobTimeline` component instead of the Markdown body:

1. **Booked / checked in** — dates + complaint.
2. **Diagnosis** — each finding: title, diagnosis, public "before" photos.
3. **Repair** — each finding: fix, parts list (names), public "after" photos. Deferred
   findings render as *"Recommended — not done at client's request"*.
4. **Completed** — date.
5. **Client review** — approved testimonial, "First name, vehicle"; owner-entered ones
   carry *"Shared with us by the client"*.

Before/after pairs sit side by side (stacked on mobile); photos open full-size on tap.
Uses the Rev 01 tokens / design-refresh conventions (mono for job number + dates, amber
"completed" node).

**Slug:** `<vehicle-label>-<service>-<job-number-digits>` slugified, e.g.
`2014-toyota-fielder-brake-overhaul-0042`. Unique by construction.

**SEO:** prerendered via existing `portfolioStaticPaths`; JSON-LD describes the work as
a `Service` on a vehicle + `BreadcrumbList`. **No client data in JSON-LD, meta or OG.**
Unpublished → not in `getStaticPaths` → 404 after the next rebuild.

### 6.3 Review page (`/review/:code`)

- New public route, `noindex`, excluded from the sitemap and `Disallow`ed in robots.
- Prerendered as a single shell at `/review`; `vercel.json` gets a rewrite
  `/review/:code → /review`. The page reads the code client-side.
- On load: `rpc('review_invite_summary', { token })`. No row → one generic message
  ("This link is no longer valid — please contact us"). Row → "How did we do on your
  2014 Toyota Fielder (Brake overhaul, completed 12 Sep)?" + form: first name, rating,
  comment, consent to show publicly.
- Submit → `submit` function with `kind: 'review'` (§7.2).

## 7. Security

### 7.1 RLS

- New tables: RLS enabled; `authenticated` + `is_admin()` full CRUD (same as
  `client`/`vehicle`); `revoke all … from anon`.
- `job_public` view + `review_invite_summary` are the **only** anon surfaces.

### 7.2 `submit` — `kind: 'review'`

- Same honeypot, timing and Turnstile layers as today.
- Redeem atomically via a security-definer SQL function
  `public.redeem_review_invite(token text, first_name text, rating int, comment text, consent bool)`,
  **executable by `service_role` only**. In one transaction:
  `update review_invite set used_at = now() where token_hash = sha256(token) and used_at is null and expires_at > now() returning job_id`
  → if no row, raise; else insert `testimonial` (`source = 'review_link'`,
  `status = 'pending'`, `job_id`, `vehicle_label` from the job). A concurrent double submit
  cannot both succeed.
- Invalid / expired / used → one generic error response (no enumeration).
- Goes through existing moderation; the `notify_on_testimonial` trigger fires as today.

## 8. Edge cases

| Case | Behaviour |
|---|---|
| Delete a published job | Blocked (`on delete restrict`); UI says "Unpublish first". |
| Delete a client | Jobs kept, `client_id`/`vehicle_id` → null; public page unaffected (uses `vehicle_label` snapshot). |
| Consent unticked on a published job | DB trigger unpublishes; UI triggers rebuild. |
| Job re-opened from `completed` | Unpublished automatically. |
| Photo toggled private / deleted on a published job | Rebuild triggered. |
| Rebuild hook not configured | Existing "saved — goes live on next deploy" message. |
| Two review links generated | Older unused one expired. |
| Job cancelled | Cannot be published; kept for history. |

## 9. Testing

Vitest, following `rls.test.ts` (anon block always runs; authed block env-gated on
`TEST_ADMIN_*`):

- anon **cannot** select `job`, `job_finding`, `job_photo`, `job_part`, `review_invite`.
- `job_public` exposes no private column; excludes unpublished jobs, jobs without
  consent, and non-public photos.
- Publish guard: publishing an incomplete or no-consent job raises; revoking consent
  unpublishes.
- `redeem_review_invite`: succeeds once; fails expired; fails reused; anon cannot call it.
- `review_invite_summary`: returns nothing for bad/expired/used tokens.
- Component (RTL): job page tabs render and save; Publish disabled states;
  `JobTimeline` renders deferred findings, before/after pairs, owner-entered label;
  `prepareImage` output has no EXIF.

Plus `npm run typecheck && npm run lint && npm run test && npm run build` green before
each package is marked done.

## 10. Delivery — three work packages

Each is built, deployed to staging, and checked by the owner before the next starts.

| WP | Contents | Public impact |
|---|---|---|
| **J1 — Admin jobs** | Migration (tables, enums, triggers, RLS), `prepareImage`, Jobs list + job page (all four tabs incl. parts/labour), Start job from request, client-page jobs, dashboard count. | None. |
| **J2 — Publish** | `job_public` view, media policy, publish guard, Publish panel + preview, `JobTimeline`, portfolio loaders/cards, Content-side lock + badge. | Published jobs appear under Portfolio. |
| **J3 — Reviews** | `review_invite`, `review_invite_summary`, `redeem_review_invite`, `submit` `kind: 'review'`, `/review/:code` page + rewrite + robots/sitemap exclusion, owner-entered testimonial, testimonial→job display. | Review links work; reviews show on job pages. |

## 11. Out of scope

Quotes, invoices, payments (P-4/P-5); customer portal (P-8); reminders (P-6); sending
review links automatically (owner sends manually via WhatsApp/copy); job assignment to
staff members / per-staff permissions (P-11); PDF export of a job.

## 12. Open items for the owner

1. **Approve ADR-0014** — building P-1/P-2 now, before Go-Live (Part C).
2. Confirm the public wording for deferred findings
   (*"Recommended — not done at client's request"*).
3. Confirm the consent wording at check-in.
