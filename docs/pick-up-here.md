# Pick up here — status & remaining work

> Snapshot for resuming the build. Written 2026-09-07 EOD.
> Authoritative detail lives in `project-state.md` (change log), `phase-2-plan.md` §8,
> `phase-3-plan.md` §6, and `wp14-staging-plan.md`. This file is the one-page summary.

---

## Where things stand

| Phase | State |
| --- | --- |
| **0 — Discovery** | ✅ Approved. |
| **1 — Foundation** | ✅ Complete & approved. |
| **2 — Public website MVP** | 🟢 Built; **live on private staging**; DB schema + RLS + `submit` function applied. Left: formal Lighthouse/axe pass + **Go-Live (WP14 Part C)**. |
| **3 — Admin MVP** | 🟡 In progress. **WP1–WP5 + WP3b done** (auth, schema/RLS, admin shell + branding, Dashboard, Notifications, Requests+convert, Schedule, Team). Left: WP6–WP14. |

## What's live / where

| Thing | Where |
| --- | --- |
| Repo | `github.com/Bigmanbiggiey/platinum` (`main`). GitHub Actions CI on push. |
| Hosting | Vercel project `biggieys-projects/platinum-point` — **auto-deploys on push to `main`**. |
| Public site (staging) | `https://platinum-point.vercel.app` — `VITE_SITE_NOINDEX=1` (robots `Disallow: /`, every page `noindex`). |
| Admin | `https://platinum-point.vercel.app/admin` — sign in with the `gatama98p@gmail.com` account (owner). |
| Supabase | project `aonpdrqtosmqhmomghca` ("platinum"), Postgres 17. Schema + RLS + `submit` + `admin-invite` functions all applied/deployed. |
| Local env | `.env.local` has `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (+ Vercel-added OIDC token). |

## Run / verify locally

```
npm install
npm run dev          # http://localhost:5173  (+ /admin)
npm run typecheck && npm run lint && npm run test && npm run build
```

Supabase CLI is linked & authenticated (`npx supabase ...`). Apply DB changes with
`npx supabase db push`; run one-off SQL with `npx supabase db query --linked`.

---

## Remaining work

### A. Phase 3 — Admin MVP (resume here)

| WP | What | Notes |
| --- | --- | --- |
| **WP6** | **Clients & Vehicles pages** | List + search + CRUD for `client`; vehicles nested under a client; link from the request-detail "converted" state. Tables + RLS already exist. |
| **WP7** | **CMS — Services / Portfolio / Testimonials** | CRUD with a Markdown textarea + live preview (reuse `<Prose>` — **add sanitisation** now that it's user-authored). Publish toggles, ordering, SEO fields. Testimonials = moderation queue (pending → approved/rejected, featured). |
| **WP8** | **Media library** | Upload to the `public-media` bucket (Storage write policies exist); required alt text; caption; attach to portfolio/services. |
| **WP9** | **Content blocks / Service areas / Partners / Business settings** | Keyed content-block editor; CRUD for areas + partners; single-record Business Settings editor (hours, phone, whatsapp, email, socials, GBP link, default SEO, **notification channel + destination**, booking lead-time + windows). |
| **WP10** | **Publish → rebuild** | Small `rebuild` Edge Function holding a **Vercel Deploy Hook** URL as a secret; admin calls it (authenticated) after publish/approve/settings changes; UI shows "live in ~1–2 min" + a "last published" time; debounce bursts. **Needs the owner to create a Deploy Hook** in Vercel → Project Settings → Git → Deploy Hooks. |
| **WP11** | **Customer + owner emails** | Booking confirm/decline → customer email via Resend. Owner enquiry email (the `submit` function already supports it) driven by Business Settings. **Needs a Resend API key + verified sender.** |
| **WP12** | **Owner how-to guide** | Short "update your website & manage enquiries" doc. |
| **WP13** | **Tests** | Auth guard; extend `rls.test.ts` authed-admin block; convert-to-client flow; moderation gating; publish toggle → public read; media upload; settings edit. |
| **WP14** | **Local acceptance + deploy** | Admin usable one-handed on a phone; owner does a real content update + a real enquiry follow-through unaided; sign-off. |

**Also carried into Phase 3:**
- Replace hand-written `src/shared/supabase/types.ts` with `npx supabase gen types typescript --linked`.
- `/admin` hard-load hydration warning (rewrites to `/`) — optional cleanup via a dedicated admin entry.

### B. Phase 2 — to close it out

- **WP11 perf/a11y:** run **PageSpeed Insights** on `platinum-point.vercel.app` (3 pages) + an `axe` scan; fix findings.
- **WP14 Part C — Go-Live** (`wp14-staging-plan.md` §6), needs owner decisions/inputs:
  - Domain + DNS (host/domain to be revisited — currently Vercel; note Vercel Hobby is non-commercial-use → decide Vercel Pro vs Cloudflare Pages).
  - Remove `VITE_SITE_NOINDEX`; point `VITE_SITE_ORIGIN` at the real domain; redeploy.
  - Cloudflare **Turnstile** keys (`VITE_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET`).
  - **Resend** keys (shared with WP11).
  - Cloudflare **Web Analytics** token (`VITE_CF_ANALYTICS_TOKEN`).
  - **Google Search Console** verify + submit sitemap.
  - **Google Business Profile** alignment (NAP/category/hours) + set `site_settings.gbp_url`.
  - **Privacy Policy** legal review (Kenya DPA 2019) then publish; retention rule; ODPC position.
  - Final security re-check.
- **Delete the E2E test rows** in the DB (a few `service_request` + a `pending` `testimonial`, labelled "…E2E…delete").
- Content is **DRAFT** in the DB — owner edits via the Phase 3 CMS (WP7–WP9) once built, or Supabase directly.

### C. Waiting on the owner

| Needed for | Item |
| --- | --- |
| WP10 | A **Vercel Deploy Hook** URL. |
| WP11 / WP14 C | A **Resend** API key + verified sender email. |
| WP3b (staff account) | The **staff person's email** — then use the Team page's "Create invite". |
| WP14 C | Domain choice + host decision; Turnstile keys; CF Analytics token; Search Console + GBP access; Privacy Policy source. |
| Content | Final service copy, About detail, real testimonials + consent, booking lead-time/windows, confirm WhatsApp = +254 722 322870. |

---

## Suggested order to resume

1. **WP9 Business Settings** first (unblocks a lot: notification config, booking rules, GBP link, hours editing) → then **WP7 Services/Testimonials CMS** → **WP8 Media** → **WP6 Clients/Vehicles**.
2. **WP10 publish→rebuild** once a Deploy Hook exists.
3. **WP11 emails** once a Resend key exists.
4. Then WP12–WP14, and Phase 2 Part C when the owner is ready to go public.
