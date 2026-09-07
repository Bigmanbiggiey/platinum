# Platinum Point Automotive Engineering

Public website + admin platform for **Platinum Point Automotive Engineering** — a
mobile automotive workshop in Kitengela, Kenya, run by Paul Ndirangu Gatama (former DT
Dobie engineer). Also a TECHBIGGIEY case-study project.

> **Status: Phase 2 — Public Website MVP (in progress, local-first).**
> Public pages, schema, RLS and the submission Edge Function are built. No admin UI
> yet (Phase 3), no deployment yet (WP14 staging sub-gate). See [`docs/`](./docs) for
> the phase-gated plan — nothing is built ahead of an approved phase.

## Stack

React 19 · TypeScript · Vite · [`vite-react-ssg`](https://github.com/Daydreamer-riri/vite-react-ssg)
(prerendered public routes) · Tailwind CSS v4 · Supabase (Postgres + RLS + Edge
Function) · Vitest + React Testing Library · ESLint (flat) + Prettier.

Key decisions: [`docs/decisions.md`](./docs/decisions.md).

## Prerequisites

- Node **>= 20.19** (developed on v24)
- npm (this repo uses npm; `package-lock.json` is committed)

## Setup

```bash
npm install
cp .env.example .env.local   # fill in the two Supabase values for real content
```

`.env.local` (git-ignored):

| Variable                 | What                                                                     | Needed?                                     |
| ------------------------ | ------------------------------------------------------------------------ | ------------------------------------------- |
| `VITE_SUPABASE_URL`      | Supabase project URL (owner's dev account)                               | For real content; the app builds without it |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/publishable key (safe in the browser; RLS is the boundary) | For real content                            |
| `VITE_SITE_ORIGIN`       | Canonical origin for `<link rel=canonical>` / sitemap                    | Optional (placeholder default)              |

Optional integrations — see [`.env.example`](./.env.example): `VITE_TURNSTILE_SITE_KEY`
(anti-spam widget), `VITE_CF_ANALYTICS_TOKEN` (cookieless analytics), `VITE_SUBMIT_URL`.
Without Supabase configured the app still runs — content queries return empty and pages
show their empty states.

## Scripts

| Command                           | Does                                                           |
| --------------------------------- | -------------------------------------------------------------- |
| `npm run dev`                     | Vite dev server (public site + `/admin`)                       |
| `npm run build`                   | Prerender + production build to `dist/` (via `vite-react-ssg`) |
| `npm run preview`                 | Serve the built `dist/` locally                                |
| `npm run typecheck`               | `tsc --noEmit`                                                 |
| `npm run lint`                    | ESLint                                                         |
| `npm run format` / `format:check` | Prettier write / check                                         |
| `npm run test` / `test:watch`     | Vitest                                                         |

## Project structure

```
src/
  main.tsx            vite-react-ssg entry; excludes /admin from prerender
  routes.tsx          route table
  index.css           Tailwind + Rev 01 brand tokens (single source of truth)
  shared/             cross-cutting: business constants, env, supabase client,
                      content queries, seo/analytics helpers
  public/             prerendered marketing site (layout, pages, components, forms)
  admin/              lazy-loaded, noindex admin chunk (auth is a stub until Phase 3)
supabase/             migrations, RLS, seed, `submit` Edge Function
docs/                 product definition, project state, decisions, roadmap, phase-2-plan
.github/workflows/    CI (lint + typecheck + test + build on push/PR to main)
```

## Supabase (schema, RLS, Edge Function)

Migrations, RLS policies, Storage bucket and the `submit` Edge Function live in
[`supabase/`](./supabase). They are **not applied automatically** — an authenticated
Supabase CLI is required.

```bash
npx supabase login                                   # one-time (interactive)
npx supabase link --project-ref aonpdrqtosmqhmomghca
npx supabase db push                                 # apply migrations
psql "<DB connection string>" -f supabase/seed.sql   # or: npx supabase db reset (local)
npx supabase functions deploy submit
npx supabase secrets set RESEND_API_KEY=... NOTIFY_EMAIL=... TURNSTILE_SECRET=...
```

The front end **degrades gracefully** before migrations are applied: content queries
return empty and pages show their empty states, so `npm run build` stays green.

## What is intentionally NOT here yet

Admin UI, authentication, CRM, the Schedule view, media uploads, content editing, the
publish→rebuild hook (all Phase 3). Quotes / invoices / inspection reports / reminders
(Post-MVP). See [`docs/phase-2-plan.md`](./docs/phase-2-plan.md).

## Deployment

Deferred to the Phase 2 "WP14 staging" sub-gate. Target host is Vercel; the site is
validated locally (`npm run build && npm run preview`) until production is explicitly
staged. No Vercel config is committed yet.
