# Platinum Point Automotive Engineering — Project State

> **Purpose:** the single source of truth for *where this project actually is* right
> now — what exists, what has been decided, what phase we are in, and what happens
> next. Update this file whenever the state changes.
> **Last updated:** 2026-09-07 (rev. 4 — Phase 0 approved; Phase 1 approved & in progress, local-first)

---

## 1. Current phase

| | |
| --- | --- |
| **Phase** | **Phase 2 — Public Website MVP: APPROVED & IN PROGRESS (2026-09-07).** |
| **Phase 0 / Phase 1** | Both approved 2026-09-07. Phase 1 skeleton complete; Supabase connectivity verified. |
| **Repo** | **`github.com/Bigmanbiggiey/platinum`** (`main`). CI runs on push. **Connected to Vercel project `biggieys-projects/platinum-point` — pushes auto-deploy.** |
| **Staging** | Live (private) at **`https://platinum-point.vercel.app`** — `VITE_SITE_NOINDEX` (robots `Disallow: /`, every page `noindex,nofollow`). Security headers + CSP, real content, forms working E2E. Host = Vercel for now (revisit host/domain at Go-Live). |
| **ADRs accepted 2026-09-07** | 0005, 0006, 0008, 0009, 0011, 0012, 0013 (plus 0002/0003/0010 earlier). Only 0007 (admin auth) remains proposed → Phase 3. |
| **Phase 2 plan** | `docs/phase-2-plan.md` — approved; §8 Progress table rev. 2. **Schema + RLS + seed applied** to project `aonpdrqtosmqhmomghca`; **`submit` Edge Function deployed**; RLS verified live (6 tests); build prerenders 21 pages from real data. |
| **Deferred by owner** | Cloudflare Turnstile (forms = honeypot-only for now); Resend email key (no public soft-launch until set — enquiries visible in Phase 3 admin); site content stays DRAFT (owner edits later). |
| **Remaining for Phase 2** | **WP14 Parts A + B done** (`docs/wp14-staging-plan.md` — staging live on Vercel). Left: formal **Lighthouse/axe** run + **WP14 Part C — Go-Live** (separate approval). Full checklist tracked in memory `phase-2-remaining.md`. Three E2E test rows to clean from the DB. |
| **Phase 3** | **APPROVED & IN PROGRESS 2026-09-07.** `docs/phase-3-plan.md`. Decisions: email+password (ADR-0007 Accepted); roles `owner` (Paul) + `staff`; owner email + in-app Notifications view; dedicated `admin.html` entry; Markdown+preview; TanStack Query; `rebuild` Edge Function. Building WP1–WP3 (auth, schema+RLS, admin shell) first. |
| **Trading name** | **Platinum Point Automotive Engineering** (kickoff codename "Platinum Motor Services" retired). Repo folder stays `PLATINUM`. |

Phase-gate workflow in use:
`Discovery → Documentation → Review → Approval → Implementation → Testing → Verification → Next Phase`
(see `roadmap.md`). Silence is not approval.

---

## 2. Repository state (as of 2026-09-07, after Phase 1 build)

| Aspect | State |
| --- | --- |
| Working directory | `C:\Users\PCMF\PROJECTS\PLATINUM` |
| Git repository | Branch `main`; remote **`origin` = github.com/Bigmanbiggiey/platinum`** (pushed 2026-09-07). CI (`.github/workflows/ci.yml`) now runs on push. |
| Application code | **Phase 1 skeleton only** — Vite + React 19 + TS app shell; public marketing shell (1 placeholder page + 404); admin stub (login + dashboard placeholders, auth deferred). No product features. |
| Dependencies | Installed (npm; `package-lock.json` committed). |
| Build tooling | Vite 6 + `vite-react-ssg`, Tailwind v4, ESLint (flat) + Prettier, Vitest + RTL — all configured and passing locally. |
| Supabase project | **Not created by us.** Owner's dev account. Client code wired to read `.env.local`; **no schema**. |
| Database schema / migrations | **None.** |
| Supabase Auth / Storage / RLS config | **None.** |
| Hosting / deployment | **None.** Vercel deferred; nothing pushed anywhere. |
| Domain | **None registered / confirmed.** |
| CI/CD | `.github/workflows/ci.yml` runs on push/PR to `main` (remote live since 2026-09-07). No deployment step. |
| Environment / secrets | `.env.example` committed; `.env.local` not present (git-ignored). |
| Google Business Profile / Search Console / Analytics | Unresolved — see §14.2. |

**Nothing has been deployed or pushed to any remote.** Everything is local.

---

## 3. Files

### Phase 0 (docs) — updated through rev. 2/3
`docs/product-definition.md`, `docs/project-state.md`, `docs/decisions.md`,
`docs/roadmap.md`. See change log for what each revision added.

### Phase 2 planning
`docs/phase-2-plan.md` — detailed Phase 2 work breakdown (14 work packages),
data model, RLS matrix, prerequisites, local-first + staging sub-gate, exit criteria.
**Plan only — awaiting owner approval; no Phase 2 code.**

### Phase 1 (skeleton) — new 2026-09-07
- **Config:** `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`,
  `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.editorconfig`,
  `.gitignore`, `.gitattributes`, `.env.example`, `.github/workflows/ci.yml`,
  `index.html`, `vitest.setup.ts`
- **App:** `src/main.tsx` (SSG entry, `includedRoutes` excludes `/admin`),
  `src/routes.tsx`, `src/index.css` (Tailwind + Rev 01 brand tokens)
- **Shared:** `src/shared/business.ts` (confirmed NAP constants), `src/shared/env.ts`,
  `src/shared/supabase/client.ts` (+ connectivity check)
- **Public:** `src/public/PublicLayout.tsx`, `components/Wordmark.tsx`,
  `pages/HomePage.tsx`, `pages/NotFoundPage.tsx`
- **Admin (stub):** `src/admin/AdminEntry.tsx`, `AdminLayout.tsx` (`noindex`),
  `RequireAuth.tsx` (stub), `pages/AdminLoginPage.tsx`, `pages/AdminDashboardPage.tsx`
- **Tests:** `src/shared/business.test.ts`, `src/public/components/Wordmark.test.tsx`
- **Build:** `scripts/strip-admin-preload.mjs` (strips the admin modulepreload from
  prerendered public HTML), `public/robots.txt`, `public/favicon.svg` (interim)

**No** schema/migrations, RLS, auth logic, forms, real content, Edge Functions, or
deploy config.

---

## 4. Environment facts (for future phases)

- **OS:** Windows 11 Pro. **Shell:** PowerShell primary (Bash available).
- **Node:** v24.18.0 · **npm:** 11.18.0 · **git:** 2.54.0.windows.1 (verified 2026-09-07).
- **Package manager:** **npm** (lockfile committed).
- **Deployment:** none in Phase 1 by owner's instruction — local dev + local build/test
  only. Vercel deploy + GitHub remote are a later, explicit staging step.
- **Supabase:** project on the owner's personal dev account; credentials supplied by
  the owner into `.env.local` (never committed).
- **Owner works mobile-first** — admin UI and any owner-facing tooling must assume a
  phone.

---

## 5. Decisions log (summary — full detail in `decisions.md`)

| ADR | Decision | Status |
| --- | --- | --- |
| 0001 | Tech stack: React + TypeScript + Vite + Tailwind; Supabase (Postgres, Auth, Storage, RLS); Vitest + RTL; ESLint + Prettier; Git + GitHub. | **Accepted** (mandated by project brief). |
| 0002 | Frontend hosting = **Vercel** (owner's personal account for now); **deploy deferred** — local-first until production is explicitly staged. | **Accepted 2026-09-07.** |
| 0003 | Public-site rendering = **SSG / prerender within Vite** (`vite-react-ssg`); admin = code-split `noindex` SPA chunk. | **Accepted 2026-09-07.** |
| 0004 | "One dataset, two faces" — public site and admin share the same Supabase data; visibility via publish/approve flags + RLS. | **Accepted** (mandated by project brief). |
| 0005 | Consolidated intake: all public forms → one `service_request` concept with `request_type`. | **Proposed** — needs approval. |
| 0006 | Public form spam protection (Cloudflare Turnstile + honeypot + rate limiting). | **Proposed** — needs approval. |
| 0007 | Admin auth method (email+password vs magic link). | **Proposed** — needs approval + owner preference. |
| 0008 | New-enquiry / booking notification (dashboard + best-effort email via the submission Edge Function). | **Proposed** — needs approval + owner preference (§14.2 Q20). |
| 0009 | Image handling (Supabase Storage + delivery-time transforms). | **Proposed** — needs approval. |
| 0010 | Single Vite app for public + admin (route-split); folders `src/public` / `src/admin` / `src/shared`. | **Accepted 2026-09-07.** |
| 0011 | Analytics (privacy-friendly, cookieless) + Google Search Console. | **Proposed** — needs approval. |
| 0012 | English-primary content; incidental Swahili OK; no i18n framework in MVP. | **Proposed** — reflects owner answer; needs approval. |
| 0013 | Booking & scheduling: booking *requests* + owner confirmation in MVP; self-service availability calendar in Phase 5. | **Proposed** — owner-requested feature; needs sign-off on the staging (§14.2 Q11). |

---

## 6. Open questions status

Tracked in `product-definition.md` §14. **Most answered by the owner on 2026-09-07**
(now §14.1). **Still open: §14.2 (22 items).**

### Answered 2026-09-07

| Topic | Answer |
| --- | --- |
| Business name | Platinum Point Automotive Engineering |
| Phone | +254 722 322870 (Paul) |
| Email | gatama98p@gmail.com |
| Location | Near Shell Kitengela Service Station, Yukos |
| Owner | Mr. Paul Ndirangu Gatama (may be featured) |
| "DT Dobie" reference | Permitted |
| Service areas | Kitengela + environs; countrywide by arrangement (transport facilitated) |
| Engineering (press/lathe) | In scope, first-class |
| Pricing | Quote-based, CMS-adjustable explainer |
| Bodywork affiliates | Name a few (no URLs) |
| Online booking | Wanted → phased (ADR-0013) |
| Content | Owner will provide |
| Photos | To be sourced over time |
| Testimonials | Public submission, moderated; show first name + vehicle |
| Language | English-primary; incidental Swahili OK |
| Branding | **Rev 01 asset pack supplied 2026-09-07** — logo direction (datum mark), 8-colour palette (HEX/CMYK/Pantone), type stack (Archivo / IBM Plex Mono / Newsreader, SIL OFL). Recorded in `product-definition.md` §10.2. Pending: owner sign-off, production SVG masters + favicon + social image, tagline. |

### Still open — see `product-definition.md` §14.2

Opening hours (text); WhatsApp = same number?; registered company / legal name; branded
email; final service list & descriptions; partner names; portfolio jobs; About copy;
seed testimonials; Privacy Policy source; **booking staging sign-off**; booking
lead-time & windows; **domain name + who pays**; **GBP management access**;
**Supabase/hosting ownership + budget**; existing analytics; who administers (2nd
admin?); ODPC registration; data retention; **notification channel**; launch date;
brand sign-off + production files + tagline.

---

## 7. What happens on Phase 0 approval

1. Record the approval (date + who) in the change log below.
2. Get the owner the **§14.2 still-open** answers (esp. domain, GBP access, hosting
   ownership, notification channel, booking-staging sign-off) to unblock Phase 2.
3. Send the owner the branding asset request (`product-definition.md` §10.4).
4. Present Phase 1 scope from `roadmap.md` for its own approval gate.
5. **Do not begin Phase 1 implementation until Phase 1 is explicitly approved.**

---

## 8. Change log

| Date | Change | By |
| --- | --- | --- |
| 2026-09-07 | Project kickoff. Confirmed empty working directory, no git repo. Completed Phase 0 discovery: created `docs/product-definition.md`, `docs/project-state.md`, `docs/decisions.md`, `docs/roadmap.md`. No code, dependencies, schema, or infrastructure created. Awaiting Phase 0 approval. | Lead architect (TECHBIGGIEY) |
| 2026-09-07 | **Phase 0 APPROVED** by the owner ("I approve Phase 0"). Discovery baseline is now the agreed reference. | Owner + Lead architect (TECHBIGGIEY) |
| 2026-09-07 | **Phase 1 APPROVED** with changes: Vercel is the host but **no deploy in Phase 1** (local-first; production staged later); ADR-0003/0010 per recommendation; Supabase on the owner's dev account. ADR-0002/0003/0010 marked Accepted. Verified Node v24.18.0 / npm 11.18.0 / git 2.54. | Owner + Lead architect (TECHBIGGIEY) |
| 2026-09-07 | **Phase 1 BUILT.** Scaffolded the Vite + React 19 + TS skeleton: `vite-react-ssg` prerender (public), lazy `noindex` admin chunk, Tailwind v4 with Rev 01 brand tokens, ESLint/Prettier/strict TS, Vitest + RTL (3 tests), CI workflow (dormant), Supabase client wired to `.env.local` (no schema). Chose React Router **6.28** (vite-react-ssg 0.8.9 peer-requires RR6, not RR7). Added `scripts/strip-admin-preload.mjs` so public HTML doesn't prefetch the admin chunk. Local checks all green (typecheck/lint/format/test/build). `git init` + first commit `f9a9575` on `main` — **local only, no remote, no deploy**. Awaiting owner local review before Phase 2. | Lead architect (TECHBIGGIEY) |
| 2026-09-07 | **Phase 1 COMPLETE & APPROVED.** Owner added Supabase creds to `.env.local`. Fixed the connectivity check (`/rest/v1/` is service-role-only on current Supabase → use `/auth/v1/health`); verified 200 against project `aonpdrqtosmqhmomghca` (anon JWT, role `anon`, correct ref). Commit `c2df05d`. | Owner + Lead architect (TECHBIGGIEY) |
| 2026-09-07 | **Phase 2 plan drafted** → `docs/phase-2-plan.md` (14 work packages, data model, RLS matrix, prerequisites incl. ADR-0005/0006/0009/0011/0012/0013 + §14.2 content answers + external keys, local-first with a staging sub-gate). | Lead architect (TECHBIGGIEY) |
| 2026-09-07 | **Phase 2 APPROVED & started.** Owner: ADRs approved; hours confirmed (Mon–Sat 09:00–19:30, Sun 14:45–19:30); partner = TECHBIGGIEY for now. ADR-0005/0006/0008/0009/0011/0012/0013 marked Accepted. **Pushed repo to `github.com/Bigmanbiggiey/platinum`** (`git push -u origin main`); CI now active. `business.ts` gains `hours`. | Owner + Lead architect (TECHBIGGIEY) |
| 2026-09-07 | **Phase 2 build — first pass.** Written locally: `supabase/` migrations + seed + `functions/submit/`; front end `src/shared/{seo,analytics,content/*}`, UI primitives, chrome, all 14 public routes + forms, `gen-sitemap.mjs`, `robots.txt`; added `marked`. Committed `059a7f9`. Then `8c34da7` fixed dark-theme button contrast (paper-on-paper / orange-on-orange) — base styles into `@layer base`, primary buttons use "inverted ground". Pushed to GitHub. | Lead architect (TECHBIGGIEY) |
| 2026-09-07 | **WP14 Parts A + B — staging live.** Part A: `vercel.json` (cleanUrls, `/admin`→`/` SPA rewrite, security headers + CSP scoped to self/Supabase/Turnstile/CF-analytics/Google-Fonts, immutable asset cache), `VITE_SITE_NOINDEX` switch in SeoHead, `scripts/finalize-seo.mjs` (sitemap + per-env robots.txt). Part B: created Vercel project `biggieys-projects/platinum-point`, connected GitHub (auto-deploy on push), set env vars (Prod+Preview), deployed → **`https://platinum-point.vercel.app`**. Smoke test passed: all routes 200, 21 prerendered pages, `/admin` boots, `robots: Disallow: /`, security headers + CSP live, per-page noindex + JSON-LD, **form submit E2E from the deployed origin → `{ok:true}`**. Fixed header button overflow (`compact` Call label). WP11 fundamentals verified; formal Lighthouse/axe pending (PageSpeed Insights). Now 3 E2E test rows in the DB. | Owner (Vercel OAuth) + Lead architect (TECHBIGGIEY) |
| 2026-09-07 | **Phase 2 — schema live.** Owner enabled `supabase login` (Cloudflare + content deferred). `supabase link` + `db push` applied 3 migrations to project `aonpdrqtosmqhmomghca` (Postgres 17 — fixed `config.toml`); `db push --include-seed` applied `seed.sql`; `functions deploy submit` deployed the Edge Function. Verified: RLS via anon (published-only reads; base tables + service_request = 401; anon insert = 401) and the Edge Function E2E (valid→ok+insert, honeypot/timing→silently dropped, no-consent/bad-type→422, GET→405). Added `src/shared/supabase/rls.test.ts` (6 live checks, skipped in CI). Build now prerenders **21 pages** (12 + 9 service details) from real data; 18 tests pass. 2 E2E test rows left in the DB (labelled; not public). | Lead architect (TECHBIGGIEY) |
| 2026-09-07 | **Brand pack received.** Owner supplied `Platinum Point Brand Assets.dc.html` ("Rev 01"): datum-mark logo + variants, 8-colour palette with HEX/CMYK/Pantone + 60/30/10 ratio, type stack (Archivo / IBM Plex Mono / Newsreader, all SIL OFL 1.1), substitutes. Recorded in `product-definition.md` §10.2; `decisions.md` deferred-list "Brand system" row; §14.2 Q22–24 (sign-off, production SVG masters + favicon + social, tagline) added. No files copied into the repo; still Phase 0, no code. | Lead architect (TECHBIGGIEY) |
| 2026-09-07 | **Docs rev. 2** after the owner answered most of §14. Adopted the confirmed trading name **Platinum Point Automotive Engineering** across all docs (retired "Platinum Motor Services"). Added: confirmed-facts block, Book-a-Service journey/page/form, engineering (press & lathe) as first-class services, `partner` entity + Partners CMS, public testimonial submission (first name + vehicle display), quote-based pricing explainer, branding asset request (§10.4), risks R-18/R-19. Added **ADR-0013 — Booking & scheduling approach** (phased: requests now, availability engine in Phase 5); updated ADR-0006/0008/0012. Roadmap: Phase 2/3 updated, new **Phase 5 — self-service scheduling**. §14 split into 14.1 answered / 14.2 still-open (22 items). **Still no code/deps/schema/infra. Still awaiting explicit Phase 0 approval.** | Lead architect (TECHBIGGIEY) |
