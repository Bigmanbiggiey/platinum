# Pick up here — status & remaining work

> Snapshot for resuming the build. Written 2026-09-07; **status updated 2026-10-20.**
> Authoritative detail lives in `project-state.md` (change log), `phase-2-plan.md` §8,
> `phase-3-plan.md` §6, `wp14-staging-plan.md` and `docs/superpowers/plans/`. This file
> is the one-page summary. Repo overview: `README.md`.

---

## Where things stand

| Area | State |
| --- | --- |
| **0 — Discovery / 1 — Foundation** | ✅ Approved. |
| **2 — Public website MVP** | 🟢 Built and **live on private staging**. WP11 perf/a11y merged (PR #22; local Lighthouse Perf 94–95, A11y 100). Left: **Go-Live (WP14 Part C)**. |
| **3 — Admin MVP** | 🟢 **Functionally complete (WP1–WP13).** Left: WP14 owner acceptance run; `gen types` cleanup. |
| **Jobs (ADR-0014)** | ✅ **J1** work orders (PR #4), **J2** publish to portfolio (PRs #16–#20), **J3** client review links (PR #21): all **live and accepted**. |
| **RBAC (owner/staff)** | ✅ **R-A** invites, **R-B** permissions, **R-C** attribution, **R-D** review/assignment/walk-ins (PRs #9–#15): all live. |
| **Themes** | ✅ Light / Dark / System on the site (footer) and admin (header), no flash (PR #23). |
| **Rename** | ✅ **Platinum Motor Services** across the site, admin, emails and docs (PR #24, 2026-10-19). PM monogram favicon. Kept: `platinum-point` URLs/slugs, `ppae-*` asset names, `PP-` job numbers. |
| **PMS Admin app (ADR-0015)** | ✅ Admin installable as a PWA on Android and iPhone (PR #25, 2026-10-20), live. Left: owner's real-phone checks (below). |

## What's live / where

| Thing | Where |
| --- | --- |
| Repo | `github.com/Bigmanbiggiey/platinum` (`main`). GitHub Actions CI on push/PR. |
| Hosting | Vercel project `biggieys-projects/platinum-point`. **Auto-deploys on push to `main`**. Branch previews are behind Vercel login. |
| Public site (staging) | `https://platinum-point.vercel.app` with `VITE_SITE_NOINDEX=1` (robots `Disallow: /`, every page `noindex`). |
| Admin / PMS Admin app | `https://platinum-point.vercel.app/admin`. Owner signs in as `gatama98p@gmail.com`. Install steps: `owner-guide.md`. |
| Supabase | Project `aonpdrqtosmqhmomghca` ("platinum"), Postgres 17. All migrations applied. Functions `submit`, `notify-customer`, `rebuild`, `admin-invite` deployed. |
| Secrets set | `VERCEL_DEPLOY_HOOK_URL` (auto-publish works), `ADMIN_SITE_URL`. `RESEND_API_KEY` + `NOTIFY_EMAIL` being set by the owner (2026-10-19). Confirm with `npx supabase secrets list`. |
| Local env | `.env.local` has `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. |

## Run / verify locally

```
npm install
npm run dev          # http://localhost:5173  (+ /admin)
npm run typecheck && npm run lint && npm run test && npm run build
npm run preview      # http://localhost:4173 — the only local way to try the admin PWA
```

Supabase CLI is linked (`npx supabase ...`). Apply DB changes with
`npx supabase db push`; run one-off SQL with `npx supabase db query --linked`.
After the 2026-10-07 Windows reset the Supabase, Vercel and GitHub CLIs need logging in
again (`npx supabase login`, `npx vercel login`, `gh auth login`).

`npm run build` ends with two guards: `stamp-admin-sw.mjs` fails if a public page
references the admin PWA, and `check-content.mjs` fails if pages prerender with no
services / site settings (so an empty build never replaces the live site). On Vercel, a
"Redeploy" with the build cache can re-serve the old output, so untick **Use existing
Build Cache** to force a real rebuild.

---

## Now — owner checks on real phones (PR #25)

1. **Android:** install PMS Admin from the Dashboard card → launch from the icon
   (standalone, dark splash with the PM icon) → sign in → open a job → close and reopen.
2. **iPhone:** Safari → Share → Add to Home Screen → check icon/name, that nothing sits
   under the notch, and sign in and navigate.
3. **Updates:** after the next deploy, the installed app shows the change with no reinstall.

## Email (Resend)

- With `RESEND_API_KEY` + `NOTIFY_EMAIL` set, owner alerts work. Test with an enquiry on
  the Contact page.
- **Customer emails need a verified domain.** The default sender `onboarding@resend.dev`
  only delivers to the Resend account's own address. Register a domain (with the rename,
  e.g. `platinummotorservices.co.ke`), verify it in Resend, then
  `npx supabase secrets set "RESEND_FROM=Platinum Motor Services <bookings@<domain>>"`.
  This ties in with the Go-Live domain decision.

## Remaining work

### A. Phase 3 — Admin MVP · ✅ WP1–WP13 built & deployed

Everything is live at `platinum-point.vercel.app/admin` (sign in as `gatama98p@gmail.com`).
Left:

- **WP14 — owner acceptance run:** log in on a phone → edit a content block or a
  service → Save (watch for the "live in ~1–2 min" message) → open an enquiry →
  Convert to client → set a status → confirm a booking. Report anything rough.
- **Integrations:** auto-publish (`VERCEL_DEPLOY_HOOK_URL`) is ✅ set and working. Email:
  see **Email (Resend)** above.
- **Add the staff member:** Team → Invite (email + name + role) → share the link by
  WhatsApp/email. One-time setup first (RBAC R-A): Supabase Site URL + Redirect URLs,
  Email OTP expiry 86400 s, and `npx supabase secrets set ADMIN_SITE_URL=https://platinum-point.vercel.app`.
  Staff see Jobs + Schedule only (RBAC R-B, migration 20261001090000); costs live in the owner-only job_cost / job_part_cost tables.
  Job activity (who did what) is logged by DB triggers into `job_activity`
  (migration 20261001100000) and shown on the Dashboard and each job's Activity tab.
  Staff submit jobs for review (`awaiting_review`); only the owner completes or sends back.
  Assignments live in `job_assignee` (names for staff via the `job_assignee_named` view).
  Published jobs: `portfolio_project.job_id` + the `job_public` view (the only public window onto
  job data); pages are prerendered, so a change shows after a rebuild (~30 s–2 min). Publish/Update/
  Unpublish, withdrawing consent and re-opening a job rebuild at once; photo and public-text
  edits on a published job rebuild after 20 s. Any active team member can trigger a rebuild.
  Photos: responsive copies (480/960/1600 px WebP) are made in the browser at upload and listed
  in `media.variants` — Supabase image transforms are not on our plan, never use them.
- **Carried cleanup:** swap `src/shared/supabase/types.ts` for
  `npx supabase gen types typescript --linked`. (The `/admin` hydration error —
  React #418 on any hard load of an admin URL — is fixed: the admin has its own
  client-only entry, `admin.html`.)

### B. Phase 2 — to close it out

- **WP11 perf/a11y:** ✅ merged (PR #22). Left: re-run Lighthouse on staging and a real-device check; later, trim unused JS.
- **WP14 Part C — Go-Live** (`wp14-staging-plan.md` §6), needs owner decisions/inputs:
  - Domain + DNS (host/domain to be revisited — currently Vercel; note Vercel Hobby is non-commercial-use → decide Vercel Pro vs Cloudflare Pages).
  - Remove `VITE_SITE_NOINDEX`; point `VITE_SITE_ORIGIN` at the real domain; redeploy.
  - Cloudflare **Turnstile** keys (`VITE_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET`).
  - **Resend** verified domain + `RESEND_FROM` (same domain as the site).
  - Point `ADMIN_SITE_URL` and Supabase Auth Site/Redirect URLs at the real domain. The
    installed PMS Admin app is tied to its address, so **after a domain change everyone
    reinstalls it from the new address**.
  - Cloudflare **Web Analytics** token (`VITE_CF_ANALYTICS_TOKEN`).
  - **Google Search Console** verify + submit sitemap.
  - **Google Business Profile** alignment (NAP/category/hours) + set `site_settings.gbp_url`.
  - **Privacy Policy** legal review (Kenya DPA 2019) then publish; retention rule; ODPC position.
  - Final security re-check.
- **Delete the E2E test rows** in the DB (a few `service_request` + a `pending` `testimonial`, labelled "…E2E…delete").
- Content is **DRAFT** in the DB. The owner edits it via the admin CMS.

### C. Waiting on the owner

| Needed for | Item |
| --- | --- |
| Email | Resend key ✅ (2026-10-19); a **domain** to verify for customer emails. |
| WP3b (staff account) | The **staff person's email** — then use the Team page's "Create invite". |
| WP14 C | Domain choice + host decision; Turnstile keys; CF Analytics token; Search Console + GBP access; Privacy Policy source. |
| Content | Final service copy, About detail, real testimonials + consent, booking lead-time/windows, confirm WhatsApp = +254 722 322870. |

---

## Suggested order to resume

1. Owner: real-phone checks of the PMS Admin app (above) and the WP14 acceptance run.
   Test an owner email alert.
2. Owner: replace the DRAFT site content via the CMS (Services, About/Page copy,
   Testimonials), then let it auto-publish.
3. Pick and register the **domain** (unblocks customer emails and Go-Live).
4. Phase 2 **Part C — Go-Live** when ready to go public (domain, remove noindex,
   Turnstile, Search Console, GBP, Privacy Policy) — see `wp14-staging-plan.md` §6.
5. Next feature candidates: **PWA-2** push notifications for new bookings (plan §Follow-up
   in `docs/superpowers/plans/2026-10-19-admin-pwa.md`), then Post-MVP increments in
   `roadmap.md`.
