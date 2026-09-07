# Phase 2 — Public Website MVP · Plan

> **Status: PLAN — for owner review and approval. No Phase 2 code is written yet.**
> Phase 1 (skeleton) is complete and approved. This document is the detailed plan for
> Phase 2; on approval it becomes the working spec.
> **Created:** 2026-09-07 · Companion to `roadmap.md` (Phase 2 section) and
> `product-definition.md`.

---

## 1. Goal

A complete, fast, accessible, SEO-ready **public website** for Platinum Point
Automotive Engineering that reads its content from Supabase, and the one piece of
backend the forms need (a protected submission path + owner notification).

**No admin UI in Phase 2** — content is loaded by migration + seed; the owner-editable
CMS/CRM is Phase 3. The site is fully built and verified **locally** first; deploying
to Vercel is a separate, explicit sub-gate at the end (§9).

### "Done" looks like

- Every page in §4 implemented, responsive, WCAG 2.1 AA, prerendered to static HTML.
- All five forms submit through a Turnstile-verified Edge Function into
  `service_request` / `testimonial`; the owner gets an email per submission.
- Lighthouse mobile ≥ 90 (Performance / SEO / Best Practices / Accessibility) on Home,
  a Service detail, and Contact.
- `sitemap.xml`, `robots.txt`, JSON-LD, canonical/OG all correct; `/admin` `noindex`.
- RLS proven by tests: anon reads only published rows, cannot read private tables,
  cannot write except through the function.
- `npm run build && npm run preview` serves the whole site locally with seed content.

---

## 2. Prerequisites (blockers — must be resolved before starting)

### 2.1 ADRs to approve (from `decisions.md`)

| ADR | Decision to confirm |
| --- | --- |
| **0005** | One `service_request` table with `request_type` (incl. `booking`). |
| **0006** | Submission path = honeypot + **Cloudflare Turnstile** + Edge Function (anon has **no** direct insert). Fallback: honeypot-only + direct constrained anon insert. |
| **0009** | Supabase Storage (public bucket) + image transforms; admin-only writes. *(No uploads happen in Phase 2 — seed images only — but the bucket + policies are created now.)* |
| **0011** | Analytics = Google Search Console + one cookieless tool (**Cloudflare Web Analytics** proposed) + CTA event counts. |
| **0012** | English-primary content, no i18n framework. |
| **0013** | Booking = request + owner confirmation (the Book form; the Schedule view is Phase 3). |

### 2.2 Content answers needed (from `product-definition.md` §14.2)

Needed to write real launch copy and seed the database:

1. **Opening hours** (text, per day) + whether after-hours/emergency is offered.
2. **Final service list** + a sentence or two each (review our draft; includes the
   engineering services).
3. **Partner names** — the few bodywork shops / garages to list (name + area + one
   line), with their OK.
4. **About copy** — Paul's DT Dobie years, strongest marques, the going-mobile story.
5. **2–5 seed testimonials** (first name + vehicle + quote + consent).
6. **Privacy Policy** — source (lawyer / template / we draft for review) + ODPC
   position (§14.2 Q18).
7. **Booking lead-time** (e.g. "≥ 1 day ahead") and **time-window options**
   (morning / afternoon / specific hours).
8. Confirm **+254 722 322870 is the WhatsApp number**.
9. Optionally: 3–5 **portfolio jobs** (text-first fine) — otherwise Phase 2 ships with
   1–2 and the section grows later.

### 2.3 External accounts / keys the owner sets up (or we defer)

| Item | For | If not ready |
| --- | --- | --- |
| **Cloudflare account** → Turnstile site key + secret key (free) | Form spam protection (ADR-0006) | Ship honeypot-only fallback; add Turnstile later. |
| **Cloudflare Web Analytics** token (free) | Traffic measurement (ADR-0011) | Ship without; add later (no code change beyond a snippet). |
| **Transactional email**: Resend (or similar) API key + a verified sender | Owner gets an email per enquiry/booking (ADR-0008) | Submissions still stored; owner sees them in Phase 3 admin. **No public soft-launch until email works** (leads would be silently queued). |
| **Google Search Console** access | Submit sitemap, verify (BO-1) | Do at the staging sub-gate (§9). |
| Supabase **CLI** auth + link to project `aonpdrqtosmqhmomghca` | Apply migrations, generate types, deploy the Edge Function | Blocker — required. Owner runs `supabase login` once (interactive) or provides an access token. |
| Docker Desktop *(optional)* | `supabase start` for offline local DB | Not required — we apply migrations to the linked remote project. |

---

## 3. Scope

### In

Public pages + components; DB schema for the read models + intake; RLS; Storage bucket
+ policies; the submission Edge Function + email notification; SEO technical layer;
analytics hooks; seed content; performance + a11y pass; test suite; local build/preview.

### Out (later phases)

Any admin UI, auth, CRM, media uploads, the Schedule view, content editing, the
publish→rebuild hook (Phase 3). Quotes/invoices/inspection reports/reminders
(Post-MVP). Self-service slot booking (Phase 5).

---

## 4. Pages (per `product-definition.md` §5.1)

| Route | Type | Data | Notes |
| --- | --- | --- | --- |
| `/` | prerendered | services (featured), portfolio (featured), testimonials (approved+featured), site copy | Hero, credibility, CTAs, service snapshot, areas, featured work + testimonials, contact block |
| `/services` | prerendered | `service` where published, ordered | Index, grouped by category |
| `/services/:slug` | prerendered (getStaticPaths) | one `service` | SEO landing page; "get a quote" CTA; related portfolio |
| `/portfolio` | prerendered | `portfolio_project` where published | Grid; filter by category/vehicle; graceful with 1 entry |
| `/portfolio/:slug` | prerendered (getStaticPaths) | one project + `media` | Vehicle, problem, work, outcome, gallery, related service |
| `/testimonials` | prerendered | approved testimonials + **Submit a testimonial** form | Display: first name + vehicle + quote only |
| `/service-areas` | prerendered | `service_area` | Kitengela + environs; "countrywide by arrangement" |
| `/about` | prerendered | content blocks + `partner` | Paul's background, DT Dobie, mobile model, named partners |
| `/contact` | prerendered | `site_settings` public subset | Call, WhatsApp, email, hours, base area, map link, GBP link, contact form |
| `/book` | prerendered shell + client form | — | Book a Service: date + time window (`request_type=booking`) |
| `/request-service` | prerendered shell + client form | — | Repairs / diagnostics / maintenance / engineering |
| `/request-inspection` | prerendered shell + client form | — | Pre-purchase / mechanical inspection |
| `/privacy` | prerendered | content block | Privacy Policy |
| `/404` + splat | prerendered | — | Already exists; restyle |

> Some of Service Areas / About / Testimonials may also appear as **Home sections** —
> a design call during WP7, not an architecture change.

---

## 5. Data model — concrete tables for Phase 2

Migrations in `supabase/migrations/`. Column lists below are the build target (refine
during WP1). All tables: `id uuid pk default gen_random_uuid()`, `created_at`,
`updated_at` (trigger). Enums created as Postgres `enum` types.

### 5.1 Public read models

| Table | Columns (beyond id/timestamps) | Public read rule |
| --- | --- | --- |
| `service` | `slug` (unique), `title`, `category`, `summary`, `description_md`, `whats_included_md?`, `faqs jsonb?`, `icon?`, `display_order int`, `is_published bool`, `seo_title?`, `seo_description?` | `is_published = true` |
| `portfolio_project` | `slug` (unique), `title`, `category`, `vehicle_make?`, `vehicle_model?`, `vehicle_year?`, `summary`, `body_md`, `outcome?`, `service_id fk?`, `project_date date?`, `cover_media_id fk?`, `is_published bool` | `is_published = true` |
| `testimonial` | `first_name`, `vehicle_label`, `rating int?`, `comment`, `consent bool`, `source`, `status enum(pending,approved,rejected)`, `is_featured bool`, `submitted_at` | `status = 'approved'` — **column-limited** view exposes only `first_name,vehicle_label,rating,comment,submitted_at` |
| `media` | `storage_path`, `alt_text`, `caption?`, `tags text[]?`, `width int?`, `height int?` | rows referenced by a published project |
| `content_block` | `key` (unique), `label`, `group`, `value_md` | all (site copy) |
| `service_area` | `name`, `region?`, `is_primary bool`, `note?`, `display_order int` | all |
| `partner` | `name`, `type enum(bodywork,garage,parts,other)`, `note?`, `area?`, `display_order int`, `is_published bool` | `is_published = true` |
| `site_settings` | single row: `business_name`, `legal_name?`, `tagline?`, `phone`, `whatsapp`, `email`, `hours jsonb`, `base_area`, `geo jsonb?`, `social_links jsonb`, `gbp_url?`, `default_seo jsonb` | **public subset** via a view — excludes `notification_*` |

### 5.2 Intake (write-only for the public)

| Table | Columns | Access |
| --- | --- | --- |
| `service_request` | `request_type enum(booking,general_repair,diagnostics,maintenance,assessment,road_test,mechanical_inspection,pre_purchase_inspection,engineering,other,general_contact)`, `status enum(new,contacted,scheduled,completed,closed,spam,archived) default new`, `contact_name`, `contact_phone`, `contact_whatsapp?`, `contact_email?`, `vehicle_description?`, `area?`, `requested_date date?`, `requested_time_window?`, `confirmed_at?`, `message?`, `consent bool`, `source`, `client_id fk?`, `vehicle_id fk?`, `internal_notes?`, `outcome_notes?` | **no anon access**; inserted only by the Edge Function (service role) |
| `testimonial` (insert path) | as above; function forces `status='pending'`, `source='public_form'` | insert only via function |

### 5.3 Reserved but NOT created in Phase 2

`client`, `vehicle`, `profile` (Phase 3); `service_record`, `job`, `inspection_report`,
`quote`, `invoice`, `reminder`, availability tables (later). `service_request` carries
nullable `client_id` / `vehicle_id` FKs now so Phase 3 adds those tables without
altering it.

### 5.4 Storage

- Bucket **`public-media`** (public read). RLS/storage policy: anon read; write/delete
  authenticated + admin only (no admin yet — policy in place for Phase 3).
- Seed images (if any) uploaded via the CLI during WP10, not through the app.

---

## 6. RLS policy matrix

RLS **enabled on every table**. Anon = the site's build-time + browser client.

| Table | anon SELECT | anon INSERT | anon UPDATE/DELETE | authenticated |
| --- | --- | --- | --- | --- |
| `service`, `portfolio_project`, `partner` | `is_published` | ✗ | ✗ | (Phase 3) full |
| `testimonial` | via `testimonial_public` view, `status='approved'` only | ✗ (function only) | ✗ | (Phase 3) full |
| `service_area`, `content_block` | all | ✗ | ✗ | (Phase 3) full |
| `media` | rows joined to a published project | ✗ | ✗ | (Phase 3) full |
| `site_settings` | via `site_settings_public` view only | ✗ | ✗ | (Phase 3) full |
| `service_request` | ✗ | ✗ | ✗ | (Phase 3) full |

- The Edge Function uses the **service-role key** (server-side only, in Supabase
  secrets) to insert into `service_request` / `testimonial` after verifying Turnstile
  and validating input. It forces `status` / `request_type` / `source`.
- **Test harness (WP2):** a Vitest suite using a bare anon client asserts every row of
  this matrix — especially "anon gets 0 rows from `service_request`", "anon gets only
  approved testimonials", "anon INSERT rejected".

---

## 7. Rendering & content refresh in Phase 2

- Public routes use **React Router loaders** that read Supabase with the anon key.
  `vite-react-ssg` runs them at build time and bakes the data + a loader-data manifest
  into the static output (already working in the skeleton).
- `getStaticPaths` for `/services/:slug` and `/portfolio/:slug` enumerates published
  slugs from Supabase at build time.
- **No live updates in Phase 2** (no admin). Content changes = re-run seed + rebuild.
  The publish→rebuild webhook is Phase 3.
- Because content is fixed at build time, anon RLS + the anon key at build time only
  ever expose published rows — safe.

---

## 8. Work breakdown (sequenced)

Effort: **S** ≈ half-day, **M** ≈ 1–2 days, **L** ≈ 3–5 days (rough, solo).

| WP | Title | Depends on | Effort | Key outputs |
| --- | --- | --- | --- | --- |
| **WP1** | Supabase CLI + migrations: schema | 2.1, 2.2, CLI auth | M | `supabase/` dir, `config.toml`, migration files for §5.1–5.2, `updated_at` trigger, enums, seed-safe |
| **WP2** | RLS policies + anon-access test harness | WP1 | M | Policies for §6, `testimonial_public` + `site_settings_public` views, `src/shared/supabase/rls.test.ts` |
| **WP3** | Typed client + data layer | WP1 | S | `supabase gen types` → `types.ts`; typed query helpers in `src/shared/content/*` |
| **WP4** | Submission Edge Function | WP1, Turnstile keys (or fallback), email key (or defer) | M | `supabase/functions/submit/`; Turnstile verify, zod validation, rate-limit, insert, Resend email; deployed to the project; secrets set |
| **WP5** | Design-system primitives | Phase 1 tokens | M | `Button`, `Field`/`Input`/`Textarea`/`Select`, `Card`, `Section`, `CTA`, `SEO` (head), `Img` (responsive/placeholder), `Prose` (markdown render + sanitise) in `src/public/components/` + tests |
| **WP6** | Global chrome | WP5 | S | Real header/nav (sticky Call + WhatsApp), footer w/ NAP + links, mobile floating contact, skip-link |
| **WP7** | Pages | WP3, WP5, WP6 | L | All routes in §4 with loaders + `getStaticPaths`; forms (WP4) wired; empty/sparse states |
| **WP8** | SEO technical | WP7 | M | `sitemap.xml` generator (published routes), `robots.txt` update, JSON-LD (`AutoRepair`/`LocalBusiness`, `Service`, `BreadcrumbList`), canonical + OG per page, admin excluded |
| **WP9** | Analytics + Search Console | WP8, tokens | S | Cloudflare Web Analytics snippet, CTA event helper (call / WhatsApp / each form submit), Search Console verification file |
| **WP10** | Seed content | WP1, 2.2 answers | M | `supabase/seed.sql` (or a TS seeder): site_settings, services, areas, partners, content blocks, 1–5 portfolio, 2–5 testimonials, Privacy Policy; any seed images to Storage |
| **WP11** | Performance + a11y pass | WP7–WP10 | M | Lighthouse ≥ 90 on Home / a Service / Contact; axe clean; throttled mid-range device check; font-loading + image-size tuning |
| **WP12** | Test suite consolidation | all | M | Form validation + submit (function mocked), RLS matrix (WP2), SEO head + sitemap, key components, a11y smoke |
| **WP13** | Local acceptance | all | S | `build` + `preview` walkthrough against the full exit checklist (§10); update `project-state.md` |
| **WP14** | **Staging sub-gate** (separate approval) | WP13 + owner go | M | Vercel project, env vars, deploy, custom domain (if chosen), Search Console live, GBP alignment, real Turnstile/email in prod |

**Critical path:** WP1 → WP2 → WP3 → WP7 → WP8 → WP11 → WP13. WP4/WP5/WP6/WP10 run in
parallel with the early path. WP14 only after the owner approves staging.

---

## 9. Local-first, then a staging sub-gate

Per the owner's Phase 1 instruction, **WP1–WP13 are done and verified entirely
locally** (`npm run build && npm run preview`, migrations applied to the linked
Supabase project, Edge Function tested via `supabase functions serve` or a deployed
function on the dev project). Nothing is put on Vercel until **WP14**, which is its own
small approval gate: it's where the site first becomes publicly reachable, so it also
covers Search Console, GBP alignment, production Turnstile/email keys, and the
domain decision (§14.2 Q13). A **public soft-launch** happens only after WP14 **and**
working email notifications (or the owner accepts leads waiting for the Phase 3
dashboard).

---

## 10. Exit criteria

- [ ] All §4 pages implemented, responsive, WCAG 2.1 AA, prerendered.
- [ ] Migrations apply cleanly to a fresh database; `updated_at` triggers work.
- [ ] RLS matrix (§6) fully proven by `rls.test.ts` against a bare anon client.
- [ ] Five forms submit via the Edge Function; Turnstile enforced (or documented
      fallback); owner receives an email per submission; confirmation + fallback +
      booking-expectation copy shown; spam/honeypot rejected.
- [ ] `sitemap.xml` / `robots.txt` correct; JSON-LD validates; canonical + OG per
      page; `/admin` `noindex` and absent from the sitemap.
- [ ] Lighthouse mobile ≥ 90 (Perf / SEO / BP / A11y) on Home + a Service detail +
      Contact; axe clean.
- [ ] `npm run build && npm run preview` serves the whole site with seed content;
      `typecheck` / `lint` / `format:check` / `test` green.
- [ ] `README.md` updated (Supabase CLI workflow, seed, functions).
- [ ] Owner reviews locally and approves — then WP14 (staging) as a separate gate.

---

## 11. Phase 2 risks

| Risk | Mitigation |
| --- | --- |
| Turnstile / email keys not ready → forms can't notify | Honeypot-only fallback for spam; hold public soft-launch until email works; both are config, not rebuilds |
| `vite-react-ssg` + RR6 loader/`getStaticPaths` friction on dynamic routes | Prototype `/services/:slug` first (WP7 spike) before building all pages |
| Supabase CLI needs interactive `supabase login` | Owner runs it once, or supplies a `SUPABASE_ACCESS_TOKEN`; document in README |
| Seed content thin (few jobs/testimonials) | Graceful sparse states are an explicit WP7 acceptance item; text-first portfolio entries |
| Markdown rendering XSS from content fields | `Prose` sanitises (rehype-sanitize); content is trusted (seed) now but Phase 3 adds user-adjacent input |
| Applying migrations to the owner's dev project (no separate staging DB) | Migrations are additive + reversible; keep `supabase/migrations` under version control; consider a second free Supabase project as staging before WP14 |
| Scope creep toward admin features | Phase 2 has **no** admin UI — hard line; anything owner-editable is Phase 3 |

---

## 12. Open decisions within Phase 2 (need owner input, not blocking to start WP1)

1. **Soft-launch policy:** stand up email notifications in Phase 2 (owner sets up
   Resend), or accept that Phase 2 stays local/staging-only until the Phase 3 admin
   exists? (Recommendation: set up Resend — it's ~15 min and unlocks a real soft-launch.)
2. **Turnstile now or honeypot-only for Phase 2?** (Recommendation: Turnstile — the
   Cloudflare account is also needed for Web Analytics.)
3. **Staging database:** use a second free Supabase project as staging, or apply
   migrations straight to the dev project? (Recommendation: a second project — keeps
   the dev DB clean and de-risks WP14.)
4. **Home page composition:** which of Service Areas / About / Testimonials are
   full pages vs. Home sections vs. both (pure design call; decide during WP7).
5. **Markdown vs. rich fields** for `description_md` etc. — plan assumes Markdown
   stored as text, rendered + sanitised. Confirm that's acceptable (Phase 3 admin
   would then edit Markdown, or we add a WYSIWYG later).

---

## 13. What this plan does NOT authorise

Writing Phase 2 code, creating migrations, provisioning Supabase resources, deploying
Edge Functions, or deploying to Vercel. Those begin only after the owner approves this
plan and the ADRs in §2.1.
