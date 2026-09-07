# WP14 — Staging & Go-Live · Plan

> **Status: PLAN — for owner review and approval.** This is the last work package of
> Phase 2 (`docs/phase-2-plan.md`). It has **two checkpoints**, each approved
> separately: **A/B — Staging** (deploy privately, test) and **C — Go-Live** (attach the
> domain, turn on email + anti-spam, make it public).
> **Created:** 2026-09-07 · Companion to `phase-2-plan.md`, `decisions.md` (ADR-0002).

---

## 1. Purpose & scope

Take the built site — currently local + on GitHub only — to a real URL, run the
performance/accessibility pass that needs a deploy (WP11), then decide when to point a
domain at it and open it to the public.

**In scope:** host project + build config, env vars, `vercel.json` (routing +
security headers), a site-wide staging `noindex` switch, the deploy itself, a live
smoke-test + Lighthouse/axe pass, then domain + DNS + HTTPS, Search Console, Google
Business Profile alignment, switching forms to real anti-spam + email, and a final
security re-check.

**Out of scope:** the Phase 3 admin (auth, CRM, CMS, the Schedule view), the
publish→rebuild webhook, and anything in Post-MVP.

---

## 2. Prerequisites

- ✅ Phase 2 build complete; schema + RLS + seed applied; `submit` Edge Function
  deployed; 18 tests green (incl. 6 live RLS checks).
- ✅ GitHub repo `Bigmanbiggiey/platinum`, `main`, CI passing.
- A host account (see decision D1).
- For **checkpoint C only:** a chosen domain, Google Search Console access, Google
  Business Profile management access, a Resend account + verified sender, a Cloudflare
  Turnstile site (if anti-spam is wanted at launch), and the Privacy Policy cleared
  for publication.

---

## 3. Decisions needed from the owner

| # | Decision | Options / recommendation |
| --- | --- | --- |
| **D1** | **Host** | **Vercel Hobby** (free, fastest setup) — but Vercel's Hobby plan is for *non-commercial* use; a business site should move to **Vercel Pro (~$20/mo)** or use **Cloudflare Pages** (free, no commercial-use restriction, unlimited bandwidth, and you'll already have a Cloudflare account for Turnstile + analytics). **Recommendation: Cloudflare Pages** for a free business-appropriate host; Vercel Pro if you prefer Vercel's DX. The build output is plain static files, so switching later is trivial. |
| **D2** | **Domain** | Register `platinumpoint.co.ke` (or your preference) now, or stage on the free `*.pages.dev` / `*.vercel.app` subdomain and attach the domain later. Nothing blocks staging without a domain. Registrar/DNS: your own account, not a developer's. |
| **D3** | **When to go public** | Checkpoint C should wait until: (a) email notifications work (Resend), otherwise enquiries pile up unseen until the Phase 3 admin; and (b) you're comfortable with the draft content, or have edited it. Anti-spam (Turnstile) is strongly recommended before public but not strictly blocking. |
| **D4** | **Staging visibility** | Recommendation: staging is **`noindex` site-wide + `robots: Disallow /`** (a build flag) so Google never indexes the draft. Lifted at checkpoint C. |
| **D5** | **Auto-deploy** | `main` auto-deploys to the staging URL on every push (standard). The custom domain is only attached at checkpoint C, so day-to-day pushes stay private until then. |

---

## 4. Part A — Prep (code/config, no deploy yet)

Small, reviewable changes landed before the first deploy.

| # | Task | Detail |
| --- | --- | --- |
| A1 | **Host routing config** | `vercel.json` (or Cloudflare Pages `_redirects` + `_headers`): `cleanUrls` (serve `/services` from `services.html`), `trailingSlash: false`, and a rewrite `/admin/:path* → /index.html` so a hard load of `/admin` boots the SPA (RR then renders the admin chunk). *(Hydration note: `index.html` is the prerendered home page, so `/admin` flashes home then swaps — acceptable for an internal tool; Phase 3 can give the admin its own entry or subdomain.)* |
| A2 | **Security headers** | `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy` (disable camera/mic/geo), and a **Content-Security-Policy** allowing self + `*.supabase.co` (REST/functions/storage) + `challenges.cloudflare.com` (Turnstile) + `static.cloudflareinsights.com` (analytics) + `fonts.googleapis.com`/`fonts.gstatic.com`. HSTS is added automatically by both hosts on a custom domain. |
| A3 | **Staging `noindex` switch** | `VITE_SITE_NOINDEX=1` → `SeoHead` forces `noindex,nofollow` on every page. A small `scripts/finalize-public.mjs` (folds in the current `gen-sitemap` step) writes `dist/robots.txt`: when `VITE_SITE_NOINDEX` is set → `User-agent: *\nDisallow: /`; otherwise the normal allow-list + `Sitemap: <VITE_SITE_ORIGIN>/sitemap.xml`. This also removes the hard-coded `platinumpoint.co.ke` from the committed `robots.txt`. |
| A4 | **Origin-aware SEO** | `VITE_SITE_ORIGIN` already drives canonical + sitemap + JSON-LD `url`. Set it per environment (staging = the `.pages.dev`/`.vercel.app` URL; production = the real domain). |
| A5 | **Edge Function CORS** | Set the `submit` function's `ALLOWED_ORIGIN` secret — `*` is fine for staging; tighten to the exact production origin at C. |
| A6 | **`.env.example` + README** | Document the new env vars and the deploy steps. |

Gate for Part A: `typecheck` / `lint` / `test` / `build` green; `vercel.json` (or CF
config) reviewed.

---

## 5. Part B — Staging deploy (checkpoint 1)

| # | Task |
| --- | --- |
| B1 | Create the host project; connect the GitHub repo; set **framework = Vite / Other**, **build command `npm run build`**, **output `dist`**, Node 22. |
| B2 | Set env vars on the host: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_ORIGIN` = the staging URL, `VITE_SITE_NOINDEX=1`. (Leave `VITE_TURNSTILE_SITE_KEY` / `VITE_CF_ANALYTICS_TOKEN` unset for now.) |
| B3 | Trigger a deploy from `main`; confirm the build runs the SSG prerender + `finalize-public` step and publishes `dist/`. |
| B4 | **Smoke test on the staging URL:** every route loads; `cleanUrls` works; `/admin` boots; each `<title>`/canonical/OG is per-page; JSON-LD validates (Rich Results Test); `sitemap.xml` + `robots.txt` correct (robots should be `Disallow: /`); security headers present (securityheaders.com); no console errors; mobile layout + the sticky/floating contact bars; **submit each form** and confirm rows land (RLS test + a Supabase Table Editor check). |
| B5 | **WP11 — performance & accessibility** on the deployed site: Lighthouse **mobile ≥ 90** for Performance / SEO / Best Practices / Accessibility on Home + one Service detail + Contact; `axe` clean; load on a real mid-range Android over a throttled connection. Fix regressions (image sizing, font loading, layout shift, contrast). |
| B6 | Iterate on B4–B5 until green. Update `phase-2-plan.md` §8 and `project-state.md`. |

**Checkpoint 1 exit:** staging URL passes B4 + B5; owner has seen it; owner approves
proceeding to Go-Live.

---

## 6. Part C — Go-Live (checkpoint 2 — separate approval)

Only after D2/D3 are settled and the checkpoint-C prerequisites (§2) are in hand.

| # | Task |
| --- | --- |
| C1 | **Domain + DNS:** add the custom domain to the host; create the DNS records; verify HTTPS + HSTS; set the **apex ↔ www** redirect to one canonical host. |
| C2 | **Flip to production config:** `VITE_SITE_ORIGIN` = the real domain; **remove `VITE_SITE_NOINDEX`**; redeploy. Confirm `robots.txt` now allows crawling + lists the sitemap, and pages are `index,follow`. |
| C3 | **Real anti-spam + email.** Supabase secrets: `TURNSTILE_SECRET`, `RESEND_API_KEY`, `RESEND_FROM` (verified sender), `NOTIFY_EMAIL` (`gatama98p@gmail.com` or a branded address), and tighten `ALLOWED_ORIGIN` to the production origin. Host env: `VITE_TURNSTILE_SITE_KEY`, `VITE_CF_ANALYTICS_TOKEN`; redeploy. Re-test: form submit shows the Turnstile widget, a bad token is rejected, a good submission emails the owner. |
| C4 | **Search Console:** verify the property (DNS TXT or the HTML-file method — a file in `public/`), submit `sitemap.xml`, check coverage after a day. |
| C5 | **Google Business Profile:** add the website URL; confirm **NAP** (name, phone `+254 722 322870`, service-area), category (Auto repair shop / Mechanic), and hours match the site; link the GBP in `site_settings.gbp_url` (re-seed / edit) so it appears in the footer + JSON-LD `sameAs`. |
| C6 | **Data protection:** publish the Privacy Policy only after legal review (Kenya DPA 2019); set/record the enquiry-data retention rule; confirm the ODPC-registration position. |
| C7 | **Final security re-check:** only the Supabase **anon** key is in the client bundle (`grep` the build); no service-role key or Resend key anywhere client-side; headers intact; re-run the RLS suite against production; `/admin` still `noindex` and behind the (stub) guard. |
| C8 | **Housekeeping:** delete the two E2E test rows from the DB; set the real `legal_name` in `site_settings` if the business is a registered company. |
| C9 | Tag `v0.2.0` (public site live); update `project-state.md`, `roadmap.md` (Phase 2 → done), memory. Announce / start pointing customers at the URL. |

**Checkpoint 2 exit = Phase 2 complete:** site live on the real domain over HTTPS;
forms notify the owner; Search Console + GBP aligned; Lighthouse/axe targets held on
production; security re-checked; Privacy Policy published; owner signs off.

---

## 7. Rollback

Both hosts keep every deployment and support one-click rollback to a previous build.
DNS changes (C1) are the only slow-to-revert step — lower the TTL to 300s a day
before cutover. The database is unaffected by any deploy; a bad release is a rollback,
not a data problem.

---

## 8. Risks

| Risk | Mitigation |
| --- | --- |
| **Vercel Hobby commercial-use** flag on a business site | Decide D1 up front — Cloudflare Pages (free) or Vercel Pro. |
| `/admin` hard-load hydration mismatch (home HTML → admin) | Acceptable for an internal stub now; Phase 3 gives the admin a clean entry/subdomain. Noted, not blocking. |
| CSP too strict → Turnstile / analytics / fonts / Supabase calls blocked | Build the allow-list from the known third parties (A2); test every form + font + analytics beacon on staging (B4) before go-live. |
| Staging URL gets indexed before content is ready | `VITE_SITE_NOINDEX` + `robots: Disallow /` on staging (A3/B2); only lifted at C2. |
| Enquiries lost between go-live and the Phase 3 admin | Don't go public (C) until Resend email works (D3); the Supabase Table Editor is the interim fallback. |
| Search Console / GBP verification needs access the owner controls | Listed as checkpoint-C prerequisites; gather before starting Part C. |
| Sitemap/canonical point at the wrong origin | `VITE_SITE_ORIGIN` is set per environment and the sitemap regenerates each build (A3/A4). |

---

## 9. What this unlocks / does not

**Unlocks:** a real, fast, crawlable public site; enquiries and bookings reaching the
owner; the Phase 2 soft-launch.

**Does not touch:** the admin platform (Phase 3 — needs ADR-0007), content editing by
the owner, the publish→rebuild automation, or any Post-MVP feature. After WP14, Phase
2 is done and Phase 3 gets its own plan + approval.

---

## 10. Approval

- [ ] Owner picks **D1 (host)** and **D2 (domain / stage-first)**.
- [ ] Owner approves **Part A + B (staging)** — I land the prep changes and deploy privately.
- [ ] Later, once §2 checkpoint-C prerequisites are in hand, owner approves **Part C (Go-Live)** as a separate step.
