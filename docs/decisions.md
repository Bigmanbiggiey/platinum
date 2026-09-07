# Platinum Point Automotive Engineering — Architecture Decisions

> Architecture Decision Records (ADRs). Each records a decision, its context, options
> considered, and consequences.
> **Status values:** `Accepted` (settled — either mandated by the project brief or
> already approved) · `Proposed` (recommendation awaiting the owner's approval) ·
> `Superseded` · `Rejected`.
> **Nothing in a `Proposed` ADR is implemented.** Phase 0 creates no code or
> infrastructure.
> **Last updated:** 2026-09-07 (rev. 2 — owner answers to §14 incorporated; ADR-0013 added)

---

## Index

| ADR | Title | Status | Approval needed? |
| --- | --- | --- | --- |
| [0001](#adr-0001--technology-stack) | Technology stack | Accepted (brief-mandated) | Confirm only |
| [0002](#adr-0002--frontend-hosting) | Frontend hosting | **Accepted 2026-09-07** (Vercel target; **deploy deferred** — local-first) | — |
| [0003](#adr-0003--public-site-rendering-approach) | Public-site rendering approach | **Accepted 2026-09-07** | — |
| [0004](#adr-0004--one-dataset-two-faces) | One dataset, two faces | Accepted (brief-mandated) | Confirm only |
| [0005](#adr-0005--consolidated-intake-model) | Consolidated intake model | **Accepted 2026-09-07** | — |
| [0006](#adr-0006--public-form-spam-protection) | Public form spam protection | **Accepted 2026-09-07** (honeypot now; Turnstile when keys supplied) | — |
| [0007](#adr-0007--admin-authentication-method) | Admin authentication method | **Accepted 2026-09-07** (email+password; roles owner + staff) | — |
| [0008](#adr-0008--new-enquiry-notifications) | New-enquiry notifications | **Accepted 2026-09-07** (Edge Function ready; email pending Resend key) | — |
| [0009](#adr-0009--image-storage-and-delivery) | Image storage and delivery | **Accepted 2026-09-07** | — |
| [0010](#adr-0010--single-application-vs-separate-apps) | Single application vs separate apps | **Accepted 2026-09-07** | — |
| [0011](#adr-0011--analytics) | Analytics | **Accepted 2026-09-07** | — |
| [0012](#adr-0012--language--i18n-for-mvp) | Language / i18n for MVP | **Accepted 2026-09-07** | — |
| [0013](#adr-0013--booking--scheduling-approach) | Booking & scheduling approach | **Accepted 2026-09-07** | — |

---

## ADR-0001 — Technology stack

**Status:** Accepted (mandated by the project brief; listed here for the record and for
owner confirmation).

### Context
The brief prescribes the stack "unless a documented architectural reason requires
otherwise". No such reason has emerged in discovery. Django is explicitly excluded
unless a future review proves Supabase cannot meet a requirement.

### Decision
- **Frontend:** React, TypeScript, Vite, Tailwind CSS.
- **Backend/platform:** Supabase — PostgreSQL, Supabase Auth, Supabase Storage, Row
  Level Security. Supabase **Edge Functions only where genuinely necessary**
  (candidate: enquiry notifications — see ADR-0008).
- **Testing:** Vitest + React Testing Library.
- **Quality:** ESLint + Prettier.
- **Source control:** Git + GitHub.

### Consequences
- No custom application server to run or secure in MVP; the browser talks to Supabase
  directly using the **anon** key, so **RLS correctness is critical** (see security
  requirements and ADR-0004).
- Standard Postgres + Storage keep the data reasonably portable if Supabase is ever
  outgrown (see risk R-7).
- Some behaviours that would be trivial with a server (server-side email, secret-holding
  endpoints, cron) require an Edge Function or an external service — kept to a minimum.

---

## ADR-0002 — Frontend hosting

**Status:** **Accepted 2026-09-07.** Target host = **Vercel**, initially on the owner's
personal Vercel account, to be revisited once the domain and a business hosting
account are sorted (§14.2 Q13). **Deployment is deferred:** per the owner, nothing is
built or pushed to Vercel yet — Phase 1 and subsequent work is validated **locally**
first, and production is staged later as an explicit step.

### Context
The public site must be fast, globally served, HTTPS, with good caching and easy
deploys from GitHub. The build is a static/prerendered bundle (see ADR-0003). Budget
is minimal (family business); free tiers are expected to suffice initially.

### Options
| Option | Pros | Cons |
| --- | --- | --- |
| **Vercel** | Excellent DX, GitHub integration, previews, generous free tier, good edge network. | Company-account/billing considerations if usage grows. |
| **Netlify** | Similar DX, forms/redirects features, good free tier. | Build minutes limits on free tier. |
| **Cloudflare Pages** | Very fast edge, cheap bandwidth, strong free tier. | Slightly rougher DX for some framework features. |

### Decision (proposed)
Use **Vercel** for the frontend, connected to the GitHub repo, with preview
deployments per PR and production on `main`. Revisit if cost or account ownership
(§14.2 Q13, Q15) points elsewhere; Cloudflare Pages is the fallback.

### Consequences
- Deploy config is host-specific but thin; switching later is low effort for a static
  app.
- Domain (once chosen) is pointed at the host; DNS ideally managed where the domain is
  registered or on Cloudflare.
- Host account should be owned by the business, not a personal developer account
  (risk R-11).

---

## ADR-0003 — Public-site rendering approach

**Status:** **Accepted 2026-09-07.** Static generation / prerendering of public routes
within Vite (`vite-react-ssg`); admin ships as a code-split, `noindex` SPA chunk.

### Context
BO-1 (discoverability) needs crawlable, fast-first-paint public pages with correct
per-page metadata and JSON-LD. Content (services, portfolio, testimonials, copy) lives
in Supabase and is edited by the owner; it changes infrequently but must not require a
developer to publish. The admin area has the opposite needs (no SEO, behind auth,
highly interactive).

### Options
| Option | SEO | Content freshness | Complexity |
| --- | --- | --- | --- |
| **Plain SPA (Vite CSR)** | Weak without extra work (client-rendered content, crawler variance). | Instant. | Lowest. |
| **SSG / prerender at build, rebuild on publish** | Strong (real HTML per route). | Needs a rebuild trigger when the owner publishes (webhook → host build hook). | Moderate. |
| **SSR framework (e.g. Next.js)** | Strong. | Instant. | Higher; adds a server runtime; diverges from "Vite" in the brief. |

### Decision (proposed)
**Static generation / prerendering** of the public routes from Supabase content at
build time, staying within Vite (e.g. `vite-react-ssg` / `vite-plugin-ssr`-style
prerendering, or a small prerender step). Publishing content in the admin triggers a
host **build hook** to regenerate. The **admin** ships as a client-rendered SPA bundle
(code-split, `noindex`).

If the rebuild-on-publish loop proves too slow or fiddly for the owner, fall back to:
SPA for the app shell **plus** prerendered HTML + JSON-LD for the SEO-critical routes
only.

### Consequences
- One repo, one build, two output "modes" (prerendered public + SPA admin).
- Need a lightweight, secure way for "publish" in the admin to call the host build
  hook (a stored hook URL; possibly via a minimal Edge Function to keep the hook
  secret) — detailed in Phase 3/4.
- Content edits are live within a build cycle (typically 1–2 minutes), which is
  acceptable for this business. Set owner expectations accordingly.

**This decision materially shapes Phase 1 scaffolding and needs sign-off before Phase 1.**

---

## ADR-0004 — One dataset, two faces

**Status:** Accepted (mandated by the project brief).

### Context
The brief's core architectural principle: the public website and the admin system use
the **same underlying data**. Admin creates a service → it's available publicly. Admin
uploads a job → it can appear in the portfolio. Admin adds a testimonial → it can
appear publicly after approval.

### Decision
- A **single Supabase database** is the source of truth for both the public site and
  the admin.
- **Visibility is data, not duplication:** `is_published` on `service` /
  `portfolio_project`; `status = approved` on `testimonial`; a public subset of
  `site_settings`; etc.
- **RLS is the enforcement boundary:** the anon role can only ever read gated rows and
  can only insert into designated submission tables (constrained). The admin role
  (authenticated + `role`) has full CRUD.
- The public build reads content through the anon client (or at build time via a
  read-only fetch); the admin reads/writes through the authenticated client.

### Consequences
- No content sync, no second CMS, no copy-paste between systems.
- Correct RLS policies are a security-critical deliverable with dedicated tests
  (risk R-1).
- The conceptual model in `product-definition.md` §11 is designed around this;
  Post-MVP entities extend it rather than fork it.

---

## ADR-0005 — Consolidated intake model

**Status:** **Accepted 2026-09-07.**

### Context
Three public forms (Request a Service, Request an Inspection, Contact) plus phone /
WhatsApp all produce the same kind of thing: *someone wants to talk to the business
about a vehicle or a job.* The owner needs one place to see and work these.

### Options
| Option | Pros | Cons |
| --- | --- | --- |
| **One `service_request` table with `request_type`** | Single inbox / pipeline; less schema; easy to add a new form later; simple RLS (one insert policy). | Some columns nullable / type-specific; need a discriminator. |
| **Separate tables per form** (`enquiries`, `inspection_requests`, `contact_messages`) | Each table tightly typed. | Three inboxes, three pipelines, three sets of RLS, duplicated conversion logic; harder to get a unified dashboard. |

### Decision (proposed)
**One `service_request` concept** with `request_type ∈ {booking, general_repair,
diagnostics, maintenance, assessment, road_test, mechanical_inspection,
pre_purchase_inspection, engineering, other, general_contact}`, a shared `status`
pipeline (`new → contacted → scheduled → completed → closed`, plus `spam` / `archived`),
free-text `vehicle_description` before conversion, nullable `client_id` / `vehicle_id`
populated on "convert to client + vehicle", and (for `booking`) `requested_date`,
`requested_time_window`, `confirmed_at` — see ADR-0013.

Pure "Contact" messages use `request_type = general_contact` and simply may skip the
vehicle/scheduling fields. (If the owner prefers, contact messages can be visually
separated in the UI while still sharing the table.)

### Consequences
- One dashboard, one pipeline, one conversion action, one insert RLS policy.
- Adding a future intake channel (e.g. WhatsApp API) means a new `source` /
  `request_type`, not a new table.
- Reporting on channel mix (R-16) is a single query.

---

## ADR-0006 — Public form spam protection

**Status:** **Accepted 2026-09-07.** Phase 2 ships the **honeypot + timing** layer and
the Edge Function submission path immediately; **Cloudflare Turnstile** is added to the
function as soon as the owner supplies the site/secret keys (no rebuild — config only).

### Context
Public insert access for anon (even constrained) invites spam and abuse, which wastes
the owner's time and pollutes the CRM (risk R-5). There is no application server to
filter requests before they hit the database. The owner has **confirmed** public,
site-submitted testimonials (moderated) — so `testimonial` inserts also need this
protection, not just `service_request`.

### Options
- **Honeypot field only** — trivial, catches naive bots, misses modern spam.
- **CAPTCHA / challenge** — Cloudflare Turnstile (free, privacy-friendly, low
  friction) or hCaptcha. Requires verifying the token server-side (Edge Function) or
  via a Turnstile-aware flow.
- **Rate limiting** — per-IP / per-fingerprint throttling; needs somewhere to enforce
  it (Edge Function, or host/WAF rules).

### Decision (proposed)
**Defense in depth:**
1. **Honeypot + timing check** in every form (cheap, no dependency).
2. **Cloudflare Turnstile** on all public forms (Book a Service, Request a Service,
   Request an Inspection, Contact, Submit a testimonial), with token verification in a
   small **Edge Function** that is the only path allowed to insert `service_request` /
   `testimonial` (anon `INSERT` is *not* granted directly on those tables; the function
   uses a scoped server-side key and forces `status` / `request_type`). This also gives
   one place for rate limiting and basic validation.
3. **Notification throttling** so a burst can't spam the owner.

Simpler fallback if an Edge Function is judged too much for MVP: keep direct anon
`INSERT` with strict column/`CHECK` constraints + honeypot + Turnstile widget
(client-verified), accepting weaker guarantees.

### Consequences
- Introduces (at most) one Edge Function — consistent with the brief's "only where
  genuinely necessary". This is the strongest candidate for one.
- Adds a Cloudflare account/site key dependency (free).
- Slightly more Phase 3/4 work; materially less spam and a clean CRM.

---

## ADR-0007 — Admin authentication method

**Status:** **Accepted 2026-09-07.** **Email + password** with email password-reset.
No public sign-up. Two roles: **`owner`** (Paul) and **`staff`** — both get full admin
CRUD in the MVP; `owner` additionally manages staff accounts via an admin "Team"
screen. Seed one owner (Paul, `gatama98p@gmail.com`); the staff account is added
through the UI when the owner supplies that person's email. 2FA + magic-link are
Post-MVP.

### Context
One admin user at launch (the owner), possibly a second later (§14.2 Q17). Owner is
mobile-first. No public sign-up. Supabase Auth is mandated.

### Options
| Option | Pros | Cons |
| --- | --- | --- |
| **Email + password** | Familiar; works offline-ish (no email round-trip to log in); password manager friendly. | Password reset needs email; weak-password risk. |
| **Magic link (email OTP)** | No password to forget; simple. | Requires email access on the device each login; email deliverability dependency; more friction on a phone. |
| **Both** | Flexibility. | Slightly more UI. |

### Decision (proposed)
**Email + password** as the primary method, with **password reset via email**.
Accounts are created by an administrator (seed script / Supabase dashboard), never
self-serve. Consider **2FA** and magic-link as options Post-MVP.

**Owner input needed:** does the owner prefer typing a password, or receiving a login
link by email each time?

### Consequences
- Need a documented, secure way to seed the first account (Supabase dashboard or a
  one-off script using the service-role key locally — never shipped).
- A "forgot password" flow must exist and be tested.

---

## ADR-0008 — New-enquiry notifications

**Status:** **Accepted 2026-09-07.** The submission Edge Function is built to send the
owner an email per enquiry/booking via a transactional provider (Resend); it activates
when the API key + sender are supplied. Until then submissions are stored and surfaced
in the Phase 3 dashboard. Channel preference (email / WhatsApp / SMS) still open
(§14.2 Q20) — email is the default.

### Context
BO-5 depends on the owner actually seeing new enquiries and **booking requests**
quickly. He is mobile and busy (risk R-9). If notifications are unreliable, leads are
missed (risk R-6). There is no always-on server. Booking (ADR-0013) raises the stakes:
a slow confirmation is a poor booking experience (risk R-18).

### Options
| Option | Pros | Cons |
| --- | --- | --- |
| **Dashboard only** (owner checks the admin) | Zero extra infra; always accurate. | Relies on the owner remembering to check. |
| **Email on new enquiry** via a transactional API (e.g. Resend/Postmark) from an **Edge Function** triggered by a DB insert / webhook | Push notification to the owner's phone; low cost. | Adds an Edge Function + an email API key; deliverability to manage. |
| **WhatsApp message** to the owner | Matches how the business already works (R-16). | WhatsApp Business API setup is non-trivial and has cost; likely Post-MVP. |
| **Supabase Realtime badge** in the admin PWA | Nice in-app signal. | Only helps when the admin is open. |

### Decision (proposed)
MVP: **dashboard is the source of truth**, **plus** a best-effort **email
notification** to the owner (`gatama98p@gmail.com` for now) on each new
`service_request` / `testimonial`, sent from the same Edge Function that already
handles spam-checked inserts (ADR-0006) — so **no new function is added solely for
notifications**. Throttle to avoid floods. Store the notification channel + destination
in `site_settings` so it's changeable without a deploy. Always show the owner's direct
phone/WhatsApp on the public site as the ultimate fallback.

**WhatsApp notification** is explicitly **Post-MVP**, pending the owner confirming he
wants it and accepting the setup/cost.

**Owner input needed (§14.2 Q20):** email, WhatsApp, SMS, more than one, or
dashboard-only? A branded sending domain also depends on §14.2 Q13 (domain).

### Consequences
- One transactional email provider dependency (free tier adequate at expected volume).
- Notification is advisory; the system remains correct if email fails.

---

## ADR-0009 — Image storage and delivery

**Status:** **Accepted 2026-09-07.**

### Context
Content strategy (§9) depends on the owner uploading images over time from a phone, on
mobile data. Public performance budget is strict (R-10). No professional photo set
exists yet.

### Options
- **Supabase Storage, public bucket, served as-is** — simplest; large phone images
  hurt performance.
- **Supabase Storage + Supabase image transformations** (resize/format/quality via
  URL params) — one platform; responsive images without a build step.
- **Third-party image CDN** (Cloudinary/imgix) — powerful; another account, another
  bill, more moving parts.

### Decision (proposed)
**Supabase Storage** with:
- A **public** bucket for website imagery; **admin-only** write/delete via RLS/Storage
  policies.
- **Supabase image transformations** for responsive `srcset` (a few widths) and modern
  formats.
- Client-side constraints in the admin: max dimensions/size, accepted formats,
  **required alt text**, optional caption.
- A tasteful placeholder in the UI when a piece of content has no image yet.
- A **private** bucket is *not* created in MVP (no internal-document feature yet);
  reserved for Post-MVP.

### Consequences
- No third-party image service to manage or pay for in MVP.
- Owner uploads are usable immediately without a separate optimisation pipeline.
- If transformation limits/costs become a problem at scale, revisit a CDN Post-MVP
  (portable — files stay in Storage).

---

## ADR-0010 — Single application vs separate apps

**Status:** **Accepted 2026-09-07.** One Vite project, folders `src/public/**`,
`src/admin/**`, `src/shared/**`; admin route-split and `noindex`.

### Context
We need a public marketing site (SEO, prerendered, anonymous) and an admin app (SPA,
authenticated). They share the data model and many types.

### Options
| Option | Pros | Cons |
| --- | --- | --- |
| **One Vite project, route-split** (`/` public, `/admin` app) | Shared types, shared Supabase client setup, one repo, one CI, one deploy; DRY. | Must ensure admin code is code-split and never blocks public performance/SEO; admin routes must be `noindex` and ideally not prerendered. |
| **Two projects** (separate repos or a monorepo) | Hard separation; independent deploys. | Duplicated setup; shared code needs a package; more overhead for a small project. |

### Decision (proposed)
**One Vite project**, with a clear folder boundary (`src/public/**`, `src/admin/**`,
`src/shared/**`), route-based code splitting so the admin bundle is never loaded for
public visitors, `/admin/*` marked `noindex` and excluded from the sitemap and from
prerendering, and a guarded admin shell (auth required).

### Consequences
- Simplest thing that works for a small team/solo maintainer.
- Requires discipline (and lint/config) to keep the public bundle lean.
- If the productisation path (multi-tenant SaaS) is later chosen, the admin can be
  extracted then, with types already isolated in `src/shared`.

---

## ADR-0011 — Analytics

**Status:** **Accepted 2026-09-07.** Cloudflare Web Analytics snippet is wired but
env-gated (no-op until the token is supplied); Search Console is done at the staging
sub-gate.

### Context
BO-1/BO-2 need measurement: traffic, sources, which pages convert, which CTA is used.
Privacy obligations (Kenya DPA 2019) and the performance budget argue against heavy
trackers. §14.2 Q16 asks whether an existing analytics / Search Console property exists.

### Options
- **Google Analytics 4** — ubiquitous, free, richer; heavier script, consent/cookie
  banner implications, privacy concerns.
- **Privacy-friendly analytics** (Plausible, Umami, Cloudflare Web Analytics) —
  lightweight, cookieless, simpler compliance; Plausible/Umami have a cost or need
  self-hosting (Umami can run on Supabase-adjacent infra; Cloudflare's is free).
- **Google Search Console** — not analytics per se; essential for SEO regardless.

### Decision (proposed)
- **Google Search Console**: set up regardless (needed for BO-1).
- **Cloudflare Web Analytics** (free, cookieless, no banner) **or** Umami if the owner
  wants more detail — pick one in Phase 2.
- **Custom event count** for CTA usage (call / WhatsApp / each form submit) recorded
  either in the analytics tool or as lightweight rows, to answer "which channel works".
- Avoid GA4 unless the owner specifically wants it and accepts the consent-banner and
  privacy trade-offs.

### Consequences
- Minimal script weight; simpler privacy posture.
- Slightly less out-of-the-box reporting than GA4.

---

## ADR-0012 — Language / i18n for MVP

**Status:** **Accepted 2026-09-07.**

### Context
The business operates in Kenya; customers are comfortable in English and/or Swahili.
Adding internationalisation infrastructure has a cost in every component and in
content authoring.

### Options
- **English only, no i18n framework** — fastest; content authored once.
- **English + Swahili from day one** — doubles content authoring (which is already a
  constraint, R-2/R-9) and adds i18n plumbing.
- **English now, structure copy so Swahili can be added later** — middle path.

### Decision (proposed) — updated per owner answer
Owner: **English is the formal/primary language; incidental Swahili is acceptable where
it helps.** So: **English-primary content, no i18n framework** for MVP. Swahili appears
only as deliberate phrasing inside individual copy blocks (e.g. a CTA, a common term),
authored directly in the content — not as a parallel translated site. Keep user-facing
copy in DB content blocks / a small UI-strings module so a full Swahili layer remains a
bounded Post-MVP addition.

### Consequences
- Less to build and maintain now; no translation workflow.
- Mixed-language copy is a content/editorial choice, invisible to the architecture.
- Post-MVP full i18n is a known, bounded piece of work rather than a retrofit.

---

## ADR-0013 — Booking & scheduling approach

**Status:** **Accepted 2026-09-07.** Phase 2 ships the Book form → `service_request`
(`request_type = booking`) with date + time window. The Schedule view (confirm /
re-time / decline) is Phase 3; the self-service availability calendar is Phase 5.

### Context
The owner wants customers to book online. But he works as a **mobile mechanic**, often
under a vehicle, with limited time and connectivity. A booking system that
**auto-commits** slots without him in the loop risks double-bookings, unreachable
locations, and jobs of unknown size landing on a fixed time. A full self-service
scheduler also needs: an availability model, working-hours/lead-time rules, timezone
handling, reschedule/cancel flows, calendar (Google) sync, reminders, and no-show
handling — a significant build that would materially delay the MVP.

### Options
| Option | What the customer gets | Owner control | Build cost |
| --- | --- | --- | --- |
| **A. Booking request + owner confirmation (MVP)** | Picks a **preferred date + time window**, submits; gets "we'll confirm within X hours", then a confirmation message. | Full — owner confirms, re-times, or declines from the admin Schedule view. | Low — one form + a few fields on `service_request` + an agenda view. Reuses ADR-0005/0006/0008. |
| **B. Self-service real-time slots** | Sees actual open slots and books one instantly. | Indirect — owner pre-defines availability; system enforces it. | High — availability tables, rules engine, holds, reschedule/cancel, calendar sync, reminders. |
| **C. Embed a third-party scheduler** (Cal.com/Calendly) | Instant slot booking via an external widget. | Medium. | Low-ish, but: data lives outside Supabase (breaks ADR-0004 "one dataset"), theming limits, another account/cost, CSP/embed friction, weaker mobile UX. |

### Decision (proposed)
**Phase the feature. Option A for the MVP; Option B as Phase 5.**

- **MVP (Phase 2 public + Phase 3 admin):** a **Book a Service** page that creates a
  `service_request` with `request_type = booking`, `requested_date`,
  `requested_time_window`, and optional notes. The admin **Schedule** view lists these
  by date; the owner **confirms** (sets `confirmed_at` + agreed time, status →
  `scheduled`), **proposes a new time**, or **declines**. The customer gets a
  confirmation via the chosen channel (ADR-0008). Copy sets expectations clearly
  ("not instantly confirmed — we'll come back to you"). A minimum **lead time** and the
  **time-window options** are configurable in Business Settings (§14.2 Q12).
- **Phase 5 — self-service scheduling:** add `availability_window` / `booking_slot`
  tables, owner-managed availability, real open-slot selection with a short hold,
  reschedule/cancel links, optional Google Calendar sync, and automated reminders.
  Built on the same `service_request`; `booking` rows just gain a hard slot.
- **Option C (third-party embed) is rejected** for MVP because it splits the data model
  (contradicts ADR-0004) and weakens the mobile experience and branding.

### Consequences
- The owner-requested capability ships in the MVP, without the availability engine
  delaying launch, and without risking auto-double-booking a mobile operator.
- Slight expectation-management need on the Book page (risk R-18) — mitigated by fast
  confirmation + notification.
- Phase 5 is additive: no rework of the `service_request` shape.
- **Needs owner sign-off** that this staging matches what they meant by "booking and
  scheduling" (§14.2 Q11).

---

## Decisions explicitly deferred (not ADRs yet)

| Topic | Why deferred | When to decide |
| --- | --- | --- |
| Brand system | Owner supplied the **Rev 01 asset pack** (2026-09-07): datum-mark logo + variants, an 8-colour palette (Graphite/Slate/Signal Amber/Instrument Teal/Steel/Platinum/Mist/Paper) with HEX/CMYK/Pantone, and a 3-face type stack (Archivo / IBM Plex Mono / Newsreader, all SIL OFL 1.1). See `product-definition.md` §10.2. **Tokens are usable in the build now.** Pending: owner sign-off (§14.2 Q22), production `ppae-*.svg` masters + favicon + social image (§14.2 Q23), tagline (§14.2 Q24). | Sign-off before Phase 2 finish; production files before Phase 4 (brand application). |
| Domain name & DNS provider | Owner input required (§14.2 Q13). | Before Phase 2 finish / launch. |
| Privacy Policy content & ODPC registration | Legal input required (§14.2 Q10, Q18). | Before public launch (Phase 2 / Phase 4). |
| Booking lead-time & time-window options | Owner input required (§14.2 Q12); stored in Business Settings. | Phase 2 (form) / Phase 3 (settings). |
| Self-service scheduler details (availability model, calendar sync, reminders) | Phase 5 scope (ADR-0013); needs its own mini-discovery. | Start of Phase 5. |
| Rich-text editor choice for admin | Implementation detail. | Phase 3. |
| Component/design-system approach (headless lib vs hand-rolled) | Implementation detail; depends on brand. | Phase 1/2. |
| CI provider specifics (GitHub Actions workflow shape) | Implementation detail. | Phase 1. |
| Package manager (npm/pnpm) | Minor; npm assumed. | Phase 1. |
| Post-MVP: inspection report format, quotes/invoices, reminders channel, customer portal | Out of MVP scope; needs its own discovery. | Post-MVP discovery. |
| WhatsApp Business API integration (intake + notifications) | Cost/setup; owner to confirm appetite (§14.2 Q20, R-16). | Post-MVP. |
| Multi-tenant / productisation architecture | Only if the SaaS path is chosen. | Future review. |
