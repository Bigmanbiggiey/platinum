# Jobs J1 — Admin work orders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the owner an admin **Jobs** section to record a work order end to end — check-in, diagnosis (problems + "before" photos), repair (fixes + "after" photos + parts), wrap-up (labour, costs, completion) — with **no change to the public site**.

**Architecture:** One migration adds four admin-only tables (`job`, `job_finding`, `job_photo`, `job_part`) plus a sealed per-year counter for job numbers, with DB triggers for job numbering, consent/completion timestamps and moving the linked request to `completed`. The admin gets pure helpers (`src/admin/lib/jobs.ts`), React Query hooks (`src/admin/lib/jobData.ts`), an image-prep step that strips EXIF/GPS before every upload, two presentational components (photos, parts), and pages under `src/admin/pages/jobs/`. Existing pages (Request detail, Client detail, Dashboard, nav) link in.

**Tech Stack:** Supabase Postgres 17 (SQL migrations, RLS, plpgsql triggers) · React 19 + TypeScript + React Router 6.28 · TanStack Query 5 · Tailwind v4 with the admin UI kit in `src/admin/components/ui.tsx` · Vitest + React Testing Library + user-event (jsdom).

**Spec:** `docs/superpowers/specs/2026-09-30-jobs-work-orders-design.md` (approved 2026-09-30, ADR-0014). This plan implements **J1 only** (spec §10). J2 (publish + public timeline) and J3 (review links) get their own plans after J1 is accepted on staging.

## Global Constraints

- **Branch:** create `feature/jobs-j1` from `design-refresh/public-site` (the admin code this plan was written against is on that branch, 5 commits ahead of `main`). Do not merge or push to `main` in this plan — Vercel auto-deploys `main`.
- **Only one Supabase project** (`aonpdrqtosmqhmomghca`) serves staging. `npx supabase db push` changes that live database — **stop and get the user's explicit go-ahead before running it** (Task 1, Step 5).
- **Nothing public in J1.** No anon policy, grant, view or function touches a job table. Anon must get `42501 permission denied` on every new table.
- **Private fields (spec §4.2, D5):** odometer, labour, part quantity, part cost, internal notes, client identity, registration/VIN. J1 shows them only inside the admin.
- **Parts:** `name` (later public), `quantity` numeric (private, default 1), `cost_kes` integer = cost of the line, not a unit price (private, optional).
- **Job number:** `PP-YYYY-NNNN`, year in Kenyan time (`Africa/Nairobi`, UTC+3, no DST), assigned by the database only.
- **Photo uploads** go through `prepareImage()` (re-encode ≤ 2400 px long edge → WebP, JPEG fallback) so EXIF/GPS never reaches storage. SVG and GIF pass through untouched.
- **Follow existing admin patterns:** `getDb()` from `src/admin/lib/db.ts`, UI kit components (`Card`, `Button`, `Input`, `Select`, `Textarea`, `Labeled`, `Label`, `Badge`, `PageTitle`, `EmptyState`, `Spinner`), `font-mono` for numbers/dates/IDs, `en-KE` date formatting, `confirm()` for destructive actions (already used across the admin).
- **Verification gate for every task that touches code:** `npm run typecheck && npm run lint && npm run test` green before committing.
- **Commit messages** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Testing approach:** DB behaviour is tested by a SQL script run against the linked project inside a single `DO` block that always rolls back (Task 1). Pure helpers and presentational components get Vitest tests. Pages that call Supabase are verified manually in `npm run dev` with the checklists given (the codebase has no Supabase mocking layer, and adding one is out of scope).

---

## File map

| File | Status | Responsibility |
|---|---|---|
| `supabase/migrations/20260930120000_jobs_j1.sql` | Create | Enums, tables, indexes, triggers, RLS, grants for J1 |
| `supabase/tests/jobs_j1.sql` | Create | Rolled-back SQL checks for triggers, numbering, cascades |
| `src/shared/supabase/rls.test.ts` | Modify | Anon sealed from job tables; admin can read them |
| `src/admin/lib/jobs.ts` + `jobs.test.ts` | Create | Job types, labels, pure helpers |
| `src/admin/lib/image.ts` + `image.test.ts` | Create | `fitWithin`, `prepareImage` (EXIF strip) |
| `src/admin/lib/storage.ts` | Modify | Extract `uploadMedia()`; run `prepareImage` on every upload |
| `src/admin/lib/jobData.ts` | Create | React Query hooks for jobs + child tables |
| `src/admin/pages/jobs/PartsEditor.tsx` + test | Create | Presentational parts list + add row |
| `src/admin/pages/jobs/JobPhotos.tsx` + test | Create | Presentational photo grid, public toggle, upload |
| `src/admin/pages/jobs/usePhotoActions.ts` | Create | Upload / toggle / delete glue for a job's photos |
| `src/admin/pages/jobs/JobsPage.tsx` | Create | List + filter + search |
| `src/admin/pages/jobs/NewJobPage.tsx` | Create | Walk-in or from-request job creation |
| `src/admin/pages/jobs/JobDetailPage.tsx` | Create | Header + tabs shell |
| `src/admin/pages/jobs/CheckInTab.tsx` | Create | Dates, odometer, complaint, consent, check-in photos |
| `src/admin/pages/jobs/DiagnosisTab.tsx` | Create | Findings: add/edit/reorder/delete + before photos |
| `src/admin/pages/jobs/RepairTab.tsx` | Create | Fix, outcome, after photos, parts per finding |
| `src/admin/pages/jobs/WrapUpTab.tsx` | Create | Labour, private cost summary, complete/cancel/delete |
| `src/admin/AdminApp.tsx`, `AdminShell.tsx`, `components/NavIcon.tsx` | Modify | Routes + nav item + wrench icon |
| `src/admin/pages/RequestDetailPage.tsx` | Modify | Start job / Open job |
| `src/admin/pages/ClientDetailPage.tsx` | Modify | Jobs grouped by vehicle (service history) |
| `src/admin/pages/DashboardPage.tsx` | Modify | "Open jobs" stat |
| `docs/owner-guide.md`, `docs/project-state.md`, `docs/pick-up-here.md` | Modify | Owner how-to + status |

---

### Task 1: Database — tables, triggers, RLS (+ tests)

**Files:**
- Create: `supabase/migrations/20260930120000_jobs_j1.sql`
- Create: `supabase/tests/jobs_j1.sql`
- Modify: `src/shared/supabase/rls.test.ts` (anon block after line 74; admin block after line 105)

**Interfaces:**
- Produces (DB): tables `public.job`, `public.job_finding`, `public.job_photo`, `public.job_part`, `public.job_number_counter`; enums `public.job_status`, `public.finding_outcome`, `public.job_photo_stage`. Column names exactly as in the migration below — later tasks' TypeScript types mirror them.

- [ ] **Step 1: Create the branch**

```bash
git switch design-refresh/public-site
git switch -c feature/jobs-j1
```

- [ ] **Step 2: Write the failing RLS tests**

In `src/shared/supabase/rls.test.ts`, add inside the `'RLS — anon role'` describe, after the `'CANNOT read the private admin tables (Phase 3)'` test:

```ts
  it('CANNOT read the job tables (J1)', async () => {
    for (const table of ['job', 'job_finding', 'job_photo', 'job_part', 'job_number_counter']) {
      const { error } = await db.from(table).select('*').limit(1);
      expect(error?.code, `${table} must be sealed from anon`).toBe('42501');
    }
  });
```

And inside the `'RLS — authenticated admin'` describe, after `'can read the private tables anon cannot'`:

```ts
  it('can read the job tables but not the job-number counter (J1)', async () => {
    for (const table of ['job', 'job_finding', 'job_photo', 'job_part']) {
      const { error } = await admin.from(table).select('id').limit(1);
      expect(error, `${table} should be readable by admin`).toBeNull();
    }
    const counter = await admin.from('job_number_counter').select('*').limit(1);
    expect(counter.error?.code).toBe('42501');
  });
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run src/shared/supabase/rls.test.ts`
Expected: the new anon test FAILS — the tables don't exist yet, so the error code is `PGRST205` (or `42P01`), not `42501`. (If the whole anon block is skipped, `.env.local` is missing `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — fix that first.) The admin block is skipped unless `TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD` are set; that's expected.

- [ ] **Step 4: Write the SQL behaviour test**

Create `supabase/tests/jobs_j1.sql`:

```sql
-- Jobs J1 — trigger / constraint checks against the linked project.
-- Run:  npx supabase db query --linked -f supabase/tests/jobs_j1.sql
--
-- Everything runs in ONE DO block that ends with `raise exception 'ALL_PASSED'`, which
-- rolls back every row it created (including job-number counter increments).
-- PASS = the output error is exactly ALL_PASSED. Anything else = a failed check.
do $$
declare
  c  uuid; v uuid; r uuid; m uuid; f uuid;
  j1 uuid; j2 uuid; j3 uuid;
  n1 text; n2 text; n3 text;
  s  text;
  t  timestamptz;
  cnt integer;
  y  text := extract(year from (now() at time zone 'Africa/Nairobi'))::int::text;
begin
  insert into public.client (name) values ('J1 test client') returning id into c;
  insert into public.vehicle (client_id, make, model, year, registration)
    values (c, 'Toyota', 'Fielder', 2014, 'KDA 123A') returning id into v;
  insert into public.service_request
    (request_type, contact_name, contact_phone, status, client_id, vehicle_id)
    values ('general_repair', 'J1 test', '0700000000', 'scheduled', c, v) returning id into r;

  -- 1. Job numbers: PP-<year>-NNNN, sequential, caller-supplied value ignored
  insert into public.job (client_id, vehicle_id, vehicle_label, service_request_id)
    values (c, v, '2014 Toyota Fielder', r) returning id, job_number into j1, n1;
  insert into public.job (client_id, vehicle_id, vehicle_label)
    values (c, v, '2014 Toyota Fielder') returning id, job_number into j2, n2;
  insert into public.job (job_number, vehicle_label)
    values ('HACKED', 'Walk-in') returning id, job_number into j3, n3;
  if n1 !~ ('^PP-' || y || '-[0-9]{4}$') then
    raise exception 'FAIL job_number format: %', n1;
  end if;
  if right(n2, 4)::int <> right(n1, 4)::int + 1 then
    raise exception 'FAIL job_number sequence: % then %', n1, n2;
  end if;
  if n3 = 'HACKED' then raise exception 'FAIL caller set job_number'; end if;

  -- 2. Defaults
  select status::text into s from public.job where id = j1;
  if s <> 'checked_in' then raise exception 'FAIL default status: %', s; end if;

  -- 3. Consent timestamp follows the checkbox
  update public.job set public_consent = true where id = j1;
  select consent_recorded_at into t from public.job where id = j1;
  if t is null then raise exception 'FAIL consent_recorded_at not set'; end if;
  update public.job set public_consent = false where id = j1;
  select consent_recorded_at into t from public.job where id = j1;
  if t is not null then raise exception 'FAIL consent_recorded_at not cleared'; end if;

  -- 4. Completing sets completed_at and moves the linked request to completed
  update public.job set status = 'completed' where id = j1;
  select completed_at into t from public.job where id = j1;
  if t is null then raise exception 'FAIL completed_at not set'; end if;
  select status::text into s from public.service_request where id = r;
  if s <> 'completed' then raise exception 'FAIL request status after completion: %', s; end if;

  -- 5. Re-opening clears completed_at; a closed request is never re-opened
  update public.service_request set status = 'closed' where id = r;
  update public.job set status = 'in_repair' where id = j1;
  select completed_at into t from public.job where id = j1;
  if t is not null then raise exception 'FAIL completed_at not cleared on re-open'; end if;
  update public.job set status = 'completed' where id = j1;
  select status::text into s from public.service_request where id = r;
  if s <> 'closed' then raise exception 'FAIL closed request changed to: %', s; end if;

  -- 6. One job per request
  begin
    insert into public.job (vehicle_label, service_request_id) values ('dup', r);
    raise exception 'FAIL second job allowed for the same request';
  exception when unique_violation then null;
  end;

  -- 7. Children cascade with the job; deleting a finding only unlinks photos/parts
  insert into public.media (storage_path, alt_text) values ('test/j1.jpg', 'j1 test')
    returning id into m;
  insert into public.job_finding (job_id, title) values (j2, 'Worn pads') returning id into f;
  insert into public.job_photo (job_id, finding_id, media_id, stage) values (j2, f, m, 'diagnosis');
  insert into public.job_part (job_id, finding_id, name, quantity, cost_kes)
    values (j2, f, 'Brake pads', 1, 3500);
  delete from public.job_finding where id = f;
  select count(*) into cnt from public.job_photo where job_id = j2 and finding_id is null;
  if cnt <> 1 then raise exception 'FAIL photo not unlinked from deleted finding'; end if;
  select count(*) into cnt from public.job_part where job_id = j2 and finding_id is null;
  if cnt <> 1 then raise exception 'FAIL part not unlinked from deleted finding'; end if;
  delete from public.job where id = j2;
  select count(*) into cnt from public.job_photo where job_id = j2;
  if cnt <> 0 then raise exception 'FAIL job_photo not cascaded'; end if;
  select count(*) into cnt from public.job_part where job_id = j2;
  if cnt <> 0 then raise exception 'FAIL job_part not cascaded'; end if;
  select count(*) into cnt from public.media where id = m;
  if cnt <> 1 then raise exception 'FAIL media row deleted with the job'; end if;

  -- 8. Deleting the client keeps the job, unlinks client + vehicle
  delete from public.client where id = c;
  select count(*) into cnt from public.job where id = j1 and client_id is null and vehicle_id is null;
  if cnt <> 1 then raise exception 'FAIL job not kept/unlinked after client delete'; end if;

  -- 9. Quantity must be positive
  begin
    insert into public.job_part (job_id, name, quantity) values (j1, 'bad', 0);
    raise exception 'FAIL zero quantity allowed';
  exception when check_violation then null;
  end;

  raise exception 'ALL_PASSED';
end $$;
```

- [ ] **Step 5: Write the migration**

Create `supabase/migrations/20260930120000_jobs_j1.sql`:

```sql
-- Platinum Point Automotive Engineering — Jobs (work orders), package J1.
-- Spec: docs/superpowers/specs/2026-09-30-jobs-work-orders-design.md §4 (ADR-0014).
--
-- J1 is admin-only: no anon policy, grant, view or function touches these tables.
-- The public read model (job_public), the portfolio link and review invites arrive in
-- J2/J3 migrations.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.job_status as enum
  ('checked_in', 'diagnosing', 'in_repair', 'completed', 'cancelled');
create type public.finding_outcome as enum ('pending', 'fixed', 'deferred', 'not_fixed');
create type public.job_photo_stage as enum ('check_in', 'diagnosis', 'repair');

-- ---------------------------------------------------------------------------
-- job_number_counter — one row per year; only the numbering trigger touches it
-- ---------------------------------------------------------------------------
create table public.job_number_counter (
  year       integer primary key,
  last_value integer not null
);

-- ---------------------------------------------------------------------------
-- job — one work order
-- ---------------------------------------------------------------------------
create table public.job (
  id                  uuid primary key default gen_random_uuid(),
  job_number          text not null unique,
  client_id           uuid references public.client (id) on delete set null,
  vehicle_id          uuid references public.vehicle (id) on delete set null,
  vehicle_label       text not null,
  service_request_id  uuid unique references public.service_request (id) on delete set null,
  service_id          uuid references public.service (id) on delete set null,
  status              public.job_status not null default 'checked_in',
  booked_at           timestamptz,
  checked_in_at       timestamptz not null default now(),
  completed_at        timestamptz,
  odometer_km         integer check (odometer_km is null or odometer_km >= 0),
  complaint           text,
  public_consent      boolean not null default false,
  consent_recorded_at timestamptz,
  labour_hours        numeric(5, 2) check (labour_hours is null or labour_hours >= 0),
  labour_cost_kes     integer check (labour_cost_kes is null or labour_cost_kes >= 0),
  internal_notes      text,
  created_by          uuid references auth.users (id) default auth.uid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index job_status_idx on public.job (status, checked_in_at desc);
create index job_client_idx on public.job (client_id);
create index job_vehicle_idx on public.job (vehicle_id);
create trigger job_updated_at before update on public.job
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- job_finding — one problem found, and its fix
-- ---------------------------------------------------------------------------
create table public.job_finding (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid not null references public.job (id) on delete cascade,
  display_order integer not null default 100,
  title         text not null,
  diagnosis     text,
  fix           text,
  outcome       public.finding_outcome not null default 'pending',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index job_finding_job_idx on public.job_finding (job_id, display_order);
create trigger job_finding_updated_at before update on public.job_finding
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- job_photo — a media-library image attached to a job (and optionally a finding)
-- ---------------------------------------------------------------------------
create table public.job_photo (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid not null references public.job (id) on delete cascade,
  finding_id    uuid references public.job_finding (id) on delete set null,
  media_id      uuid not null references public.media (id) on delete cascade,
  stage         public.job_photo_stage not null,
  caption       text,
  is_public     boolean not null default true,
  display_order integer not null default 100,
  created_at    timestamptz not null default now()
);
create index job_photo_job_idx on public.job_photo (job_id, display_order);

-- ---------------------------------------------------------------------------
-- job_part — parts used (name public later; quantity + cost always private)
-- ---------------------------------------------------------------------------
create table public.job_part (
  id         uuid primary key default gen_random_uuid(),
  job_id     uuid not null references public.job (id) on delete cascade,
  finding_id uuid references public.job_finding (id) on delete set null,
  name       text not null,
  quantity   numeric(8, 2) not null default 1 check (quantity > 0),
  cost_kes   integer check (cost_kes is null or cost_kes >= 0),
  created_at timestamptz not null default now()
);
create index job_part_job_idx on public.job_part (job_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Job number: PP-<year>-NNNN, per-year counter, year in Kenyan time. Always assigned
-- by the database (a caller-supplied value is overwritten). security definer so it can
-- write the sealed counter table; the upsert row-locks the year, so concurrent inserts
-- get distinct numbers.
create or replace function public.assign_job_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  y integer := extract(year from (coalesce(new.checked_in_at, now()) at time zone 'Africa/Nairobi'))::int;
  n integer;
begin
  insert into public.job_number_counter as c (year, last_value)
    values (y, 1)
    on conflict (year) do update set last_value = c.last_value + 1
    returning c.last_value into n;
  new.job_number := format('PP-%s-%s', y, lpad(n::text, 4, '0'));
  return new;
end;
$$;

create trigger job_assign_number before insert on public.job
  for each row execute function public.assign_job_number();

-- Consent + completion timestamps.
create or replace function public.job_stamp_times()
returns trigger
language plpgsql
as $$
begin
  if new.public_consent then
    if tg_op = 'INSERT' then
      new.consent_recorded_at := now();
    elsif not old.public_consent then
      new.consent_recorded_at := now();
    end if;
  else
    new.consent_recorded_at := null;
  end if;

  if new.status = 'completed' then
    if tg_op = 'INSERT' then
      new.completed_at := coalesce(new.completed_at, now());
    elsif old.status <> 'completed' then
      new.completed_at := coalesce(new.completed_at, now());
    end if;
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger job_stamp_times before insert or update on public.job
  for each row execute function public.job_stamp_times();

-- Completing a job moves its request to `completed` (never re-opens a closed one).
-- Runs as the invoking admin, who already has full CRUD on service_request.
create or replace function public.job_complete_request()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'completed' and new.service_request_id is not null then
    if tg_op = 'INSERT' or old.status is distinct from 'completed' then
      update public.service_request
        set status = 'completed'
        where id = new.service_request_id
          and status not in ('completed', 'closed');
    end if;
  end if;
  return null;
end;
$$;

create trigger job_complete_request after insert or update of status on public.job
  for each row execute function public.job_complete_request();

-- ---------------------------------------------------------------------------
-- RLS — admin full CRUD; anon sealed; counter sealed from everyone but the trigger
-- ---------------------------------------------------------------------------
alter table public.job                enable row level security;
alter table public.job_finding        enable row level security;
alter table public.job_photo          enable row level security;
alter table public.job_part           enable row level security;
alter table public.job_number_counter enable row level security;

create policy "job: admin all" on public.job
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "job_finding: admin all" on public.job_finding
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "job_photo: admin all" on public.job_photo
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "job_part: admin all" on public.job_part
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.job         to authenticated;
grant select, insert, update, delete on public.job_finding to authenticated;
grant select, insert, update, delete on public.job_photo   to authenticated;
grant select, insert, update, delete on public.job_part    to authenticated;

revoke all on public.job                from anon;
revoke all on public.job_finding        from anon;
revoke all on public.job_photo          from anon;
revoke all on public.job_part           from anon;
revoke all on public.job_number_counter from anon, authenticated;

revoke execute on function public.assign_job_number() from public, anon, authenticated;
```

Note on `job_complete_request`: in PostgreSQL 17 `OLD` is `NULL` for `INSERT` row triggers, so `old.status is distinct from 'completed'` is safe even if evaluated; the `tg_op` check keeps intent obvious.

- [ ] **Step 6: STOP — get the user's go-ahead, then push the migration**

Tell the user: "Task 1 is ready to apply `20260930120000_jobs_j1.sql` to the live Supabase project (`aonpdrqtosmqhmomghca`, the only project — staging). It only adds tables/types/functions; nothing existing changes. OK to run `npx supabase db push`?" Wait for an explicit yes.

Then run:

```bash
npx supabase migration list --linked
npx supabase db push
```

Expected: `migration list` shows only `20260930120000` as pending (local, not remote); `db push` applies it with no errors.

- [ ] **Step 7: Run the SQL behaviour test**

Run: `npx supabase db query --linked -f supabase/tests/jobs_j1.sql`
Expected: the command reports an error whose message is exactly `ALL_PASSED`. Any `FAIL …` message names the broken check — fix the migration with a **new** follow-up migration (never edit an applied one), push, re-run.

- [ ] **Step 8: Run the RLS test**

Run: `npx vitest run src/shared/supabase/rls.test.ts`
Expected: PASS (anon block); admin block skipped unless `TEST_ADMIN_*` is set.

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/20260930120000_jobs_j1.sql supabase/tests/jobs_j1.sql src/shared/supabase/rls.test.ts
git commit -m "feat(jobs): J1 schema — job, findings, photos, parts, numbering + RLS

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Job types and pure helpers

**Files:**
- Create: `src/admin/lib/jobs.ts`
- Test: `src/admin/lib/jobs.test.ts`

**Interfaces:**
- Consumes: `ServiceRequest` type from `src/admin/lib/db.ts`.
- Produces (used by Tasks 4–11):
  - `JOB_STATUSES`, `type JobStatus`, `OPEN_STATUSES`, `FINDING_OUTCOMES`, `type FindingOutcome`, `type PhotoStage`
  - `interface Job`, `JobWithRefs`, `JobFinding`, `JobPhoto`, `JobPart`
  - `jobStatusLabel: Record<JobStatus,string>`, `outcomeLabel: Record<FindingOutcome,string>`
  - `jobStatusTone(s: JobStatus): 'neutral'|'attention'|'pass'|'muted'`
  - `vehicleLabel(v: {make: string; model?: string|null; year?: number|null}): string`
  - `type JobListFilter = 'open'|'completed'|'cancelled'|'all'`, `matchesJobFilter(job, filter): boolean`, `matchesJobSearch(job, term): boolean`
  - `photoAlt(vehicle: string, stage: PhotoStage, findingTitle?: string|null): string`
  - `jobCostSummary(labourCostKes: number|null, parts: {cost_kes: number|null}[]): {labour: number; parts: number; total: number}`
  - `formatKes(n: number): string`, `pendingFindingsCount(findings): number`
  - `toDateInput(iso: string|null): string`, `fromDateInput(date: string): string|null`
  - `jobPrefillFromRequest(req): Partial<Job>`
  - `groupJobsByVehicle<T>(jobs: T[]): {key: string; label: string; jobs: T[]}[]`

- [ ] **Step 1: Write the failing tests**

Create `src/admin/lib/jobs.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  formatKes,
  fromDateInput,
  groupJobsByVehicle,
  jobCostSummary,
  jobPrefillFromRequest,
  jobStatusTone,
  matchesJobFilter,
  matchesJobSearch,
  pendingFindingsCount,
  photoAlt,
  toDateInput,
  vehicleLabel,
} from './jobs';

describe('vehicleLabel', () => {
  it('joins year, make and model', () => {
    expect(vehicleLabel({ year: 2014, make: 'Toyota', model: 'Fielder' })).toBe('2014 Toyota Fielder');
  });
  it('skips missing parts', () => {
    expect(vehicleLabel({ make: 'Isuzu D-Max', model: null, year: null })).toBe('Isuzu D-Max');
    expect(vehicleLabel({ make: 'Mazda', model: ' ' })).toBe('Mazda');
  });
});

describe('jobStatusTone', () => {
  it('maps statuses to brand roles', () => {
    expect(jobStatusTone('checked_in')).toBe('attention');
    expect(jobStatusTone('diagnosing')).toBe('neutral');
    expect(jobStatusTone('in_repair')).toBe('neutral');
    expect(jobStatusTone('completed')).toBe('pass');
    expect(jobStatusTone('cancelled')).toBe('muted');
  });
});

describe('matchesJobFilter', () => {
  it('open covers checked_in, diagnosing and in_repair only', () => {
    expect(matchesJobFilter({ status: 'checked_in' }, 'open')).toBe(true);
    expect(matchesJobFilter({ status: 'in_repair' }, 'open')).toBe(true);
    expect(matchesJobFilter({ status: 'completed' }, 'open')).toBe(false);
    expect(matchesJobFilter({ status: 'cancelled' }, 'open')).toBe(false);
  });
  it('completed / cancelled match exactly; all matches everything', () => {
    expect(matchesJobFilter({ status: 'completed' }, 'completed')).toBe(true);
    expect(matchesJobFilter({ status: 'in_repair' }, 'completed')).toBe(false);
    expect(matchesJobFilter({ status: 'cancelled' }, 'all')).toBe(true);
  });
});

describe('matchesJobSearch', () => {
  const job = {
    job_number: 'PP-2026-0042',
    vehicle_label: '2014 Toyota Fielder',
    client: { name: 'Jane Wanjiru' },
    vehicle: { registration: 'KDA 123A' },
  };
  it('matches job number, client, vehicle and registration, ignoring case and spaces', () => {
    expect(matchesJobSearch(job, '0042')).toBe(true);
    expect(matchesJobSearch(job, 'wanjiru')).toBe(true);
    expect(matchesJobSearch(job, 'fielder')).toBe(true);
    expect(matchesJobSearch(job, 'kda123a')).toBe(true);
    expect(matchesJobSearch(job, 'KDA 123')).toBe(true);
  });
  it('empty term matches; unrelated term does not', () => {
    expect(matchesJobSearch(job, '  ')).toBe(true);
    expect(matchesJobSearch(job, 'subaru')).toBe(false);
  });
  it('copes with a removed client or vehicle', () => {
    expect(matchesJobSearch({ ...job, client: null, vehicle: null }, 'fielder')).toBe(true);
  });
});

describe('photoAlt', () => {
  it('describes vehicle, stage and finding', () => {
    expect(photoAlt('2014 Toyota Fielder', 'diagnosis', 'Worn front brake pads')).toBe(
      '2014 Toyota Fielder — Before repair — Worn front brake pads',
    );
    expect(photoAlt('2014 Toyota Fielder', 'check_in')).toBe('2014 Toyota Fielder — Check-in');
    expect(photoAlt('Mazda Demio', 'repair', null)).toBe('Mazda Demio — After repair');
  });
});

describe('costs', () => {
  it('sums labour and line costs, treating blanks as zero', () => {
    expect(jobCostSummary(4000, [{ cost_kes: 3500 }, { cost_kes: null }, { cost_kes: 800 }])).toEqual({
      labour: 4000,
      parts: 4300,
      total: 8300,
    });
    expect(jobCostSummary(null, [])).toEqual({ labour: 0, parts: 0, total: 0 });
  });
  it('formats Kenyan shillings', () => {
    expect(formatKes(800)).toBe('KES 800');
    expect(formatKes(12500)).toBe('KES 12,500');
  });
  it('counts findings still pending', () => {
    expect(pendingFindingsCount([{ outcome: 'pending' }, { outcome: 'fixed' }, { outcome: 'pending' }])).toBe(2);
  });
});

describe('date inputs (Kenyan time)', () => {
  it('toDateInput renders the Nairobi calendar date', () => {
    expect(toDateInput('2026-09-11T22:30:00Z')).toBe('2026-09-12'); // 01:30 in Nairobi
    expect(toDateInput(null)).toBe('');
  });
  it('fromDateInput gives the start of that day in Nairobi', () => {
    expect(fromDateInput('2026-09-12')).toBe('2026-09-12T00:00:00+03:00');
    expect(fromDateInput('')).toBeNull();
  });
});

describe('jobPrefillFromRequest', () => {
  it('copies links, booked date and complaint', () => {
    expect(
      jobPrefillFromRequest({
        id: 'r1',
        client_id: 'c1',
        vehicle_id: 'v1',
        requested_date: '2026-09-14',
        message: '  Grinding noise when braking  ',
      }),
    ).toEqual({
      service_request_id: 'r1',
      client_id: 'c1',
      vehicle_id: 'v1',
      booked_at: '2026-09-14T00:00:00+03:00',
      complaint: 'Grinding noise when braking',
    });
  });
  it('leaves booked_at and complaint empty when the request has none', () => {
    const p = jobPrefillFromRequest({
      id: 'r2',
      client_id: 'c1',
      vehicle_id: null,
      requested_date: null,
      message: '   ',
    });
    expect(p.booked_at).toBeNull();
    expect(p.complaint).toBeNull();
  });
});

describe('groupJobsByVehicle', () => {
  it('groups in first-seen order and labels removed vehicles', () => {
    const groups = groupJobsByVehicle([
      { id: 'a', vehicle_id: 'v1', vehicle_label: '2014 Toyota Fielder' },
      { id: 'b', vehicle_id: 'v2', vehicle_label: 'Mazda Demio' },
      { id: 'c', vehicle_id: 'v1', vehicle_label: '2014 Toyota Fielder' },
      { id: 'd', vehicle_id: null, vehicle_label: 'Old Subaru' },
    ]);
    expect(groups.map((g) => [g.label, g.jobs.map((j) => j.id)])).toEqual([
      ['2014 Toyota Fielder', ['a', 'c']],
      ['Mazda Demio', ['b']],
      ['Vehicle removed', ['d']],
    ]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/admin/lib/jobs.test.ts`
Expected: FAIL — `Failed to resolve import "./jobs"`.

- [ ] **Step 3: Implement**

Create `src/admin/lib/jobs.ts`:

```ts
/**
 * Jobs (work orders) — row types + pure helpers.
 * Spec: docs/superpowers/specs/2026-09-30-jobs-work-orders-design.md
 */
import type { ServiceRequest } from './db';

export const JOB_STATUSES = [
  'checked_in',
  'diagnosing',
  'in_repair',
  'completed',
  'cancelled',
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];
export const OPEN_STATUSES: readonly JobStatus[] = ['checked_in', 'diagnosing', 'in_repair'];

export const FINDING_OUTCOMES = ['pending', 'fixed', 'deferred', 'not_fixed'] as const;
export type FindingOutcome = (typeof FINDING_OUTCOMES)[number];

export type PhotoStage = 'check_in' | 'diagnosis' | 'repair';

export interface Job {
  id: string;
  job_number: string;
  client_id: string | null;
  vehicle_id: string | null;
  vehicle_label: string;
  service_request_id: string | null;
  service_id: string | null;
  status: JobStatus;
  booked_at: string | null;
  checked_in_at: string;
  completed_at: string | null;
  odometer_km: number | null;
  complaint: string | null;
  public_consent: boolean;
  consent_recorded_at: string | null;
  labour_hours: number | null;
  labour_cost_kes: number | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

/** A job with the bits of its client + vehicle the admin lists need. */
export interface JobWithRefs extends Job {
  client: { name: string } | null;
  vehicle: { registration: string | null } | null;
}

export interface JobFinding {
  id: string;
  job_id: string;
  display_order: number;
  title: string;
  diagnosis: string | null;
  fix: string | null;
  outcome: FindingOutcome;
  created_at: string;
}

export interface JobPhoto {
  id: string;
  job_id: string;
  finding_id: string | null;
  media_id: string;
  stage: PhotoStage;
  caption: string | null;
  is_public: boolean;
  display_order: number;
  created_at: string;
  media: { storage_path: string; alt_text: string } | null;
}

export interface JobPart {
  id: string;
  job_id: string;
  finding_id: string | null;
  name: string;
  /** Private — never shown publicly. */
  quantity: number;
  /** Private — the cost of this line, not a unit price. */
  cost_kes: number | null;
  created_at: string;
}

export const jobStatusLabel: Record<JobStatus, string> = {
  checked_in: 'Checked in',
  diagnosing: 'Diagnosing',
  in_repair: 'In repair',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const outcomeLabel: Record<FindingOutcome, string> = {
  pending: 'Pending',
  fixed: 'Fixed',
  deferred: 'Deferred — client chose not to fix now',
  not_fixed: 'Not fixed',
};

const stageLabel: Record<PhotoStage, string> = {
  check_in: 'Check-in',
  diagnosis: 'Before repair',
  repair: 'After repair',
};

export function jobStatusTone(s: JobStatus): 'neutral' | 'attention' | 'pass' | 'muted' {
  if (s === 'completed') return 'pass';
  if (s === 'cancelled') return 'muted';
  if (s === 'checked_in') return 'attention';
  return 'neutral';
}

/** "2014 Toyota Fielder" — never includes the registration (it's private). */
export function vehicleLabel(v: { make: string; model?: string | null; year?: number | null }): string {
  return [v.year, v.make, v.model]
    .filter((p) => p !== null && p !== undefined && String(p).trim() !== '')
    .map((p) => String(p).trim())
    .join(' ');
}

export type JobListFilter = 'open' | 'completed' | 'cancelled' | 'all';

export function matchesJobFilter(job: Pick<Job, 'status'>, filter: JobListFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'open') return OPEN_STATUSES.includes(job.status);
  return job.status === filter;
}

const squash = (s: string) => s.toLowerCase().replace(/\s+/g, '');

export function matchesJobSearch(
  job: Pick<JobWithRefs, 'job_number' | 'vehicle_label' | 'client' | 'vehicle'>,
  term: string,
): boolean {
  const t = squash(term);
  if (!t) return true;
  return [job.job_number, job.vehicle_label, job.client?.name ?? '', job.vehicle?.registration ?? '']
    .map(squash)
    .some((field) => field.includes(t));
}

/** Alt text for an uploaded job photo (the media library requires one). */
export function photoAlt(vehicle: string, stage: PhotoStage, findingTitle?: string | null): string {
  return [vehicle, stageLabel[stage], findingTitle].filter(Boolean).join(' — ');
}

export function jobCostSummary(labourCostKes: number | null, parts: Pick<JobPart, 'cost_kes'>[]) {
  const labour = labourCostKes ?? 0;
  const partsTotal = parts.reduce((sum, p) => sum + (p.cost_kes ?? 0), 0);
  return { labour, parts: partsTotal, total: labour + partsTotal };
}

export const formatKes = (n: number) => `KES ${n.toLocaleString('en-KE')}`;

export function pendingFindingsCount(findings: Pick<JobFinding, 'outcome'>[]): number {
  return findings.filter((f) => f.outcome === 'pending').length;
}

/** ISO timestamp → `YYYY-MM-DD` for `<input type="date">`, in Kenyan time. */
export function toDateInput(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
}

/** `YYYY-MM-DD` → start of that day in Kenyan time (UTC+3, no DST). */
export function fromDateInput(date: string): string | null {
  return date ? `${date}T00:00:00+03:00` : null;
}

export function jobPrefillFromRequest(
  req: Pick<ServiceRequest, 'id' | 'client_id' | 'vehicle_id' | 'requested_date' | 'message'>,
): Partial<Job> {
  return {
    service_request_id: req.id,
    client_id: req.client_id,
    vehicle_id: req.vehicle_id,
    booked_at: fromDateInput(req.requested_date ?? ''),
    complaint: req.message?.trim() || null,
  };
}

export interface VehicleJobGroup<T> {
  key: string;
  label: string;
  jobs: T[];
}

/** Per-vehicle service history: groups in first-seen order (input is newest first). */
export function groupJobsByVehicle<T extends Pick<Job, 'vehicle_id' | 'vehicle_label'>>(
  jobs: T[],
): VehicleJobGroup<T>[] {
  const groups = new Map<string, VehicleJobGroup<T>>();
  for (const job of jobs) {
    const key = job.vehicle_id ?? 'none';
    const group = groups.get(key) ?? {
      key,
      label: job.vehicle_id ? job.vehicle_label : 'Vehicle removed',
      jobs: [],
    };
    group.jobs.push(job);
    groups.set(key, group);
  }
  return [...groups.values()];
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/admin/lib/jobs.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add src/admin/lib/jobs.ts src/admin/lib/jobs.test.ts
git commit -m "feat(jobs): job types and pure helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Strip EXIF/GPS from every upload

**Files:**
- Create: `src/admin/lib/image.ts`
- Test: `src/admin/lib/image.test.ts`
- Modify: `src/admin/lib/storage.ts:1-33` (keep `imageSize` at lines 35–46 unchanged)

**Interfaces:**
- Produces: `fitWithin(width, height, maxEdge): {width, height}`, `prepareImage(file: File, maxEdge = 2400): Promise<File>`, and in `storage.ts` a new plain async `uploadMedia(file: File, alt: string): Promise<string>` (returns the `media.id`). `useUploadMedia()` keeps its signature (`mutate({ file, alt })`), so `MediaPage` is unaffected.

- [ ] **Step 1: Write the failing tests**

Create `src/admin/lib/image.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fitWithin, prepareImage } from './image';

describe('fitWithin', () => {
  it('scales the long edge down to the limit, keeping aspect ratio', () => {
    expect(fitWithin(4000, 3000, 2400)).toEqual({ width: 2400, height: 1800 });
    expect(fitWithin(3000, 4000, 2400)).toEqual({ width: 1800, height: 2400 });
  });
  it('never upscales', () => {
    expect(fitWithin(800, 600, 2400)).toEqual({ width: 800, height: 600 });
  });
});

describe('prepareImage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  /** jsdom has no canvas/bitmap support — stub the pieces prepareImage uses. */
  function stubCanvas(blobTypes: string[]) {
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as never);
    const queue = [...blobTypes];
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb: BlobCallback) =>
      cb(new Blob(['re-encoded'], { type: queue.shift() })),
    );
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 4000, height: 3000, close: vi.fn() }),
    );
    return { drawImage };
  }

  it('passes SVGs through untouched', async () => {
    const svg = new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' });
    expect(await prepareImage(svg)).toBe(svg);
  });

  it('re-encodes a photo to WebP at max 2400px, producing a new file (no EXIF)', async () => {
    const { drawImage } = stubCanvas(['image/webp']);
    const original = new File(['jpeg-bytes-with-exif-gps'], 'IMG_0042.JPG', { type: 'image/jpeg' });
    const out = await prepareImage(original);
    expect(out).not.toBe(original);
    expect(out.name).toBe('IMG_0042.webp');
    expect(out.type).toBe('image/webp');
    expect(out.size).toBe('re-encoded'.length); // canvas output, not the original bytes
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2400, 1800);
  });

  it('falls back to JPEG when the browser cannot encode WebP', async () => {
    stubCanvas(['image/png', 'image/jpeg']);
    const out = await prepareImage(new File(['x'], 'photo.jpeg', { type: 'image/jpeg' }));
    expect(out.name).toBe('photo.jpg');
    expect(out.type).toBe('image/jpeg');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/admin/lib/image.test.ts`
Expected: FAIL — `Failed to resolve import "./image"`.

- [ ] **Step 3: Implement `image.ts`**

Create `src/admin/lib/image.ts`:

```ts
/**
 * Image prep before upload: downscale + re-encode through a canvas. Re-encoding drops
 * all EXIF metadata — including the GPS location phones embed — so a photo taken at a
 * client's home can never publish where they live. It also shrinks uploads on mobile data.
 */
const PASSTHROUGH = new Set(['image/svg+xml', 'image/gif']);

export function fitWithin(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function prepareImage(file: File, maxEdge = 2400): Promise<File> {
  if (!file.type.startsWith('image/') || PASSTHROUGH.has(file.type)) return file;

  // `from-image` applies the EXIF orientation before the metadata is discarded.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot process images.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Older Safari returns PNG when asked for WebP — fall back to JPEG then.
  let blob = await toBlob(canvas, 'image/webp', 0.85);
  if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', 0.85);
  if (!blob) throw new Error('Could not process this image.');

  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const base = file.name.replace(/\.[^.]+$/, '') || 'photo';
  return new File([blob], `${base}.${ext}`, { type: blob.type });
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/admin/lib/image.test.ts`
Expected: PASS.

- [ ] **Step 5: Route every upload through it**

Replace lines 1–33 of `src/admin/lib/storage.ts` (everything above `function imageSize`) with:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getDb } from './db';
import { prepareImage } from './image';

const BUCKET = 'public-media';

/**
 * Upload an image to public-media and create the `media` row. Returns the media id.
 * Every image is re-encoded first (prepareImage) so EXIF/GPS never reaches storage.
 */
export async function uploadMedia(file: File, alt: string): Promise<string> {
  const db = getDb();
  const prepared = await prepareImage(file);
  const ext = prepared.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `uploads/${crypto.randomUUID()}.${ext}`;
  const up = await db.storage.from(BUCKET).upload(path, prepared, {
    contentType: prepared.type || 'image/jpeg',
    upsert: false,
  });
  if (up.error) throw up.error;

  // Read natural size for responsive rendering.
  const dims = await imageSize(prepared).catch(() => ({ width: null, height: null }));

  const { data, error } = await db
    .from('media')
    .insert({ storage_path: path, alt_text: alt, width: dims.width, height: dims.height })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export function useUploadMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, alt }: { file: File; alt: string }) => uploadMedia(file, alt),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media', 'list'] }),
  });
}
```

- [ ] **Step 6: Verify and commit**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: all green.

Manual check (`npm run dev`, sign in, **Website content → Media**): upload a phone photo that has location data. Download it back from the media grid (open image in new tab → save) and inspect it with any EXIF viewer (e.g. Windows file Properties → Details): no GPS / camera fields. Delete the test image.

```bash
git add src/admin/lib/image.ts src/admin/lib/image.test.ts src/admin/lib/storage.ts
git commit -m "feat(media): re-encode uploads to strip EXIF/GPS; extract uploadMedia()

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Data hooks for jobs

**Files:**
- Create: `src/admin/lib/jobData.ts`

**Interfaces:**
- Consumes: `getDb` (`./db`), `uploadMedia` (`./storage`, Task 3), types from `./jobs` (Task 2).
- Produces (used by Tasks 6–11):
  - `useJobs(): UseQueryResult<JobWithRefs[]>`
  - `useJob(id?: string): UseQueryResult<JobWithRefs | null>`
  - `useJobByRequest(requestId?: string): UseQueryResult<{id: string; job_number: string} | null>`
  - `useClientJobs(clientId?: string): UseQueryResult<ClientJobRow[]>` where `ClientJobRow = Pick<Job,'id'|'job_number'|'vehicle_id'|'vehicle_label'|'status'|'checked_in_at'>`
  - `useCreateJob()` → `mutateAsync(row: Partial<Job>): Promise<string>` (new job id)
  - `useUpdateJob(id: string)` → `mutate(patch: Partial<Job>)`
  - `useDeleteJob()` → `mutateAsync(id: string)`
  - `findings`, `photos`, `parts` — each `{ useList(jobId), useCreate(jobId), useUpdate(jobId), useRemove(jobId) }`; `useCreate` takes `Partial<T>` (job_id added for you), `useUpdate` takes `{ id, patch }`, `useRemove` takes `id`
  - `useAddPhoto(jobId)` → `mutateAsync({ file, stage, findingId, alt })`

This task is glue over Supabase; it is type-checked here and exercised by the manual checks in Tasks 6–11 (DB behaviour itself is covered by Task 1).

- [ ] **Step 1: Implement**

Create `src/admin/lib/jobData.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDb } from './db';
import { uploadMedia } from './storage';
import type { Job, JobFinding, JobPart, JobPhoto, JobWithRefs, PhotoStage } from './jobs';

const JOB_WITH_REFS = '*, client(name), vehicle(registration)';

export type ClientJobRow = Pick<
  Job,
  'id' | 'job_number' | 'vehicle_id' | 'vehicle_label' | 'status' | 'checked_in_at'
>;

function useInvalidateJobs() {
  const qc = useQueryClient();
  return (id?: string) => {
    void qc.invalidateQueries({ queryKey: ['jobs'] });
    void qc.invalidateQueries({ queryKey: ['client-jobs'] });
    void qc.invalidateQueries({ queryKey: ['job-by-request'] });
    void qc.invalidateQueries({ queryKey: ['count'] });
    // Completing a job moves its request to `completed` (DB trigger).
    void qc.invalidateQueries({ queryKey: ['request'] });
    void qc.invalidateQueries({ queryKey: ['requests'] });
    if (id) void qc.invalidateQueries({ queryKey: ['job', id] });
  };
}

export function useJobs() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: async (): Promise<JobWithRefs[]> => {
      const { data, error } = await getDb()
        .from('job')
        .select(JOB_WITH_REFS)
        .order('checked_in_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as JobWithRefs[];
    },
  });
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: ['job', id],
    enabled: !!id,
    queryFn: async (): Promise<JobWithRefs | null> => {
      const { data, error } = await getDb()
        .from('job')
        .select(JOB_WITH_REFS)
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as JobWithRefs) ?? null;
    },
  });
}

export function useJobByRequest(requestId: string | undefined) {
  return useQuery({
    queryKey: ['job-by-request', requestId],
    enabled: !!requestId,
    queryFn: async (): Promise<{ id: string; job_number: string } | null> => {
      const { data, error } = await getDb()
        .from('job')
        .select('id, job_number')
        .eq('service_request_id', requestId!)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}

export function useClientJobs(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-jobs', clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<ClientJobRow[]> => {
      const { data, error } = await getDb()
        .from('job')
        .select('id, job_number, vehicle_id, vehicle_label, status, checked_in_at')
        .eq('client_id', clientId!)
        .order('checked_in_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClientJobRow[];
    },
  });
}

export function useCreateJob() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: async (row: Partial<Job>): Promise<string> => {
      const { data, error } = await getDb()
        .from('job')
        .insert(row as never)
        .select('id')
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => invalidate(),
  });
}

export function useUpdateJob(id: string) {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: async (patch: Partial<Job>) => {
      const { error } = await getDb().from('job').update(patch as never).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(id),
  });
}

export function useDeleteJob() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getDb().from('job').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });
}

/* -- Child tables (findings, photos, parts) -------------------------------- */

export const jobChildKey = (table: string, jobId: string) => ['job-children', table, jobId] as const;

function makeJobChild<T extends { id: string }>(table: string, select: string, orderBy: string) {
  const useList = (jobId: string) =>
    useQuery({
      queryKey: jobChildKey(table, jobId),
      queryFn: async (): Promise<T[]> => {
        const { data, error } = await getDb()
          .from(table)
          .select(select)
          .eq('job_id', jobId)
          .order(orderBy)
          .order('created_at');
        if (error) throw error;
        return (data ?? []) as unknown as T[];
      },
    });

  function useInvalidate(jobId: string) {
    const qc = useQueryClient();
    return () => qc.invalidateQueries({ queryKey: jobChildKey(table, jobId) });
  }

  const useCreate = (jobId: string) => {
    const invalidate = useInvalidate(jobId);
    return useMutation({
      mutationFn: async (row: Partial<T>) => {
        const { error } = await getDb()
          .from(table)
          .insert({ ...row, job_id: jobId } as never);
        if (error) throw error;
      },
      onSuccess: invalidate,
    });
  };

  const useUpdate = (jobId: string) => {
    const invalidate = useInvalidate(jobId);
    return useMutation({
      mutationFn: async ({ id, patch }: { id: string; patch: Partial<T> }) => {
        const { error } = await getDb().from(table).update(patch as never).eq('id', id);
        if (error) throw error;
      },
      onSuccess: invalidate,
    });
  };

  const useRemove = (jobId: string) => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (id: string) => {
        const { error } = await getDb().from(table).delete().eq('id', id);
        if (error) throw error;
      },
      // Deleting a finding unlinks its photos/parts (DB `on delete set null`) — refresh all.
      onSuccess: () => qc.invalidateQueries({ queryKey: ['job-children'] }),
    });
  };

  return { useList, useCreate, useUpdate, useRemove };
}

export const findings = makeJobChild<JobFinding>('job_finding', '*', 'display_order');
export const photos = makeJobChild<JobPhoto>(
  'job_photo',
  '*, media(storage_path, alt_text)',
  'display_order',
);
export const parts = makeJobChild<JobPart>('job_part', '*', 'created_at');

/** Upload an image (EXIF stripped) and attach it to the job. */
export function useAddPhoto(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      file: File;
      stage: PhotoStage;
      findingId: string | null;
      alt: string;
    }) => {
      const mediaId = await uploadMedia(p.file, p.alt);
      const { error } = await getDb()
        .from('job_photo')
        .insert({ job_id: jobId, media_id: mediaId, stage: p.stage, finding_id: p.findingId });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: jobChildKey('job_photo', jobId) });
      void qc.invalidateQueries({ queryKey: ['media', 'list'] });
    },
  });
}
```

- [ ] **Step 2: Verify and commit**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

```bash
git add src/admin/lib/jobData.ts
git commit -m "feat(jobs): React Query hooks for jobs, findings, photos and parts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Presentational components — parts and photos

**Files:**
- Create: `src/admin/pages/jobs/PartsEditor.tsx`, `src/admin/pages/jobs/PartsEditor.test.tsx`
- Create: `src/admin/pages/jobs/JobPhotos.tsx`, `src/admin/pages/jobs/JobPhotos.test.tsx`

**Interfaces:**
- Consumes: `JobPart`, `JobPhoto`, `formatKes` (Task 2); UI kit; `publicImageUrl` from `src/shared/content/media.ts`.
- Produces:
  - `PartsEditor({ parts: JobPart[]; onAdd: (p: NewPart) => void; onRemove: (id: string) => void; busy?: boolean })`, `interface NewPart { name: string; quantity: number; cost_kes: number | null }`
  - `JobPhotos({ photos: JobPhoto[]; onUpload: (files: File[]) => void; onTogglePublic: (p: JobPhoto) => void; onDelete: (p: JobPhoto) => void; uploading?: boolean; label?: string })`

- [ ] **Step 1: Write the failing tests**

Create `src/admin/pages/jobs/PartsEditor.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PartsEditor } from './PartsEditor';
import type { JobPart } from '../../lib/jobs';

const part: JobPart = {
  id: 'p1',
  job_id: 'j1',
  finding_id: 'f1',
  name: 'Oil filter',
  quantity: 1,
  cost_kes: 800,
  created_at: '2026-09-30T08:00:00Z',
};

describe('<PartsEditor />', () => {
  it('adds a part with quantity and cost as numbers, then clears the row', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<PartsEditor parts={[]} onAdd={onAdd} onRemove={vi.fn()} />);

    const add = screen.getByRole('button', { name: 'Add part' });
    expect(add).toBeDisabled();

    await user.type(screen.getByLabelText('Part name'), '  Brake fluid ');
    await user.clear(screen.getByLabelText('Quantity'));
    await user.type(screen.getByLabelText('Quantity'), '1.5');
    await user.type(screen.getByLabelText('Cost (KES)'), '1200');
    await user.click(add);

    expect(onAdd).toHaveBeenCalledWith({ name: 'Brake fluid', quantity: 1.5, cost_kes: 1200 });
    expect(screen.getByLabelText('Part name')).toHaveValue('');
    expect(screen.getByLabelText('Quantity')).toHaveValue(1);
  });

  it('sends a null cost when none is entered', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<PartsEditor parts={[]} onAdd={onAdd} onRemove={vi.fn()} />);
    await user.type(screen.getByLabelText('Part name'), 'Cable ties');
    await user.click(screen.getByRole('button', { name: 'Add part' }));
    expect(onAdd).toHaveBeenCalledWith({ name: 'Cable ties', quantity: 1, cost_kes: null });
  });

  it('lists parts with private quantity and cost, and removes one', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<PartsEditor parts={[part]} onAdd={vi.fn()} onRemove={onRemove} />);
    expect(screen.getByText('Oil filter')).toBeInTheDocument();
    expect(screen.getByText('×1')).toBeInTheDocument();
    expect(screen.getByText('KES 800')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove Oil filter' }));
    expect(onRemove).toHaveBeenCalledWith('p1');
  });
});
```

Create `src/admin/pages/jobs/JobPhotos.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JobPhotos } from './JobPhotos';
import type { JobPhoto } from '../../lib/jobs';

const photo = (over: Partial<JobPhoto>): JobPhoto => ({
  id: 'ph1',
  job_id: 'j1',
  finding_id: null,
  media_id: 'm1',
  stage: 'diagnosis',
  caption: null,
  is_public: true,
  display_order: 100,
  created_at: '2026-09-30T08:00:00Z',
  media: { storage_path: 'uploads/a.webp', alt_text: 'Worn pads' },
  ...over,
});

describe('<JobPhotos />', () => {
  it('marks hidden photos and toggles visibility', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const hidden = photo({ id: 'ph2', is_public: false, media: { storage_path: 'uploads/b.webp', alt_text: 'Plate visible' } });
    render(
      <JobPhotos
        photos={[photo({}), hidden]}
        onUpload={vi.fn()}
        onTogglePublic={onToggle}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getAllByText('Hidden from website')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Show on website' }));
    expect(onToggle).toHaveBeenCalledWith(hidden);
  });

  it('passes chosen files to onUpload', async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn();
    render(
      <JobPhotos
        photos={[]}
        onUpload={onUpload}
        onTogglePublic={vi.fn()}
        onDelete={vi.fn()}
        label="Add before photos"
      />,
    );
    const file = new File(['x'], 'pads.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByLabelText('Add before photos'), file);
    expect(onUpload).toHaveBeenCalledWith([file]);
  });

  it('asks the parent to delete a photo', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const p = photo({});
    render(<JobPhotos photos={[p]} onUpload={vi.fn()} onTogglePublic={vi.fn()} onDelete={onDelete} />);
    await user.click(screen.getByRole('button', { name: 'Delete photo' }));
    expect(onDelete).toHaveBeenCalledWith(p);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/admin/pages/jobs`
Expected: FAIL — cannot resolve `./PartsEditor` / `./JobPhotos`.

- [ ] **Step 3: Implement `PartsEditor.tsx`**

```tsx
import { useState } from 'react';
import { Button, Input } from '../../components/ui';
import { formatKes, type JobPart } from '../../lib/jobs';

export interface NewPart {
  name: string;
  quantity: number;
  cost_kes: number | null;
}

/** Parts used for one fix. Only names ever go public (J2); quantity + cost stay private. */
export function PartsEditor({
  parts,
  onAdd,
  onRemove,
  busy = false,
}: {
  parts: JobPart[];
  onAdd: (p: NewPart) => void;
  onRemove: (id: string) => void;
  busy?: boolean;
}) {
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [cost, setCost] = useState('');
  const canAdd = name.trim() !== '' && Number(qty) > 0 && !busy;

  const add = () => {
    onAdd({
      name: name.trim(),
      quantity: Number(qty),
      cost_kes: cost.trim() === '' ? null : Math.round(Number(cost)),
    });
    setName('');
    setQty('1');
    setCost('');
  };

  return (
    <div className="space-y-2">
      {parts.length > 0 && (
        <ul className="divide-y divide-[color:var(--color-line)] text-sm">
          {parts.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-1.5">
              <span className="flex-1 text-[color:var(--color-ink)]">{p.name}</span>
              <span className="font-mono text-xs text-steel">×{p.quantity}</span>
              <span className="w-24 text-right font-mono text-xs text-steel">
                {p.cost_kes != null ? formatKes(p.cost_kes) : '—'}
              </span>
              <button
                type="button"
                aria-label={`Remove ${p.name}`}
                onClick={() => onRemove(p.id)}
                className="font-mono text-[10px] text-signal"
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_5rem_7rem_auto]">
        <Input
          aria-label="Part name"
          placeholder="Part, e.g. front brake pads"
          className="col-span-2 sm:col-span-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          aria-label="Quantity"
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
        <Input
          aria-label="Cost (KES)"
          type="number"
          min="0"
          inputMode="numeric"
          placeholder="KES"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
        />
        <Button aria-label="Add part" className="col-span-2 sm:col-span-1" disabled={!canAdd} onClick={add}>
          Add
        </Button>
      </div>
      <p className="text-xs text-[color:var(--color-muted)]">
        Only part names can appear on the website. Quantity and cost stay private.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Implement `JobPhotos.tsx`**

```tsx
import { useRef } from 'react';
import { Badge, Button } from '../../components/ui';
import { publicImageUrl } from '../../../shared/content/media';
import type { JobPhoto } from '../../lib/jobs';

/** Photo grid for one stage/finding with a per-photo website toggle. */
export function JobPhotos({
  photos,
  onUpload,
  onTogglePublic,
  onDelete,
  uploading = false,
  label = 'Add photos',
}: {
  photos: JobPhoto[];
  onUpload: (files: File[]) => void;
  onTogglePublic: (photo: JobPhoto) => void;
  onDelete: (photo: JobPhoto) => void;
  uploading?: boolean;
  label?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((p) => (
            <figure key={p.id} className="relative">
              <img
                src={publicImageUrl(p.media?.storage_path ?? '', { width: 400 }) ?? undefined}
                alt={p.media?.alt_text ?? ''}
                loading="lazy"
                className={`aspect-[4/3] w-full rounded object-cover ${p.is_public ? '' : 'opacity-50'}`}
              />
              {!p.is_public && (
                <span className="absolute left-1 top-1">
                  <Badge tone="muted">Hidden from website</Badge>
                </span>
              )}
              <figcaption className="mt-1 flex gap-2 font-mono text-[10px]">
                <button
                  type="button"
                  onClick={() => onTogglePublic(p)}
                  className="text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
                >
                  {p.is_public ? 'Hide from website' : 'Show on website'}
                </button>
                <button
                  type="button"
                  aria-label="Delete photo"
                  onClick={() => onDelete(p)}
                  className="ml-auto text-signal"
                >
                  delete
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      {/* No `capture` attribute: phones then offer both "Take photo" and the gallery. */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        aria-label={label}
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onUpload(files);
          e.target.value = '';
        }}
      />
      <Button className="mt-2" disabled={uploading} onClick={() => fileRef.current?.click()}>
        {uploading ? 'Uploading…' : label}
      </Button>
    </div>
  );
}
```

Deviation from spec §5.4, on purpose: no `capture="environment"` — on iOS it forces the camera and blocks picking an existing photo; without it both options are offered.

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run src/admin/pages/jobs`
Expected: PASS (6 tests).

- [ ] **Step 6: Verify and commit**

```bash
npm run typecheck && npm run lint
git add src/admin/pages/jobs/PartsEditor.tsx src/admin/pages/jobs/PartsEditor.test.tsx src/admin/pages/jobs/JobPhotos.tsx src/admin/pages/jobs/JobPhotos.test.tsx
git commit -m "feat(jobs): parts editor and job photo grid components

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Jobs list, new job, nav and routes

**Files:**
- Create: `src/admin/pages/jobs/JobsPage.tsx`, `src/admin/pages/jobs/NewJobPage.tsx`, `src/admin/pages/jobs/JobDetailPage.tsx` (temporary stub, replaced in Task 7)
- Modify: `src/admin/AdminApp.tsx` (imports + routes after line 48), `src/admin/AdminShell.tsx:9-17`, `src/admin/components/NavIcon.tsx:3-12` and `paths`

**Interfaces:**
- Consumes: `useJobs`, `useCreateJob` (Task 4); `matchesJobFilter`, `matchesJobSearch`, `jobStatusLabel`, `jobStatusTone`, `vehicleLabel`, `jobPrefillFromRequest` (Task 2); `clients`, `vehicles`, `services` from `src/admin/lib/resources.ts`; `useRequest` from `src/admin/lib/requests.ts`.
- Produces: routes `/admin/jobs`, `/admin/jobs/new` (optional `?request=<id>`), `/admin/jobs/:id`; export `JobDetailPage` from `src/admin/pages/jobs/JobDetailPage.tsx`.

- [ ] **Step 1: Wrench icon**

In `src/admin/components/NavIcon.tsx`, add `| 'jobs'` to `IconName` (after `'requests'`), and add to `paths` after `requests`:

```tsx
  jobs: (
    <>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4Z" />
    </>
  ),
```

- [ ] **Step 2: Nav item**

In `src/admin/AdminShell.tsx`, in `baseNav` between Requests and Schedule:

```ts
  { to: '/admin/jobs', label: 'Jobs', icon: 'jobs' },
```

- [ ] **Step 3: `JobsPage.tsx`**

```tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, Input, PageTitle, Select, Spinner } from '../../components/ui';
import { useJobs } from '../../lib/jobData';
import {
  jobStatusLabel,
  jobStatusTone,
  matchesJobFilter,
  matchesJobSearch,
  type JobListFilter,
} from '../../lib/jobs';

export function JobsPage() {
  const [filter, setFilter] = useState<JobListFilter>('open');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const q = useJobs();
  const rows = (q.data ?? []).filter(
    (j) => matchesJobFilter(j, filter) && matchesJobSearch(j, search),
  );

  return (
    <section>
      <PageTitle
        actions={
          <Button variant="accent" onClick={() => navigate('/admin/jobs/new')}>
            New job
          </Button>
        }
      >
        Jobs
      </PageTitle>

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          placeholder="Search job number, client or registration…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          aria-label="Show"
          value={filter}
          onChange={(e) => setFilter(e.target.value as JobListFilter)}
        >
          <option value="open">Open</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="all">All</option>
        </Select>
      </div>

      {q.isLoading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState>
          {filter === 'open' && !search.trim()
            ? 'No open jobs. Start one from a request, or tap New job for a walk-in.'
            : 'No jobs match.'}
        </EmptyState>
      ) : (
        <Card className="divide-y divide-[color:var(--color-line)] p-0">
          {rows.map((j) => (
            <Link
              key={j.id}
              to={`/admin/jobs/${j.id}`}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-[color:var(--color-ground)]"
            >
              <span className="font-mono text-xs text-steel">{j.job_number}</span>
              <span className="font-semibold text-[color:var(--color-ink)]">{j.vehicle_label}</span>
              {j.vehicle?.registration && (
                <span className="font-mono text-xs text-[color:var(--color-muted)]">
                  {j.vehicle.registration}
                </span>
              )}
              <span className="text-sm text-[color:var(--color-muted)]">
                {j.client?.name ?? 'No client'}
              </span>
              <span className="ml-auto flex items-center gap-2">
                <span className="font-mono text-[10px] text-steel">
                  {new Date(j.checked_in_at).toLocaleDateString('en-KE', { dateStyle: 'medium' })}
                </span>
                <Badge tone={jobStatusTone(j.status)}>{jobStatusLabel[j.status]}</Badge>
              </span>
            </Link>
          ))}
        </Card>
      )}
    </section>
  );
}
```

- [ ] **Step 4: `NewJobPage.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  Card,
  Input,
  Labeled,
  PageTitle,
  Select,
  Spinner,
  Textarea,
} from '../../components/ui';
import { clients, services, vehicles } from '../../lib/resources';
import { useRequest } from '../../lib/requests';
import { useCreateJob } from '../../lib/jobData';
import { jobPrefillFromRequest, vehicleLabel } from '../../lib/jobs';

const NEW_VEHICLE = 'new';

/** Start a job — a walk-in, or from a request (`?request=<id>`) with fields prefilled. */
export function NewJobPage() {
  const [params] = useSearchParams();
  const requestId = params.get('request') ?? undefined;
  const request = useRequest(requestId);
  const clientList = clients.useList();
  const vehicleList = vehicles.useList();
  const serviceList = services.useList();
  const createVehicle = vehicles.useCreate();
  const createJob = useCreateJob();
  const navigate = useNavigate();

  const [clientId, setClientId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [newVehicle, setNewVehicle] = useState({ make: '', model: '', year: '', registration: '' });
  const [serviceId, setServiceId] = useState('');
  const [complaint, setComplaint] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Prefill once the request arrives.
  const req = request.data;
  useEffect(() => {
    if (!req) return;
    setClientId(req.client_id ?? '');
    setVehicleId(req.vehicle_id ?? '');
    setComplaint(req.message ?? '');
  }, [req]);

  const clientVehicles = useMemo(
    () => (vehicleList.data ?? []).filter((v) => v.client_id === clientId),
    [vehicleList.data, clientId],
  );

  if (requestId && request.isLoading) return <Spinner />;

  const busy = createJob.isPending || createVehicle.isPending;
  const vehicleChosen =
    vehicleId === NEW_VEHICLE ? newVehicle.make.trim() !== '' : vehicleId !== '';
  const canCreate = clientId !== '' && vehicleChosen && !busy;

  const submit = async () => {
    setError(null);
    try {
      let vehicle = clientVehicles.find((v) => v.id === vehicleId);
      if (vehicleId === NEW_VEHICLE) {
        vehicle = await createVehicle.mutateAsync({
          client_id: clientId,
          make: newVehicle.make.trim(),
          model: newVehicle.model.trim() || null,
          year: newVehicle.year ? Number(newVehicle.year) : null,
          registration: newVehicle.registration.trim() || null,
        });
      }
      if (!vehicle) throw new Error('Pick a vehicle.');
      const id = await createJob.mutateAsync({
        ...(req ? jobPrefillFromRequest(req) : {}),
        client_id: clientId,
        vehicle_id: vehicle.id,
        vehicle_label: vehicleLabel(vehicle),
        service_id: serviceId || null,
        complaint: complaint.trim() || null,
      });
      navigate(`/admin/jobs/${id}`, { replace: true });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const setNv = (k: keyof typeof newVehicle) => (e: { target: { value: string } }) =>
    setNewVehicle((p) => ({ ...p, [k]: e.target.value }));

  return (
    <section className="space-y-4">
      <PageTitle
        actions={
          <Link
            to={requestId ? `/admin/requests/${requestId}` : '/admin/jobs'}
            className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
          >
            ← Back
          </Link>
        }
      >
        {req ? `New job for ${req.contact_name}` : 'New job'}
      </PageTitle>

      <Card className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Client" hint="Not listed? Add them under Clients first.">
          <Select
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setVehicleId('');
            }}
          >
            <option value="">— pick a client —</option>
            {(clientList.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.phone ? ` · ${c.phone}` : ''}
              </option>
            ))}
          </Select>
        </Labeled>
        <Labeled label="Vehicle">
          <Select
            value={vehicleId}
            disabled={!clientId}
            onChange={(e) => setVehicleId(e.target.value)}
          >
            <option value="">— pick a vehicle —</option>
            {clientVehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {vehicleLabel(v)}
                {v.registration ? ` · ${v.registration}` : ''}
              </option>
            ))}
            <option value={NEW_VEHICLE}>+ Add a vehicle</option>
          </Select>
        </Labeled>

        {vehicleId === NEW_VEHICLE && (
          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-4">
            <Labeled label="Make">
              <Input value={newVehicle.make} onChange={setNv('make')} placeholder="Toyota" />
            </Labeled>
            <Labeled label="Model">
              <Input value={newVehicle.model} onChange={setNv('model')} placeholder="Fielder" />
            </Labeled>
            <Labeled label="Year">
              <Input type="number" value={newVehicle.year} onChange={setNv('year')} />
            </Labeled>
            <Labeled label="Registration">
              <Input value={newVehicle.registration} onChange={setNv('registration')} />
            </Labeled>
          </div>
        )}

        <Labeled label="Service">
          <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">— none —</option>
            {(serviceList.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </Select>
        </Labeled>
      </Card>

      <Card>
        <Labeled label="Customer's complaint" hint="In your words — this can appear on the website later.">
          <Textarea rows={3} value={complaint} onChange={(e) => setComplaint(e.target.value)} />
        </Labeled>
      </Card>

      {error && <p className="text-sm text-signal">{error}</p>}
      <Button variant="accent" disabled={!canCreate} onClick={submit}>
        {busy ? 'Creating…' : 'Check in vehicle'}
      </Button>
    </section>
  );
}
```

- [ ] **Step 5: Temporary detail stub**

Create `src/admin/pages/jobs/JobDetailPage.tsx` (replaced in Task 7):

```tsx
import { useParams } from 'react-router-dom';
import { EmptyState, PageTitle, Spinner } from '../../components/ui';
import { useJob } from '../../lib/jobData';

export function JobDetailPage() {
  const { id } = useParams();
  const q = useJob(id);
  if (q.isLoading) return <Spinner />;
  if (!q.data) return <EmptyState>Job not found.</EmptyState>;
  return <PageTitle>{`${q.data.job_number} · ${q.data.vehicle_label}`}</PageTitle>;
}
```

- [ ] **Step 6: Routes**

In `src/admin/AdminApp.tsx` add imports:

```tsx
import { JobsPage } from './pages/jobs/JobsPage';
import { NewJobPage } from './pages/jobs/NewJobPage';
import { JobDetailPage } from './pages/jobs/JobDetailPage';
```

and after `<Route path="requests/:id" element={<RequestDetailPage />} />`:

```tsx
              <Route path="jobs" element={<JobsPage />} />
              <Route path="jobs/new" element={<NewJobPage />} />
              <Route path="jobs/:id" element={<JobDetailPage />} />
```

- [ ] **Step 7: Verify**

Run: `npm run typecheck && npm run lint && npm run test` → green.

Manual (`npm run dev`, sign in at `/admin`):
1. Sidebar shows **Jobs** with a wrench between Requests and Schedule.
2. Jobs → "No open jobs…" empty state.
3. New job → pick a client → vehicle list shows only theirs → "+ Add a vehicle" → Make `Toyota`, Model `Fielder`, Year `2014` → Check in vehicle → lands on `/admin/jobs/<id>` titled `PP-2026-0001 · 2014 Toyota Fielder` (number may differ).
4. Back to Jobs: the job appears under **Open**; search `fielder` and the job number digits both find it; **Completed** hides it.

- [ ] **Step 8: Commit**

```bash
git add src/admin/pages/jobs src/admin/AdminApp.tsx src/admin/AdminShell.tsx src/admin/components/NavIcon.tsx
git commit -m "feat(jobs): jobs list, new job (walk-in / from request), nav + routes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Job page shell + Check-in tab

**Files:**
- Create: `src/admin/pages/jobs/usePhotoActions.ts`, `src/admin/pages/jobs/CheckInTab.tsx`
- Replace: `src/admin/pages/jobs/JobDetailPage.tsx`
- Create (placeholders, filled in Tasks 8–10): `src/admin/pages/jobs/DiagnosisTab.tsx`, `RepairTab.tsx`, `WrapUpTab.tsx`

**Interfaces:**
- Consumes: `useJob`, `useUpdateJob`, `photos`, `useAddPhoto` (Task 4); `JobPhotos` (Task 5); `JOB_STATUSES`, `jobStatusLabel`, `jobStatusTone`, `photoAlt`, `toDateInput`, `fromDateInput`, types (Task 2).
- Produces: `usePhotoActions(job: Pick<Job,'id'|'vehicle_label'>)` → `{ upload(files: File[], stage: PhotoStage, finding: Pick<JobFinding,'id'|'title'> | null): Promise<void>; togglePublic(p: JobPhoto): void; remove(p: JobPhoto): void; uploading: boolean; error: string | null }`. Tab components take `{ job: JobWithRefs }`.

- [ ] **Step 1: `usePhotoActions.ts`**

```ts
import { useState } from 'react';
import { photos, useAddPhoto } from '../../lib/jobData';
import { photoAlt, type Job, type JobFinding, type JobPhoto, type PhotoStage } from '../../lib/jobs';

/** Upload / show-hide / delete for a job's photos, shared by every tab. */
export function usePhotoActions(job: Pick<Job, 'id' | 'vehicle_label'>) {
  const add = useAddPhoto(job.id);
  const update = photos.useUpdate(job.id);
  const del = photos.useRemove(job.id);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (
    files: File[],
    stage: PhotoStage,
    finding: Pick<JobFinding, 'id' | 'title'> | null,
  ) => {
    setUploading(true);
    setError(null);
    try {
      for (const file of files) {
        await add.mutateAsync({
          file,
          stage,
          findingId: finding?.id ?? null,
          alt: photoAlt(job.vehicle_label, stage, finding?.title),
        });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const togglePublic = (p: JobPhoto) =>
    update.mutate({ id: p.id, patch: { is_public: !p.is_public } });

  const remove = (p: JobPhoto) => {
    if (confirm('Remove this photo from the job? It stays in the media library.')) del.mutate(p.id);
  };

  return { upload, togglePublic, remove, uploading, error };
}
```

- [ ] **Step 2: Placeholder tabs**

Create each of `DiagnosisTab.tsx`, `RepairTab.tsx`, `WrapUpTab.tsx` with this content, changing the function name (`DiagnosisTab` / `RepairTab` / `WrapUpTab`):

```tsx
import type { JobWithRefs } from '../../lib/jobs';

export function DiagnosisTab({ job }: { job: JobWithRefs }) {
  return <p className="text-sm text-[color:var(--color-muted)]">{job.job_number}</p>;
}
```

- [ ] **Step 3: `CheckInTab.tsx`**

```tsx
import { useState } from 'react';
import { Button, Card, Input, Label, Labeled, Textarea } from '../../components/ui';
import { photos, useUpdateJob } from '../../lib/jobData';
import { fromDateInput, toDateInput, type JobWithRefs } from '../../lib/jobs';
import { JobPhotos } from './JobPhotos';
import { usePhotoActions } from './usePhotoActions';

export function CheckInTab({ job }: { job: JobWithRefs }) {
  // Remount the form when the saved values change, so it never shows stale data.
  const formKey = [
    job.vehicle_label,
    job.booked_at,
    job.checked_in_at,
    job.odometer_km,
    job.complaint,
    job.internal_notes,
  ].join('|');
  return (
    <div className="space-y-4">
      <ConsentCard job={job} />
      <CheckInForm key={formKey} job={job} />
      <CheckInPhotos job={job} />
    </div>
  );
}

function ConsentCard({ job }: { job: JobWithRefs }) {
  const update = useUpdateJob(job.id);
  return (
    <Card>
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1"
          checked={job.public_consent}
          disabled={update.isPending}
          onChange={(e) => update.mutate({ public_consent: e.target.checked })}
        />
        <span>
          <span className="font-semibold text-[color:var(--color-ink)]">
            Client agrees to this job being shown on our website
          </span>
          <span className="block text-xs text-[color:var(--color-muted)]">
            Their name, phone and number plate are never shown.
            {job.consent_recorded_at &&
              ` Recorded ${new Date(job.consent_recorded_at).toLocaleString('en-KE')}.`}
          </span>
        </span>
      </label>
    </Card>
  );
}

function CheckInForm({ job }: { job: JobWithRefs }) {
  const update = useUpdateJob(job.id);
  const [f, setF] = useState({
    vehicle_label: job.vehicle_label,
    booked: toDateInput(job.booked_at),
    checkedIn: toDateInput(job.checked_in_at),
    odometer: job.odometer_km?.toString() ?? '',
    complaint: job.complaint ?? '',
    internal: job.internal_notes ?? '',
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const save = () =>
    update.mutate({
      vehicle_label: f.vehicle_label.trim() || job.vehicle_label,
      booked_at: fromDateInput(f.booked),
      // Keep the original time of day unless the date itself was changed.
      checked_in_at:
        f.checkedIn === toDateInput(job.checked_in_at)
          ? job.checked_in_at
          : (fromDateInput(f.checkedIn) ?? job.checked_in_at),
      odometer_km: f.odometer.trim() === '' ? null : Math.round(Number(f.odometer)),
      complaint: f.complaint.trim() || null,
      internal_notes: f.internal.trim() || null,
    });

  return (
    <Card className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Vehicle (as shown on the job)" hint="Make, model, year — no number plate.">
          <Input value={f.vehicle_label} onChange={set('vehicle_label')} />
        </Labeled>
        <Labeled label="Odometer (km) — private">
          <Input type="number" min="0" inputMode="numeric" value={f.odometer} onChange={set('odometer')} />
        </Labeled>
        <Labeled label="Booked for">
          <Input type="date" value={f.booked} onChange={set('booked')} />
        </Labeled>
        <Labeled label="Checked in">
          <Input type="date" value={f.checkedIn} onChange={set('checkedIn')} />
        </Labeled>
      </div>
      <Labeled label="Customer's complaint">
        <Textarea rows={3} value={f.complaint} onChange={set('complaint')} />
      </Labeled>
      <Labeled label="Internal notes — private">
        <Textarea rows={3} value={f.internal} onChange={set('internal')} />
      </Labeled>
      <Button variant="accent" disabled={update.isPending} onClick={save}>
        Save check-in
      </Button>
      {update.isError && <p className="text-xs text-signal">{(update.error as Error).message}</p>}
    </Card>
  );
}

function CheckInPhotos({ job }: { job: JobWithRefs }) {
  const all = photos.useList(job.id);
  const actions = usePhotoActions(job);
  const checkIn = (all.data ?? []).filter((p) => p.stage === 'check_in');
  return (
    <Card>
      <Label>Check-in photos</Label>
      <div className="mt-2">
        <JobPhotos
          photos={checkIn}
          label="Add check-in photos"
          uploading={actions.uploading}
          onUpload={(files) => void actions.upload(files, 'check_in', null)}
          onTogglePublic={actions.togglePublic}
          onDelete={actions.remove}
        />
      </div>
      {actions.error && <p className="mt-2 text-xs text-signal">{actions.error}</p>}
    </Card>
  );
}
```

- [ ] **Step 4: `JobDetailPage.tsx` (replace the stub)**

```tsx
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Badge, Card, EmptyState, Labeled, PageTitle, Select, Spinner } from '../../components/ui';
import { useJob, useUpdateJob } from '../../lib/jobData';
import {
  JOB_STATUSES,
  jobStatusLabel,
  jobStatusTone,
  type JobStatus,
  type JobWithRefs,
} from '../../lib/jobs';
import { CheckInTab } from './CheckInTab';
import { DiagnosisTab } from './DiagnosisTab';
import { RepairTab } from './RepairTab';
import { WrapUpTab } from './WrapUpTab';

const TABS = [
  { key: 'check-in', label: 'Check-in' },
  { key: 'diagnosis', label: 'Diagnosis' },
  { key: 'repair', label: 'Repair' },
  { key: 'wrap-up', label: 'Wrap-up' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export function JobDetailPage() {
  const { id } = useParams();
  const q = useJob(id);
  const [params, setParams] = useSearchParams();
  const tab: TabKey = TABS.find((t) => t.key === params.get('tab'))?.key ?? 'check-in';

  if (q.isLoading) return <Spinner />;
  const job = q.data;
  if (!job) return <EmptyState>Job not found.</EmptyState>;

  return (
    <section className="space-y-6">
      <PageTitle
        actions={
          <Link
            to="/admin/jobs"
            className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
          >
            ← All jobs
          </Link>
        }
      >
        <span className="block font-mono text-xs font-normal text-steel">{job.job_number}</span>
        {job.vehicle_label}
      </PageTitle>

      <JobHeader job={job} />

      <div
        role="tablist"
        aria-label="Job stages"
        className="flex gap-1 overflow-x-auto border-b border-[color:var(--color-line)]"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setParams({ tab: t.key }, { replace: true })}
            className={`whitespace-nowrap px-3 py-2 text-sm font-semibold ${
              tab === t.key
                ? 'border-b-2 border-signal text-[color:var(--color-ink)]'
                : 'text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === 'check-in' && <CheckInTab job={job} />}
        {tab === 'diagnosis' && <DiagnosisTab job={job} />}
        {tab === 'repair' && <RepairTab job={job} />}
        {tab === 'wrap-up' && <WrapUpTab job={job} />}
      </div>
    </section>
  );
}

function JobHeader({ job }: { job: JobWithRefs }) {
  const update = useUpdateJob(job.id);
  return (
    <Card className="grid gap-4 sm:grid-cols-[1fr_1fr_14rem]">
      <div>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
          Client
        </span>
        <p className="text-[color:var(--color-ink)]">
          {job.client_id ? (
            <Link to={`/admin/clients/${job.client_id}`} className="underline-offset-2 hover:underline">
              {job.client?.name ?? 'Client'}
            </Link>
          ) : (
            'No client on file'
          )}
        </p>
      </div>
      <div>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
          Registration
        </span>
        <p className="font-mono text-[color:var(--color-ink)]">{job.vehicle?.registration ?? '—'}</p>
      </div>
      <Labeled label="Status">
        <div className="flex items-center gap-2">
          <Select
            value={job.status}
            disabled={update.isPending}
            onChange={(e) => update.mutate({ status: e.target.value as JobStatus })}
          >
            {JOB_STATUSES.map((s) => (
              <option key={s} value={s}>
                {jobStatusLabel[s]}
              </option>
            ))}
          </Select>
          <Badge tone={jobStatusTone(job.status)}>{jobStatusLabel[job.status]}</Badge>
        </div>
      </Labeled>
    </Card>
  );
}
```

- [ ] **Step 5: Verify**

Run: `npm run typecheck && npm run lint && npm run test` → green.

Manual (`npm run dev`), on the job from Task 6:
1. Tabs switch and the URL shows `?tab=…`; refreshing keeps the tab.
2. Tick consent → "Recorded …" appears; untick → it disappears.
3. Edit odometer, complaint, booked date → Save check-in → refresh → values kept; checked-in date unchanged keeps its time.
4. Add two check-in photos from the phone/gallery → thumbnails appear; "Hide from website" dims one with "Hidden from website"; delete asks to confirm and removes it.
5. Status select → "Diagnosing" → badge updates; Jobs list reflects it.

- [ ] **Step 6: Commit**

```bash
git add src/admin/pages/jobs
git commit -m "feat(jobs): job page with stage tabs and check-in (consent, dates, photos)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Diagnosis tab

**Files:**
- Replace: `src/admin/pages/jobs/DiagnosisTab.tsx`

**Interfaces:**
- Consumes: `findings`, `photos` (Task 4); `usePhotoActions` (Task 7); `JobPhotos` (Task 5); `JobFinding`, `JobPhoto`, `JobWithRefs` (Task 2).
- Produces: `DiagnosisTab({ job })`.

- [ ] **Step 1: Implement**

```tsx
import { useState } from 'react';
import { Button, Card, EmptyState, Input, Label, Labeled, Textarea } from '../../components/ui';
import { findings, photos } from '../../lib/jobData';
import type { JobFinding, JobPhoto, JobWithRefs } from '../../lib/jobs';
import { JobPhotos } from './JobPhotos';
import { usePhotoActions } from './usePhotoActions';

type PhotoActions = ReturnType<typeof usePhotoActions>;

export function DiagnosisTab({ job }: { job: JobWithRefs }) {
  const list = findings.useList(job.id);
  const create = findings.useCreate(job.id);
  const update = findings.useUpdate(job.id);
  const allPhotos = photos.useList(job.id);
  const actions = usePhotoActions(job);
  const [title, setTitle] = useState('');
  const rows = list.data ?? [];

  const add = () => {
    const last = rows[rows.length - 1];
    create.mutate({ title: title.trim(), display_order: (last?.display_order ?? 0) + 10 });
    setTitle('');
  };

  // Swap display_order with the neighbour.
  const move = (index: number, dir: -1 | 1) => {
    const a = rows[index];
    const b = rows[index + dir];
    if (!a || !b) return;
    const aOrder = a.display_order === b.display_order ? b.display_order + dir : b.display_order;
    update.mutate({ id: a.id, patch: { display_order: aOrder } });
    update.mutate({ id: b.id, patch: { display_order: a.display_order } });
  };

  return (
    <div className="space-y-4">
      {rows.length === 0 && !list.isLoading && (
        <EmptyState>No problems logged yet. Add the first one below.</EmptyState>
      )}
      {rows.map((fd, i) => (
        <FindingCard
          key={`${fd.id}:${fd.title}:${fd.diagnosis ?? ''}`}
          jobId={job.id}
          finding={fd}
          photos={(allPhotos.data ?? []).filter(
            (p) => p.finding_id === fd.id && p.stage === 'diagnosis',
          )}
          actions={actions}
          onUp={i > 0 ? () => move(i, -1) : undefined}
          onDown={i < rows.length - 1 ? () => move(i, 1) : undefined}
        />
      ))}
      {actions.error && <p className="text-xs text-signal">{actions.error}</p>}

      <Card>
        <Labeled label="Add a problem found">
          <div className="mt-1 flex gap-2">
            <Input
              className="mt-0"
              placeholder="e.g. Worn front brake pads"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && title.trim()) add();
              }}
            />
            <Button disabled={!title.trim() || create.isPending} onClick={add}>
              Add
            </Button>
          </div>
        </Labeled>
      </Card>
    </div>
  );
}

function FindingCard({
  jobId,
  finding,
  photos: findingPhotos,
  actions,
  onUp,
  onDown,
}: {
  jobId: string;
  finding: JobFinding;
  photos: JobPhoto[];
  actions: PhotoActions;
  onUp?: () => void;
  onDown?: () => void;
}) {
  const update = findings.useUpdate(jobId);
  const remove = findings.useRemove(jobId);
  const [title, setTitle] = useState(finding.title);
  const [diagnosis, setDiagnosis] = useState(finding.diagnosis ?? '');
  const dirty = title !== finding.title || diagnosis !== (finding.diagnosis ?? '');

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <Label>Problem</Label>
        <div className="ml-auto flex gap-1 font-mono text-[10px]">
          <button type="button" aria-label="Move up" disabled={!onUp} onClick={onUp} className="px-1 disabled:opacity-30">
            ↑
          </button>
          <button type="button" aria-label="Move down" disabled={!onDown} onClick={onDown} className="px-1 disabled:opacity-30">
            ↓
          </button>
        </div>
      </div>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Problem title" />
      <Labeled label="Diagnosis — what you found and how">
        <Textarea rows={3} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
      </Labeled>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!dirty || !title.trim() || update.isPending}
          onClick={() =>
            update.mutate({
              id: finding.id,
              patch: { title: title.trim(), diagnosis: diagnosis.trim() || null },
            })
          }
        >
          Save
        </Button>
        <Button
          variant="danger"
          className="ml-auto"
          onClick={() => {
            if (confirm(`Delete "${finding.title}"? Its photos and parts stay on the job, unlinked.`)) {
              remove.mutate(finding.id);
            }
          }}
        >
          Delete problem
        </Button>
      </div>
      <Label>Before photos</Label>
      <JobPhotos
        photos={findingPhotos}
        label="Add before photos"
        uploading={actions.uploading}
        onUpload={(files) => void actions.upload(files, 'diagnosis', finding)}
        onTogglePublic={actions.togglePublic}
        onDelete={actions.remove}
      />
    </Card>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run lint && npm run test` → green.

Manual: Diagnosis tab → add "Worn front brake pads" and "Leaking rocker cover gasket" → edit a diagnosis → Save → refresh keeps it → ↑/↓ reorders (and survives refresh) → add a before photo to one finding (shows only under that finding) → delete a finding: its photo no longer shows under Diagnosis, the job still loads.

- [ ] **Step 3: Commit**

```bash
git add src/admin/pages/jobs/DiagnosisTab.tsx
git commit -m "feat(jobs): diagnosis tab — log problems with before photos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Repair tab

**Files:**
- Replace: `src/admin/pages/jobs/RepairTab.tsx`

**Interfaces:**
- Consumes: `findings`, `photos`, `parts` (Task 4); `PartsEditor`, `JobPhotos` (Task 5); `usePhotoActions` (Task 7); `FINDING_OUTCOMES`, `outcomeLabel`, types (Task 2).
- Produces: `RepairTab({ job })`.

- [ ] **Step 1: Implement**

```tsx
import { useState } from 'react';
import { Button, Card, EmptyState, Label, Labeled, Select, Textarea } from '../../components/ui';
import { findings, parts, photos } from '../../lib/jobData';
import {
  FINDING_OUTCOMES,
  outcomeLabel,
  type FindingOutcome,
  type JobFinding,
  type JobPart,
  type JobPhoto,
  type JobWithRefs,
} from '../../lib/jobs';
import { JobPhotos } from './JobPhotos';
import { PartsEditor } from './PartsEditor';
import { usePhotoActions } from './usePhotoActions';

type PhotoActions = ReturnType<typeof usePhotoActions>;

export function RepairTab({ job }: { job: JobWithRefs }) {
  const list = findings.useList(job.id);
  const allPhotos = photos.useList(job.id);
  const allParts = parts.useList(job.id);
  const actions = usePhotoActions(job);
  const rows = list.data ?? [];

  if (!list.isLoading && rows.length === 0) {
    return <EmptyState>Log the problems you found in the Diagnosis tab first.</EmptyState>;
  }

  return (
    <div className="space-y-4">
      {rows.map((fd) => (
        <RepairCard
          key={`${fd.id}:${fd.fix ?? ''}:${fd.outcome}`}
          jobId={job.id}
          finding={fd}
          photos={(allPhotos.data ?? []).filter((p) => p.finding_id === fd.id && p.stage === 'repair')}
          parts={(allParts.data ?? []).filter((p) => p.finding_id === fd.id)}
          actions={actions}
        />
      ))}
      {actions.error && <p className="text-xs text-signal">{actions.error}</p>}
    </div>
  );
}

function RepairCard({
  jobId,
  finding,
  photos: afterPhotos,
  parts: findingParts,
  actions,
}: {
  jobId: string;
  finding: JobFinding;
  photos: JobPhoto[];
  parts: JobPart[];
  actions: PhotoActions;
}) {
  const update = findings.useUpdate(jobId);
  const addPart = parts.useCreate(jobId);
  const removePart = parts.useRemove(jobId);
  const [fix, setFix] = useState(finding.fix ?? '');
  const [outcome, setOutcome] = useState<FindingOutcome>(finding.outcome);
  const dirty = fix !== (finding.fix ?? '') || outcome !== finding.outcome;

  return (
    <Card className="space-y-3">
      <div>
        <h3 className="font-semibold text-[color:var(--color-ink)]">{finding.title}</h3>
        {finding.diagnosis && (
          <p className="mt-1 whitespace-pre-wrap text-sm text-[color:var(--color-muted)]">
            {finding.diagnosis}
          </p>
        )}
      </div>
      <Labeled label="Fix — what was done">
        <Textarea rows={3} value={fix} onChange={(e) => setFix(e.target.value)} />
      </Labeled>
      <Labeled label="Outcome">
        <Select value={outcome} onChange={(e) => setOutcome(e.target.value as FindingOutcome)}>
          {FINDING_OUTCOMES.map((o) => (
            <option key={o} value={o}>
              {outcomeLabel[o]}
            </option>
          ))}
        </Select>
      </Labeled>
      <Button
        disabled={!dirty || update.isPending}
        onClick={() =>
          update.mutate({ id: finding.id, patch: { fix: fix.trim() || null, outcome } })
        }
      >
        Save repair
      </Button>

      <Label>After photos</Label>
      <JobPhotos
        photos={afterPhotos}
        label="Add after photos"
        uploading={actions.uploading}
        onUpload={(files) => void actions.upload(files, 'repair', finding)}
        onTogglePublic={actions.togglePublic}
        onDelete={actions.remove}
      />

      <Label>Parts used</Label>
      <PartsEditor
        parts={findingParts}
        busy={addPart.isPending}
        onAdd={(p) => addPart.mutate({ ...p, finding_id: finding.id })}
        onRemove={(id) => removePart.mutate(id)}
      />
    </Card>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run lint && npm run test` → green.

Manual: Repair tab shows one card per finding with its diagnosis → write a fix, set **Fixed**, Save repair → refresh keeps it → set the other finding to **Deferred** → add an after photo to the first finding → add parts `Front brake pads` ×1 KES 3500 and `Brake fluid` ×0.5 (no cost) → both listed with qty/cost → remove one.

- [ ] **Step 3: Commit**

```bash
git add src/admin/pages/jobs/RepairTab.tsx
git commit -m "feat(jobs): repair tab — fixes, outcomes, after photos and parts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Wrap-up tab

**Files:**
- Replace: `src/admin/pages/jobs/WrapUpTab.tsx`

**Interfaces:**
- Consumes: `useUpdateJob`, `useDeleteJob`, `findings`, `parts` (Task 4); `jobCostSummary`, `formatKes`, `pendingFindingsCount`, types (Task 2).
- Produces: `WrapUpTab({ job })`.

- [ ] **Step 1: Implement**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, Label, Labeled } from '../../components/ui';
import { findings, parts, useDeleteJob, useUpdateJob } from '../../lib/jobData';
import {
  formatKes,
  jobCostSummary,
  pendingFindingsCount,
  type JobWithRefs,
} from '../../lib/jobs';

export function WrapUpTab({ job }: { job: JobWithRefs }) {
  return (
    <div className="space-y-4">
      <LabourCard key={`${job.labour_hours}|${job.labour_cost_kes}`} job={job} />
      <CostSummary job={job} />
      <StatusCard job={job} />
      <DeleteCard job={job} />
    </div>
  );
}

function LabourCard({ job }: { job: JobWithRefs }) {
  const update = useUpdateJob(job.id);
  const [hours, setHours] = useState(job.labour_hours?.toString() ?? '');
  const [cost, setCost] = useState(job.labour_cost_kes?.toString() ?? '');
  return (
    <Card className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Labour hours — private">
          <Input type="number" min="0" step="0.25" inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} />
        </Labeled>
        <Labeled label="Labour cost (KES) — private">
          <Input type="number" min="0" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} />
        </Labeled>
      </div>
      <Button
        disabled={update.isPending}
        onClick={() =>
          update.mutate({
            labour_hours: hours.trim() === '' ? null : Number(hours),
            labour_cost_kes: cost.trim() === '' ? null : Math.round(Number(cost)),
          })
        }
      >
        Save labour
      </Button>
    </Card>
  );
}

function CostSummary({ job }: { job: JobWithRefs }) {
  const allParts = parts.useList(job.id);
  const s = jobCostSummary(job.labour_cost_kes, allParts.data ?? []);
  return (
    <Card>
      <Label>Cost summary — private, never shown on the website</Label>
      <dl className="mt-2 grid grid-cols-[1fr_auto] gap-y-1 text-sm">
        <dt className="text-[color:var(--color-muted)]">Labour</dt>
        <dd className="text-right font-mono">{formatKes(s.labour)}</dd>
        <dt className="text-[color:var(--color-muted)]">Parts</dt>
        <dd className="text-right font-mono">{formatKes(s.parts)}</dd>
        <dt className="font-semibold text-[color:var(--color-ink)]">Total</dt>
        <dd className="text-right font-mono font-semibold">{formatKes(s.total)}</dd>
      </dl>
    </Card>
  );
}

function StatusCard({ job }: { job: JobWithRefs }) {
  const update = useUpdateJob(job.id);
  const list = findings.useList(job.id);
  const pending = pendingFindingsCount(list.data ?? []);

  const complete = () => {
    if (
      pending > 0 &&
      !confirm(`${pending} problem(s) still have no outcome. Mark the job completed anyway?`)
    ) {
      return;
    }
    update.mutate({ status: 'completed' });
  };

  return (
    <Card className="space-y-3">
      <Label>Job status</Label>
      {job.status === 'completed' ? (
        <>
          <p className="text-sm text-teal">
            ✓ Completed{' '}
            {job.completed_at &&
              new Date(job.completed_at).toLocaleDateString('en-KE', { dateStyle: 'medium' })}
            .
          </p>
          <Button disabled={update.isPending} onClick={() => update.mutate({ status: 'in_repair' })}>
            Re-open job
          </Button>
        </>
      ) : job.status === 'cancelled' ? (
        <>
          <p className="text-sm text-[color:var(--color-muted)]">This job was cancelled.</p>
          <Button disabled={update.isPending} onClick={() => update.mutate({ status: 'checked_in' })}>
            Re-open job
          </Button>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="accent" disabled={update.isPending} onClick={complete}>
            Mark completed
          </Button>
          <Button
            variant="danger"
            disabled={update.isPending}
            onClick={() => {
              if (confirm('Cancel this job? It stays on file for history.')) {
                update.mutate({ status: 'cancelled' });
              }
            }}
          >
            Cancel job
          </Button>
        </div>
      )}
      {job.service_request_id && job.status !== 'completed' && (
        <p className="text-xs text-[color:var(--color-muted)]">
          Completing the job also marks its request completed.
        </p>
      )}
    </Card>
  );
}

function DeleteCard({ job }: { job: JobWithRefs }) {
  const del = useDeleteJob();
  const navigate = useNavigate();
  return (
    <Button
      variant="danger"
      disabled={del.isPending}
      onClick={async () => {
        if (
          confirm(
            `Delete job ${job.job_number}? Its problems, photo links and parts are removed. Photos stay in the media library.`,
          )
        ) {
          await del.mutateAsync(job.id);
          navigate('/admin/jobs');
        }
      }}
    >
      Delete job
    </Button>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run lint && npm run test` → green.

Manual:
1. Labour 2.5 h / KES 4000 → Save → Cost summary shows Labour 4,000, Parts = sum of Task 9 part costs, Total.
2. With a finding still **Pending**, Mark completed → confirm prompt names the count → OK → "✓ Completed <date>"; header badge **Completed**; Jobs list moves it to **Completed**.
3. For a job started from a request (Task 11 wires the button — re-check this item after Task 11): the request shows status **completed**.
4. Re-open → badge "In repair", completed date cleared.
5. Create a throwaway walk-in job → Delete job → back on the list, gone.

- [ ] **Step 3: Commit**

```bash
git add src/admin/pages/jobs/WrapUpTab.tsx
git commit -m "feat(jobs): wrap-up tab — labour, private cost summary, complete/cancel/delete

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Link Jobs into Requests, Clients and the Dashboard

**Files:**
- Modify: `src/admin/pages/RequestDetailPage.tsx` (imports; hooks near line 31; new card after the Customer card, ~line 140)
- Modify: `src/admin/pages/ClientDetailPage.tsx` (imports; hook near line 53; new section after Vehicles, ~line 145; delete confirm text line 175)
- Modify: `src/admin/pages/DashboardPage.tsx:10-24` (`useCount` `in` op) and the stats grid (~lines 98–114)

**Interfaces:**
- Consumes: `useJobByRequest`, `useClientJobs` (Task 4); `groupJobsByVehicle`, `jobStatusLabel`, `jobStatusTone`, `OPEN_STATUSES` (Task 2).

- [ ] **Step 1: Request detail — Start job / Open job**

In `src/admin/pages/RequestDetailPage.tsx`:
- Change the router import to `import { Link, useNavigate, useParams } from 'react-router-dom';`
- Add `import { useJobByRequest } from '../lib/jobData';`
- After `const convert = useConvertToClient(r ?? ({} as never));` add:

```tsx
  const job = useJobByRequest(id);
  const navigate = useNavigate();
```

- After the closing `</Card>` of the **Customer** card (inside the `space-y-4` column) add:

```tsx
          <Card>
            <Label>Job</Label>
            {job.data ? (
              <p className="mt-1 text-sm">
                <Link
                  to={`/admin/jobs/${job.data.id}`}
                  className="text-teal underline-offset-2 hover:underline"
                >
                  Open job {job.data.job_number} →
                </Link>
              </p>
            ) : r.client_id ? (
              <div className="mt-2">
                <Button variant="accent" onClick={() => navigate(`/admin/jobs/new?request=${r.id}`)}>
                  Start job
                </Button>
              </div>
            ) : (
              <p className="mt-1 text-sm text-[color:var(--color-muted)]">
                Convert to a client first, then start a job.
              </p>
            )}
          </Card>
```

- [ ] **Step 2: Client detail — service history**

In `src/admin/pages/ClientDetailPage.tsx`:
- Add imports:

```tsx
import { useClientJobs } from '../lib/jobData';
import { groupJobsByVehicle, jobStatusLabel, jobStatusTone } from '../lib/jobs';
```

- After the `requests` `useQuery` block add: `const jobs = useClientJobs(id);`
- After the Vehicles `</div>` (the block containing `<InlineCrud … />`) add:

```tsx
      <div>
        <h2 className="mb-2 font-semibold text-[color:var(--color-ink)]">Jobs</h2>
        {jobs.isLoading ? (
          <Spinner />
        ) : (jobs.data ?? []).length === 0 ? (
          <EmptyState>No jobs for this client yet.</EmptyState>
        ) : (
          <div className="space-y-3">
            {groupJobsByVehicle(jobs.data!).map((g) => (
              <div key={g.key}>
                <h3 className="mb-1 text-sm font-semibold text-[color:var(--color-muted)]">
                  {g.label}
                </h3>
                <Card className="divide-y divide-[color:var(--color-line)] p-0">
                  {g.jobs.map((j) => (
                    <Link
                      key={j.id}
                      to={`/admin/jobs/${j.id}`}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-[color:var(--color-ground)]"
                    >
                      <span className="font-mono text-[10px] text-steel">
                        {new Date(j.checked_in_at).toLocaleDateString('en-KE')}
                      </span>
                      <span className="font-mono text-xs">{j.job_number}</span>
                      <span className="ml-auto">
                        <Badge tone={jobStatusTone(j.status)}>{jobStatusLabel[j.status]}</Badge>
                      </span>
                    </Link>
                  ))}
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
```

- Change the delete confirm text to: `'Delete this client? Vehicles are removed too; requests and jobs are kept but unlinked.'`

- [ ] **Step 3: Dashboard — Open jobs**

In `src/admin/pages/DashboardPage.tsx`:
- Add `import { OPEN_STATUSES } from '../lib/jobs';`
- Replace the `CountFilter` type and the filter branch in `useCount`:

```ts
type CountFilter = [column: string, op: 'eq' | 'is' | 'in', value: unknown];
```

```ts
      if (filter) {
        const [col, op, val] = filter;
        q =
          op === 'is'
            ? q.is(col, val as never)
            : op === 'in'
              ? q.in(col, val as never[])
              : q.eq(col, val as never);
      }
```

- In `DashboardPage`, after `const newReqs = …` add:

```ts
  const openJobs = useCount('open', 'job', ['status', 'in', [...OPEN_STATUSES]]);
```

- Change the grid class to `grid gap-3 sm:grid-cols-3 lg:grid-cols-6` and add after the "New requests" stat:

```tsx
        <Stat label="Open jobs" value={openJobs.data} to="/admin/jobs" />
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run lint && npm run test` → green.

Manual:
1. A request **not** converted: Job card says "Convert to a client first…". Convert → **Start job** appears → it opens New job prefilled (client, vehicle, complaint; request name in the title) → Check in vehicle.
2. Back on the request: "Open job PP-…" links to it. The request's status is unchanged.
3. Complete that job in Wrap-up → the request now shows **completed** (Task 10 item 3).
4. Client page lists the job under the vehicle's heading.
5. Dashboard "Open jobs" count matches the Jobs list's Open filter and links to it.

- [ ] **Step 5: Commit**

```bash
git add src/admin/pages/RequestDetailPage.tsx src/admin/pages/ClientDetailPage.tsx src/admin/pages/DashboardPage.tsx
git commit -m "feat(jobs): start jobs from requests, per-vehicle history on clients, open-jobs stat

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Owner guide, status docs, full verification

**Files:**
- Modify: `docs/owner-guide.md` (new section after "## Confirming a booking", before "## Editing the website")
- Modify: `docs/project-state.md` (change-log table — add a row at the end), `docs/pick-up-here.md` (status table + remaining work)

- [ ] **Step 1: Owner guide section**

Insert into `docs/owner-guide.md` before `## Editing the website`:

```markdown
## Recording a job

**Jobs** in the menu is where you log each car you work on, from arrival to hand-back.

1. **Start the job.** From a request: open it, **Convert to client** if you haven't, then
   **Start job**. For a walk-in: **Jobs → New job**, pick the client and vehicle (or
   **+ Add a vehicle**). Each job gets a number like `PP-2026-0042`.
2. **Check-in tab.** Odometer, the customer's complaint in your words, and photos of the
   car as it arrived. Tick **Client agrees to this job being shown on our website** only
   if they said yes.
3. **Diagnosis tab.** Add each problem you find, explain it, and add **before** photos.
4. **Repair tab.** For each problem: what you did, the outcome (**Fixed**, **Deferred** if
   the client chose not to fix it now, or **Not fixed**), **after** photos and the parts
   you used.
5. **Wrap-up tab.** Labour hours and cost, then **Mark completed**. If the job came from a
   request, that request is marked completed too.

Photos: tap **Hide from website** on any photo that shows a number plate, a face or a
home. Location data is removed from every photo automatically when you upload it.

Private — never on the website: the client's name and phone, number plate, odometer,
labour, part quantities and costs, and internal notes.

Jobs don't appear on the website yet — publishing is the next update.
```

- [ ] **Step 2: Status docs**

Append to the change-log table in `docs/project-state.md`:

```markdown
| 2026-09-30 | ADR-0014 accepted (jobs / work orders, pulls P-1/P-2 forward). **J1 built:** `job`/`job_finding`/`job_photo`/`job_part` + numbering/consent/completion triggers + RLS (anon sealed); admin Jobs list, New job (walk-in / from request), job page tabs (check-in, diagnosis, repair, wrap-up); per-vehicle history on Clients; Open-jobs stat; all uploads now strip EXIF/GPS. Nothing public yet. Next: owner checks J1 on staging → plan J2 (publish). | Lead architect (TECHBIGGIEY) |
```

In `docs/pick-up-here.md`, add a row to the "Where things stand" table:

```markdown
| **Jobs (ADR-0014)** | 🟡 **J1 (admin work orders) built** on `feature/jobs-j1`. Next: owner acceptance on staging, then J2 (publish to portfolio) and J3 (review links) — each planned separately. Spec: `docs/superpowers/specs/2026-09-30-jobs-work-orders-design.md`. |
```

- [ ] **Step 3: Full verification**

Run:

```bash
npm run typecheck && npm run lint && npm run test && npm run build
npx supabase db query --linked -f supabase/tests/jobs_j1.sql
```

Expected: all four npm scripts pass (build includes prerender + SEO finalize; the admin chunk is still excluded from prerender); the SQL test reports exactly `ALL_PASSED`.

Also confirm nothing public changed: `git diff design-refresh/public-site --stat -- src/public src/routes.tsx vercel.json supabase/functions` prints nothing.

- [ ] **Step 4: Clean up manual-test data**

Delete the jobs, test client/vehicle and uploaded test photos created during Tasks 6–11 via the admin (Jobs → Wrap-up → Delete job; Clients → Delete client; Website content → Media).

- [ ] **Step 5: Commit**

```bash
git add docs/owner-guide.md docs/project-state.md docs/pick-up-here.md
git commit -m "docs(jobs): owner guide for recording jobs; J1 status

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Hand off**

Use superpowers:finishing-a-development-branch to decide how `feature/jobs-j1` is integrated (it sits on top of the unmerged `design-refresh/public-site` work — the user decides the merge order). Then ask the owner for the J1 acceptance run on staging before J2 is planned.

---

## Spec coverage (J1)

| Spec item | Task |
|---|---|
| §4.1 enums, §4.2 `job`/`job_finding`/`job_photo`/`job_part` | 1 |
| §4.4 job number, consent timestamp, completion side-effects | 1 |
| §4.4 publish guard, consent-revoked unpublish, re-open unpublish | **J2** (need `portfolio_project.job_id`) |
| §4.2 `review_invite`, §4.3 testimonial changes | **J3** |
| §4.3 `portfolio_project.job_id`, §4.5 `job_public`, media policy | **J2** |
| §5.1 routes, §5.2 list, §5.3 starting a job | 6, 11 |
| §5.4 tabs 1–3; tab 4 labour/summary/complete | 7, 8, 9, 10 |
| §5.4 tab 4 review link + owner-entered testimonial | **J3** |
| §5.5 Publish panel | **J2** |
| §5.6 client history, dashboard count | 11 |
| §5.6 portfolio lock/badge, testimonial job link | **J2 / J3** |
| §5.7 EXIF stripping (all uploads) | 3 |
| §7.1 RLS (admin CRUD, anon sealed) | 1 |
| §8 edge cases: delete client keeps job; cancelled jobs kept | 1, 10 |
| §9 tests: anon sealed, trigger behaviour, components, image prep | 1, 2, 3, 5 |
