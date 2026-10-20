# Platinum Motor Services

Public website + admin platform for **Platinum Motor Services**, a mobile automotive
workshop in Kitengela, Kenya, run by Paul Ndirangu Gatama (former DT Dobie engineer).
The admin can also be installed on phones as the **PMS Admin** app. This is also a
TECHBIGGIEY case-study project.

|                           |                                                                                                                                                                                                                                                                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Public site (staging)** | <https://platinum-point.vercel.app>. Live but hidden from search engines (`noindex`) until Go-Live.                                                                                                                                                                                                                                           |
| **Admin / PMS Admin app** | <https://platinum-point.vercel.app/admin>                                                                                                                                                                                                                                                                                                     |
| **Status (2026-10-20)**   | Public site, admin (CRM + CMS), jobs with publish-to-portfolio and client review links, owner/staff roles, light/dark themes and the installable admin app are **all live on staging**. Still to do: **Go-Live** (domain, remove `noindex`, Turnstile, Search Console, Privacy Policy). See [`docs/pick-up-here.md`](./docs/pick-up-here.md). |

## What it does

**Public website** (prerendered, fast, SEO-ready):

- Home, Services (+ detail pages), Work (portfolio and published job stories), About,
  Service areas, Testimonials, Contact, Book a service, Request a service / inspection,
  Privacy, and the client review page (`/review/<code>`).
- Forms go to one `submit` Edge Function (honeypot + timing checks; Turnstile when keys
  are set) and arrive in the admin as requests.
- Call / WhatsApp buttons everywhere. JSON-LD (`AutoRepair`), sitemap, light/dark theme.

**Admin** (`/admin`, client-only, never indexed):

- **Owner:** Dashboard, Notifications, Requests (convert to client + vehicle), Schedule
  (confirm/decline bookings, which emails the customer), Jobs, Clients, Website content
  (Services, Portfolio, Testimonials, Media, Page copy, Areas, Partners), Settings, Team.
- **Staff:** Jobs and Schedule only. No clients, phone numbers, costs or website content.
- **Jobs:** check-in → diagnosis → repair → wrap-up, with photos (EXIF/GPS stripped,
  responsive WebP copies made in the browser), parts, labour and an activity log of who
  did what. Staff submit for review and the owner approves. Completed jobs with client
  consent can be **published** to the portfolio. **Review links** let clients leave a
  review once, within 30 days.
- **Publishing:** content saves trigger a Vercel rebuild, and changes go live in about
  1–2 minutes.

## Install the PMS Admin app on a phone

The admin is a Progressive Web App, so there's no app store involved.

| Phone       | How                                                                                                                                                            |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Android** | Open **Chrome** → `platinum-point.vercel.app/admin` → sign in → tap **Install** on the Dashboard's "Install the app" card (or Chrome **⋮** → **Install app**). |
| **iPhone**  | Open **Safari** (not Chrome) → `platinum-point.vercel.app/admin` → **Share** → **Add to Home Screen** → **Add**. Then open the app and sign in.                |

- **iPhone keeps the app's login separate from Safari's**, so sign in once inside the app.
- **Email links** (staff invites, password resets) open in the browser. Finish there,
  then use the app.
- **Updates are automatic.** The app loads the latest deploy each time it's opened.
- **No connection:** it shows a "You're offline" screen with **Try again**.
- **To remove it:** long-press the icon → **Uninstall** (Android) / **Remove App** (iPhone).

The full how-to for owners and staff is in [`docs/owner-guide.md`](./docs/owner-guide.md).

## Stack

React 19 · TypeScript · Vite 6 · [`vite-react-ssg`](https://github.com/Daydreamer-riri/vite-react-ssg)
(prerendered public routes) · Tailwind CSS v4 · TanStack Query 5 · Supabase (Postgres 17

- RLS, Auth, Storage, Edge Functions) · Resend (email) · Vercel (hosting) · Vitest + React
  Testing Library · ESLint (flat) + Prettier.

Architecture decisions are recorded as ADRs in [`docs/decisions.md`](./docs/decisions.md):
ADR-0003 SSG, ADR-0010 two HTML entries, ADR-0014 jobs, ADR-0015 admin PWA.

## Local development

**Prerequisites:** Node **>= 20.19** (developed on v24), npm (`package-lock.json` is
committed).

```bash
npm install
cp .env.example .env.local   # fill in the Supabase values for real content
npm run dev                  # http://localhost:5173 (public) and /admin
```

`.env.local` (git-ignored):

| Variable                  | What                                                                            | Needed?                                     |
| ------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------- |
| `VITE_SUPABASE_URL`       | Supabase project URL                                                            | For real content; the app builds without it |
| `VITE_SUPABASE_ANON_KEY`  | Supabase anon key (safe in the browser; RLS is the boundary)                    | For real content                            |
| `VITE_SITE_ORIGIN`        | Canonical origin for `<link rel=canonical>` / sitemap                           | Optional (placeholder default)              |
| `VITE_SITE_NOINDEX`       | `1` = `noindex` everywhere + `robots.txt` disallows all (staging)               | Set on staging; blank at Go-Live            |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile widget on forms                                            | Optional                                    |
| `VITE_CF_ANALYTICS_TOKEN` | Cloudflare Web Analytics (cookieless)                                           | Optional                                    |
| `VITE_SUBMIT_URL`         | Override the form endpoint (default `${VITE_SUPABASE_URL}/functions/v1/submit`) | Optional                                    |

Without Supabase configured the app still runs: content queries return empty and pages
show their empty states.

The admin's service worker is registered **only in production builds**. To try the
installable app locally, run `npm run build && npm run preview` and open
`http://localhost:4173/admin`.

## Scripts

| Command                           | Does                                                                       |
| --------------------------------- | -------------------------------------------------------------------------- |
| `npm run dev`                     | Vite dev server (public site + `/admin`)                                   |
| `npm run build`                   | Prerender + production build to `dist/`, then the post-build scripts below |
| `npm run preview`                 | Serve the built `dist/` locally (`/admin` served from `admin.html`)        |
| `npm run typecheck`               | `tsc --noEmit`                                                             |
| `npm run lint`                    | ESLint                                                                     |
| `npm run format` / `format:check` | Prettier write / check                                                     |
| `npm run test` / `test:watch`     | Vitest                                                                     |
| `npm run check:mobile`            | Phone/tablet navigation check in a real browser (see below)                |

Post-build steps (run by `npm run build`, in `scripts/`):

| Script                    | Does                                                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `strip-admin-preload.mjs` | Removes admin `modulepreload` hints from public HTML (public visitors never download the admin).                             |
| `stamp-admin-sw.mjs`      | Stamps `dist/admin-sw.js` with the build id (fresh caches per deploy). **Fails** if a public page references the PWA files.  |
| `finalize-seo.mjs`        | Writes `sitemap.xml` + `robots.txt` (honours `VITE_SITE_NOINDEX`).                                                           |
| `check-content.mjs`       | When Supabase is configured, **fails** the build if pages prerendered empty, so an empty build never replaces the live site. |

### Mobile check

`npm run check:mobile [base-url]` drives your installed **Edge** (or Chrome:
`BROWSER_CHANNEL=chrome`) through `playwright-core`, with touch emulation at 320, 360,
390, 430, 667×375, 768 and 1024 px. It checks the public menu and the admin header +
drawer: no sideways overflow, nothing cut off or wrapping, tap targets ≥ 44 px, Escape /
backdrop / link closing, scroll lock, `inert`, and focus moving in and back. The admin
runs with a fake session and **every Supabase request is answered inside the test
browser**, so the real project is never touched. Screenshots go to `tmp/mobile-nav/`
(git-ignored). It exits 1 on any failure. Run it before any PR that changes layout or
navigation:

```bash
npm run build && npm run preview     # terminal 1
npm run check:mobile                 # terminal 2 (default http://localhost:4173)
```

`scripts/gen-admin-icons.mjs` is run **by hand** (`node scripts/gen-admin-icons.mjs`) to
re-render `public/icons/*.png` from `public/favicon.svg` when the mark changes.

## Project structure

```
index.html            public entry → src/main.tsx (prerendered + hydrated)
admin.html            admin entry → src/admin/main.tsx (client-only; links the PWA manifest)
src/
  routes.tsx          public route table
  index.css           Tailwind + Rev 01 brand tokens, light/dark themes
  shared/             business constants, env, Supabase client, content queries,
                      menu behaviour (lib/useMenuDismiss) shared by both navs,
                      SEO/analytics helpers, theme switcher
  public/             public site: layout, pages, components, forms
  admin/              admin SPA: shell, auth, pages, jobs, content CMS, lib
    pwa/              service-worker registration, routing rules, install prompt
public/
  admin.webmanifest   PMS Admin manifest (scope /admin)
  admin-sw.js         admin service worker (scope /admin)
  admin-offline.html  offline screen
  icons/              PWA icons (generated)
supabase/
  migrations/         schema, RLS, triggers, functions (applied with `db push`)
  functions/          Edge Functions: submit, notify-customer, rebuild, admin-invite
  seed.sql            initial content
scripts/              post-build steps + icon generator
docs/                 product definition, state, decisions, roadmap, plans, owner guide
.github/workflows/    CI: lint + typecheck + test + build on push/PR to main
vercel.json           clean URLs, /admin rewrite, security headers + CSP, PWA headers
```

## Supabase

Project `aonpdrqtosmqhmomghca` (Postgres 17). **Nothing is applied automatically.** Use
an authenticated Supabase CLI:

```bash
npx supabase login                                     # one-time
npx supabase link --project-ref aonpdrqtosmqhmomghca
npx supabase db push                                   # apply new migrations
npx supabase functions deploy <name>                   # submit | notify-customer | rebuild | admin-invite
npx supabase secrets set NAME=value ...                # see below
npx supabase secrets list
```

`supabase/config.toml` sets JWT checks per function (`submit` is public; the others need
a signed-in admin).

| Edge Function     | Does                                                                                |
| ----------------- | ----------------------------------------------------------------------------------- |
| `submit`          | Public forms + review links → `service_request` / `testimonial`; owner email alert. |
| `notify-customer` | Booking confirmed/declined email to the customer.                                   |
| `rebuild`         | Calls the Vercel deploy hook after content/job publishing (debounced).              |
| `admin-invite`    | Owner-only staff invites (one-time link, 24 h).                                     |

| Secret                   | Used by                 | Notes                                                                                                                        |
| ------------------------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `RESEND_API_KEY`         | submit, notify-customer | Emails are skipped without it.                                                                                               |
| `NOTIFY_EMAIL`           | submit                  | Where owner alerts go.                                                                                                       |
| `RESEND_FROM`            | submit, notify-customer | Default `onboarding@resend.dev` **can only send to the Resend account's own email**. Customer emails need a verified domain. |
| `VERCEL_DEPLOY_HOOK_URL` | rebuild                 | Vercel → Project Settings → Git → Deploy Hooks (branch `main`).                                                              |
| `ADMIN_SITE_URL`         | admin-invite            | `https://platinum-point.vercel.app` (later the real domain). Must be `https://`.                                             |
| `ADMIN_ALLOWED_ORIGIN`   | admin-invite            | Optional CORS lock.                                                                                                          |
| `TURNSTILE_SECRET`       | submit                  | Optional, pairs with `VITE_TURNSTILE_SITE_KEY`.                                                                              |
| `ALLOWED_ORIGIN`         | submit                  | Optional CORS lock.                                                                                                          |

> **Never use Supabase image transformations (`render/image`).** They're not on our
> plan. Responsive copies are made in the browser at upload and listed in
> `media.variants`.

## Deployment

- **Vercel** project `biggieys-projects/platinum-point`. **Pushes to `main` auto-deploy**
  to <https://platinum-point.vercel.app>. Branches get preview deploys, which are behind
  Vercel login, so the PWA can't be installed from them.
- Env vars for the front end are set in Vercel (Production + Preview). Edge Function
  secrets live in Supabase.
- To force a real rebuild, use Vercel **Redeploy** with **Use existing Build Cache** unticked.
- **If the admin service worker ever misbehaves**, deploy the kill switch in ADR-0015
  (`docs/decisions.md`): it unregisters itself on every installed phone at next open.

## Workflow

Phase-gated (`Discovery → Docs → Review → Approval → Build → Test → Verify`). Each
feature gets a plan in `docs/superpowers/plans/`, a branch and a PR. CI must pass before
merge, and layout/navigation changes also pass `npm run check:mobile`. Production-affecting steps (`db push`, `functions deploy`, secrets) are run by
the owner.

## Documentation

| Doc                                                          | What                                                  |
| ------------------------------------------------------------ | ----------------------------------------------------- |
| [`docs/pick-up-here.md`](./docs/pick-up-here.md)             | **Start here.** One-page status and remaining work.   |
| [`docs/owner-guide.md`](./docs/owner-guide.md)               | How to use the admin / PMS Admin app (owner + staff). |
| [`docs/project-state.md`](./docs/project-state.md)           | Current state and change log.                         |
| [`docs/decisions.md`](./docs/decisions.md)                   | Architecture decisions (ADRs).                        |
| [`docs/roadmap.md`](./docs/roadmap.md)                       | Phases, Post-MVP increments.                          |
| [`docs/product-definition.md`](./docs/product-definition.md) | Discovery baseline: business, users, scope, brand.    |
| [`docs/superpowers/`](./docs/superpowers)                    | Feature specs and implementation plans.               |
