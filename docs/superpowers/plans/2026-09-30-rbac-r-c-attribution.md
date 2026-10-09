# RBAC R-C — Job activity & attribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every action on a job is recorded with who did it — "Kevin · staff — added 2 after photos · PP-2026-0042 · 2014 Toyota Fielder · 10 min ago" — on the owner's Dashboard and in a new Activity tab on each job.

**Architecture:** One migration (`20261001100000_job_activity.sql`) adds a `job_activity` table written **only** by SECURITY DEFINER `AFTER` triggers on `job`, `job_finding`, `job_photo` and `job_part` through one helper, `log_job_activity()`, which snapshots the actor's display name and role and merges consecutive photo uploads (same person, same job, same stage, within 2 minutes) into one entry with a count. Clients get SELECT only — no insert/update/delete grant — so entries can't be skipped or forged from the browser. The admin gets pure formatting helpers, two query hooks, one presentational `ActivityList`, an Activity tab and a Dashboard card.

**Tech Stack:** Supabase Postgres 17 (SQL migration, RLS, plpgsql triggers) · React 19 + TypeScript + React Router 6.28 · TanStack Query 5 · Tailwind v4 admin UI kit · Vitest + React Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-09-30-rbac-and-invites-design.md` — this plan implements **§4.6 (job activity log)** and the **activity parts of §5** (job Activity section, owner Dashboard "Recent job activity" card). Delivery package **R-C** (spec §9).

## Global Constraints

- **Depends on:** R-B (`2026-09-30-rbac-r-b-permissions.md`) **merged and its migration `20261001090000_rbac_owner_staff.sql` applied live** — this plan's SQL test uses `public.is_staff()`, the staff walk-in insert policy and the owner-only `job_cost`; the UI edits build on R-B's `JobDetailPage.tsx` and `DashboardPage.tsx` (owner-only route). R-A (`2026-09-30-rbac-r-a-invites.md`) must be merged too: invites require a display name, which is what `actor_name` snapshots. `fix/profile-self-promotion` (40dcd3d) is on `main` (required since R-A).
- **Branch:** `feature/rbac-r-c-attribution` from an up-to-date `main`. Never push to `main` directly; open a PR only when the user asks.
- **Only one Supabase project** (`aonpdrqtosmqhmomghca`). `npx supabase db push` changes it live — **STOP and get the user's explicit OK first** (Task 5). Before that the migration is tested by a **rolled-back dry run**: `begin;` + migration + test + `rollback;` in one file under `supabase/.temp/` (git-ignored), run with `npx supabase db query --linked -f <file>`; the test's final `raise exception 'ALL_PASSED'` aborts it; then a read-only query confirms nothing was left behind.
- **Trigger-written only (spec §4.6, §7):** `job_activity` has no INSERT/UPDATE/DELETE grant for `anon` or `authenticated`, and `log_job_activity()` is not executable by them. Only SECURITY DEFINER triggers write it.
- **Actions (exact strings, spec §4.6):** `checked_in`, `status_changed`, `finding_added`, `finding_updated`, `photo_added`, `photo_removed`, `part_added`, `part_removed`, `labour_updated`, `consent_changed`.
- **No costs in the log.** Staff can read activity for jobs they can see; `job_cost` / `job_part_cost` changes are never logged and `detail` never contains a price.
- **Actor snapshot:** `actor_name` = `profile.display_name` (trimmed, non-empty) else `profile.email`; `actor_role` = `owner` / `staff`; `actor_id` = `auth.uid()`, `on delete set null` so history survives removals; all three null = system (migrations, SQL, service role).
- **Photo merge:** consecutive `photo_added` by the same actor on the same job with the same stage within 2 minutes → one entry with `detail.count` incremented and `created_at` moved to the latest upload.
- **Follow existing admin patterns:** `getDb()`, UI kit components, `font-mono` for numbers/IDs/times, `en-KE` + `Africa/Nairobi`.
- **Verification gate for every task that touches code:** `npm run typecheck && npm run lint && npm run test` green and `npx prettier --check <changed src files>` clean before committing. Final task also runs `npm run build`.
- **Commit messages** end with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

## File map

| File | Status | Responsibility |
|---|---|---|
| `supabase/migrations/20261001100000_job_activity.sql` | Create | `job_activity` table, `log_job_activity()`, 4 triggers, RLS + grants |
| `supabase/tests/job_activity.sql` | Create | Rolled-back checks: actor, every action, photo merge, no client writes, cascade |
| `src/shared/supabase/rls.test.ts` | Modify | `job_activity` sealed from anon; read-only for owner and staff |
| `src/admin/lib/activity.ts` + `activity.test.ts` | Create | Row types; `describeActivity`, `actorLabel`, `timeAgo` |
| `src/admin/lib/activityData.ts` | Create | `useJobActivity`, `useRecentActivity` |
| `src/admin/components/ActivityList.tsx` + test | Create | Presentational timeline / feed |
| `src/admin/pages/jobs/ActivityTab.tsx` | Create | Job Activity tab |
| `src/admin/pages/jobs/JobDetailPage.tsx` | Modify | Add the Activity tab |
| `src/admin/pages/DashboardPage.tsx` | Modify | "Recent job activity" card |
| `docs/owner-guide.md`, `docs/pick-up-here.md` | Modify | Where to see who did what |

---

### Task 1: Migration + SQL test (dry run only)

**Files:**
- Create: `supabase/migrations/20261001100000_job_activity.sql`
- Create: `supabase/tests/job_activity.sql`

**Interfaces:**
- Produces (DB): table `public.job_activity (id uuid, job_id uuid, created_at timestamptz, actor_id uuid, actor_name text, actor_role text, action text, detail jsonb)`. `detail` shapes per action (Task 2 formats them):
  - `checked_in` `{ job_number }` · `status_changed` `{ from, to }` (job_status strings) · `finding_added` `{ title }` · `finding_updated` `{ title, outcome }` · `photo_added` `{ stage, count }` · `photo_removed` `{ stage }` · `part_added` `{ name, quantity }` · `part_removed` `{ name }` · `labour_updated` `{ from, to }` (hours, number or null) · `consent_changed` `{ to }` (boolean).
  - PostgREST embed `job_activity … job(job_number, vehicle_label)`.

- [ ] **Step 1: Create the branch**

```bash
git switch main
git pull
ls supabase/migrations/20261001090000_rbac_owner_staff.sql
npx supabase db query --linked "select to_regprocedure('public.is_staff()') as is_staff"
```
Expected: the file exists and `is_staff` is not null (R-B applied live). Otherwise STOP — R-B must be merged and pushed first.

```bash
git switch -c feature/rbac-r-c-attribution
```

- [ ] **Step 2: Write the SQL test**

Create `supabase/tests/job_activity.sql`:

```sql
-- Job activity log (spec §4.6, §8) — checks against the linked project.
-- Run (after the migration is applied):
--   npx supabase db query --linked -f supabase/tests/job_activity.sql
-- Before it is applied, run it as a dry run (see the R-C plan, Task 1).
--
-- One DO block that ends with `raise exception 'ALL_PASSED'`, rolling back everything.
-- PASS = the output error is exactly ALL_PASSED. Anything else = a failed check.
do $$
declare
  owner_id uuid := gen_random_uuid();
  staff_id uuid := gen_random_uuid();
  j uuid; f uuid; p uuid; ph uuid;
  m1 uuid; m2 uuid; m3 uuid; m4 uuid;
  a record;
  cnt integer;
  n integer;
begin
  -- ---------------------------------------------------------------- fixtures (postgres)
  insert into auth.users (id, email, aud, role)
    values (owner_id, 'act-owner@example.test', 'authenticated', 'authenticated'),
           (staff_id, 'act-staff@example.test', 'authenticated', 'authenticated');
  update public.profile set role = 'owner', is_active = true, display_name = 'Owner Test'
    where user_id = owner_id;
  update public.profile set role = 'staff', is_active = true, display_name = 'Kevin Test'
    where user_id = staff_id;
  insert into public.media (storage_path, alt_text) values ('act/1.jpg', '1') returning id into m1;
  insert into public.media (storage_path, alt_text) values ('act/2.jpg', '2') returning id into m2;
  insert into public.media (storage_path, alt_text) values ('act/3.jpg', '3') returning id into m3;
  insert into public.media (storage_path, alt_text) values ('act/4.jpg', '4') returning id into m4;

  -- ---------------------------------------------------------------- as STAFF
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', staff_id, 'role', 'authenticated')::text, true);

  -- 1. Check-in, attributed to the staff member
  insert into public.job (vehicle_label) values ('2014 Toyota Fielder') returning id into j;
  select * into a from public.job_activity where job_id = j and action = 'checked_in';
  if not found then raise exception 'FAIL no checked_in entry'; end if;
  if a.actor_id is distinct from staff_id
     or a.actor_name is distinct from 'Kevin Test'
     or a.actor_role is distinct from 'staff' then
    raise exception 'FAIL wrong actor: % / % / %', a.actor_id, a.actor_name, a.actor_role;
  end if;
  if a.detail ->> 'job_number' is null then raise exception 'FAIL checked_in has no job_number'; end if;

  -- 2. Status change
  update public.job set status = 'diagnosing' where id = j;
  select * into a from public.job_activity where job_id = j and action = 'status_changed';
  if a.detail ->> 'from' is distinct from 'checked_in' or a.detail ->> 'to' is distinct from 'diagnosing' then
    raise exception 'FAIL status detail: %', a.detail;
  end if;

  -- 3. Findings: added, updated; a reorder is not logged
  insert into public.job_finding (job_id, title) values (j, 'Worn pads') returning id into f;
  update public.job_finding set outcome = 'fixed' where id = f;
  update public.job_finding set display_order = 5 where id = f;
  select count(*) into cnt from public.job_activity
    where job_id = j and action = 'finding_added' and detail ->> 'title' = 'Worn pads';
  if cnt <> 1 then raise exception 'FAIL finding_added count %', cnt; end if;
  select count(*) into cnt from public.job_activity where job_id = j and action = 'finding_updated';
  if cnt <> 1 then raise exception 'FAIL finding_updated count % (reorder logged?)', cnt; end if;
  select * into a from public.job_activity where job_id = j and action = 'finding_updated';
  if a.detail ->> 'outcome' is distinct from 'fixed' then raise exception 'FAIL finding outcome %', a.detail; end if;

  -- 4. Three after-photos in a row → ONE entry with count 3
  insert into public.job_photo (job_id, finding_id, media_id, stage) values (j, f, m1, 'repair');
  insert into public.job_photo (job_id, finding_id, media_id, stage) values (j, f, m2, 'repair');
  insert into public.job_photo (job_id, finding_id, media_id, stage) values (j, f, m3, 'repair');
  select count(*), max((detail ->> 'count')::int) into cnt, n
    from public.job_activity where job_id = j and action = 'photo_added';
  if cnt <> 1 or n <> 3 then raise exception 'FAIL photo merge: % entries, count %', cnt, n; end if;

  --    …a different stage starts a new entry
  insert into public.job_photo (job_id, media_id, stage) values (j, m4, 'diagnosis') returning id into ph;
  select count(*) into cnt from public.job_activity where job_id = j and action = 'photo_added';
  if cnt <> 2 then raise exception 'FAIL new stage did not start a new entry (%)', cnt; end if;

  -- 5. Photo removed
  delete from public.job_photo where id = ph;
  select count(*) into cnt from public.job_activity
    where job_id = j and action = 'photo_removed' and detail ->> 'stage' = 'diagnosis';
  if cnt <> 1 then raise exception 'FAIL photo_removed count %', cnt; end if;

  -- 6. Parts (name + quantity only — never a cost)
  insert into public.job_part (job_id, name, quantity) values (j, 'Brake pads', 2) returning id into p;
  delete from public.job_part where id = p;
  select * into a from public.job_activity where job_id = j and action = 'part_added';
  if a.detail ->> 'name' is distinct from 'Brake pads' or (a.detail ->> 'quantity')::numeric <> 2 then
    raise exception 'FAIL part_added detail %', a.detail;
  end if;
  if a.detail ? 'cost_kes' then raise exception 'FAIL a cost leaked into the log'; end if;
  select count(*) into cnt from public.job_activity where job_id = j and action = 'part_removed';
  if cnt <> 1 then raise exception 'FAIL part_removed count %', cnt; end if;

  -- 7. Labour hours + consent
  update public.job set labour_hours = 1.5 where id = j;
  select * into a from public.job_activity where job_id = j and action = 'labour_updated';
  if (a.detail ->> 'to')::numeric <> 1.5 then raise exception 'FAIL labour detail %', a.detail; end if;
  update public.job set public_consent = true where id = j;
  select * into a from public.job_activity where job_id = j and action = 'consent_changed';
  if a.detail ->> 'to' is distinct from 'true' then raise exception 'FAIL consent detail %', a.detail; end if;

  -- 8. Staff read the log but can't write it in any way
  select count(*) into cnt from public.job_activity where job_id = j;
  if cnt < 10 then raise exception 'FAIL staff sees only % entries', cnt; end if;
  begin
    insert into public.job_activity (job_id, action) values (j, 'checked_in');
    raise exception 'FAIL staff inserted activity';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.job_activity set actor_name = 'forged' where job_id = j;
    raise exception 'FAIL staff edited activity';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.job_activity where job_id = j;
    raise exception 'FAIL staff deleted activity';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.log_job_activity(j, 'checked_in', '{}'::jsonb);
    raise exception 'FAIL staff called log_job_activity';
  exception when insufficient_privilege then null;
  end;

  -- ---------------------------------------------------------------- as OWNER
  perform set_config('request.jwt.claims',
    json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);

  -- 9. Owner actions are attributed to the owner
  update public.job set status = 'in_repair' where id = j;
  select * into a from public.job_activity
    where job_id = j and action = 'status_changed' order by created_at desc limit 1;
  if a.actor_role is distinct from 'owner' or a.actor_name is distinct from 'Owner Test' then
    raise exception 'FAIL owner attribution: % / %', a.actor_name, a.actor_role;
  end if;

  -- 10. Deleting a job that still has photos and parts works and clears its log
  insert into public.job_part (job_id, name) values (j, 'Oil filter');
  delete from public.job where id = j;

  -- ---------------------------------------------------------------- system (postgres, no user)
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);

  select count(*) into cnt from public.job_activity where job_id = j;
  if cnt <> 0 then raise exception 'FAIL log not cleared with the job (%)', cnt; end if;

  -- 11. System writes have no actor
  insert into public.job (vehicle_label) values ('System job') returning id into j;
  select * into a from public.job_activity where job_id = j and action = 'checked_in';
  if a.actor_id is not null or a.actor_name is not null or a.actor_role is not null then
    raise exception 'FAIL system entry has an actor';
  end if;

  raise exception 'ALL_PASSED';
end $$;
```

- [ ] **Step 3: Run it against the live schema to see it fail**

Run: `npx supabase db query --linked -f supabase/tests/job_activity.sql`
Expected: an error that is NOT `ALL_PASSED` — `relation "public.job_activity" does not exist`. The block rolls back.

- [ ] **Step 4: Write the migration**

Create `supabase/migrations/20261001100000_job_activity.sql`:

```sql
-- Platinum Point Automotive Engineering — RBAC R-C: job activity log (attribution).
-- Spec: docs/superpowers/specs/2026-09-30-rbac-and-invites-design.md §4.6.
--
-- Every action on a job is recorded with WHO did it. Rows are written only by the
-- SECURITY DEFINER triggers below — clients have SELECT only — so entries can't be
-- skipped or forged from the browser. Costs are never logged (staff can read this).

create table public.job_activity (
  id         uuid primary key default gen_random_uuid(),
  job_id     uuid not null references public.job (id) on delete cascade,
  -- clock_timestamp(), not now(): entries written inside one transaction keep their
  -- real order, which the photo-merge rule depends on.
  created_at timestamptz not null default clock_timestamp(),
  actor_id   uuid references auth.users (id) on delete set null,   -- null = system
  actor_name text,                                                -- snapshot
  actor_role text check (actor_role is null or actor_role in ('owner', 'staff')),
  action     text not null check (action in (
               'checked_in', 'status_changed', 'finding_added', 'finding_updated',
               'photo_added', 'photo_removed', 'part_added', 'part_removed',
               'labour_updated', 'consent_changed')),
  detail     jsonb not null default '{}'::jsonb
);
create index job_activity_job_idx    on public.job_activity (job_id, created_at desc);
create index job_activity_recent_idx on public.job_activity (created_at desc);

-- ---------------------------------------------------------------------------
-- The one writer
-- ---------------------------------------------------------------------------
create or replace function public.log_job_activity(p_job_id uuid, p_action text, p_detail jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid      uuid := auth.uid();
  who_name text;
  who_role text;
  latest   public.job_activity%rowtype;
begin
  -- A cascaded job delete fires child triggers after the job row is gone: nothing to log
  -- (and the insert would violate the foreign key).
  if not exists (select 1 from public.job where id = p_job_id) then
    return;
  end if;

  if uid is not null then
    select coalesce(nullif(btrim(p.display_name), ''), p.email), p.role
      into who_name, who_role
      from public.profile p
      where p.user_id = uid;
  end if;

  -- Consecutive uploads by the same person, same job, same stage, within 2 minutes
  -- → one entry with a count ("added 3 after photos").
  if p_action = 'photo_added' then
    select * into latest
      from public.job_activity a
      where a.job_id = p_job_id
      order by a.created_at desc
      limit 1;
    if found
       and latest.action = 'photo_added'
       and latest.actor_id is not distinct from uid
       and (latest.detail ->> 'stage') is not distinct from (p_detail ->> 'stage')
       and latest.created_at > clock_timestamp() - interval '2 minutes'
    then
      update public.job_activity
        set detail = jsonb_set(
              latest.detail, '{count}',
              to_jsonb(coalesce((latest.detail ->> 'count')::int, 1) + 1)),
            created_at = clock_timestamp()
        where id = latest.id;
      return;
    end if;
  end if;

  insert into public.job_activity (job_id, actor_id, actor_name, actor_role, action, detail)
    values (p_job_id, uid, who_name, who_role, p_action, coalesce(p_detail, '{}'::jsonb));
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers (SECURITY DEFINER so they can call the writer; auth.uid() still reads the
-- caller's JWT claims)
-- ---------------------------------------------------------------------------
create or replace function public.job_activity_on_job()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_job_activity(new.id, 'checked_in',
      jsonb_build_object('job_number', new.job_number));
    return null;
  end if;
  if new.status is distinct from old.status then
    perform public.log_job_activity(new.id, 'status_changed',
      jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  if new.labour_hours is distinct from old.labour_hours then
    perform public.log_job_activity(new.id, 'labour_updated',
      jsonb_build_object('from', old.labour_hours, 'to', new.labour_hours));
  end if;
  if new.public_consent is distinct from old.public_consent then
    perform public.log_job_activity(new.id, 'consent_changed',
      jsonb_build_object('to', new.public_consent));
  end if;
  return null;
end;
$$;

create trigger job_activity_log
  after insert or update on public.job
  for each row execute function public.job_activity_on_job();

create or replace function public.job_activity_on_finding()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_job_activity(new.job_id, 'finding_added',
      jsonb_build_object('title', new.title));
  elsif (new.title, new.diagnosis, new.fix, new.outcome)
        is distinct from (old.title, old.diagnosis, old.fix, old.outcome) then
    -- display_order changes (reordering) are deliberately not logged.
    perform public.log_job_activity(new.job_id, 'finding_updated',
      jsonb_build_object('title', new.title, 'outcome', new.outcome));
  end if;
  return null;
end;
$$;

create trigger job_finding_activity_log
  after insert or update on public.job_finding
  for each row execute function public.job_activity_on_finding();

create or replace function public.job_activity_on_photo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_job_activity(new.job_id, 'photo_added',
      jsonb_build_object('stage', new.stage, 'count', 1));
  else
    perform public.log_job_activity(old.job_id, 'photo_removed',
      jsonb_build_object('stage', old.stage));
  end if;
  return null;
end;
$$;

create trigger job_photo_activity_log
  after insert or delete on public.job_photo
  for each row execute function public.job_activity_on_photo();

create or replace function public.job_activity_on_part()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_job_activity(new.job_id, 'part_added',
      jsonb_build_object('name', new.name, 'quantity', new.quantity));
  else
    perform public.log_job_activity(old.job_id, 'part_removed',
      jsonb_build_object('name', old.name));
  end if;
  return null;
end;
$$;

create trigger job_part_activity_log
  after insert or delete on public.job_part
  for each row execute function public.job_activity_on_part();

-- ---------------------------------------------------------------------------
-- RLS + grants: read-only for admins; nobody writes except the triggers above
-- ---------------------------------------------------------------------------
alter table public.job_activity enable row level security;

create policy "job_activity: admins read" on public.job_activity
  for select to authenticated
  using (
    public.is_owner()
    or (public.is_staff() and exists (select 1 from public.job j where j.id = job_activity.job_id))
  );

revoke all on public.job_activity from anon, authenticated;
grant select on public.job_activity to authenticated;

revoke execute on function public.log_job_activity(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.job_activity_on_job()     from public, anon, authenticated;
revoke execute on function public.job_activity_on_finding() from public, anon, authenticated;
revoke execute on function public.job_activity_on_photo()   from public, anon, authenticated;
revoke execute on function public.job_activity_on_part()    from public, anon, authenticated;
```

- [ ] **Step 5: Dry-run the migration with the new test and the existing ones (rolled back)**

```bash
M=supabase/migrations/20261001100000_job_activity.sql
mkdir -p supabase/.temp
for T in job_activity rbac jobs_j1 profile_guard; do
  { echo 'begin;'; cat "$M"; cat "supabase/tests/$T.sql"; echo 'rollback;'; } > "supabase/.temp/dryrun_$T.sql"
  echo "== $T"; npx supabase db query --linked -f "supabase/.temp/dryrun_$T.sql"
done
```
Expected: all four print an error whose message is exactly `ALL_PASSED` (the existing tests prove the new triggers don't break job CRUD, deletes or the RBAC matrix). Any `FAIL …` → fix the migration and re-run.

- [ ] **Step 6: Confirm nothing was left behind (read-only)**

```bash
npx supabase db query --linked "select to_regclass('public.job_activity') as job_activity, to_regprocedure('public.log_job_activity(uuid,text,jsonb)') as writer"
```
Expected: both null.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20261001100000_job_activity.sql supabase/tests/job_activity.sql
git commit -m "feat(db): trigger-written job activity log with actor snapshot (RBAC R-C)

Not applied yet — dry-run tested with job_activity.sql, rbac.sql, jobs_j1.sql and
profile_guard.sql (all ALL_PASSED inside a rolled-back transaction).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Activity formatting helpers

**Files:**
- Create: `src/admin/lib/activity.ts`
- Test: `src/admin/lib/activity.test.ts`

**Interfaces:**
- Consumes: `jobStatusLabel`, `JobStatus`, `PhotoStage` from `src/admin/lib/jobs.ts`; detail shapes from Task 1.
- Produces:
  - `ACTIVITY_ACTIONS` (readonly tuple of the 10 action strings), `type ActivityAction`
  - `interface JobActivity { id: string; job_id: string; created_at: string; actor_id: string | null; actor_name: string | null; actor_role: 'owner' | 'staff' | null; action: ActivityAction; detail: Record<string, unknown> }`
  - `interface JobActivityWithJob extends JobActivity { job: { job_number: string; vehicle_label: string } | null }`
  - `describeActivity(a: Pick<JobActivity, 'action' | 'detail'>): string`
  - `actorLabel(a: Pick<JobActivity, 'actor_name' | 'actor_role'>): string`
  - `timeAgo(iso: string, now?: Date): string`

- [ ] **Step 1: Write the failing test**

Create `src/admin/lib/activity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { actorLabel, describeActivity, timeAgo, type JobActivity } from './activity';

const d = (action: JobActivity['action'], detail: Record<string, unknown> = {}) =>
  describeActivity({ action, detail });

describe('describeActivity', () => {
  it('describes every action', () => {
    expect(d('checked_in', { job_number: 'PP-2026-0042' })).toBe('checked in the vehicle');
    expect(d('status_changed', { from: 'checked_in', to: 'diagnosing' })).toBe(
      'moved the job from Checked in to Diagnosing',
    );
    expect(d('status_changed', { to: 'completed' })).toBe('moved the job to Completed');
    expect(d('finding_added', { title: 'Worn pads' })).toBe('added problem “Worn pads”');
    expect(d('finding_updated', { title: 'Worn pads', outcome: 'fixed' })).toBe(
      'updated problem “Worn pads” — fixed',
    );
    expect(d('finding_updated', { title: 'Worn pads', outcome: 'pending' })).toBe(
      'updated problem “Worn pads”',
    );
    expect(d('photo_added', { stage: 'repair', count: 2 })).toBe('added 2 after photos');
    expect(d('photo_added', { stage: 'check_in', count: 1 })).toBe('added 1 check-in photo');
    expect(d('photo_added', { stage: 'diagnosis' })).toBe('added 1 before photo');
    expect(d('photo_removed', { stage: 'repair' })).toBe('removed an after photo');
    expect(d('photo_removed', { stage: 'diagnosis' })).toBe('removed a before photo');
    expect(d('part_added', { name: 'Brake pads', quantity: 2 })).toBe('added part Brake pads ×2');
    expect(d('part_removed', { name: 'Brake pads' })).toBe('removed part Brake pads');
    expect(d('labour_updated', { from: null, to: 1.5 })).toBe('set labour to 1.5 h');
    expect(d('labour_updated', { from: 2, to: null })).toBe('cleared the labour hours');
    expect(d('consent_changed', { to: true })).toBe('recorded the customer’s consent to publish');
    expect(d('consent_changed', { to: false })).toBe('withdrew consent to publish');
  });
});

describe('actorLabel', () => {
  it('shows name · role, or System when nobody was signed in', () => {
    expect(actorLabel({ actor_name: 'Kevin', actor_role: 'staff' })).toBe('Kevin · staff');
    expect(actorLabel({ actor_name: 'Paul', actor_role: null })).toBe('Paul');
    expect(actorLabel({ actor_name: null, actor_role: null })).toBe('System');
  });
});

describe('timeAgo', () => {
  const now = new Date('2026-10-01T10:00:00Z');
  it('reads naturally for recent times', () => {
    expect(timeAgo('2026-10-01T09:59:30Z', now)).toBe('just now');
    expect(timeAgo('2026-10-01T09:50:00Z', now)).toBe('10 min ago');
    expect(timeAgo('2026-10-01T07:00:00Z', now)).toBe('3 h ago');
    expect(timeAgo('2026-09-29T10:00:00Z', now)).toBe('2 d ago');
  });
  it('falls back to a date after a week', () => {
    expect(timeAgo('2026-09-01T10:00:00Z', now)).toMatch(/2026/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/admin/lib/activity.test.ts`
Expected: FAIL — `./activity` does not exist.

- [ ] **Step 3: Write the helpers**

Create `src/admin/lib/activity.ts`:

```ts
/**
 * Job activity (who did what) — row types + pure formatting.
 * Spec: docs/superpowers/specs/2026-09-30-rbac-and-invites-design.md §4.6, §5.
 */
import { jobStatusLabel, type JobStatus, type PhotoStage } from './jobs';

export const ACTIVITY_ACTIONS = [
  'checked_in',
  'status_changed',
  'finding_added',
  'finding_updated',
  'photo_added',
  'photo_removed',
  'part_added',
  'part_removed',
  'labour_updated',
  'consent_changed',
] as const;
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export interface JobActivity {
  id: string;
  job_id: string;
  created_at: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: 'owner' | 'staff' | null;
  action: ActivityAction;
  detail: Record<string, unknown>;
}

export interface JobActivityWithJob extends JobActivity {
  job: { job_number: string; vehicle_label: string } | null;
}

const PHOTO_WORD: Record<PhotoStage, string> = {
  check_in: 'check-in',
  diagnosis: 'before',
  repair: 'after',
};

const OUTCOME_WORD: Record<string, string> = {
  fixed: 'fixed',
  deferred: 'deferred',
  not_fixed: 'not fixed',
};

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown): number | null => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return null;
};

/** "added 2 after photos", "moved the job from Checked in to Diagnosing", … */
export function describeActivity(a: Pick<JobActivity, 'action' | 'detail'>): string {
  const d = a.detail ?? {};
  switch (a.action) {
    case 'checked_in':
      return 'checked in the vehicle';
    case 'status_changed': {
      const to = jobStatusLabel[d.to as JobStatus] ?? str(d.to);
      const from = jobStatusLabel[d.from as JobStatus];
      return from ? `moved the job from ${from} to ${to}` : `moved the job to ${to}`;
    }
    case 'finding_added':
      return `added problem “${str(d.title)}”`;
    case 'finding_updated': {
      const outcome = OUTCOME_WORD[str(d.outcome)];
      return `updated problem “${str(d.title)}”${outcome ? ` — ${outcome}` : ''}`;
    }
    case 'photo_added': {
      const n = num(d.count) ?? 1;
      const word = PHOTO_WORD[d.stage as PhotoStage];
      return `added ${n} ${word ? `${word} ` : ''}photo${n === 1 ? '' : 's'}`;
    }
    case 'photo_removed': {
      const word = PHOTO_WORD[d.stage as PhotoStage];
      if (!word) return 'removed a photo';
      return `removed ${/^[aeiou]/.test(word) ? 'an' : 'a'} ${word} photo`;
    }
    case 'part_added': {
      const q = num(d.quantity);
      return `added part ${str(d.name)}${q !== null ? ` ×${q}` : ''}`;
    }
    case 'part_removed':
      return `removed part ${str(d.name)}`;
    case 'labour_updated': {
      const hours = num(d.to);
      return hours === null ? 'cleared the labour hours' : `set labour to ${hours} h`;
    }
    case 'consent_changed':
      return d.to === true
        ? 'recorded the customer’s consent to publish'
        : 'withdrew consent to publish';
  }
}

/** "Kevin · staff"; "System" for entries written with nobody signed in. */
export function actorLabel(a: Pick<JobActivity, 'actor_name' | 'actor_role'>): string {
  if (!a.actor_name) return 'System';
  return a.actor_role ? `${a.actor_name} · ${a.actor_role}` : a.actor_name;
}

export function timeAgo(iso: string, now: Date = new Date()): string {
  const seconds = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(iso).toLocaleDateString('en-KE', {
    dateStyle: 'medium',
    timeZone: 'Africa/Nairobi',
  });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/admin/lib/activity.test.ts`
Expected: PASS.

- [ ] **Step 5: Gate + commit**

```bash
npm run typecheck && npm run lint && npm run test
npx prettier --check src/admin/lib/activity.ts src/admin/lib/activity.test.ts
git add src/admin/lib/activity.ts src/admin/lib/activity.test.ts
git commit -m "feat(activity): describe job activity entries in plain words

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Activity list component + data hooks

**Files:**
- Create: `src/admin/components/ActivityList.tsx`
- Test: `src/admin/components/ActivityList.test.tsx`
- Create: `src/admin/lib/activityData.ts`

**Interfaces:**
- Consumes: `JobActivity`, `JobActivityWithJob`, `describeActivity`, `actorLabel`, `timeAgo` (Task 2); `getDb()`.
- Produces:
  - `ActivityList({ items, showJob?, now? }: { items: (JobActivity & { job?: JobActivityWithJob['job'] })[]; showJob?: boolean; now?: Date })`
  - `useJobActivity(jobId: string)` → `UseQueryResult<JobActivity[]>` (newest first, max 200)
  - `useRecentActivity(limit?: number)` → `UseQueryResult<JobActivityWithJob[]>` (newest first, default 20, refetch every 60 s)

- [ ] **Step 1: Write the failing test**

Create `src/admin/components/ActivityList.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ActivityList } from './ActivityList';
import type { JobActivityWithJob } from '../lib/activity';

const now = new Date('2026-10-01T10:00:00Z');
const entry: JobActivityWithJob = {
  id: 'a1',
  job_id: 'j1',
  created_at: '2026-10-01T09:50:00Z',
  actor_id: 'u1',
  actor_name: 'Kevin',
  actor_role: 'staff',
  action: 'photo_added',
  detail: { stage: 'repair', count: 2 },
  job: { job_number: 'PP-2026-0042', vehicle_label: '2014 Toyota Fielder' },
};

function renderList(props: Parameters<typeof ActivityList>[0]) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ActivityList {...props} />
    </MemoryRouter>,
  );
}

describe('<ActivityList />', () => {
  it('dashboard feed: who, what, which job, when — linking to the job', () => {
    renderList({ items: [entry], showJob: true, now });
    expect(screen.getByText('Kevin · staff')).toBeInTheDocument();
    expect(screen.getByText(/added 2 after photos/)).toBeInTheDocument();
    expect(screen.getByText(/PP-2026-0042 · 2014 Toyota Fielder/)).toBeInTheDocument();
    expect(screen.getByText('10 min ago')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/admin/jobs/j1');
  });

  it('job timeline: no job reference and no links', () => {
    renderList({ items: [entry], now });
    expect(screen.queryByText(/PP-2026-0042/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('says so when there is nothing yet', () => {
    renderList({ items: [] });
    expect(screen.getByText('No activity yet.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/admin/components/ActivityList.test.tsx`
Expected: FAIL — `./ActivityList` does not exist.

- [ ] **Step 3: Create the component**

Create `src/admin/components/ActivityList.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from './ui';
import {
  actorLabel,
  describeActivity,
  timeAgo,
  type JobActivity,
  type JobActivityWithJob,
} from '../lib/activity';

type Item = JobActivity & { job?: JobActivityWithJob['job'] };

const row =
  'flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-4 py-2.5 text-sm';

/**
 * "Kevin · staff — added 2 after photos · PP-2026-0042 · 2014 Toyota Fielder · 10 min ago".
 * `showJob` (dashboard feed) adds the job reference and links each entry to its job.
 */
export function ActivityList({
  items,
  showJob = false,
  now,
}: {
  items: Item[];
  showJob?: boolean;
  now?: Date;
}) {
  if (items.length === 0) return <EmptyState>No activity yet.</EmptyState>;
  return (
    <ul className="divide-y divide-[color:var(--color-line)]">
      {items.map((a) => {
        const body: ReactNode = (
          <>
            <span className="font-semibold text-[color:var(--color-ink)]">{actorLabel(a)}</span>
            <span className="text-[color:var(--color-muted)]">— {describeActivity(a)}</span>
            {showJob && a.job && (
              <span className="font-mono text-xs text-steel">
                · {a.job.job_number} · {a.job.vehicle_label}
              </span>
            )}
            <span className="ml-auto font-mono text-[10px] text-steel">
              {timeAgo(a.created_at, now)}
            </span>
          </>
        );
        return (
          <li key={a.id}>
            {showJob ? (
              <Link
                to={`/admin/jobs/${a.job_id}`}
                className={`${row} hover:bg-[color:var(--color-ground)]`}
              >
                {body}
              </Link>
            ) : (
              <div className={row}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 4: Create the data hooks**

Create `src/admin/lib/activityData.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { getDb } from './db';
import type { JobActivity, JobActivityWithJob } from './activity';

// staleTime 0: the log is written by DB triggers on other mutations, so refetch
// whenever the Activity tab or the Dashboard mounts instead of trusting a cache.

export function useJobActivity(jobId: string) {
  return useQuery({
    queryKey: ['job-activity', 'job', jobId],
    staleTime: 0,
    queryFn: async (): Promise<JobActivity[]> => {
      const { data, error } = await getDb()
        .from('job_activity')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as JobActivity[];
    },
  });
}

/** Owner Dashboard feed (spec §5): the latest entries across all jobs. */
export function useRecentActivity(limit = 20) {
  return useQuery({
    queryKey: ['job-activity', 'recent', limit],
    staleTime: 0,
    refetchInterval: 60_000,
    queryFn: async (): Promise<JobActivityWithJob[]> => {
      const { data, error } = await getDb()
        .from('job_activity')
        .select('*, job(job_number, vehicle_label)')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as JobActivityWithJob[];
    },
  });
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run src/admin/components/ActivityList.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Gate + commit**

```bash
npm run typecheck && npm run lint && npm run test
npx prettier --check src/admin/components/ActivityList.tsx src/admin/components/ActivityList.test.tsx src/admin/lib/activityData.ts
git add src/admin/components/ActivityList.tsx src/admin/components/ActivityList.test.tsx src/admin/lib/activityData.ts
git commit -m "feat(activity): activity list component and query hooks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Activity tab + Dashboard feed + live RLS checks

**Files:**
- Create: `src/admin/pages/jobs/ActivityTab.tsx`
- Modify: `src/admin/pages/jobs/JobDetailPage.tsx` (`TABS`, imports, tab panel)
- Modify: `src/admin/pages/DashboardPage.tsx`
- Modify: `src/shared/supabase/rls.test.ts`

**Interfaces:**
- Consumes: `ActivityList` (Task 3), `useJobActivity`, `useRecentActivity` (Task 3); `JobDetailPage` as left by R-B Task 6.
- Produces: `ActivityTab({ job }: { job: Pick<JobWithRefs, 'id'> })`; tab key `activity` (`/admin/jobs/:id?tab=activity`).

- [ ] **Step 1: Create the tab**

Create `src/admin/pages/jobs/ActivityTab.tsx`:

```tsx
import { Card, Spinner } from '../../components/ui';
import { ActivityList } from '../../components/ActivityList';
import { useJobActivity } from '../../lib/activityData';
import type { JobWithRefs } from '../../lib/jobs';

/** Who did what on this job (spec §5). Owner and staff both see it. */
export function ActivityTab({ job }: { job: Pick<JobWithRefs, 'id'> }) {
  const q = useJobActivity(job.id);
  if (q.isLoading) return <Spinner />;
  if (q.isError) return <p className="text-sm text-signal">{(q.error as Error).message}</p>;
  return (
    <Card className="p-0">
      <ActivityList items={q.data ?? []} />
    </Card>
  );
}
```

- [ ] **Step 2: Add it to the job page**

In `src/admin/pages/jobs/JobDetailPage.tsx`:

1. Add the import after `import { useJob } from '../../lib/jobData';`:
```tsx
import { ActivityTab } from './ActivityTab';
```
2. In `TABS`, after `{ key: 'wrap-up', label: 'Wrap-up' },` add:
```tsx
  { key: 'activity', label: 'Activity' },
```
3. In the tab panel, after `{tab === 'wrap-up' && <WrapUpTab job={job} />}` add:
```tsx
        {tab === 'activity' && <ActivityTab job={job} />}
```

- [ ] **Step 3: Dashboard card**

In `src/admin/pages/DashboardPage.tsx`:

1. Add imports after `import { useRequests } from '../lib/requests';`:
```tsx
import { useRecentActivity } from '../lib/activityData';
import { ActivityList } from '../components/ActivityList';
```
2. In `DashboardPage`, after `const recent = useRequests({ status: 'all', type: 'all', search: '' });` add:
```tsx
  const activity = useRecentActivity(20);
```
3. Insert this block between the stats grid's closing `</div>` and the `<div>` that starts with `<h2 className="mb-3 font-semibold text-[color:var(--color-ink)]">Recent requests</h2>`:
```tsx
      <div>
        <h2 className="mb-3 font-semibold text-[color:var(--color-ink)]">Recent job activity</h2>
        {activity.isLoading ? (
          <Spinner />
        ) : activity.isError ? (
          <p className="text-sm text-signal">{(activity.error as Error).message}</p>
        ) : (
          <Card className="p-0">
            <ActivityList items={activity.data ?? []} showJob />
          </Card>
        )}
      </div>
```

- [ ] **Step 4: Live RLS checks**

In `src/shared/supabase/rls.test.ts`:

1. In the anon describe, after the `'CANNOT read the job cost tables (RBAC)'` test, add:
```ts
  it('CANNOT read the job activity log (RBAC R-C)', async () => {
    const { error } = await db.from('job_activity').select('*').limit(1);
    expect(error?.code).toBe('42501');
  });
```
2. In the `'RLS — authenticated admin'` describe (owner), after `'owner can read the job cost tables (RBAC)'`, add:
```ts
  it('owner reads the activity log but cannot write it (RBAC R-C)', async () => {
    const read = await admin.from('job_activity').select('id').limit(1);
    expect(read.error).toBeNull();
    const write = await admin
      .from('job_activity')
      .insert({ job_id: '00000000-0000-0000-0000-000000000000', action: 'checked_in' });
    expect(write.error?.code).toBe('42501');
  });
```
3. In the `'RLS — authenticated staff (RBAC)'` describe, after `'cannot create a client'`, add:
```ts
  it('reads the activity log but cannot write it (RBAC R-C)', async () => {
    const read = await staff.from('job_activity').select('id').limit(1);
    expect(read.error).toBeNull();
    const write = await staff
      .from('job_activity')
      .insert({ job_id: '00000000-0000-0000-0000-000000000000', action: 'checked_in' });
    expect(write.error?.code).toBe('42501');
  });
```
(With `.env.local` present, the anon check fails until Task 5's push; that's expected.)

- [ ] **Step 5: Gate + commit**

```bash
npm run typecheck && npm run lint && npm run test
npx prettier --check src/admin/pages/jobs/ActivityTab.tsx src/admin/pages/jobs/JobDetailPage.tsx src/admin/pages/DashboardPage.tsx src/shared/supabase/rls.test.ts
git add src/admin/pages/jobs/ActivityTab.tsx src/admin/pages/jobs/JobDetailPage.tsx src/admin/pages/DashboardPage.tsx src/shared/supabase/rls.test.ts
git commit -m "feat(activity): job Activity tab and owner dashboard feed

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: STOP — apply live and verify

**Files:** none (live changes + checks).

- [ ] **Step 1: STOP — ask for the push**

Tell the user: "R-C is ready to apply `20261001100000_job_activity.sql` to the live project. It only adds the `job_activity` table, its triggers and read-only policies; existing data is untouched (existing jobs start with an empty history). OK to run `npx supabase db push`?" Wait for an explicit yes.

- [ ] **Step 2: Push**

```bash
npx supabase db push
```
Expected: `Applying migration 20261001100000_job_activity.sql...` then `Finished supabase db push.`

- [ ] **Step 3: SQL tests live**

```bash
for T in job_activity rbac jobs_j1 profile_guard; do echo "== $T"; npx supabase db query --linked -f supabase/tests/$T.sql; done
```
Expected: each prints `ALL_PASSED`.

- [ ] **Step 4: Live RLS suite**

With `TEST_ADMIN_*` (owner) and `TEST_STAFF_*` (staff) exported:
```bash
npx vitest run src/shared/supabase/rls.test.ts
```
Expected: all PASS.

- [ ] **Step 5: Manual check with the user (`npm run dev`, or staging after merge)**

1. As **staff** (phone if possible): open a job → Repair → add 3 after photos in a row → change the status → add a part.
2. The job's **Activity** tab shows, newest first: "Kevin · staff — added part …", "— moved the job from … to …", "— added 3 after photos" (one entry, not three).
3. As **owner**: Dashboard → **Recent job activity** shows the same entries with "· PP-… · <vehicle> · N min ago"; tapping one opens the job.
4. Nothing on either screen shows a price.

Any failure → superpowers:systematic-debugging before changing code.

---

### Task 6: Docs + final gates

**Files:**
- Modify: `docs/owner-guide.md` (`Dashboard` bullet in "Getting around"; end of "## Recording a job")
- Modify: `docs/pick-up-here.md`

- [ ] **Step 1: Owner guide**

In `docs/owner-guide.md`:

1. Replace `- **Dashboard** — the numbers at a glance, and your most recent requests.` with:
```markdown
- **Dashboard** — the numbers at a glance, **recent job activity** (who did what on
  which job, e.g. "Kevin · staff — added 2 after photos"), and your most recent requests.
```
2. At the end of the "## Recording a job" section (just before "## Editing the website"), add:
```markdown
**Who did what:** every job has an **Activity** tab listing each check-in, status
change, problem, photo, part, labour and consent change with the name of the person
who made it and when. Several photos uploaded together show as one line ("added 3
after photos"). Prices are never shown there, so staff can see it too.
```

- [ ] **Step 2: Pick-up-here**

In `docs/pick-up-here.md`, after the RBAC R-B sentence added in R-B (`Staff see Jobs + Schedule only …`), append:
```markdown
Job activity (who did what) is logged by DB triggers into `job_activity`
(migration 20261001100000) and shown on the Dashboard and each job's Activity tab.
```

- [ ] **Step 3: Full gates**

```bash
npm run typecheck && npm run lint && npm run test && npm run build
npx prettier --check src
```
Expected: all green.

- [ ] **Step 4: Commit + hand off**

```bash
git add docs/owner-guide.md docs/pick-up-here.md
git commit -m "docs: job activity / attribution (RBAC R-C)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
Use superpowers:finishing-a-development-branch. Push / open the PR only when the user asks (PR body ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`).

---

## Self-review (spec coverage)

| Spec item | Task |
|---|---|
| §4.6 `job_activity` columns (id, job_id cascade, created_at, actor_id → auth.users null = system, actor_name snapshot, actor_role snapshot, action, detail) | 1 |
| §4.6 the 10 actions | 1 (triggers), 2 (wording) |
| §4.6 written only by AFTER triggers on job / job_finding / job_photo / job_part, security definer, no client grants | 1 (+ `rbac.sql`-style probes in `job_activity.sql` §8) |
| §4.6 photo merge within 2 minutes with a count | 1 |
| §4.6 RLS: owner reads all; staff read entries for jobs they can see | 1 |
| §5 job page Activity section/tab (everyone) | 4 |
| §5 owner Dashboard "Recent job activity" — last 20, "Kevin · staff — added 2 after photos · PP-2026-0042 · 2014 Toyota Fielder · 10 min ago", linking to the job | 2, 3, 4 |
| §7 attribution rows trigger-written only; can't be inserted/edited/deleted by clients | 1, 4 (rls.test) |
| §8 "activity rows are written with the right actor and can't be inserted directly" | 1 |
| §8 manual: owner dashboard shows "<name> · staff — …" | 5 |
