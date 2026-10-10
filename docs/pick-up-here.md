# Pick up here — status & remaining work

> Snapshot for resuming the build. Written 2026-09-07 EOD; status updated 2026-10-09.
> Authoritative detail lives in `project-state.md` (change log), `phase-2-plan.md` §8,
> `phase-3-plan.md` §6, and `wp14-staging-plan.md`. This file is the one-page summary.

---

## Where things stand

| Phase | State |
| --- | --- |
| **0 — Discovery** | ✅ Approved. |
| **1 — Foundation** | ✅ Complete & approved. |
| **2 — Public website MVP** | 🟢 Built; **live on private staging**; DB schema + RLS + `submit` function applied. Left: formal Lighthouse/axe pass + **Go-Live (WP14 Part C)**. |
| **3 — Admin MVP** | 🟢 **Functionally complete (WP1–WP13).** Auth+roles+Team, Dashboard+Notifications, Requests+convert, Schedule, full CMS, Media, Business Settings, publish→rebuild + emails (functions deployed; switch on with secrets). Left: WP14 owner acceptance run; `gen types` cleanup. |
| **Jobs (ADR-0014)** | 🟢 **J1 (admin work orders) merged** (PR #4). Next: owner acceptance on staging, then J2 (publish to portfolio) and J3 (review links) — each planned separately. Spec: `docs/superpowers/specs/2026-09-30-jobs-work-orders-design.md`. |
| **RBAC (owner/staff)** | 🟡 **R-A (shareable staff invites)** ✅ live (PRs #9, #11, #12). **R-B (permissions)** ✅ live (PR #13). **R-C (attribution)** on `feature/rbac-r-c-attribution`. Then R-D (review, assignment, walk-in clients — `docs/superpowers/specs/2026-10-10-job-review-assignment-design.md`), then J2. Spec: `docs/superpowers/specs/2026-09-30-rbac-and-invites-design.md`. |

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

Supabase CLI is linked (`npx supabase ...`). Apply DB changes with
`npx supabase db push`; run one-off SQL with `npx supabase db query --linked`.
After the 2026-10-07 Windows reset the Supabase, Vercel and GitHub CLIs need logging in
again (`npx supabase login`, `npx vercel login`, `gh auth login`).

`npm run build` ends with `scripts/check-content.mjs`: when Supabase is configured it
fails the build if pages prerender with no services / site settings, so an empty build
never replaces the live site. On Vercel, a "Redeploy" with the build cache can re-serve
the old output — untick **Use existing Build Cache** to force a real rebuild.

---

## Remaining work

### A. Phase 3 — Admin MVP · ✅ WP1–WP13 built & deployed

Everything is live at `platinum-point.vercel.app/admin` (sign in as `gatama98p@gmail.com`).
Left:

- **WP14 — owner acceptance run:** log in on a phone → edit a content block or a
  service → Save (watch for the "live in ~1–2 min" message) → open an enquiry →
  Convert to client → set a status → confirm a booking. Report anything rough.
- **Switch on the two integrations** by setting Supabase secrets:
  - `npx supabase secrets set VERCEL_DEPLOY_HOOK_URL=<hook>` — auto-publish. Create the
    hook in **Vercel → Project Settings → Git → Deploy Hooks** (branch `main`).
  - `npx supabase secrets set RESEND_API_KEY=<key> RESEND_FROM=<verified sender> NOTIFY_EMAIL=gatama98p@gmail.com`
    — customer booking emails + owner enquiry emails.
- **Add the staff member:** Team → Invite (email + name + role) → share the link by
  WhatsApp/email. One-time setup first (RBAC R-A): Supabase Site URL + Redirect URLs,
  Email OTP expiry 86400 s, and `npx supabase secrets set ADMIN_SITE_URL=https://platinum-point.vercel.app`.
  Staff see Jobs + Schedule only (RBAC R-B, migration 20261001090000); costs live in the owner-only job_cost / job_part_cost tables.
  Job activity (who did what) is logged by DB triggers into `job_activity`
  (migration 20261001100000) and shown on the Dashboard and each job's Activity tab.
- **Carried cleanup:** swap `src/shared/supabase/types.ts` for
  `npx supabase gen types typescript --linked`. (The `/admin` hydration error —
  React #418 on any hard load of an admin URL — is fixed: the admin has its own
  client-only entry, `admin.html`.)

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

1. Owner: WP14 acceptance run on the admin; set the `VERCEL_DEPLOY_HOOK_URL` and
   `RESEND_*` secrets to switch on auto-publish + emails.
2. Owner: replace the DRAFT site content via the CMS (Services, About/Page copy,
   Testimonials), then let it auto-publish.
3. Phase 2 **Part C — Go-Live** when ready to go public (domain, remove noindex,
   Turnstile, Search Console, GBP, Privacy Policy) — see `wp14-staging-plan.md` §6.
