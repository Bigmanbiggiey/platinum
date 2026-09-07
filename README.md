# Platinum Point Automotive Engineering

Public website + admin platform for **Platinum Point Automotive Engineering** — a
mobile automotive workshop in Kitengela, Kenya, run by Paul Ndirangu Gatama (former DT
Dobie engineer). Also a TECHBIGGIEY case-study project.

> **Status: Phase 1 — Foundation & Scaffolding (local-first).**
> This is an empty, tooled skeleton. No product features, no schema, no deployment.
> See [`docs/`](./docs) for the phase-gated plan — nothing is built ahead of an
> approved phase.

## Stack

React 19 · TypeScript · Vite · [`vite-react-ssg`](https://github.com/Daydreamer-riri/vite-react-ssg)
(prerendered public routes) · Tailwind CSS v4 · Supabase (client only in Phase 1) ·
Vitest + React Testing Library · ESLint (flat) + Prettier.

Key decisions: [`docs/decisions.md`](./docs/decisions.md).

## Prerequisites

- Node **>= 20.19** (developed on v24)
- npm (this repo uses npm; `package-lock.json` is committed)

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the two Supabase values (optional in Phase 1)
```

`.env.local` (git-ignored):

| Variable                 | What                                                                     | Needed?                                                         |
| ------------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Supabase project URL (owner's dev account)                               | Optional in Phase 1 — only the admin connectivity check uses it |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/publishable key (safe in the browser; RLS is the boundary) | Optional in Phase 1                                             |

Without these, the app runs fine; the admin dashboard just reports
"Supabase not configured".

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
  shared/             cross-cutting: business constants, env, supabase client
  public/             prerendered marketing site (layout, pages, components)
  admin/              lazy-loaded, noindex admin chunk (auth is a stub until Phase 3)
docs/                 product definition, project state, decisions, roadmap
.github/workflows/    CI (runs once a GitHub remote exists — deferred)
```

## What is intentionally NOT here yet

Database schema / migrations, RLS policies, real pages, forms, authentication,
content, the submission Edge Function, and any deployment. Each arrives in its own
approved phase — see [`docs/roadmap.md`](./docs/roadmap.md).

## Deployment

Deferred. Target host is Vercel; the site is validated locally until production is
explicitly staged. No Vercel config is committed yet.
