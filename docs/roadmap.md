# Platinum Point Automotive Engineering — Roadmap

> Phase-gated delivery plan. Each phase has a **goal**, **scope**, **deliverables**,
> and **exit criteria**. **A phase does not start until it is explicitly approved.**
> Silence is not approval. This roadmap is a plan, not a commitment to build ahead of
> approval.
> **Last updated:** 2026-09-07 (rev. 2 — owner §14 answers folded in; Phase 5 added)

Workflow per phase:
`Discovery → Documentation → Review → Approval → Implementation → Testing → Verification → Next phase`

MVP = **Phase 1 + Phase 2 + Phase 3 + Phase 4**. Everything after is Post-MVP.

**Booking note:** the owner asked for online booking/scheduling. Per **ADR-0013** the
MVP ships **booking *requests*** (customer proposes a date + time window; owner
confirms in the admin). The **self-service availability calendar** is **Phase 5**
(first Post-MVP increment).

---

## Phase 0 — Discovery ✅ APPROVED 2026-09-07

**Goal:** Establish a shared, documented understanding of the product, the MVP, the
architecture direction, the risks, and the unknowns — before any building.

**Scope / deliverables**
- `docs/product-definition.md`
- `docs/project-state.md`
- `docs/decisions.md`
- `docs/roadmap.md`

**Explicitly not done:** no code, no `package.json`, no dependencies, no Supabase
project, no schema, no migrations, no infrastructure, no pages.

**Exit criteria**
- [x] Owner has read the documents.
- [x] **Owner explicitly approved Phase 0 — 2026-09-07.**
- [x] Owner answered most of §14 (2026-09-07 → §14.1). Remaining items in §14.2.
- [ ] Owner actions the §14.2 still-open questions and the branding sign-off (§10.2–10.4).
- [ ] Per-phase ADRs are approved as each gate is reached (Phase 1: 0002/0003/0010;
      Phase 2: 0004/0005/0006/0009/0011/0012/0013; Phase 3: 0007/0008). Phase 0
      approval does **not** implicitly approve these.

> Phase 0 done. **Phase 1 still needs its own explicit approval before any code.**

---

## Phase 1 — Foundation & Scaffolding · ✅ COMPLETE & APPROVED 2026-09-07 (local-first)

**Goal:** A running, empty, well-tooled application skeleton — validated **locally** —
plus the wiring to talk to a Supabase project on the owner's dev account.

**Prerequisites:** ✅ Phase 0 approved. ✅ ADR-0002/0003/0010 accepted. Domain and
business hosting account (§14.2 Q13, Q15) deferred by owner — Vercel personal account,
no deploy yet.

**Scope**
- Initialise a **local** Git repo (`.gitignore`, first commit). **GitHub remote
  deferred** until the owner asks — the CI workflow file is written but not run.
- Scaffold Vite + React + TypeScript (npm; lockfile committed).
- Tailwind CSS v4 with the **Rev 01 brand tokens** as theme variables (§10.2 palette +
  Archivo / IBM Plex Mono / Newsreader); theme-aware light/dark grounds; no component
  hard-codes a colour or font.
- Project structure: `src/public/**`, `src/admin/**`, `src/shared/**` (per ADR-0010).
- Routing; public shell (prerendered) + admin shell (lazy chunk, route-guard **stub**,
  `noindex`, excluded from prerender/sitemap). No real auth yet.
- Rendering per ADR-0003: `vite-react-ssg` prerender for public routes; admin
  code-split.
- ESLint (flat config) + Prettier + strict `tsconfig` + editorconfig.
- Vitest + React Testing Library configured; one trivial passing test.
- GitHub Actions CI workflow committed (install → typecheck → lint → test → build) —
  runs once a remote exists.
- Supabase client wired to read `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from
  `.env.local`; `.env.example` committed; **no schema** created. Owner supplies the
  project URL + anon key; connection verified with a throwaway read.
- `README.md` with setup + run + test instructions.
- Update `project-state.md`.

**Not in this phase:** business tables, RLS policies, real pages, auth flows, forms,
content, the submission Edge Function, any deployment.

**Exit criteria**
- [x] `npm run build` / `test` / `lint` / `typecheck` / `format:check` all pass **locally** (2026-09-07).
- [x] Public shell prerenders to static HTML (`dist/index.html`, `dist/404.html`);
      admin is a separate lazy chunk, `noindex`, excluded from prerender, and not
      modulepreloaded on public pages.
- [x] Brand tokens present and used (Rev 01 palette + type stack in `src/index.css`;
      no hard-coded hex/font in components).
- [x] Supabase client connects using `.env.local` creds — verified via
      `/auth/v1/health` → 200 (owner added creds 2026-09-07).
- [x] `README.md` lets a fresh dev run the project from scratch.
- [x] **Owner reviewed and approved Phase 1 (2026-09-07).**

> Deployment to Vercel + GitHub remote + CI execution are a later explicit step
> (before or during Phase 2 soft-launch), not part of Phase 1.

---

## Phase 2 — Public Website MVP (content-driven, pre-CMS) · APPROVED & IN PROGRESS 2026-09-07

> Detailed work breakdown: **`docs/phase-2-plan.md`** (§8 Progress table).
> Schema/RLS/seed applied + `submit` function deployed + RLS verified live
> (2026-09-07). Remaining: WP11 perf/a11y + **WP14 staging & go-live** —
> **`docs/wp14-staging-plan.md`** (two checkpoints, each separately approved).

**Goal:** A complete, fast, SEO-ready public website that a visitor can use to
understand the business and make contact — reading content from Supabase, with content
seeded via migration/seed (the owner-facing CMS to edit it comes in Phase 3).

**Prerequisites:** Phase 1 approved & done. ADR-0004, 0005, 0006, 0009, 0011, 0012,
0013 approved. §14.2 answered enough to write real launch copy (esp. opening hours Q1,
service list Q5, partner names Q6, About Q8, seed testimonials Q9). Privacy Policy
content path decided (§14.2 Q10). Booking lead-time / windows agreed (§14.2 Q12).

**Scope**
- **Schema (first migration set):** `service`, `portfolio_project`, `testimonial`,
  `media`, `content_block`, `service_area`, `partner`, `site_settings`
  (public-readable parts) — read models for the public site. **RLS**: anon `SELECT` on
  gated rows only.
- **Intake path (per ADR-0005/0006):** `service_request` table (incl. `booking` fields
  `requested_date` / `requested_time_window` / `confirmed_at`) + the submission
  **Edge Function** (Turnstile verification, validation, rate limiting; forces
  `status` / `request_type`) + owner email notification (ADR-0008). `testimonial`
  `pending` inserts go through the same function. This is the one "admin-ish" backend
  piece that ships with the public site because the forms need it.
- **Pages** (per `product-definition.md` §5.1): Home, Services index + detail
  (incl. **Engineering / Press & Lathe**), Portfolio index + detail, Testimonials
  (+ **Submit a testimonial** form), Service Areas, About (+ **named partners**),
  Contact, **Book a Service**, Request a Service, Request an Inspection, Privacy
  Policy, 404.
- **Forms:** Book a Service (`request_type = booking`, date + time window), Request a
  Service, Request an Inspection, Contact, Submit a testimonial — all via the
  protected Edge Function, all with confirmation + fallback contact + expectation copy
  ("we'll confirm your booking within X hours").
- **Global components:** header/nav with sticky Call + WhatsApp, footer with NAP,
  mobile floating contact, reusable CTA, service/portfolio/testimonial/partner cards,
  form components, SEO head component, responsive image component with placeholders.
- **Contact affordances:** `tel:+254722322870`, WhatsApp deep links with pre-filled
  context, GBP link.
- **SEO:** per-page `<title>`/meta/canonical/OG, `AutoRepair`/`LocalBusiness` +
  `Service` + `BreadcrumbList` JSON-LD from `site_settings` (`areaServed` = Kitengela +
  Kenya-by-arrangement), generated `sitemap.xml`, `robots.txt`, admin excluded.
  Google Search Console verification. Analytics per ADR-0011 + CTA event counting
  (call / WhatsApp / each form).
- **Seed content:** owner-provided services (incl. engineering), 3–5 portfolio entries
  (text-first OK), a few named partners, 2–5 approved seed testimonials (with consent),
  service areas, business settings (hours, notification channel), pricing/quotes
  explainer + other content blocks, Privacy Policy — loaded via seed.
- **Performance & a11y:** meet the §5.4 budget (Lighthouse mobile ≥ 90 across
  Performance/SEO/Best Practices/Accessibility); test on a throttled mid-range device.
- **Tests:** form validation + submission (mocked function), RLS anon-access tests
  (no private data; testimonial read exposes only display columns; no direct anon
  insert on `service_request`/`testimonial`), SEO head rendering, key component
  rendering.
- Update `project-state.md` and any ADR outcomes.

**Exit criteria**
- [ ] All pages implemented, responsive, accessible (AA), and populated from Supabase.
- [ ] All five forms create rows via the protected function and notify the owner; spam
      protection active; confirmation + fallback + booking-expectation copy shown.
- [ ] Lighthouse mobile ≥ 90 on Performance, SEO, Best Practices, Accessibility for
      Home + one Service detail + Contact.
- [ ] JSON-LD validates; `sitemap.xml` / `robots.txt` correct; admin `noindex`.
- [ ] Search Console verified; analytics recording pageviews + CTA events.
- [ ] RLS tests prove anon cannot read `client`/`vehicle`/raw `service_request` and
      cannot perform disallowed writes.
- [ ] CI green; deployed to production domain (if domain ready) or host URL.
- [ ] Owner reviews the live site and approves moving to Phase 3.

> The site can **soft-launch** after Phase 2 (discoverable, contactable) even before
> the CMS/CRM exist, as long as seed content is acceptable to the owner.

---

## Phase 3 — Admin MVP: CMS + CRM · APPROVED & IN PROGRESS 2026-09-07

> **Detailed plan: `docs/phase-3-plan.md`.** Decisions locked: email+password auth;
> roles `owner` (Paul) + `staff`; owner email + in-app Notifications view; dedicated
> `admin.html` entry; Markdown+preview editor; TanStack Query; `rebuild` Edge Function.

**Goal:** The owner can log in on a phone and manage content and enquiries without a
developer.

**Prerequisites:** ADR-0007 approved + owner auth preference. §14.2 Q17 (who
administers — seed a 2nd admin?) answered. Build-hook-on-publish approach (ADR-0003)
confirmed. Phase 2 does **not** need to be fully closed — Phase 3 is admin-only and
only touches the public deploy via the rebuild hook, so it can run in parallel with
Phase 2 Go-Live (WP14 Part C).

**Scope**
- **Auth:** Supabase Auth per ADR-0007; login, logout, forgot/reset password; route
  guard on `/admin/*`; `profile` table with `role`; seed the owner account (documented,
  service-role key never shipped).
- **Schema additions / hardening:** `client`, `vehicle`, `profile`; admin-side columns
  on `service_request` (internal notes, outcome, links); **RLS** for authenticated
  admin CRUD across all tables; Storage bucket + policies for media (ADR-0009).
- **Dashboard:** counts (new requests, upcoming bookings, clients, vehicles, pending
  testimonials); recent / unhandled requests with quick status change; this week's
  confirmed bookings; quick-add links.
- **CRM:**
  - **Service requests:** list + filters; detail with all fields + internal notes;
    status pipeline; **convert to client + vehicle**; link existing client/vehicle;
    outcome notes; `spam`/`archive`.
  - **Schedule / bookings:** agenda/list of `booking` requests and `scheduled` items by
    date; **confirm** (set agreed date/time, `confirmed_at`), **propose new time**, or
    **decline** — triggers the customer confirmation message (ADR-0008). Not a
    real-time availability calendar (that is Phase 5).
  - **Clients:** CRUD, search, type (individual/fleet), contacts, notes.
  - **Vehicles:** CRUD under a client.
- **CMS:**
  - **Services:** CRUD, rich text, publish toggle, ordering, SEO fields.
  - **Portfolio:** CRUD, rich text, cover + gallery via media library, publish toggle,
    related service.
  - **Testimonials:** moderation of site-submitted feedback (`pending`/`approved`/
    `rejected`, `featured`); public view exposes only first name + vehicle + comment.
  - **Media library:** upload (phone-friendly), alt text (required), caption, basic
    tag/search, attach to content.
  - **Content blocks:** edit keyed site copy (incl. pricing/quotes explainer).
  - **Service areas:** CRUD.
  - **Partners / affiliates:** CRUD (name, type, note, area, order, published).
  - **Business settings:** single-record editor (incl. hours, notification channel +
    destination, booking lead-time & time-window options).
- **Publish → site:** publishing/approving triggers the host build hook (per ADR-0003)
  so changes appear on the public site within a build cycle; show the owner a clear
  "changes will be live in ~1–2 minutes" message.
- **Safety:** confirm destructive actions; prefer `archived`/soft states;
  `created_at`/`updated_at` everywhere.
- **Tests:** auth guard, RLS admin-vs-anon, convert-to-client/vehicle flow,
  moderation gating (only `approved` testimonials public), publish toggle affecting
  public read, media upload happy path.
- **Owner guide:** short "How to update your website & manage enquiries" doc.
- Update `project-state.md`.

**Exit criteria**
- [ ] Owner can log in on a phone and perform every CMS + CRM task listed.
- [ ] Creating/publishing a service, portfolio entry, partner, or approving a
      testimonial makes it appear on the public site (via rebuild) with no developer
      action.
- [ ] A booking request can be confirmed / re-timed / declined from the Schedule view
      and the customer is notified.
- [ ] A public `service_request` can be converted to a `client` + `vehicle` in a
      couple of taps; pipeline statuses work.
- [ ] RLS: authenticated admin has full CRUD; anon still blocked from all private data
      and disallowed writes (tests prove it).
- [ ] Destructive actions are guarded; timestamps present.
- [ ] CI green; deployed.
- [ ] Owner completes a real content update and a real enquiry follow-through unaided.
- [ ] Owner approves.

---

## Phase 4 — Launch Hardening & Handover

**Goal:** Take the MVP from "works" to "live and owned by the business".

**Prerequisites:** Phases 1–3 approved & done. Domain decided (§14.2 Q13). Privacy
Policy finalised (§14.2 Q10). GBP management access obtained (§14.2 Q14).

**Scope**
- Custom domain live on the host; DNS; HTTPS/HSTS; www↔apex redirect; canonical host.
- Final SEO pass: metadata review, structured data, `sitemap.xml` submitted to Search
  Console, existing **Google Business Profile** aligned (NAP, category, hours, GBP
  link as `sameAs`).
- Accessibility audit (keyboard, screen-reader spot check, contrast) and fixes.
- Performance audit on a real mid-range Android over throttled network; fix regressions.
- Error monitoring (lightweight) and uptime check.
- Backups: confirm Supabase backup settings; document restore steps.
- Security review: re-audit all RLS policies; confirm only the anon key is in the
  client bundle; secrets in CI/host only; dependency audit; Dependabot on.
- Data protection: publish Privacy Policy; set enquiry/customer data **retention
  policy** (§14.2 Q19); consent copy final; confirm ODPC position (§14.2 Q18).
- Legal/footer: trading name (and registered legal name if a company — §14.2 Q3).
- Apply the **brand** (logo, palette, type, favicon, social image) from the parallel
  branding work into the centralised theme tokens.
- **Account & credential handover:** domain, host, Supabase org, analytics, Search
  Console, GBP, email — all owned by the business; access documented for the owner.
- Final `project-state.md` update; tag `v1.0`.

**Exit criteria**
- [ ] Site live on the business domain over HTTPS; redirects correct.
- [ ] Search Console + GBP set up and consistent (NAP).
- [ ] a11y and performance targets met on a real device.
- [ ] All RLS policies re-reviewed; no secret beyond the anon key in the client.
- [ ] Privacy Policy published; retention policy set and implemented (or scheduled).
- [ ] Owner holds/owns all accounts and credentials; handover doc delivered.
- [ ] Owner signs off MVP as launched.

---

## Phase 5 — Self-service scheduling (first Post-MVP increment)

**Goal:** Customers pick a real open time slot and get an immediate booking, against
the owner's published availability — the full version of the owner's "booking and
scheduling" ask (ADR-0013 Option B).

**Prerequisites:** MVP launched and used for a while. Its own mini-discovery
(availability rules, buffers, travel time, calendar sync scope, reminder channel).
Owner comfortable that MVP booking-request volume justifies it.

**Scope (indicative — refined at Phase 5 discovery)**
- `availability_window` (recurring + one-off) and `booking_slot` tables; owner manages
  availability in the admin.
- Public slot picker on **Book a Service**: shows genuine open slots, places a short
  hold, confirms on submit.
- Reschedule / cancel links for the customer (tokenised, no login).
- Buffers between jobs; lead-time and max-horizon rules; block-out dates.
- Optional one-way **Google Calendar** sync of confirmed bookings.
- Automated **reminders** (channel per ADR-0008 direction; may need a scheduled Edge
  Function).
- Admin Schedule view upgraded from agenda to calendar.

**Exit criteria**
- [ ] A customer can self-book a real slot; the owner sees it without manual
      confirmation and is not double-booked.
- [ ] Reschedule/cancel works from the customer link.
- [ ] Reminders fire reliably.
- [ ] RLS: availability is publicly readable only as free/busy, not as customer data.
- [ ] Owner approves.

---

## Post-MVP (each is its own discovery → approval → build cycle)

Prioritisation to be revisited with the owner after launch and after seeing real usage.
Indicative order (Phase 5 above is the first of these):

| # | Increment | Value | Notes |
| --- | --- | --- | --- |
| P-1 | **Vehicle service history** | Per-vehicle timeline of work done; foundation for reminders and repeat business. | New `service_record` entity linked to `vehicle`; admin entry; maybe visible to the customer later. |
| P-2 | **Job / work-order management** | Track a job from booked → in progress → done; notes, parts, labour, photos. | Extends `service_request`; adds `job`. |
| P-3 | **Structured inspection reports** | Consistent pre-purchase / mechanical inspection output the owner can send as a link or PDF. | `inspection_report` with a checklist template; shareable read-only link; PDF export. Directly boosts the inspection SEO funnel. |
| P-4 | **Quotes** | Send a quote from a job/request; customer can accept. | `quote`; PDF/link. |
| P-5 | **Invoices (+ optional M-Pesa)** | Bill for completed work; record payment. | `invoice`, `payment`; M-Pesa only if the owner wants it. |
| P-6 | **Maintenance reminders** | "Your Toyota is due a service" via WhatsApp/SMS/email. | `reminder`; needs a scheduler (cron/Edge Function) and a messaging channel. |
| P-7 | **WhatsApp Business integration** | Structured intake and templated replies where the business already lives. | API setup + cost; ties into `service_request` as a `source`. |
| P-8 | **Customer accounts / portal** | Customers see their vehicles, history, quotes, invoices. | New auth audience; significant RLS work. |
| P-9 | **Self-service scheduling** | Pick a real slot instead of "we'll confirm". | **Promoted to Phase 5** above. |
| P-10 | **Blog / resource content** | Long-tail SEO ("how to know if your clutch is going"). | `article` entity in the CMS; editorial effort is the constraint. |
| P-11 | **Multi-staff roles & audit log** | If the business grows past the owner. | Role matrix; `audit_log`. |
| P-12 | **In-admin analytics** | Enquiry trends, channel mix, conversion, top services/areas. | Reporting views over existing data. |
| P-13 | **Swahili content (i18n)** | Wider reach. | Add i18n layer; double content authoring. |

## Future product ideas (not scheduled)

- **Multi-tenant SaaS** for other independent mechanics / small garages (the
  TECHBIGGIEY productisation). Requires its own architecture review — tenancy model,
  onboarding, billing, theming, data isolation. This is where "separate the admin app"
  (ADR-0010 consequence) would be revisited.
- Parts inventory & supplier management.
- Technician PWA with offline on-site capture.
- Fleet customer dashboards / servicing contracts.
- OBD / diagnostic tooling integration.
- Vetted affiliate marketplace.
- Automated review-request flow feeding GBP + on-site testimonials.

---

## Dependency map (what blocks what)

```
Phase 0 approval  (+ owner sign-off on ADR-0013 phased booking)
      │
      ▼
Phase 1 (needs ADR-0002/0003/0010 approved)
      │
      ▼
Phase 2 (needs ADR-0004/0005/0006/0009/0011/0012/0013 + §14.2 copy answers + Privacy
         path + booking lead-time/windows)   ── booking *requests*, testimonial
      │        │                                submission, engineering, partners
      │        └── soft launch possible here
      ▼
Phase 3 (needs ADR-0007 + owner auth pref + §14.2 Q17)   ── Schedule view, Partners CMS
      │
      ▼
Phase 4 (needs domain + Privacy Policy final + GBP management access + brand assets)
      │
      ▼
MVP launched (v1.0)
      │
      ▼
Phase 5 — self-service scheduling (own mini-discovery)
      │
      ▼
Other Post-MVP increments — each its own discovery → approval → build
```
