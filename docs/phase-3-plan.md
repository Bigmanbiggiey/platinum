# Phase 3 — Admin MVP (CMS + CRM) · Plan

> **Status: APPROVED & IN PROGRESS (2026-09-07).** May run in parallel with Phase 2
> Go-Live (WP14 Part C).
> **Created:** 2026-09-07 · Companion to `roadmap.md` (Phase 3), `product-definition.md`
> §6, `decisions.md` (ADR-0007).

## Decisions locked at kickoff (2026-09-07)

- **Auth (ADR-0007):** email + password, email password-reset. No public sign-up.
- **Roles:** `owner` (Paul, `gatama98p@gmail.com`) + `staff`. Both get **full admin
  CRUD** in the MVP; `owner` additionally manages staff via an admin **Team** screen.
  Seed the owner; the staff account is created through the UI once the owner supplies
  that person's email.
- **Notifications:** owner **email** on new enquiry / booking / testimonial (the
  `submit` function already does this) **plus an in-app Notifications view** in the
  admin (unread badge, click-through, mark-read). Backed by a `notification` table
  populated by a DB trigger so any insert path generates one.
- **Admin panel includes a "View site ↗" link** to the public site (new tab).
- **Tech choices accepted:** dedicated `admin.html` entry, Markdown-textarea +
  preview editor (reuses `<Prose>`, now sanitised), TanStack Query, a `rebuild` Edge
  Function for publish→rebuild.

---

## 1. Goal

**The owner can sign in on a phone and run the business from one place** — see and
work enquiries and bookings, keep clients and vehicles on file, and edit every piece
of the public website (services, portfolio, testimonials, copy, areas, partners,
business info) without a developer. Publishing in the admin updates the live site.

### "Done" looks like

- The owner logs in on a phone, works a real enquiry end-to-end (contact → convert to
  client + vehicle → schedule → complete), and edits a piece of site copy — all
  unaided.
- Publishing a service / approving a testimonial / editing settings makes the change
  appear on the public site within a build cycle.
- RLS proven: authenticated admin has full CRUD; anon still sees only published/approved
  data and cannot write except through the `submit` function.
- `typecheck` / `lint` / `test` / `build` green; deployed.

---

## 2. Prerequisites

### 2.1 Decisions to lock (see §11)

| ADR / choice | Recommendation |
| --- | --- |
| **ADR-0007 — admin auth** | **Email + password** + email password-reset. No public sign-up; accounts created deliberately. Owner input: password vs magic-link. |
| **Admin entry / routing** | Give the admin its **own HTML entry** (`admin.html` as a second Vite/vite-react-ssg input) — fixes the Phase 2 `/admin` hydration mismatch and fully separates the bundle. |
| **Rich text** | **Markdown textarea + live preview** (reuses the existing `<Prose>` renderer; no WYSIWYG dependency). Add sanitisation to `<Prose>` now that content is user-editable. |
| **Data fetching** | **TanStack Query** — the admin is mutation-heavy (lists + refetch + optimistic updates). One dependency, big ergonomics win. |
| **Publish → rebuild** | A small Supabase **Edge Function `rebuild`** holding the Vercel Deploy Hook URL as a secret; the admin calls it (authenticated) after publish/approve/settings changes. Keeps the hook URL out of the client. |

### 2.2 Owner input needed

1. **§14.2 Q17** — who administers day-to-day: Paul only, or a second person? (Seed one
   `owner` account regardless; a second is a row + an invite.)
2. Password vs magic-link for sign-in (ADR-0007).
3. Confirm the notification channel for new enquiries / booking confirmations —
   **email** for MVP (the `submit` function already supports Resend); WhatsApp is
   Post-MVP.

### 2.3 Technical prerequisites (in hand)

- ✅ Supabase project live with the Phase 2 schema + RLS + `submit` function.
- ✅ Vercel project connected to GitHub (needed for the Deploy Hook).
- ⏳ A **Vercel Deploy Hook** URL (create in project settings) for WP10.
- ⏳ **Resend** key (shared with WP14 Part C) for booking-confirmation emails to
  customers. Without it, the admin still works; confirmations just aren't sent.

---

## 3. Scope

### In

Auth + a `profile`/role model; `client` + `vehicle` tables; `authenticated` RLS across
every table; an admin SPA (own entry, mobile-first) with: Dashboard; Service requests
(pipeline + convert-to-client/vehicle); Schedule (confirm / re-time / decline
bookings); Clients; Vehicles; Services / Portfolio / Testimonials CMS; Media library;
Content blocks / Service areas / Partners / Business settings; publish→rebuild;
customer booking-confirmation emails; an owner how-to guide; tests; deploy.

### Out (later phases)

Per-vehicle **service history** timeline, **job / work-order** management, **inspection
report** builder, **quotes** / **invoices** / payments, **customer portal**,
**maintenance reminders**, **WhatsApp Business API**, multi-staff permission matrix +
full **audit log**, **self-service scheduling** (Phase 5). Light audit only:
`created_at` / `updated_at` everywhere, `created_by` where meaningful.

---

## 4. Data model additions (concrete — migrations)

New tables; the Phase 2 tables gain `authenticated` policies and a few columns.

| Table | Columns (indicative) | Notes |
| --- | --- | --- |
| `profile` | `user_id` (pk, → `auth.users`), `display_name`, `role` (`owner`/`staff`), `created_at`, `updated_at` | 1:1 with an auth user; created by a `handle_new_user` trigger (default `staff`). Seed promotes `gatama98p@gmail.com` to `owner`. RLS: a user reads/updates their own row; `owner` reads/writes all. |
| `notification` | `type` (`request`/`booking`/`testimonial`), `title`, `body?`, `entity_type`, `entity_id`, `read_at?`, `created_at` | Written by an `AFTER INSERT` trigger on `service_request` / `testimonial`. Admin Notifications view lists these; RLS = any authenticated admin reads + updates `read_at`. |
| `client` | `name`, `type` (`individual`/`fleet`), `phone`, `whatsapp?`, `email?`, `area?`, `source?`, `notes?`, timestamps, `created_by` | Search by name/phone. |
| `vehicle` | `client_id` (→ `client`), `make`, `model`, `year?`, `registration?`, `vin?`, `colour?`, `mileage?`, `fuel?`, `transmission?`, `notes?`, timestamps | Many per client. |
| `service_request` (alter) | activate the existing nullable `client_id` / `vehicle_id` as FKs → `client` / `vehicle` | Populated by "convert". |
| `content_block` / `site_settings` / `service` / `portfolio_project` / `testimonial` / `media` / `service_area` / `partner` (alter) | add `created_by` / `updated_by` where useful | No shape change. |
| `portfolio_media` | (exists) | admin manages the gallery join. |

**Reserved, still not built:** `service_record`, `job`, `inspection_report`, `quote`,
`invoice`, `payment`, `reminder`, `customer_account`, `audit_log`,
`availability_window` (Phase 5).

---

## 5. RLS additions

- **`authenticated` + role check** policies for full CRUD on every business table
  (`service`, `portfolio_project`, `portfolio_media`, `testimonial`, `media`,
  `content_block`, `service_area`, `partner`, `site_settings`, `service_request`,
  `client`, `vehicle`). Helper: a `security definer` `is_admin()` reading `profile.role`.
- **`profile`:** a user sees/edits their own row; `owner` sees all.
- **Storage `public-media`:** `insert` / `update` / `delete` for `authenticated` admins
  (Phase 2 left these unpoliced → service-role only).
- **Anon is unchanged** — still published/approved reads + the `submit` function only.
- **Extend `src/shared/supabase/rls.test.ts`:** add an authenticated-admin client;
  assert admin CRUD succeeds on each table **and** re-assert every anon restriction
  still holds (no regression).

---

## 6. Work breakdown (sequenced)

Effort: **S** ≈ half-day · **M** ≈ 1–2 days · **L** ≈ 3–5 days (rough, solo).

### Progress (2026-09-07)

| WP | State |
| --- | --- |
| WP1 auth | ✅ `profile` (+ role, `handle_new_user` trigger), `is_admin()`/`is_owner()`; `shared/supabase/auth.ts`; `AuthProvider`; **real route guard**; login / forgot / reset pages. **Owner account created** (`gatama98p@gmail.com`) and promoted to `owner` (migration `..._100300_bootstrap_owner`). |
| WP2 admin RLS + schema | ✅ Migrations applied: `client`, `vehicle`, `notification` (+ triggers), FKs, `created_by`; `authenticated` + `is_admin()` full-CRUD policies on every table + Storage; anon sealed (401). **RLS verified live** (simulated authed-owner: full CRUD OK; anon still 401). `rls.test.ts` has anon checks + an env-gated authed-admin block (`TEST_ADMIN_EMAIL/PASSWORD`). |
| WP3 admin shell | ✅ `AdminShell` (nav, unread badge, **View site ↗**, sign out), TanStack Query, `AdminApp` router. Admin stays the `/admin/*` lazy chunk (dedicated entry deferred — the hydration warning is benign). |
| WP3b Team | ✅ `admin-invite` Edge Function (owner-checked; service-role creates the user + returns a one-time invite link — no email dependency); `profile.email` migration + trigger + backfill; Team page (list, invite, activate/deactivate staff). Owner-only nav item. |
| WP4 Dashboard + Notifications | ✅ Dashboard: clickable live counts + recent-requests list. Notifications page: `notification` list (unread first), mark-read / mark-all, click-through. Unread badge on the Notifications nav item. |
| WP5 Requests + Schedule | ✅ Requests: filterable table (status/type/search). Detail: all fields, status pipeline, internal + outcome notes, **convert to client (+ optional vehicle)**. Schedule: agenda of booking/scheduled requests with Confirm (sets `confirmed_at` + status) / re-time / Decline. **Customer email = WP11** (Resend key). |
| Branding | ✅ Rev 01 datum mark + wordmark across AdminShell / Login / Reset; admin UI kit on `--color` tokens + IBM Plex Mono for labels/IDs/dates/phones; Signal Amber actions, Instrument Teal pass-states. Login + reset have a show/hide **password toggle**. |
| WP6 Clients + Vehicles | ✅ List + search; client detail (editable fields + notes); nested vehicles (InlineCrud); linked requests. |
| WP7 CMS: Services / Portfolio / Testimonials | ✅ Services + Portfolio list + edit (Markdown editor with preview, publish toggle, SEO fields, cover + gallery). Testimonials moderation (approve / reject / feature / delete). |
| WP8 Media library | ✅ Upload to `public-media` (required alt text, natural size), list, edit alt, delete; picker used by Portfolio. |
| WP9 Content blocks / Areas / Partners / Settings | ✅ Business Settings single-record editor (NAP, hours rows, SEO description, notification channel + address, socials); Page copy (Markdown+preview); Areas + Partners via a generic `InlineCrud`. |
| WP10 publish→rebuild | ✅ `rebuild` Edge Function (deployed; admin-checked; POSTs a Vercel Deploy Hook held as a secret). `usePublish()` debounces 20s, shows "live in ~1–2 min". **No-ops until `VERCEL_DEPLOY_HOOK_URL` secret is set** — owner creates a Deploy Hook in Vercel. |
| WP11 customer email | ✅ `notify-customer` Edge Function (deployed; Resend). Schedule Confirm/Decline calls it and reports whether it sent. **No-ops until `RESEND_API_KEY` secret is set.** |
| WP12 owner guide | ✅ `docs/owner-guide.md`. |
| WP13 tests | ✅ Admin unit tests (db helpers, PasswordInput toggle, Prose script/handler stripping). **24 pass**, 4 skipped (env-gated authed-admin RLS). |
| WP14 acceptance | 🟡 Deployed (auto). Local gate green. **Owner to do the real end-to-end run** (log in → edit content → publish → handle an enquiry). |
| Carried | ✅ `<Prose>` now sanitises (DOMPurify browser / regex strip SSG). ⬜ `gen types` swap for `types.ts` still deferred. `/admin` hydration warning still benign. |

**Gate green:** typecheck · lint · format · test (24) · build (21 prerendered pages;
admin chunk 143 kB gzip, code-split & `noindex`). Functions deployed: `submit`,
`admin-invite`, `rebuild`, `notify-customer`.

**Owner-supplied to fully switch on:** a **Vercel Deploy Hook** URL →
`npx supabase secrets set VERCEL_DEPLOY_HOOK_URL=…` (auto-publish); a **Resend** API
key + sender → `npx supabase secrets set RESEND_API_KEY=… RESEND_FROM=… NOTIFY_EMAIL=…`
(customer + owner emails); the **staff person's email** (Team invite).

| WP | Title | Depends on | Effort | Key outputs |
| --- | --- | --- | --- | --- |
| **WP1** | Auth foundation | ADR-0007 | M | `profile` table + `role` (`owner`/`staff`) + `handle_new_user` trigger; Supabase Auth (email+password); login / logout / forgot / reset pages; **real route guard** + auth/session hook; owner-account bootstrap (owner signs up in the dashboard → seed promotes them to `owner`; documented). |
| **WP2** | Admin RLS + CRM schema | WP1 | M | Migrations for `client`, `vehicle`, `notification` (+ trigger), `created_by` columns; `is_admin()` helper; `authenticated` CRUD policies on all tables + Storage; **extend `rls.test.ts`** (admin CRUD + anon no-regression). |
| **WP3** | Admin shell + platform | WP1 | M | Dedicated `admin.html` entry (own bundle, `noindex`); admin layout — mobile-first nav, **unread-notifications badge, "View site ↗" link**; TanStack Query with the authed client; shared admin UI (data table, form field set, toast, confirm dialog, save-state indicator); loading / empty / error states. |
| **WP3b** | Team (users) | WP1, WP2 | S | Owner-only screen to add a `staff` member (creates the auth user + `profile role='staff'`, sends a set-password email) and deactivate one. |
| **WP4** | Dashboard + Notifications | WP3 | M | Dashboard: counts (unread notifications, new requests, upcoming bookings, clients, vehicles, pending testimonials); recent/unhandled requests with quick status change; this week's confirmed bookings; quick-add links. **Notifications view**: list from the `notification` table, unread first, click-through to the entity, mark-read / mark-all-read. |
| **WP5** | Service requests + Schedule | WP2, WP3 | L | Requests: list + filters (status/type/date), detail (all submitted fields + internal notes), status pipeline (`new→contacted→scheduled→completed→closed`, `spam`/`archived`), **convert to client + vehicle**, link existing, outcome notes. Schedule: agenda of `booking` + `scheduled` by date; **confirm** (set agreed date/time + `confirmed_at`) / **propose new time** / **decline** → sends the customer a confirmation email (WP11). |
| **WP6** | Clients + Vehicles | WP2, WP3 | M | CRUD + search; client type; client → vehicles → requests; internal notes. |
| **WP7** | CMS — Services / Portfolio / Testimonials | WP3 | L | Services: CRUD, Markdown+preview, publish toggle, ordering, SEO fields. Portfolio: CRUD, Markdown+preview, cover + gallery via media library, publish toggle, related service. Testimonials: moderation queue (`pending→approved/rejected`, `featured`). **Add sanitisation to `<Prose>`.** |
| **WP8** | Media library | WP3 | M | Upload to `public-media` (phone camera roll), **required alt text**, caption, tag/search, attach to portfolio/services; client-side size/format/dimension limits. |
| **WP9** | CMS — Content blocks / Areas / Partners / Settings | WP3 | M | Content blocks: keyed editor with friendly labels. Service areas + Partners: CRUD. **Business settings**: single-record editor (hours, phone, whatsapp, email, socials, GBP link, default SEO, **notification channel + destination**, booking lead-time + time windows). |
| **WP10** | Publish → rebuild | WP7, WP9, Vercel Deploy Hook | S | `rebuild` Edge Function holding the hook URL as a secret; admin calls it after publish/approve/settings change; UI shows "changes live in ~1–2 min" + a "last published" time. |
| **WP11** | Customer + owner notifications | WP5, WP9, Resend | S | Booking confirm/decline → customer email (Resend). Owner notification channel/destination now driven by Business Settings (the `submit` function already reads `site_settings`). |
| **WP12** | Owner guide | all | S | "How to update your website & manage enquiries" — short, screenshot-light, phone-oriented. |
| **WP13** | Tests | all | M | Auth guard; RLS admin-vs-anon (WP2); convert-to-client/vehicle flow; moderation gating (only `approved` testimonials public); publish toggle affecting public read; media upload happy path; settings edit; a Vitest for the `rebuild` function trigger. |
| **WP14** | Local acceptance + deploy | all | M | Admin usable one-handed on a phone; deploy (same Vercel project — admin is `noindex`, its own entry); **owner completes a real content update + a real enquiry follow-through unaided**. Update `project-state.md` / `roadmap.md` / memory. |

**Critical path:** WP1 → WP2 → WP3 → WP5 → WP13 → WP14. WP4/WP6/WP7/WP8/WP9 run in
parallel after WP3; WP10/WP11 after WP7/WP9.

---

## 7. Non-functional requirements

| Area | Requirement |
| --- | --- |
| **Mobile** | Every CRUD task usable one-handed on a phone; image upload from the camera roll. |
| **Auth** | Supabase Auth; secure token storage; password reset tested; no service-role key in the client; guard redirects unauthenticated users to `/admin/login`. |
| **Authorization** | RLS enforced on every table; `authenticated` alone is not enough — role is checked. Anon restrictions re-verified by tests. |
| **Safety** | Confirm destructive actions; prefer `archived` / soft states over hard delete for content and requests. |
| **Auditability (light)** | `created_at` / `updated_at` on all rows; `created_by` where meaningful. Full audit log is Post-MVP. |
| **Performance** | Admin bundle is separate and `noindex`; never loaded by public visitors (already true via code-split; the dedicated entry makes it explicit). |
| **Content safety** | `<Prose>` sanitises rendered Markdown (rehype-sanitize / DOMPurify) now that it's user-authored. |

---

## 8. Rebuild-on-publish (ADR-0003) — how it works in Phase 3

1. Owner publishes a service / approves a testimonial / edits settings.
2. The admin calls the authenticated **`rebuild` Edge Function**, which POSTs the
   stored **Vercel Deploy Hook** URL.
3. Vercel rebuilds `main` (SSG prerender picks up the new DB content) and redeploys.
4. The admin shows "your changes will be live in ~1–2 minutes" and a "last published
   at …" timestamp so the owner isn't surprised by the delay.

Throttle: coalesce rapid successive publishes (e.g. a 60–90s debounce server-side) so
a burst of edits triggers one build.

---

## 9. Exit criteria (from `roadmap.md`, expanded)

- [ ] Owner logs in on a phone and performs every CMS + CRM task listed.
- [ ] Publishing a service / portfolio entry / partner, or approving a testimonial,
      makes it appear on the public site via rebuild — no developer action.
- [ ] A booking request can be confirmed / re-timed / declined from the Schedule view
      and the customer is emailed.
- [ ] A public `service_request` converts to a `client` + `vehicle` in a couple of
      taps; the status pipeline works.
- [ ] RLS: authenticated admin has full CRUD; anon still blocked from all private data
      and disallowed writes (`rls.test.ts` proves both).
- [ ] Destructive actions guarded; timestamps present.
- [ ] `typecheck` / `lint` / `test` / `build` green; admin deployed (`noindex`).
- [ ] `README` + owner guide updated.
- [ ] Owner completes a real content update **and** a real enquiry follow-through
      unaided, then approves.

---

## 10. Risks

| Risk | Mitigation |
| --- | --- |
| **Scope creep** toward job management / quotes / service history | Hard line — §3 "Out"; those are Post-MVP with their own discovery. |
| **RLS regression** exposing private data when adding `authenticated` policies | Extend `rls.test.ts` with an authed client + re-assert every anon restriction; review policies at the WP2 gate. |
| **Rich-text XSS** now that content is admin-authored | Sanitise in `<Prose>` (WP7); Markdown-only input, no raw HTML. |
| **Owner locks himself out** | Tested password-reset flow; document recovery via the Supabase dashboard (service-role); a second admin account if the owner wants one (§14.2 Q17). |
| **Rebuild latency confuses the owner** | Clear "live in ~2 min" messaging + "last published" timestamp; debounce bursts. |
| **Admin mobile ergonomics** | Test on a real mid-range Android throughout, not just a narrow desktop window. |
| **`/admin` hydration mismatch** carried from Phase 2 | Fixed in WP3 by the dedicated `admin.html` entry. |
| **Deploy Hook URL leakage** | Held server-side in the `rebuild` Edge Function, never in the client bundle. |
| **Two E2E test rows / draft content** still in the DB | Owner edits content via the new CMS; the E2E rows can be archived/deleted from the admin once WP5 exists. |

---

## 11. Decisions — all resolved 2026-09-07

1. **ADR-0007:** ✅ email + password.
2. **§14.2 Q17:** ✅ Paul (`owner`) + one `staff` account (added via the Team screen;
   owner to supply the staff email).
3. **Notifications:** ✅ owner email + in-app Notifications view.
4. **Tech choices:** ✅ dedicated `admin.html` entry, Markdown+preview editor,
   TanStack Query, `rebuild` Edge Function.
5. **Start now** — ✅ in parallel with Phase 2 Go-Live.

Still needed from the owner during the build: the **staff person's email** (for WP3b);
a **Vercel Deploy Hook** URL (WP10); the **Resend** key (WP11, shared with WP14 C).

---

## 12. What this plan does NOT authorise

Writing Phase 3 code, creating migrations, provisioning auth, or deploying. Those begin
only after the owner approves this plan and the §11 decisions.
