# RBAC R-B — Owner / Staff permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Staff can work on jobs (and see the job schedule) and nothing else — no clients, requests, costs, website content, settings, team or notifications — enforced in Postgres, mirrored in the admin UI.

**Architecture:** One migration (`20261001090000_rbac_owner_staff.sql`) adds `is_staff()`, turns every CRM/CMS "admin all" policy into "owner all", gives staff narrow policies on `job`, `vehicle` and `media`, adds guard triggers (same pattern as `guard_profile_privileges`) so staff can't relink or cancel jobs or relink vehicles, and moves costs into two owner-only tables (`job_cost`, `job_part_cost`) because RLS is per row, not per column. The admin gets a `useRole()` hook, a role-based nav, a `<RequireOwner>` route guard, staff-safe job pages (no client, request, costs, cancel or delete), a staff walk-in check-in form, an owner "link client" control for walk-ins, and a job agenda on the Schedule page.

**Tech Stack:** Supabase Postgres 17 (SQL migrations, RLS, plpgsql triggers) · Deno Edge Functions · React 19 + TypeScript + React Router 6.28 · TanStack Query 5 · Tailwind v4 admin UI kit · Vitest + React Testing Library + user-event (jsdom).

**Spec:** `docs/superpowers/specs/2026-09-30-rbac-and-invites-design.md` — this plan implements **§3, §4.1–4.5 and §5 except the activity pieces** (delivery package **R-B**, spec §9). The job activity log, dashboard feed and job Activity tab are R-C (`2026-09-30-rbac-r-c-attribution.md`).

## Global Constraints

- **Depends on:** R-A (`2026-09-30-rbac-r-a-invites.md`) merged — Task 2 uses `supabase/functions/_shared/caller.ts` (`getCaller`) from R-A, and you need a staff test account created with an R-A invite. Also `fix/profile-self-promotion` (40dcd3d) merged: its migration `20260930140000_guard_profile_privileges.sql` is already applied live, so `supabase db push` refuses to run from a branch that lacks the file. `fix/owner-profile-lookup` (cbdf18a) and `fix/admin-no-access-signout` (fa9ff2c, `NoAccess` component) are already on `main`.
- **Branch:** `feature/rbac-r-b-permissions` from an up-to-date `main`. Never push to `main` directly; open a PR only when the user asks.
- **Only one Supabase project** (`aonpdrqtosmqhmomghca`) serves staging. `npx supabase db push` and `npx supabase functions deploy` change it live — **STOP and get the user's explicit OK first** (Task 10). Before that, the migration is tested only by a **rolled-back dry run**: `begin;` + migration + test + `rollback;` in one file under `supabase/.temp/` (git-ignored), run with `npx supabase db query --linked -f <file>`; the test's final `raise exception 'ALL_PASSED'` aborts the transaction; then a read-only query confirms nothing was left behind.
- **Apply the migration right before merging the PR.** It drops `job.labour_cost_kes` and `job_part.cost_kes`; the currently deployed admin reads them. Push the migration, run the live checks, then merge so Vercel deploys the matching UI within minutes.
- **All permissions are enforced in the database** (spec §7); UI hiding is convenience only. Guard triggers only restrict `current_user = 'authenticated'` callers who are not an active owner; `postgres` / `service_role` (migrations, Edge Functions, SQL tests) are unaffected.
- **Permission matrix (spec §3), verbatim decisions:** staff access = Jobs & job schedule only (D2); staff see vehicle + job details only — no client name/phone, no linked request, **no costs** (D3); staff check in walk-ins from vehicle details alone, owner links a client later; **only the owner deletes** (and cancels) jobs (D5); staff schedule = job schedule only, booking-request Schedule stays owner-only (D6).
- **Staff land on `/admin/jobs`**, nav = Jobs + Schedule only. Owner nav unchanged.
- **Staff photo uploads** keep going through `uploadMedia()` in `src/admin/lib/storage.ts` → `prepareImage()` (EXIF/GPS stripped) → storage `public-media` → `media` row. Storage insert stays `is_admin()`; update/delete become owner-only; read stays admin-only.
- **Follow existing admin patterns:** `getDb()`, UI kit (`Card`, `Button`, `Input`, `Select`, `Labeled`, `Label`, `Badge`, `PageTitle`, `EmptyState`, `Spinner`), `font-mono` for numbers/IDs/dates, `en-KE` + `Africa/Nairobi` dates, `confirm()` for destructive actions.
- **Verification gate for every task that touches code:** `npm run typecheck && npm run lint && npm run test` green and `npx prettier --check <changed src files>` clean before committing (exceptions are called out in the task). Final task also runs `npm run build`.
- **Commit messages** end with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **`TEST_ADMIN_EMAIL` must be an OWNER account** after this package (the admin block of `rls.test.ts` edits content and clients). The new staff block needs `TEST_STAFF_EMAIL` / `TEST_STAFF_PASSWORD` (an active staff account). Neither is `VITE_`-prefixed; both are read only by the Node test runner.

---

## File map

| File | Status | Responsibility |
|---|---|---|
| `supabase/migrations/20261001090000_rbac_owner_staff.sql` | Create | `is_staff()`, owner-only policies, vehicle/job/media staff policies, guard triggers, `job_cost` / `job_part_cost`, storage policies |
| `supabase/tests/rbac.sql` | Create | Rolled-back owner/staff matrix checks |
| `supabase/tests/jobs_j1.sql` | Modify | Drop `cost_kes` from a fixture insert (column moves) |
| `supabase/functions/rebuild/index.ts`, `notify-customer/index.ts` | Modify | Owner-only |
| `src/admin/auth/authContext.ts` + `authContext.test.ts` | Modify / Create | `AdminRole`, `roleOf()`, `useRole()` |
| `src/admin/nav.ts` + `nav.test.ts` | Create | `navFor(role)` |
| `src/admin/RequireAuth.tsx` | Modify | Export `NoAccess` with `message` / `action` props |
| `src/admin/RequireOwner.tsx` + `RequireOwner.test.tsx` | Create | `<RequireOwner>` guard, `<RoleHome>` index redirect |
| `src/admin/AdminApp.tsx` | Modify | Owner-only route group; staff-reachable Jobs + Schedule |
| `src/admin/AdminShell.tsx` | Modify | Nav from `navFor(role)`; unread count only for owner |
| `src/admin/lib/notifications.ts` | Modify | `useUnreadCount(enabled)` |
| `src/admin/lib/jobs.ts` + `jobs.test.ts` | Modify | Cost types move; `partCost`, `jobStatusOptions`, agenda helpers |
| `src/admin/lib/jobData.ts` | Modify | Cost embeds; `useAddPart`, `useSaveLabour`, `useLinkJobClient`, `useJobAgenda` |
| `src/admin/lib/resources.ts` | Modify | `AdminVehicle.client_id` nullable |
| `src/admin/pages/jobs/PartsEditor.tsx` + test | Modify | `showCost` prop; cost from `job_part_cost` |
| `src/admin/pages/jobs/JobHeader.tsx` + test | Create | Header extracted: client only for owner, link-client for walk-ins, staff status options |
| `src/admin/pages/jobs/JobDetailPage.tsx` | Modify | Use `JobHeader` |
| `src/admin/pages/jobs/JobsPage.tsx` | Modify | No client name for staff |
| `src/admin/pages/jobs/WrapUpTab.tsx` + test | Modify / Create | Labour cost, cost summary, cancel, delete owner-only |
| `src/admin/pages/jobs/RepairTab.tsx` | Modify | `useAddPart`, `showCost` |
| `src/admin/pages/jobs/WalkInForm.tsx` + test | Create | Staff walk-in: vehicle fields only |
| `src/admin/pages/jobs/NewJobPage.tsx` | Modify | Owner form vs `WalkInForm` |
| `src/admin/pages/jobs/JobAgenda.tsx` + test | Create | Jobs grouped by booked day |
| `src/admin/pages/SchedulePage.tsx` | Modify | Owner: bookings + job agenda; staff: job agenda |
| `src/shared/supabase/rls.test.ts` | Modify | Cost tables sealed from anon; staff block |
| `docs/owner-guide.md`, `docs/pick-up-here.md` | Modify | What staff can do |

---

### Task 1: Migration R-1 + SQL tests (dry run only)

**Files:**
- Create: `supabase/migrations/20261001090000_rbac_owner_staff.sql`
- Create: `supabase/tests/rbac.sql`
- Modify: `supabase/tests/jobs_j1.sql` (step 7 `job_part` insert)

**Interfaces:**
- Produces (DB):
  - `public.is_staff() returns boolean` (security definer).
  - Tables `public.job_cost (job_id uuid pk → job on delete cascade, labour_cost_kes integer, updated_at)` and `public.job_part_cost (part_id uuid pk → job_part on delete cascade, cost_kes integer, updated_at)` — owner-only.
  - Columns **removed:** `job.labour_cost_kes`, `job_part.cost_kes`. `vehicle.client_id` now nullable; `vehicle.created_by` and `media.created_by` default `auth.uid()`.
  - Triggers `job_guard_privileges` (BEFORE UPDATE on job), `vehicle_guard_client` (BEFORE UPDATE on vehicle). `job_complete_request()` becomes SECURITY DEFINER.
  - Policy names: `"<table>: owner all"`, `"vehicle: staff read job vehicles"`, `"vehicle: staff update job vehicles"`, `"vehicle: staff add walk-in vehicle"`, `"job: staff read"`, `"job: staff check in walk-ins"`, `"job: staff update"`, `"media: staff add own"`, `"media: staff read own or job photos"`, `"public-media: owner update"`, `"public-media: owner delete"`.
  - PostgREST embeds used by Task 4: `job … job_cost(labour_cost_kes)` and `job_part … job_part_cost(cost_kes)` (one-to-one: the FK column is the PK). For staff these embeds return `null`.

- [ ] **Step 1: Create the branch**

```bash
git switch main
git pull
ls supabase/functions/_shared/caller.ts supabase/migrations/20260930140000_guard_profile_privileges.sql
```
Expected: both files exist. If not, STOP — R-A and `fix/profile-self-promotion` must be merged first.

```bash
git switch -c feature/rbac-r-b-permissions
```

- [ ] **Step 2: Write the SQL test (it must fail against the current schema)**

Create `supabase/tests/rbac.sql`:

```sql
-- RBAC owner/staff matrix (spec §3, §4, §8) — checks against the linked project.
-- Run (after the migration is applied):
--   npx supabase db query --linked -f supabase/tests/rbac.sql
-- Before it is applied, run it as a dry run (see the R-B plan, Task 1).
--
-- One DO block that ends with `raise exception 'ALL_PASSED'`, rolling back everything.
-- PASS = the output error is exactly ALL_PASSED. Anything else = a failed check.
-- It creates its own throwaway users, so it never depends on real accounts.
do $$
declare
  owner_id uuid := gen_random_uuid();
  staff_id uuid := gen_random_uuid();
  c uuid; r uuid;
  v_client uuid; v_other uuid; v_walkin uuid;
  j_owner uuid; j_staff uuid;
  p uuid; m_owner uuid; m_staff uuid;
  cnt integer;
  s text;
  t text;
begin
  -- ---------------------------------------------------------------- fixtures (postgres)
  insert into auth.users (id, email, aud, role)
    values (owner_id, 'rbac-owner@example.test', 'authenticated', 'authenticated'),
           (staff_id, 'rbac-staff@example.test', 'authenticated', 'authenticated');
  update public.profile set role = 'owner', is_active = true where user_id = owner_id;
  update public.profile set role = 'staff', is_active = true where user_id = staff_id;

  insert into public.client (name) values ('RBAC client') returning id into c;
  insert into public.vehicle (client_id, make, registration)
    values (c, 'Toyota', 'KDA 100A') returning id into v_client;
  insert into public.vehicle (client_id, make) values (c, 'Nissan') returning id into v_other;
  insert into public.service_request
    (request_type, contact_name, contact_phone, status, client_id, vehicle_id)
    values ('general_repair', 'RBAC test', '0700000000', 'scheduled', c, v_client)
    returning id into r;
  insert into public.job (client_id, vehicle_id, vehicle_label, service_request_id)
    values (c, v_client, 'Toyota', r) returning id into j_owner;
  insert into public.job_cost (job_id, labour_cost_kes) values (j_owner, 5000);
  insert into public.job_part (job_id, name) values (j_owner, 'Pads') returning id into p;
  insert into public.job_part_cost (part_id, cost_kes) values (p, 3500);
  insert into public.media (storage_path, alt_text) values ('rbac/owner.jpg', 'owner only')
    returning id into m_owner;

  -- 0. Costs left the shared rows
  select count(*) into cnt from information_schema.columns
    where table_schema = 'public'
      and ((table_name = 'job' and column_name = 'labour_cost_kes')
        or (table_name = 'job_part' and column_name = 'cost_kes'));
  if cnt <> 0 then raise exception 'FAIL cost columns still on job/job_part'; end if;

  -- ---------------------------------------------------------------- as STAFF
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', staff_id, 'role', 'authenticated')::text, true);

  if public.is_staff() is not true then raise exception 'FAIL is_staff() false for staff'; end if;
  if public.is_owner() then raise exception 'FAIL staff is_owner()'; end if;

  -- 1. Owner-only tables return nothing to staff
  foreach t in array array['client', 'service_request', 'notification', 'site_settings',
      'service', 'portfolio_project', 'portfolio_media', 'testimonial', 'content_block',
      'service_area', 'partner', 'job_cost', 'job_part_cost'] loop
    begin
      execute format('select count(*) from public.%I', t) into cnt;
    exception when insufficient_privilege then
      cnt := 0; -- no table grant at all is also "can't read"
    end;
    if cnt <> 0 then raise exception 'FAIL staff can read %', t; end if;
  end loop;
  select count(*) into cnt from public.profile;
  if cnt <> 1 then raise exception 'FAIL staff sees % profiles', cnt; end if;

  -- 2. …and can't be written
  begin
    insert into public.client (name) values ('staff client');
    raise exception 'FAIL staff inserted a client';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.job_cost (job_id, labour_cost_kes) values (j_owner, 1);
    raise exception 'FAIL staff wrote job_cost';
  exception when insufficient_privilege then null;
  end;

  -- 3. Jobs: staff see every job; vehicles only when on a job
  select count(*) into cnt from public.job where id = j_owner;
  if cnt <> 1 then raise exception 'FAIL staff cannot see the job'; end if;
  select count(*) into cnt from public.vehicle where id = v_client;
  if cnt <> 1 then raise exception 'FAIL staff cannot see the job vehicle'; end if;
  select count(*) into cnt from public.vehicle where id = v_other;
  if cnt <> 0 then raise exception 'FAIL staff can see a vehicle that is on no job'; end if;

  -- 4. Walk-in: a vehicle with no client, then a job (RETURNING needs SELECT on both)
  insert into public.vehicle (make, model) values ('Mazda', 'Demio') returning id into v_walkin;
  insert into public.job (vehicle_id, vehicle_label) values (v_walkin, 'Mazda Demio')
    returning id into j_staff;

  -- 5. Staff can't attach a client or request
  begin
    insert into public.vehicle (client_id, make) values (c, 'Honda');
    raise exception 'FAIL staff added a client vehicle';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.job (client_id, vehicle_label) values (c, 'x');
    raise exception 'FAIL staff created a job with a client';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.job (service_request_id, vehicle_label) values (r, 'x');
    raise exception 'FAIL staff created a job from a request';
  exception when insufficient_privilege then null;
  end;

  -- 6. Staff record work
  update public.job set status = 'diagnosing', labour_hours = 2.5 where id = j_owner;
  update public.vehicle set registration = 'KDB 200B' where id = v_walkin;
  insert into public.job_finding (job_id, title) values (j_owner, 'Worn pads');
  insert into public.job_part (job_id, name, quantity) values (j_owner, 'Brake fluid', 1);
  insert into public.media (storage_path, alt_text) values ('rbac/staff.jpg', 'staff')
    returning id into m_staff;
  insert into public.job_photo (job_id, media_id, stage) values (j_owner, m_staff, 'diagnosis');

  -- 7. …but can't relink, cancel or un-cancel
  begin
    update public.job set client_id = null where id = j_owner;
    raise exception 'FAIL staff unlinked the client';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.job set service_request_id = null where id = j_owner;
    raise exception 'FAIL staff unlinked the request';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.job set status = 'cancelled' where id = j_staff;
    raise exception 'FAIL staff cancelled a job';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.vehicle set client_id = c where id = v_walkin;
    raise exception 'FAIL staff linked a vehicle to a client';
  exception when insufficient_privilege then null;
  end;

  -- 8. …and can't delete (no policy → nothing deleted)
  delete from public.job where id = j_staff;
  select count(*) into cnt from public.job where id = j_staff;
  if cnt <> 1 then raise exception 'FAIL staff deleted a job'; end if;

  -- 9. Media: own uploads + job photos only; can't forge created_by
  select count(*) into cnt from public.media where id = m_staff;
  if cnt <> 1 then raise exception 'FAIL staff cannot see own upload'; end if;
  select count(*) into cnt from public.media where id = m_owner;
  if cnt <> 0 then raise exception 'FAIL staff can see unrelated media'; end if;
  begin
    insert into public.media (storage_path, alt_text, created_by) values ('x', 'x', owner_id);
    raise exception 'FAIL staff forged media.created_by';
  exception when insufficient_privilege then null;
  end;

  -- 10. Staff completing a job moves its (owner-only) request to completed
  update public.job set status = 'completed' where id = j_owner;

  -- ---------------------------------------------------------------- as OWNER
  perform set_config('request.jwt.claims',
    json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  if public.is_staff() then raise exception 'FAIL owner is_staff()'; end if;

  select count(*) into cnt from public.job_cost where job_id = j_owner;
  if cnt <> 1 then raise exception 'FAIL owner cannot read job_cost'; end if;
  select count(*) into cnt from public.job_part_cost where part_id = p;
  if cnt <> 1 then raise exception 'FAIL owner cannot read job_part_cost'; end if;
  select count(*) into cnt from public.media where id = m_owner;
  if cnt <> 1 then raise exception 'FAIL owner cannot read media'; end if;

  -- The owner links the walk-in later, cancels and deletes.
  update public.vehicle set client_id = c where id = v_walkin;
  update public.job set client_id = c where id = j_staff;
  insert into public.job_cost (job_id, labour_cost_kes) values (j_staff, 1000);
  update public.job set status = 'cancelled' where id = j_staff;
  delete from public.job where id = j_staff;

  -- ---------------------------------------------------------------- results (postgres)
  perform set_config('role', 'postgres', true);

  select status::text into s from public.service_request where id = r;
  if s <> 'completed' then raise exception 'FAIL request not completed by staff completion: %', s; end if;
  select count(*) into cnt from public.job where id = j_owner and labour_hours = 2.5;
  if cnt <> 1 then raise exception 'FAIL staff labour hours not saved'; end if;
  select count(*) into cnt from public.job where id = j_staff;
  if cnt <> 0 then raise exception 'FAIL owner could not delete the job'; end if;
  select count(*) into cnt from public.job_cost where job_id = j_staff;
  if cnt <> 0 then raise exception 'FAIL job_cost not cascaded'; end if;
  select count(*) into cnt from public.vehicle where id = v_walkin and client_id = c;
  if cnt <> 1 then raise exception 'FAIL owner could not link the walk-in vehicle'; end if;
  select count(*) into cnt from public.media where id = m_staff and created_by = staff_id;
  if cnt <> 1 then raise exception 'FAIL media.created_by default not auth.uid()'; end if;

  raise exception 'ALL_PASSED';
end $$;
```

- [ ] **Step 3: Run the test against the live schema to see it fail**

Run: `npx supabase db query --linked -f supabase/tests/rbac.sql`
Expected: an error that is NOT `ALL_PASSED` — `relation "public.job_cost" does not exist` (the migration isn't applied). The block rolls back; nothing is written.

- [ ] **Step 4: Write the migration**

Create `supabase/migrations/20261001090000_rbac_owner_staff.sql`:

```sql
-- Platinum Point Automotive Engineering — RBAC R-B: owner / staff permissions.
-- Spec: docs/superpowers/specs/2026-09-30-rbac-and-invites-design.md §3, §4.1–4.5.
--
-- Before: public.is_admin() (any active profile) had full CRUD on everything.
-- After:  owner = everything; staff = jobs (+ the vehicles on them, job photos) only.
--         Costs move to owner-only tables because RLS is per row, not per column,
--         and owner + staff share the `authenticated` Postgres role.
-- Anon policies are unchanged. Server roles (postgres, service_role) are unaffected.

-- ===========================================================================
-- 4.1 Role helper
-- ===========================================================================
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profile
    where user_id = auth.uid() and is_active and role = 'staff'
  );
$$;

-- ===========================================================================
-- 4.2 Owner-only tables ("admin all" → "owner all")
-- ===========================================================================
drop policy "service_request: admin all" on public.service_request;
create policy "service_request: owner all" on public.service_request
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy "client: admin all" on public.client;
create policy "client: owner all" on public.client
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy "notification: admin all" on public.notification;
create policy "notification: owner all" on public.notification
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy "service: admin all" on public.service;
create policy "service: owner all" on public.service
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy "portfolio_project: admin all" on public.portfolio_project;
create policy "portfolio_project: owner all" on public.portfolio_project
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy "portfolio_media: admin all" on public.portfolio_media;
create policy "portfolio_media: owner all" on public.portfolio_media
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy "testimonial: admin all" on public.testimonial;
create policy "testimonial: owner all" on public.testimonial
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy "content_block: admin all" on public.content_block;
create policy "content_block: owner all" on public.content_block
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy "service_area: admin all" on public.service_area;
create policy "service_area: owner all" on public.service_area
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy "partner: admin all" on public.partner;
create policy "partner: owner all" on public.partner
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy "site_settings: admin all" on public.site_settings;
create policy "site_settings: owner all" on public.site_settings
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- ===========================================================================
-- 4.3 Vehicles — walk-ins have no client; staff see/edit vehicles on a job
-- ===========================================================================
alter table public.vehicle alter column client_id drop not null;
alter table public.vehicle alter column created_by set default auth.uid();

drop policy "vehicle: admin all" on public.vehicle;
create policy "vehicle: owner all" on public.vehicle
  for all to authenticated using (public.is_owner()) with check (public.is_owner());
-- created_by = auth.uid(): a staff member must see the walk-in vehicle they just added
-- (INSERT … RETURNING) before the job that references it exists.
create policy "vehicle: staff read job vehicles" on public.vehicle
  for select to authenticated
  using (
    public.is_staff()
    and (created_by = auth.uid()
         or exists (select 1 from public.job j where j.vehicle_id = vehicle.id))
  );
create policy "vehicle: staff update job vehicles" on public.vehicle
  for update to authenticated
  using (public.is_staff() and exists (select 1 from public.job j where j.vehicle_id = vehicle.id))
  with check (public.is_staff());
create policy "vehicle: staff add walk-in vehicle" on public.vehicle
  for insert to authenticated
  with check (public.is_staff() and client_id is null);

-- Only the owner links a vehicle to a client. SECURITY INVOKER on purpose (current_user
-- must be the caller's role) — same pattern as guard_profile_privileges.
create or replace function public.guard_vehicle_client()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated'
     and new.client_id is distinct from old.client_id
     and not public.is_owner()
  then
    raise exception 'Only the owner can link a vehicle to a client.'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger vehicle_guard_client
  before update on public.vehicle
  for each row execute function public.guard_vehicle_client();

-- ===========================================================================
-- 4.4 Jobs
-- ===========================================================================
drop policy "job: admin all" on public.job;
create policy "job: owner all" on public.job
  for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "job: staff read" on public.job
  for select to authenticated using (public.is_staff());
create policy "job: staff check in walk-ins" on public.job
  for insert to authenticated
  with check (public.is_staff() and client_id is null and service_request_id is null);
create policy "job: staff update" on public.job
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
-- No staff delete policy: only the owner deletes jobs (D5).

-- Non-owners can't relink a job, cancel it, or undo the owner's cancel.
create or replace function public.guard_job_privileges()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not public.is_owner() then
    if new.client_id is distinct from old.client_id
       or new.service_request_id is distinct from old.service_request_id
    then
      raise exception 'Only the owner can link a job to a client or request.'
        using errcode = 'insufficient_privilege';
    end if;
    if (new.status = 'cancelled') is distinct from (old.status = 'cancelled') then
      raise exception 'Only the owner can cancel a job or restore a cancelled one.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;

create trigger job_guard_privileges
  before update on public.job
  for each row execute function public.guard_job_privileges();

-- Staff can't read or write service_request, but completing a job must still move its
-- request to `completed`: run the J1 trigger as its owner.
alter function public.job_complete_request() security definer;
revoke execute on function public.job_complete_request() from public, anon, authenticated;

-- job_finding / job_photo / job_part keep their "admin all" (is_admin()) policies:
-- staff need full CRUD to record work, and every row is tied to an existing job by a
-- NOT NULL foreign key.

-- Costs → owner-only tables.
create table public.job_cost (
  job_id          uuid primary key references public.job (id) on delete cascade,
  labour_cost_kes integer check (labour_cost_kes is null or labour_cost_kes >= 0),
  updated_at      timestamptz not null default now()
);
create trigger job_cost_updated_at before update on public.job_cost
  for each row execute function public.set_updated_at();

create table public.job_part_cost (
  part_id    uuid primary key references public.job_part (id) on delete cascade,
  cost_kes   integer check (cost_kes is null or cost_kes >= 0),
  updated_at timestamptz not null default now()
);
create trigger job_part_cost_updated_at before update on public.job_part_cost
  for each row execute function public.set_updated_at();

insert into public.job_cost (job_id, labour_cost_kes)
  select id, labour_cost_kes from public.job where labour_cost_kes is not null;
insert into public.job_part_cost (part_id, cost_kes)
  select id, cost_kes from public.job_part where cost_kes is not null;

alter table public.job drop column labour_cost_kes;
alter table public.job_part drop column cost_kes;

alter table public.job_cost      enable row level security;
alter table public.job_part_cost enable row level security;
create policy "job_cost: owner all" on public.job_cost
  for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "job_part_cost: owner all" on public.job_part_cost
  for all to authenticated using (public.is_owner()) with check (public.is_owner());
revoke all on public.job_cost      from anon;
revoke all on public.job_part_cost from anon;
grant select, insert, update, delete on public.job_cost      to authenticated;
grant select, insert, update, delete on public.job_part_cost to authenticated;

-- ===========================================================================
-- 4.5 Media for job photos
-- ===========================================================================
alter table public.media alter column created_by set default auth.uid();

drop policy "media: admin all" on public.media;
create policy "media: owner all" on public.media
  for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "media: staff add own" on public.media
  for insert to authenticated
  with check (public.is_staff() and created_by = auth.uid());
create policy "media: staff read own or job photos" on public.media
  for select to authenticated
  using (
    public.is_staff()
    and (created_by = auth.uid()
         or exists (select 1 from public.job_photo jp where jp.media_id = media.id))
  );

-- Storage public-media: insert stays is_admin() (staff upload job photos), read stays
-- admin-only (20260930130000); update/delete become owner-only.
drop policy "public-media: admin update" on storage.objects;
drop policy "public-media: admin delete" on storage.objects;
create policy "public-media: owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'public-media' and public.is_owner());
create policy "public-media: owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'public-media' and public.is_owner());
```

- [ ] **Step 5: Keep `jobs_j1.sql` valid after the column move**

In `supabase/tests/jobs_j1.sql`, step 7, replace:

```sql
  insert into public.job_part (job_id, finding_id, name, quantity, cost_kes)
    values (j2, f, 'Brake pads', 1, 3500);
```
with:
```sql
  insert into public.job_part (job_id, finding_id, name, quantity)
    values (j2, f, 'Brake pads', 1);
```

- [ ] **Step 6: Dry-run the migration with each SQL test (rolled back)**

```bash
M=supabase/migrations/20261001090000_rbac_owner_staff.sql
mkdir -p supabase/.temp
for T in rbac jobs_j1 profile_guard; do
  { echo 'begin;'; cat "$M"; cat "supabase/tests/$T.sql"; echo 'rollback;'; } > "supabase/.temp/dryrun_$T.sql"
  echo "== $T"; npx supabase db query --linked -f "supabase/.temp/dryrun_$T.sql"
done
```
Expected: each of the three prints an error whose message is exactly `ALL_PASSED`. Any `FAIL …` → fix the migration (not the test) and re-run.

- [ ] **Step 7: Confirm the dry run left nothing behind (read-only)**

```bash
npx supabase db query --linked "select to_regprocedure('public.is_staff()') as is_staff, to_regclass('public.job_cost') as job_cost, (select count(*) from information_schema.columns where table_schema='public' and table_name='job' and column_name='labour_cost_kes') as labour_col"
```
Expected: `is_staff` = null, `job_cost` = null, `labour_col` = 1.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20261001090000_rbac_owner_staff.sql supabase/tests/rbac.sql supabase/tests/jobs_j1.sql
git commit -m "feat(db): owner/staff RLS, job guard triggers, owner-only cost tables (RBAC R-1)

Not applied yet — dry-run tested (rbac.sql, jobs_j1.sql, profile_guard.sql all
ALL_PASSED inside a rolled-back transaction).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Edge Functions owner-only

Staff must not publish the website or email customers. Verified by review now and live in Task 10.

**Files:**
- Modify: `supabase/functions/rebuild/index.ts` (the caller check R-A introduced)
- Modify: `supabase/functions/notify-customer/index.ts` (same)

**Interfaces:**
- Consumes: `getCaller(req): Promise<CallerProfile | null>` from `supabase/functions/_shared/caller.ts` (R-A), `CallerProfile.role: 'owner' | 'staff'`.

- [ ] **Step 1: `rebuild` → owner-only**

In `supabase/functions/rebuild/index.ts` replace:

```ts
  // Caller must be an active admin (their own profile — see _shared/caller.ts).
  const me = await getCaller(req);
  if (!me?.isActive) return json({ ok: false, error: 'forbidden' }, 403);
```
with:
```ts
  // Caller must be the active owner (website publishing is owner-only — RBAC spec §3).
  const me = await getCaller(req);
  if (!me?.isActive || me.role !== 'owner') return json({ ok: false, error: 'forbidden' }, 403);
```

- [ ] **Step 2: `notify-customer` → owner-only**

In `supabase/functions/notify-customer/index.ts` replace:

```ts
  const me = await getCaller(req);
  if (!me?.isActive) return json({ ok: false, error: 'forbidden' }, 403);
```
with:
```ts
  // Booking requests are owner-only (RBAC spec §3, D6).
  const me = await getCaller(req);
  if (!me?.isActive || me.role !== 'owner') return json({ ok: false, error: 'forbidden' }, 403);
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/rebuild/index.ts supabase/functions/notify-customer/index.ts
git commit -m "fix(functions): rebuild and notify-customer are owner-only

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Roles in the admin — `useRole`, nav, `RequireOwner`, routes

**Files:**
- Modify: `src/admin/auth/authContext.ts`
- Test: `src/admin/auth/authContext.test.ts`
- Create: `src/admin/nav.ts`
- Test: `src/admin/nav.test.ts`
- Modify: `src/admin/RequireAuth.tsx` (`NoAccess` exported, `message` / `action` props)
- Create: `src/admin/RequireOwner.tsx`
- Test: `src/admin/RequireOwner.test.tsx`
- Modify: `src/admin/AdminApp.tsx` (route tree)
- Modify: `src/admin/AdminShell.tsx` (nav + unread)
- Modify: `src/admin/lib/notifications.ts` (`useUnreadCount`)

**Interfaces:**
- Produces:
  - `type AdminRole = 'owner' | 'staff'`; `roleOf(profile: AdminProfile | null): AdminRole | null`; `useRole(): AdminRole | null` (all in `src/admin/auth/authContext.ts`).
  - `interface NavItem { to: string; label: string; icon: 'dashboard' | 'notifications' | 'requests' | 'jobs' | 'schedule' | 'clients' | 'content' | 'settings' | 'team'; end?: boolean; badge?: boolean }`; `navFor(role: AdminRole | null): NavItem[]` (`src/admin/nav.ts`).
  - `NoAccess({ email, message?, action? }: { email: string | null; message?: string; action?: ReactNode })` exported from `src/admin/RequireAuth.tsx`.
  - `RequireOwner()` (layout route) and `RoleHome({ owner }: { owner: ReactNode })` from `src/admin/RequireOwner.tsx`.
  - `useUnreadCount(enabled?: boolean)`.

- [ ] **Step 1: Write the failing tests**

Create `src/admin/auth/authContext.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { roleOf } from './authContext';
import type { AdminProfile } from '../../shared/supabase/auth';

const p = (over: Partial<AdminProfile>): AdminProfile => ({
  user_id: 'u1',
  email: 'a@b.co',
  display_name: 'A',
  role: 'staff',
  is_active: true,
  ...over,
});

describe('roleOf', () => {
  it('returns the role of an active profile', () => {
    expect(roleOf(p({ role: 'owner' }))).toBe('owner');
    expect(roleOf(p({ role: 'staff' }))).toBe('staff');
  });
  it('returns null for no profile or an inactive one', () => {
    expect(roleOf(null)).toBeNull();
    expect(roleOf(p({ role: 'owner', is_active: false }))).toBeNull();
  });
});
```

Create `src/admin/nav.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { navFor } from './nav';

describe('navFor', () => {
  it('gives the owner everything plus Team', () => {
    expect(navFor('owner').map((n) => n.label)).toEqual([
      'Dashboard',
      'Notifications',
      'Requests',
      'Jobs',
      'Schedule',
      'Clients',
      'Website content',
      'Settings',
      'Team',
    ]);
  });
  it('gives staff Jobs and Schedule only', () => {
    expect(navFor('staff').map((n) => n.to)).toEqual(['/admin/jobs', '/admin/schedule']);
  });
  it('gives nobody else anything', () => {
    expect(navFor(null)).toEqual([]);
  });
});
```

Create `src/admin/RequireOwner.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { AuthContext, type AuthState } from './auth/authContext';
import { RequireOwner, RoleHome } from './RequireOwner';

vi.mock('../shared/supabase/auth', () => ({ signOut: vi.fn(async () => {}) }));

function renderAt(path: string, role: 'owner' | 'staff') {
  const state: AuthState = {
    loading: false,
    session: { user: { email: 'kevin@example.com' } } as unknown as Session,
    profile: {
      user_id: 'u1',
      email: 'kevin@example.com',
      display_name: 'Kevin',
      role,
      is_active: true,
    },
  };
  return render(
    <AuthContext.Provider value={state}>
      <MemoryRouter
        initialEntries={[path]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/admin" element={<RoleHome owner={<p>Dashboard</p>} />} />
          <Route path="/admin/jobs" element={<p>Jobs list</p>} />
          <Route element={<RequireOwner />}>
            <Route path="/admin/clients" element={<p>Clients list</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('<RequireOwner />', () => {
  it('lets the owner through', () => {
    renderAt('/admin/clients', 'owner');
    expect(screen.getByText('Clients list')).toBeInTheDocument();
  });

  it('shows staff the no-access screen with sign-out and a way back to Jobs', () => {
    renderAt('/admin/clients', 'staff');
    expect(screen.queryByText('Clients list')).not.toBeInTheDocument();
    expect(screen.getByText(/for the owner/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Jobs' })).toHaveAttribute('href', '/admin/jobs');
  });
});

describe('<RoleHome />', () => {
  it('shows the owner the dashboard', () => {
    renderAt('/admin', 'owner');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('sends staff to Jobs', () => {
    renderAt('/admin', 'staff');
    expect(screen.getByText('Jobs list')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/admin/auth/authContext.test.ts src/admin/nav.test.ts src/admin/RequireOwner.test.tsx`
Expected: FAIL — `roleOf`, `./nav`, `./RequireOwner` don't exist.

- [ ] **Step 3: Add the role helpers**

Replace `src/admin/auth/authContext.ts` with:

```ts
import { createContext, useContext } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { AdminProfile } from '../../shared/supabase/auth';

export interface AuthState {
  loading: boolean;
  session: Session | null;
  profile: AdminProfile | null;
}

export const AuthContext = createContext<AuthState>({
  loading: true,
  session: null,
  profile: null,
});

export const useAuth = () => useContext(AuthContext);

export type AdminRole = 'owner' | 'staff';

/** The admin role of a profile, or null when there is no ACTIVE profile. */
export function roleOf(profile: AdminProfile | null): AdminRole | null {
  return profile?.is_active ? profile.role : null;
}

/** The signed-in person's role (RBAC spec §5). The database enforces it; this mirrors it. */
export const useRole = (): AdminRole | null => roleOf(useAuth().profile);
```

- [ ] **Step 4: Create the nav model**

Create `src/admin/nav.ts`:

```ts
import type { AdminRole } from './auth/authContext';

export interface NavItem {
  to: string;
  label: string;
  icon:
    | 'dashboard'
    | 'notifications'
    | 'requests'
    | 'jobs'
    | 'schedule'
    | 'clients'
    | 'content'
    | 'settings'
    | 'team';
  end?: boolean;
  badge?: boolean;
}

const OWNER_NAV: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/admin/notifications', label: 'Notifications', icon: 'notifications', badge: true },
  { to: '/admin/requests', label: 'Requests', icon: 'requests' },
  { to: '/admin/jobs', label: 'Jobs', icon: 'jobs' },
  { to: '/admin/schedule', label: 'Schedule', icon: 'schedule' },
  { to: '/admin/clients', label: 'Clients', icon: 'clients' },
  { to: '/admin/content', label: 'Website content', icon: 'content' },
  { to: '/admin/settings', label: 'Settings', icon: 'settings' },
  { to: '/admin/team', label: 'Team', icon: 'team' },
];

/** Staff: jobs & the job schedule only (D2, D6). */
const STAFF_NAV: NavItem[] = [
  { to: '/admin/jobs', label: 'Jobs', icon: 'jobs' },
  { to: '/admin/schedule', label: 'Schedule', icon: 'schedule' },
];

export function navFor(role: AdminRole | null): NavItem[] {
  if (role === 'owner') return OWNER_NAV;
  if (role === 'staff') return STAFF_NAV;
  return [];
}
```

- [ ] **Step 5: Export `NoAccess` with a custom message and action**

In `src/admin/RequireAuth.tsx`:

1. Change the first import line to:
```tsx
import { useState, type ReactNode } from 'react';
```
2. Replace the `NoAccess` function signature and its first paragraph:

```tsx
function NoAccess({ email }: { email: string | null }) {
```
with:
```tsx
export function NoAccess({
  email,
  message = 'This account doesn’t have admin access. Ask the owner to add you to the team.',
  action,
}: {
  email: string | null;
  message?: string;
  action?: ReactNode;
}) {
```
and replace:
```tsx
        <p>This account doesn&rsquo;t have admin access. Ask the owner to add you to the team.</p>
```
with:
```tsx
        <p>{message}</p>
        {action}
```

- [ ] **Step 6: Create the owner guard + role home**

Create `src/admin/RequireOwner.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Link, Navigate, Outlet } from 'react-router-dom';
import { useAuth, useRole } from './auth/authContext';
import { NoAccess } from './RequireAuth';

/** Layout route for owner-only pages (RBAC spec §5). Staff get the no-access screen. */
export function RequireOwner() {
  const role = useRole();
  const { session } = useAuth();
  if (role !== 'owner') {
    return (
      <NoAccess
        email={session?.user?.email ?? null}
        message="This part of the admin is for the owner. Your account can use Jobs and Schedule."
        action={
          <Link
            to="/admin/jobs"
            className="inline-block font-semibold text-paper underline underline-offset-2"
          >
            Go to Jobs
          </Link>
        }
      />
    );
  }
  return <Outlet />;
}

/** `/admin`: the owner's Dashboard; staff land on Jobs (spec §5). */
export function RoleHome({ owner }: { owner: ReactNode }) {
  return useRole() === 'owner' ? <>{owner}</> : <Navigate to="/admin/jobs" replace />;
}
```

- [ ] **Step 7: Route tree**

In `src/admin/AdminApp.tsx`, add the import after the `RequireAuth` import:

```tsx
import { RequireOwner, RoleHome } from './RequireOwner';
```
and replace the whole `<Route element={<RequireAuth />}> … </Route>` block with:

```tsx
          <Route element={<RequireAuth />}>
            <Route element={<AdminShell />}>
              <Route index element={<RoleHome owner={<DashboardPage />} />} />
              {/* Owner + staff (spec §3) */}
              <Route path="jobs" element={<JobsPage />} />
              <Route path="jobs/new" element={<NewJobPage />} />
              <Route path="jobs/:id" element={<JobDetailPage />} />
              <Route path="schedule" element={<SchedulePage />} />
              {/* Owner only */}
              <Route element={<RequireOwner />}>
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="requests" element={<RequestsPage />} />
                <Route path="requests/:id" element={<RequestDetailPage />} />
                <Route path="clients" element={<ClientsPage />} />
                <Route path="clients/:id" element={<ClientDetailPage />} />
                <Route path="team" element={<TeamPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="content" element={<ContentHubPage />} />
                <Route path="content/services" element={<ServicesListPage />} />
                <Route path="content/services/:id" element={<ServiceEditPage />} />
                <Route path="content/portfolio" element={<PortfolioListPage />} />
                <Route path="content/portfolio/:id" element={<PortfolioEditPage />} />
                <Route path="content/testimonials" element={<TestimonialsPage />} />
                <Route path="content/media" element={<MediaPage />} />
                <Route path="content/copy" element={<CopyPage />} />
                <Route path="content/areas" element={<AreasPage />} />
                <Route path="content/partners" element={<PartnersPage />} />
              </Route>
            </Route>
          </Route>
```

- [ ] **Step 8: Unread count only when wanted**

In `src/admin/lib/notifications.ts`, replace `useUnreadCount` with:

```ts
/** `enabled = false` for staff: notifications are owner-only (spec §3). */
export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: ['notifications', 'unreadCount'],
    enabled,
    queryFn: async () => {
      const { count } = await getDb()
        .from('notification')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null);
      return count ?? 0;
    },
    refetchInterval: enabled ? 60_000 : false,
  });
}
```

- [ ] **Step 9: Nav from the role**

In `src/admin/AdminShell.tsx`:

1. Replace `import { useAuth } from './auth/authContext';` with:
```tsx
import { useAuth, useRole } from './auth/authContext';
import { navFor } from './nav';
```
2. Delete the whole `const baseNav = [ … ] as const;` block.
3. Replace `  const unread = useUnreadCount();` with:
```tsx
  const role = useRole();
  const unread = useUnreadCount(role === 'owner');
```
4. Replace:
```tsx
  const nav =
    profile?.role === 'owner'
      ? [...baseNav, { to: '/admin/team', label: 'Team', icon: 'team' as const }]
      : baseNav;
```
with:
```tsx
  const nav = navFor(role);
```
5. In the `nav.map`, replace `end={'end' in n ? n.end : false}` with `end={n.end ?? false}` and `{'badge' in n && n.badge && (unread.data ?? 0) > 0 && (` with `{n.badge && (unread.data ?? 0) > 0 && (`.

- [ ] **Step 10: Run the tests to verify they pass**

Run: `npx vitest run src/admin/auth/authContext.test.ts src/admin/nav.test.ts src/admin/RequireOwner.test.tsx src/admin/RequireAuth.test.tsx`
Expected: PASS (the existing `RequireAuth` tests still pass — default message unchanged).

- [ ] **Step 11: Gate + commit**

```bash
npm run typecheck && npm run lint && npm run test
npx prettier --check src/admin/auth src/admin/nav.ts src/admin/nav.test.ts src/admin/RequireAuth.tsx src/admin/RequireOwner.tsx src/admin/RequireOwner.test.tsx src/admin/AdminApp.tsx src/admin/AdminShell.tsx src/admin/lib/notifications.ts
git add src/admin/auth src/admin/nav.ts src/admin/nav.test.ts src/admin/RequireAuth.tsx src/admin/RequireOwner.tsx src/admin/RequireOwner.test.tsx src/admin/AdminApp.tsx src/admin/AdminShell.tsx src/admin/lib/notifications.ts
git commit -m "feat(admin): role-based nav, RequireOwner guard, staff land on Jobs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Job data layer — costs move, staff-safe helpers

**Files:**
- Modify: `src/admin/lib/jobs.ts`
- Test: `src/admin/lib/jobs.test.ts`
- Modify: `src/admin/lib/jobData.ts`
- Modify: `src/admin/lib/resources.ts` (`AdminVehicle.client_id`)

**Interfaces:**
- Consumes: DB from Task 1 (`job_cost`, `job_part_cost`, embeds).
- Produces (all used by Tasks 5-8):
  - `Job` **without** `labour_cost_kes`; `JobWithRefs` gains `job_cost: { labour_cost_kes: number | null } | null`.
  - `JobPart` **without** `cost_kes`; gains `job_part_cost: { cost_kes: number | null } | null`.
  - `partCost(p: Pick<JobPart, 'job_part_cost'>): number | null`
  - `jobCostSummary(labourCostKes: number | null, parts: Pick<JobPart, 'job_part_cost'>[]): { labour: number; parts: number; total: number }`
  - `jobStatusOptions(current: JobStatus, isOwner: boolean): JobStatus[]`
  - `type AgendaJob = Pick<Job, 'id' | 'job_number' | 'vehicle_label' | 'status' | 'booked_at'>`
  - `interface AgendaDay<T> { day: string; jobs: T[] }`; `groupAgendaByDay<T extends Pick<Job, 'booked_at'>>(jobs: T[]): AgendaDay<T>[]`; `agendaDayLabel(day: string): string`
  - `interface NewPartInput { name: string; quantity: number; cost_kes: number | null; finding_id: string | null }`
  - `useAddPart(jobId: string)` → mutation of `NewPartInput`
  - `useSaveLabour(jobId: string)` → mutation of `{ hours: number | null; costKes?: number | null }` (`costKes` omitted = don't touch `job_cost`)
  - `useLinkJobClient(job: Pick<Job, 'id' | 'vehicle_id'>)` → mutation of `clientId: string`
  - `useJobAgenda()` → query of `AgendaJob[]` (open jobs with `booked_at`, soonest first)
  - `AdminVehicle.client_id: string | null`

- [ ] **Step 1: Write the failing tests**

In `src/admin/lib/jobs.test.ts`:

1. Change the import list to:
```ts
import {
  agendaDayLabel,
  formatKes,
  fromDateInput,
  groupAgendaByDay,
  groupJobsByVehicle,
  jobCostSummary,
  jobPrefillFromRequest,
  jobStatusOptions,
  jobStatusTone,
  matchesJobFilter,
  matchesJobSearch,
  partCost,
  pendingFindingsCount,
  photoAlt,
  toDateInput,
  vehicleLabel,
} from './jobs';
```
2. Replace the `jobCostSummary` expectation block:
```ts
    expect(
      jobCostSummary(4000, [{ cost_kes: 3500 }, { cost_kes: null }, { cost_kes: 800 }]),
    ).toEqual({
```
with:
```ts
    expect(
      jobCostSummary(4000, [
        { job_part_cost: { cost_kes: 3500 } },
        { job_part_cost: null },
        { job_part_cost: { cost_kes: null } },
        { job_part_cost: { cost_kes: 800 } },
      ]),
    ).toEqual({
```
3. Append at the end of the file:
```ts
describe('partCost', () => {
  it('reads the owner-only cost embed; null when hidden or unset', () => {
    expect(partCost({ job_part_cost: { cost_kes: 800 } })).toBe(800);
    expect(partCost({ job_part_cost: { cost_kes: null } })).toBeNull();
    expect(partCost({ job_part_cost: null })).toBeNull();
  });
});

describe('jobStatusOptions', () => {
  it('lets the owner pick any status', () => {
    expect(jobStatusOptions('in_repair', true)).toEqual([
      'checked_in',
      'diagnosing',
      'in_repair',
      'completed',
      'cancelled',
    ]);
  });
  it('never offers staff "cancelled"', () => {
    expect(jobStatusOptions('in_repair', false)).toEqual([
      'checked_in',
      'diagnosing',
      'in_repair',
      'completed',
    ]);
  });
  it('locks a cancelled job for staff', () => {
    expect(jobStatusOptions('cancelled', false)).toEqual(['cancelled']);
  });
});

describe('groupAgendaByDay', () => {
  it('groups by the Kenyan calendar day, soonest first, skipping unbooked jobs', () => {
    const jobs = [
      { id: 'b', booked_at: '2026-10-02T06:00:00+00:00' },
      { id: 'a', booked_at: '2026-09-30T22:30:00+00:00' }, // 01:30 on 1 Oct in Nairobi
      { id: 'c', booked_at: '2026-10-01T09:00:00+00:00' },
      { id: 'x', booked_at: null },
    ];
    expect(groupAgendaByDay(jobs)).toEqual([
      { day: '2026-10-01', jobs: [jobs[1], jobs[2]] },
      { day: '2026-10-02', jobs: [jobs[0]] },
    ]);
  });
});

describe('agendaDayLabel', () => {
  it('names the day', () => {
    expect(agendaDayLabel('2026-10-01')).toMatch(/1/);
    expect(agendaDayLabel('2026-10-01')).toMatch(/Oct/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/admin/lib/jobs.test.ts`
Expected: FAIL — `partCost`, `jobStatusOptions`, `groupAgendaByDay`, `agendaDayLabel` are not exported.

- [ ] **Step 3: Update the types + helpers**

In `src/admin/lib/jobs.ts`:

1. In `interface Job`, delete the line `  labour_cost_kes: number | null;`.
2. Replace `interface JobWithRefs` with:
```ts
/** A job with the bits of its client + vehicle the admin lists need. */
export interface JobWithRefs extends Job {
  /** Null for staff — `client` is owner-only (RLS). */
  client: { name: string } | null;
  vehicle: { registration: string | null } | null;
  /** Owner-only table; null for staff or when no cost is recorded. */
  job_cost: { labour_cost_kes: number | null } | null;
}
```
3. In `interface JobPart`, replace:
```ts
  /** Private — the cost of this line, not a unit price. */
  cost_kes: number | null;
```
with:
```ts
  /** Owner-only embed (job_part_cost); null for staff. Cost of the line, not a unit price. */
  job_part_cost: { cost_kes: number | null } | null;
```
4. Replace `jobCostSummary` with:
```ts
export function partCost(p: Pick<JobPart, 'job_part_cost'>): number | null {
  return p.job_part_cost?.cost_kes ?? null;
}

export function jobCostSummary(
  labourCostKes: number | null,
  parts: Pick<JobPart, 'job_part_cost'>[],
) {
  const labour = labourCostKes ?? 0;
  const partsTotal = parts.reduce((sum, p) => sum + (partCost(p) ?? 0), 0);
  return { labour, parts: partsTotal, total: labour + partsTotal };
}
```
5. Append at the end of the file:
```ts
/** Status choices in the job header. Only the owner cancels or restores a job (D5). */
export function jobStatusOptions(current: JobStatus, isOwner: boolean): JobStatus[] {
  if (isOwner) return [...JOB_STATUSES];
  if (current === 'cancelled') return ['cancelled'];
  return JOB_STATUSES.filter((s) => s !== 'cancelled');
}

export type AgendaJob = Pick<Job, 'id' | 'job_number' | 'vehicle_label' | 'status' | 'booked_at'>;

export interface AgendaDay<T> {
  day: string;
  jobs: T[];
}

/** Job schedule (D6): booked jobs grouped by Kenyan calendar day, soonest first. */
export function groupAgendaByDay<T extends Pick<Job, 'booked_at'>>(jobs: T[]): AgendaDay<T>[] {
  const sorted = jobs
    .filter((j) => j.booked_at)
    .sort((a, b) => new Date(a.booked_at!).getTime() - new Date(b.booked_at!).getTime());
  const days = new Map<string, T[]>();
  for (const job of sorted) {
    const day = toDateInput(job.booked_at);
    days.set(day, [...(days.get(day) ?? []), job]);
  }
  return [...days].map(([day, dayJobs]) => ({ day, jobs: dayJobs }));
}

/** `2026-10-01` → "Thu, 1 Oct" (Kenyan time). */
export function agendaDayLabel(day: string): string {
  return new Date(`${day}T12:00:00+03:00`).toLocaleDateString('en-KE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Africa/Nairobi',
  });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/admin/lib/jobs.test.ts`
Expected: PASS.

- [ ] **Step 5: Data hooks**

In `src/admin/lib/jobData.ts`:

1. Replace the imports block and `JOB_WITH_REFS` with:
```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDb } from './db';
import { uploadMedia } from './storage';
import {
  OPEN_STATUSES,
  type AgendaJob,
  type Job,
  type JobFinding,
  type JobPart,
  type JobPhoto,
  type JobWithRefs,
  type PhotoStage,
} from './jobs';

// client + job_cost are owner-only: for staff PostgREST returns null for both embeds.
const JOB_WITH_REFS = '*, client(name), vehicle(registration), job_cost(labour_cost_kes)';
```
2. Replace `export const parts = makeJobChild<JobPart>('job_part', '*', 'created_at');` with:
```ts
// job_part_cost is owner-only: null for staff.
export const parts = makeJobChild<JobPart>('job_part', '*, job_part_cost(cost_kes)', 'created_at');
```
3. Append at the end of the file:
```ts
export interface NewPartInput {
  name: string;
  quantity: number;
  /** Owner only; staff always send null. */
  cost_kes: number | null;
  finding_id: string | null;
}

/** Adds a part; its cost (owner) goes to the owner-only job_part_cost table. */
export function useAddPart(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: NewPartInput) => {
      const db = getDb();
      const { data, error } = await db
        .from('job_part')
        .insert({ job_id: jobId, finding_id: p.finding_id, name: p.name, quantity: p.quantity })
        .select('id')
        .single();
      if (error) throw error;
      if (p.cost_kes !== null) {
        const { error: costError } = await db
          .from('job_part_cost')
          .upsert({ part_id: (data as { id: string }).id, cost_kes: p.cost_kes });
        if (costError) throw costError;
      }
    },
    // Settled, not success: a part saved without its cost must still show up.
    onSettled: () => qc.invalidateQueries({ queryKey: jobChildKey('job_part', jobId) }),
  });
}

/** Labour hours (shared) + labour cost (owner-only job_cost; omit costKes to leave it). */
export function useSaveLabour(jobId: string) {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: async (v: { hours: number | null; costKes?: number | null }) => {
      const db = getDb();
      const { error } = await db.from('job').update({ labour_hours: v.hours }).eq('id', jobId);
      if (error) throw error;
      if (v.costKes !== undefined) {
        const { error: costError } = await db
          .from('job_cost')
          .upsert({ job_id: jobId, labour_cost_kes: v.costKes });
        if (costError) throw costError;
      }
    },
    onSuccess: () => invalidate(jobId),
  });
}

/** Owner: link a walk-in job (and its client-less vehicle) to a client (D5). */
export function useLinkJobClient(job: Pick<Job, 'id' | 'vehicle_id'>) {
  const invalidate = useInvalidateJobs();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (clientId: string) => {
      const db = getDb();
      if (job.vehicle_id) {
        const { error } = await db
          .from('vehicle')
          .update({ client_id: clientId })
          .eq('id', job.vehicle_id)
          .is('client_id', null);
        if (error) throw error;
      }
      const { error } = await db.from('job').update({ client_id: clientId }).eq('id', job.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate(job.id);
      void qc.invalidateQueries({ queryKey: ['vehicle', 'list'] });
    },
  });
}

/** Job schedule (D6): open jobs with a booked date, soonest first. No customer data. */
export function useJobAgenda() {
  return useQuery({
    queryKey: ['jobs', 'agenda'],
    queryFn: async (): Promise<AgendaJob[]> => {
      const { data, error } = await getDb()
        .from('job')
        .select('id, job_number, vehicle_label, status, booked_at')
        .not('booked_at', 'is', null)
        .in('status', [...OPEN_STATUSES])
        .order('booked_at');
      if (error) throw error;
      return (data ?? []) as AgendaJob[];
    },
  });
}
```

- [ ] **Step 6: Walk-in vehicles have no client**

In `src/admin/lib/resources.ts`, in `interface AdminVehicle`, replace `  client_id: string;` with:
```ts
  /** Null for a walk-in until the owner links a client (RBAC D5). */
  client_id: string | null;
```

- [ ] **Step 7: Gate (partial) + commit**

`npm run typecheck` now fails in `PartsEditor.tsx`, `PartsEditor.test.tsx` and `WrapUpTab.tsx` (they still read `cost_kes` / `labour_cost_kes`); Tasks 5 and 6 fix them. Run:

```bash
npx vitest run src/admin/lib/jobs.test.ts && npm run lint
npx prettier --check src/admin/lib/jobs.ts src/admin/lib/jobs.test.ts src/admin/lib/jobData.ts src/admin/lib/resources.ts
git add src/admin/lib/jobs.ts src/admin/lib/jobs.test.ts src/admin/lib/jobData.ts src/admin/lib/resources.ts
git commit -m "feat(jobs): costs read from owner-only tables; staff status options; job agenda data

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Parts editor without costs for staff

**Files:**
- Modify (rewrite): `src/admin/pages/jobs/PartsEditor.tsx`
- Test (rewrite): `src/admin/pages/jobs/PartsEditor.test.tsx`

**Interfaces:**
- Consumes: `JobPart` (with `job_part_cost`), `partCost`, `formatKes` (Task 4).
- Produces: `PartsEditor({ parts, onAdd, onRemove, busy?, showCost? })`, `showCost` default `true`; `NewPart { name: string; quantity: number; cost_kes: number | null }` unchanged.

- [ ] **Step 1: Write the failing test**

Replace `src/admin/pages/jobs/PartsEditor.test.tsx` with:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PartsEditor } from './PartsEditor';
import type { JobPart } from '../../lib/jobs';

const part: JobPart = {
  id: 'p1',
  job_id: 'j1',
  finding_id: 'f1',
  name: 'Oil filter',
  quantity: 1,
  job_part_cost: { cost_kes: 800 },
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

  it('keeps the row when onAdd rejects, and only clears it once onAdd resolves', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockRejectedValueOnce(new Error('nope')).mockResolvedValueOnce(undefined);
    render(<PartsEditor parts={[]} onAdd={onAdd} onRemove={vi.fn()} />);

    await user.type(screen.getByLabelText('Part name'), 'Spark plug');
    await user.click(screen.getByRole('button', { name: 'Add part' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Part name')).toHaveValue('Spark plug');

    await user.click(screen.getByRole('button', { name: 'Add part' }));
    await waitFor(() => expect(screen.getByLabelText('Part name')).toHaveValue(''));
  });

  it('staff mode (showCost=false): no cost field, no cost column, null cost sent', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<PartsEditor parts={[part]} onAdd={onAdd} onRemove={vi.fn()} showCost={false} />);
    expect(screen.queryByLabelText('Cost (KES)')).not.toBeInTheDocument();
    expect(screen.queryByText('KES 800')).not.toBeInTheDocument();
    expect(screen.getByText('×1')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Part name'), 'Wiper');
    await user.click(screen.getByRole('button', { name: 'Add part' }));
    expect(onAdd).toHaveBeenCalledWith({ name: 'Wiper', quantity: 1, cost_kes: null });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/admin/pages/jobs/PartsEditor.test.tsx`
Expected: FAIL — "KES 800" not found (component reads `p.cost_kes`) and the staff-mode test finds a Cost field.

- [ ] **Step 3: Rewrite the component**

Replace `src/admin/pages/jobs/PartsEditor.tsx` with:

```tsx
import { useState } from 'react';
import { Button, Input } from '../../components/ui';
import { formatKes, partCost, type JobPart } from '../../lib/jobs';

export interface NewPart {
  name: string;
  quantity: number;
  cost_kes: number | null;
}

/**
 * Parts used for one fix. Only names ever go public (J2); quantity stays private and
 * cost is owner-only (`showCost` false for staff — RBAC D3).
 */
export function PartsEditor({
  parts,
  onAdd,
  onRemove,
  busy = false,
  showCost = true,
}: {
  parts: JobPart[];
  onAdd: (p: NewPart) => Promise<unknown> | void;
  onRemove: (id: string) => void;
  busy?: boolean;
  showCost?: boolean;
}) {
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [cost, setCost] = useState('');
  const canAdd = name.trim() !== '' && Number(qty) > 0 && !busy;

  const add = async () => {
    try {
      await onAdd({
        name: name.trim(),
        quantity: Number(qty),
        cost_kes: !showCost || cost.trim() === '' ? null : Math.round(Number(cost)),
      });
    } catch {
      return; // keep the row so nothing typed is lost; the caller shows the error
    }
    setName('');
    setQty('1');
    setCost('');
  };

  return (
    <div className="space-y-2">
      {parts.length > 0 && (
        <ul className="divide-y divide-[color:var(--color-line)] text-sm">
          {parts.map((p) => {
            const c = partCost(p);
            return (
              <li key={p.id} className="flex items-center gap-3 py-1.5">
                <span className="flex-1 text-[color:var(--color-ink)]">{p.name}</span>
                <span className="font-mono text-xs text-steel">×{p.quantity}</span>
                {showCost && (
                  <span className="w-24 text-right font-mono text-xs text-steel">
                    {c != null ? formatKes(c) : '—'}
                  </span>
                )}
                <button
                  type="button"
                  aria-label={`Remove ${p.name}`}
                  onClick={() => onRemove(p.id)}
                  className="font-mono text-[10px] text-signal"
                >
                  remove
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div
        className={`grid grid-cols-2 items-end gap-2 ${
          showCost ? 'sm:grid-cols-[1fr_5rem_7rem_auto]' : 'sm:grid-cols-[1fr_5rem_auto]'
        }`}
      >
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
        {showCost && (
          <Input
            aria-label="Cost (KES)"
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="KES"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        )}
        <Button
          aria-label="Add part"
          className="col-span-2 sm:col-span-1"
          disabled={!canAdd}
          onClick={() => void add()}
        >
          Add
        </Button>
      </div>
      <p className="text-xs text-[color:var(--color-muted)]">
        {showCost
          ? 'Only part names can appear on the website. Quantity and cost stay private.'
          : 'Only part names can appear on the website. Quantity stays private.'}
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/admin/pages/jobs/PartsEditor.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit** (typecheck still fails in `WrapUpTab.tsx` until Task 6)

```bash
npm run lint
npx prettier --check src/admin/pages/jobs/PartsEditor.tsx src/admin/pages/jobs/PartsEditor.test.tsx
git add src/admin/pages/jobs/PartsEditor.tsx src/admin/pages/jobs/PartsEditor.test.tsx
git commit -m "feat(jobs): parts editor hides costs for staff

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Job pages for staff — header, list, wrap-up, repair

**Files:**
- Create: `src/admin/pages/jobs/JobHeader.tsx`
- Test: `src/admin/pages/jobs/JobHeader.test.tsx`
- Modify (rewrite): `src/admin/pages/jobs/JobDetailPage.tsx`
- Modify: `src/admin/pages/jobs/JobsPage.tsx`
- Modify (rewrite): `src/admin/pages/jobs/WrapUpTab.tsx`
- Test: `src/admin/pages/jobs/WrapUpTab.test.tsx`
- Modify: `src/admin/pages/jobs/RepairTab.tsx`

**Interfaces:**
- Consumes: `useRole()` (Task 3); `jobStatusOptions`, `jobCostSummary`, `JobWithRefs.job_cost` (Task 4); `useAddPart`, `useSaveLabour`, `useLinkJobClient`, `useUpdateJob`, `useDeleteJob`, `findings`, `parts`, `photos` (`jobData.ts`); `clients` (`resources.ts`); `PartsEditor` `showCost` (Task 5).
- Produces: `JobHeader({ job }: { job: JobWithRefs })`. R-C adds an Activity tab to `JobDetailPage`'s `TABS`.

- [ ] **Step 1: Write the failing header test**

Create `src/admin/pages/jobs/JobHeader.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, type AuthState } from '../../auth/authContext';
import { JobHeader } from './JobHeader';
import type { JobWithRefs } from '../../lib/jobs';

vi.mock('../../lib/jobData', () => ({
  useUpdateJob: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useLinkJobClient: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
}));
vi.mock('../../lib/resources', () => ({
  clients: { useList: () => ({ data: [{ id: 'c1', name: 'Jane Wanjiku', phone: null }] }) },
}));

const job: JobWithRefs = {
  id: 'j1',
  job_number: 'PP-2026-0042',
  client_id: 'c1',
  vehicle_id: 'v1',
  vehicle_label: '2014 Toyota Fielder',
  service_request_id: 'r1',
  service_id: null,
  status: 'in_repair',
  booked_at: null,
  checked_in_at: '2026-09-30T08:00:00Z',
  completed_at: null,
  odometer_km: null,
  complaint: null,
  public_consent: false,
  consent_recorded_at: null,
  labour_hours: null,
  internal_notes: null,
  created_at: '2026-09-30T08:00:00Z',
  updated_at: '2026-09-30T08:00:00Z',
  client: { name: 'Jane Wanjiku' },
  vehicle: { registration: 'KDA 123A' },
  job_cost: null,
};

function renderAs(role: 'owner' | 'staff', j: JobWithRefs = job) {
  const state: AuthState = {
    loading: false,
    session: null,
    profile: { user_id: 'u1', email: 'x@y.co', display_name: 'X', role, is_active: true },
  };
  return render(
    <AuthContext.Provider value={state}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <JobHeader job={j} />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('<JobHeader />', () => {
  it('shows the owner the client and every status', () => {
    renderAs('owner');
    expect(screen.getByRole('link', { name: 'Jane Wanjiku' })).toBeInTheDocument();
    const status = screen.getByLabelText('Status');
    expect(within(status).getByRole('option', { name: 'Cancelled' })).toBeInTheDocument();
  });

  it('hides the client from staff and never offers Cancelled', () => {
    renderAs('staff', { ...job, client: null });
    expect(screen.queryByText('Client')).not.toBeInTheDocument();
    expect(screen.queryByText('Jane Wanjiku')).not.toBeInTheDocument();
    expect(screen.getByText('KDA 123A')).toBeInTheDocument();
    const status = screen.getByLabelText('Status');
    expect(within(status).queryByRole('option', { name: 'Cancelled' })).not.toBeInTheDocument();
  });

  it('lets the owner link a client to a walk-in', () => {
    renderAs('owner', { ...job, client_id: null, client: null, service_request_id: null });
    expect(screen.getByText(/walk-in/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Link a client')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Write the failing wrap-up test**

Create `src/admin/pages/jobs/WrapUpTab.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, type AuthState } from '../../auth/authContext';
import { WrapUpTab } from './WrapUpTab';
import type { JobWithRefs } from '../../lib/jobs';

const saveLabour = vi.fn();
vi.mock('../../lib/jobData', () => {
  const list = () => ({ data: [] });
  const mutation = () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  });
  return {
    findings: { useList: list },
    parts: { useList: list, useRemove: mutation },
    photos: { useList: list },
    useAddPart: mutation,
    useSaveLabour: () => ({ mutate: saveLabour, isPending: false, isError: false, error: null }),
    useUpdateJob: mutation,
    useDeleteJob: mutation,
  };
});
vi.mock('./usePhotoActions', () => ({
  usePhotoActions: () => ({
    upload: vi.fn(),
    togglePublic: vi.fn(),
    remove: vi.fn(),
    uploading: false,
    error: null,
  }),
}));

const job: JobWithRefs = {
  id: 'j1',
  job_number: 'PP-2026-0042',
  client_id: null,
  vehicle_id: 'v1',
  vehicle_label: '2014 Toyota Fielder',
  service_request_id: null,
  service_id: null,
  status: 'in_repair',
  booked_at: null,
  checked_in_at: '2026-09-30T08:00:00Z',
  completed_at: null,
  odometer_km: null,
  complaint: null,
  public_consent: false,
  consent_recorded_at: null,
  labour_hours: 2,
  internal_notes: null,
  created_at: '2026-09-30T08:00:00Z',
  updated_at: '2026-09-30T08:00:00Z',
  client: null,
  vehicle: { registration: null },
  job_cost: { labour_cost_kes: 4000 },
};

function renderAs(role: 'owner' | 'staff') {
  const state: AuthState = {
    loading: false,
    session: null,
    profile: { user_id: 'u1', email: 'x@y.co', display_name: 'X', role, is_active: true },
  };
  return render(
    <AuthContext.Provider value={state}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <WrapUpTab job={job} />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('<WrapUpTab />', () => {
  beforeEach(() => saveLabour.mockReset());

  it('staff: labour hours and completion only — no costs, cancel or delete', async () => {
    const user = userEvent.setup();
    renderAs('staff');
    expect(screen.getByLabelText('Labour hours')).toHaveValue(2);
    expect(screen.queryByLabelText('Labour cost (KES)')).not.toBeInTheDocument();
    expect(screen.queryByText(/cost summary/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel job' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete job' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark completed' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save labour' }));
    expect(saveLabour).toHaveBeenCalledWith({ hours: 2 });
  });

  it('owner: sees and saves the labour cost, cost summary, cancel and delete', async () => {
    const user = userEvent.setup();
    renderAs('owner');
    expect(screen.getByLabelText('Labour cost (KES)')).toHaveValue(4000);
    expect(screen.getByText(/cost summary/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel job' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete job' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save labour' }));
    expect(saveLabour).toHaveBeenCalledWith({ hours: 2, costKes: 4000 });
  });
});
```

- [ ] **Step 3: Run to verify both fail**

Run: `npx vitest run src/admin/pages/jobs/JobHeader.test.tsx src/admin/pages/jobs/WrapUpTab.test.tsx`
Expected: FAIL — `./JobHeader` does not exist; WrapUpTab has no `Labour hours` label and imports the old hooks.

- [ ] **Step 4: Create `JobHeader`**

Create `src/admin/pages/jobs/JobHeader.tsx`:

```tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, Labeled, Select } from '../../components/ui';
import { useRole } from '../../auth/authContext';
import { useLinkJobClient, useUpdateJob } from '../../lib/jobData';
import { clients } from '../../lib/resources';
import {
  jobStatusLabel,
  jobStatusOptions,
  jobStatusTone,
  type JobStatus,
  type JobWithRefs,
} from '../../lib/jobs';

const fieldLabel =
  'font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-muted)]';

/** Client (owner only), registration, status. Staff never see client details (D3). */
export function JobHeader({ job }: { job: JobWithRefs }) {
  const isOwner = useRole() === 'owner';
  const update = useUpdateJob(job.id);
  const options = jobStatusOptions(job.status, isOwner);

  return (
    <Card
      className={`grid gap-4 ${isOwner ? 'sm:grid-cols-[1fr_1fr_14rem]' : 'sm:grid-cols-[1fr_14rem]'}`}
    >
      {isOwner && (
        <div>
          <span className={fieldLabel}>Client</span>
          {job.client_id ? (
            <p className="text-[color:var(--color-ink)]">
              <Link
                to={`/admin/clients/${job.client_id}`}
                className="underline-offset-2 hover:underline"
              >
                {job.client?.name ?? 'Client'}
              </Link>
            </p>
          ) : (
            <LinkClient job={job} />
          )}
        </div>
      )}
      <div>
        <span className={fieldLabel}>Registration</span>
        <p className="font-mono text-[color:var(--color-ink)]">
          {job.vehicle?.registration ?? '—'}
        </p>
      </div>
      <Labeled label="Status">
        <div className="flex items-center gap-2">
          <Select
            aria-label="Status"
            value={job.status}
            disabled={update.isPending || options.length < 2}
            onChange={(e) => update.mutate({ status: e.target.value as JobStatus })}
          >
            {options.map((s) => (
              <option key={s} value={s}>
                {jobStatusLabel[s]}
              </option>
            ))}
          </Select>
          <Badge tone={jobStatusTone(job.status)}>{jobStatusLabel[job.status]}</Badge>
        </div>
        {update.isError && (
          <p className="mt-1 text-xs text-signal">{(update.error as Error).message}</p>
        )}
      </Labeled>
    </Card>
  );
}

/** Owner: attach a client to a walk-in checked in by staff (D5). */
function LinkClient({ job }: { job: JobWithRefs }) {
  const list = clients.useList();
  const link = useLinkJobClient(job);
  const [clientId, setClientId] = useState('');
  return (
    <div className="space-y-2">
      <p className="text-sm text-[color:var(--color-muted)]">Walk-in — no client yet.</p>
      <div className="flex items-end gap-2">
        <Select
          aria-label="Link a client"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
          <option value="">— pick a client —</option>
          {(list.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.phone ? ` · ${c.phone}` : ''}
            </option>
          ))}
        </Select>
        <Button disabled={!clientId || link.isPending} onClick={() => link.mutate(clientId)}>
          Link
        </Button>
      </div>
      {link.isError && <p className="text-xs text-signal">{(link.error as Error).message}</p>}
    </div>
  );
}
```

- [ ] **Step 5: Use it in `JobDetailPage`**

Replace `src/admin/pages/jobs/JobDetailPage.tsx` with:

```tsx
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { EmptyState, PageTitle, Spinner } from '../../components/ui';
import { useJob } from '../../lib/jobData';
import { CheckInTab } from './CheckInTab';
import { DiagnosisTab } from './DiagnosisTab';
import { JobHeader } from './JobHeader';
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
```

- [ ] **Step 6: Rewrite `WrapUpTab`**

Replace `src/admin/pages/jobs/WrapUpTab.tsx` with:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, Label, Labeled } from '../../components/ui';
import { useRole } from '../../auth/authContext';
import {
  findings,
  parts,
  photos,
  useAddPart,
  useDeleteJob,
  useSaveLabour,
  useUpdateJob,
} from '../../lib/jobData';
import { formatKes, jobCostSummary, pendingFindingsCount, type JobWithRefs } from '../../lib/jobs';
import { JobPhotos } from './JobPhotos';
import { PartsEditor } from './PartsEditor';
import { usePhotoActions } from './usePhotoActions';

/** Costs, cancel and delete are owner-only (RBAC D3, D5); the database enforces it too. */
export function WrapUpTab({ job }: { job: JobWithRefs }) {
  const isOwner = useRole() === 'owner';
  const labourCost = job.job_cost?.labour_cost_kes ?? null;
  return (
    <div className="space-y-4">
      <LabourCard key={`${job.labour_hours}|${labourCost}`} job={job} isOwner={isOwner} />
      <UnlinkedCard job={job} isOwner={isOwner} />
      {isOwner && <CostSummary job={job} />}
      <StatusCard job={job} isOwner={isOwner} />
      {isOwner && <DeleteCard job={job} />}
    </div>
  );
}

function LabourCard({ job, isOwner }: { job: JobWithRefs; isOwner: boolean }) {
  const save = useSaveLabour(job.id);
  const [hours, setHours] = useState(job.labour_hours?.toString() ?? '');
  const [cost, setCost] = useState(job.job_cost?.labour_cost_kes?.toString() ?? '');
  const hoursValue = hours.trim() === '' ? null : Number(hours);
  return (
    <Card className="space-y-3">
      <div className={`grid gap-4 ${isOwner ? 'sm:grid-cols-2' : ''}`}>
        <Labeled label="Labour hours — private">
          <Input
            aria-label="Labour hours"
            type="number"
            min="0"
            step="0.25"
            inputMode="decimal"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
        </Labeled>
        {isOwner && (
          <Labeled label="Labour cost (KES) — private">
            <Input
              aria-label="Labour cost (KES)"
              type="number"
              min="0"
              inputMode="numeric"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </Labeled>
        )}
      </div>
      <Button
        disabled={save.isPending}
        onClick={() =>
          save.mutate(
            isOwner
              ? {
                  hours: hoursValue,
                  costKes: cost.trim() === '' ? null : Math.round(Number(cost)),
                }
              : { hours: hoursValue },
          )
        }
      >
        Save labour
      </Button>
      {save.isError && <p className="text-xs text-signal">{(save.error as Error).message}</p>}
    </Card>
  );
}

/** Photos and parts whose problem was deleted: still on the job, still costed, but shown nowhere else. */
function UnlinkedCard({ job, isOwner }: { job: JobWithRefs; isOwner: boolean }) {
  const allPhotos = photos.useList(job.id);
  const allParts = parts.useList(job.id);
  const addPart = useAddPart(job.id);
  const removePart = parts.useRemove(job.id);
  const actions = usePhotoActions(job);
  const loosePhotos = (allPhotos.data ?? []).filter(
    (p) => p.finding_id === null && p.stage !== 'check_in',
  );
  const looseParts = (allParts.data ?? []).filter((p) => p.finding_id === null);
  if (loosePhotos.length === 0 && looseParts.length === 0) return null;
  return (
    <Card className="space-y-3">
      <Label>Unlinked photos &amp; parts</Label>
      <p className="text-xs text-[color:var(--color-muted)]">
        These belonged to a problem that was deleted.
      </p>
      {loosePhotos.length > 0 && (
        <JobPhotos
          photos={loosePhotos}
          canUpload={false}
          onUpload={() => undefined}
          onTogglePublic={actions.togglePublic}
          onDelete={actions.remove}
        />
      )}
      {actions.error && <p className="text-xs text-signal">{actions.error}</p>}
      <PartsEditor
        parts={looseParts}
        busy={addPart.isPending}
        showCost={isOwner}
        onAdd={(p) => addPart.mutateAsync({ ...p, finding_id: null })}
        onRemove={(id) => removePart.mutate(id)}
      />
      {addPart.isError && <p className="text-xs text-signal">{(addPart.error as Error).message}</p>}
      {removePart.isError && (
        <p className="text-xs text-signal">{(removePart.error as Error).message}</p>
      )}
    </Card>
  );
}

function CostSummary({ job }: { job: JobWithRefs }) {
  const allParts = parts.useList(job.id);
  const s = jobCostSummary(job.job_cost?.labour_cost_kes ?? null, allParts.data ?? []);
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

function StatusCard({ job, isOwner }: { job: JobWithRefs; isOwner: boolean }) {
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
          <Button
            disabled={update.isPending}
            onClick={() => update.mutate({ status: 'in_repair' })}
          >
            Re-open job
          </Button>
        </>
      ) : job.status === 'cancelled' ? (
        <>
          <p className="text-sm text-[color:var(--color-muted)]">This job was cancelled.</p>
          {isOwner && (
            <Button
              disabled={update.isPending}
              onClick={() => update.mutate({ status: 'checked_in' })}
            >
              Re-open job
            </Button>
          )}
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="accent" disabled={update.isPending} onClick={complete}>
            Mark completed
          </Button>
          {isOwner && (
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
          )}
        </div>
      )}
      {update.isError && <p className="text-xs text-signal">{(update.error as Error).message}</p>}
      {isOwner && job.service_request_id && job.status !== 'completed' && (
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
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <Button
        variant="danger"
        disabled={del.isPending}
        onClick={async () => {
          if (
            confirm(
              `Delete job ${job.job_number}? Its problems, photo links and parts are removed. Photos stay in the media library.`,
            )
          ) {
            setError(null);
            try {
              await del.mutateAsync(job.id);
            } catch (e) {
              setError((e as Error).message);
              return;
            }
            navigate('/admin/jobs');
          }
        }}
      >
        Delete job
      </Button>
      {error && <p className="text-xs text-signal">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 7: Repair tab — `useAddPart` + `showCost`**

In `src/admin/pages/jobs/RepairTab.tsx`:

1. Replace `import { findings, parts, photos } from '../../lib/jobData';` with:
```tsx
import { useRole } from '../../auth/authContext';
import { findings, parts, photos, useAddPart } from '../../lib/jobData';
```
2. In `RepairTab`, after `const actions = usePhotoActions(job);` add:
```tsx
  const isOwner = useRole() === 'owner';
```
and in the `<RepairCard … />` props add `showCost={isOwner}` after `actions={actions}`.
3. In `RepairCard`'s props destructuring add `showCost,` after `actions,` and in its type add `showCost: boolean;` after `actions: PhotoActions;`.
4. Replace `  const addPart = parts.useCreate(jobId);` with `  const addPart = useAddPart(jobId);`.
5. In the `<PartsEditor … />` inside `RepairCard`, add `showCost={showCost}` after `busy={addPart.isPending}`.

- [ ] **Step 8: Jobs list — no client name for staff**

In `src/admin/pages/jobs/JobsPage.tsx`:

1. Add the import `import { useRole } from '../../auth/authContext';` after the `react-router-dom` import.
2. After `const q = useJobs();` add `  const isOwner = useRole() === 'owner';`.
3. Replace the search `placeholder="Search job number, client or registration…"` with:
```tsx
          placeholder={
            isOwner
              ? 'Search job number, client or registration…'
              : 'Search job number or registration…'
          }
```
4. Replace:
```tsx
              <span className="text-sm text-[color:var(--color-muted)]">
                {j.client?.name ?? 'No client'}
              </span>
```
with:
```tsx
              {isOwner && (
                <span className="text-sm text-[color:var(--color-muted)]">
                  {j.client?.name ?? 'No client'}
                </span>
              )}
```

- [ ] **Step 9: Run the tests**

Run: `npx vitest run src/admin/pages/jobs`
Expected: PASS (JobHeader 3, WrapUpTab 2, PartsEditor 5, JobPhotos unchanged).

- [ ] **Step 10: Full gate + commit** (typecheck is green again from here)

```bash
npm run typecheck && npm run lint && npm run test
npx prettier --check src/admin/pages/jobs
git add src/admin/pages/jobs
git commit -m "feat(jobs): staff job view — no client, request, costs, cancel or delete; owner links walk-ins

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Staff walk-in check-in

**Files:**
- Create: `src/admin/pages/jobs/WalkInForm.tsx`
- Test: `src/admin/pages/jobs/WalkInForm.test.tsx`
- Modify: `src/admin/pages/jobs/NewJobPage.tsx`

**Interfaces:**
- Consumes: `vehicles.useCreate()` (`src/admin/lib/resources.ts`, `mutateAsync(row: Partial<AdminVehicle>): Promise<AdminVehicle>`), `useCreateJob()` (`mutateAsync(row: Partial<Job>): Promise<string>`), `vehicleLabel`, `useRole`.
- Produces: `WalkInForm()`; `NewJobPage` renders `WalkInForm` for staff.

- [ ] **Step 1: Write the failing test**

Create `src/admin/pages/jobs/WalkInForm.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { WalkInForm } from './WalkInForm';

const createVehicle = vi.fn();
const createJob = vi.fn();
vi.mock('../../lib/resources', () => ({
  vehicles: {
    useCreate: () => ({ mutateAsync: createVehicle, isPending: false }),
  },
}));
vi.mock('../../lib/jobData', () => ({
  useCreateJob: () => ({ mutateAsync: createJob, isPending: false }),
}));

function renderForm() {
  return render(
    <MemoryRouter
      initialEntries={['/admin/jobs/new']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/admin/jobs/new" element={<WalkInForm />} />
        <Route path="/admin/jobs/:id" element={<p>Job page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('<WalkInForm />', () => {
  beforeEach(() => {
    createVehicle.mockReset().mockResolvedValue({
      id: 'v1',
      client_id: null,
      make: 'Mazda',
      model: 'Demio',
      year: 2015,
      registration: 'KDC 1',
    });
    createJob.mockReset().mockResolvedValue('j1');
  });

  it('has no client picker', () => {
    renderForm();
    expect(screen.queryByText(/client/i)).not.toBeInTheDocument();
  });

  it('checks in a walk-in from vehicle details alone', async () => {
    const user = userEvent.setup();
    renderForm();
    const submit = screen.getByRole('button', { name: 'Check in vehicle' });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText('Make'), ' Mazda ');
    await user.type(screen.getByLabelText('Model'), 'Demio');
    await user.type(screen.getByLabelText('Year'), '2015');
    await user.type(screen.getByLabelText('Registration'), 'KDC 1');
    await user.type(screen.getByLabelText(/complaint/i), 'Knocking on bumps');
    await user.click(submit);

    expect(createVehicle).toHaveBeenCalledWith({
      client_id: null,
      make: 'Mazda',
      model: 'Demio',
      year: 2015,
      registration: 'KDC 1',
    });
    expect(createJob).toHaveBeenCalledWith({
      vehicle_id: 'v1',
      vehicle_label: '2015 Mazda Demio',
      complaint: 'Knocking on bumps',
    });
    expect(await screen.findByText('Job page')).toBeInTheDocument();
  });

  it('reuses the vehicle if only the job insert failed', async () => {
    createJob.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce('j1');
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText('Make'), 'Mazda');
    await user.click(screen.getByRole('button', { name: 'Check in vehicle' }));
    expect(await screen.findByText('network')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Check in vehicle' }));
    expect(await screen.findByText('Job page')).toBeInTheDocument();
    expect(createVehicle).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/admin/pages/jobs/WalkInForm.test.tsx`
Expected: FAIL — `./WalkInForm` does not exist.

- [ ] **Step 3: Create the form**

Create `src/admin/pages/jobs/WalkInForm.tsx`:

```tsx
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Input, Labeled, PageTitle, Textarea } from '../../components/ui';
import { vehicles, type AdminVehicle } from '../../lib/resources';
import { useCreateJob } from '../../lib/jobData';
import { vehicleLabel } from '../../lib/jobs';

/**
 * Staff check-in (D5): vehicle details only — no client, no request. The database
 * only accepts a staff job with client_id and service_request_id both null; the owner
 * links a client later from the job header.
 */
export function WalkInForm() {
  const createVehicle = vehicles.useCreate();
  const createJob = useCreateJob();
  const navigate = useNavigate();
  // A vehicle inserted by a submit whose job insert then failed — reused on retry.
  const createdVehicle = useRef<AdminVehicle | null>(null);

  const [v, setV] = useState({ make: '', model: '', year: '', registration: '' });
  const [complaint, setComplaint] = useState('');
  const [error, setError] = useState<string | null>(null);

  const busy = createJob.isPending || createVehicle.isPending;
  const canCreate = v.make.trim() !== '' && !busy;

  const setField = (k: keyof typeof v) => (e: { target: { value: string } }) => {
    createdVehicle.current = null;
    setV((p) => ({ ...p, [k]: e.target.value }));
  };

  const submit = async () => {
    setError(null);
    try {
      if (!createdVehicle.current) {
        createdVehicle.current = await createVehicle.mutateAsync({
          client_id: null,
          make: v.make.trim(),
          model: v.model.trim() || null,
          year: v.year ? Number(v.year) : null,
          registration: v.registration.trim() || null,
        });
      }
      const vehicle = createdVehicle.current;
      const id = await createJob.mutateAsync({
        vehicle_id: vehicle.id,
        vehicle_label: vehicleLabel(vehicle),
        complaint: complaint.trim() || null,
      });
      navigate(`/admin/jobs/${id}`, { replace: true });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <section className="space-y-4">
      <PageTitle
        actions={
          <Link
            to="/admin/jobs"
            className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
          >
            ← Back
          </Link>
        }
      >
        Check in a walk-in
      </PageTitle>

      <Card className="grid gap-4 sm:grid-cols-4">
        <Labeled label="Make">
          <Input value={v.make} onChange={setField('make')} placeholder="Toyota" />
        </Labeled>
        <Labeled label="Model">
          <Input value={v.model} onChange={setField('model')} placeholder="Fielder" />
        </Labeled>
        <Labeled label="Year">
          <Input type="number" value={v.year} onChange={setField('year')} />
        </Labeled>
        <Labeled label="Registration">
          <Input value={v.registration} onChange={setField('registration')} />
        </Labeled>
      </Card>

      <Card>
        <Labeled
          label="What the customer says is wrong"
          hint="In your words — this can appear on the website later."
        >
          <Textarea
            aria-label="Complaint"
            rows={3}
            value={complaint}
            onChange={(e) => setComplaint(e.target.value)}
          />
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

- [ ] **Step 4: Switch `NewJobPage` by role**

In `src/admin/pages/jobs/NewJobPage.tsx`:

1. Add imports after the existing `../../lib/jobs` import:
```tsx
import { useRole } from '../../auth/authContext';
import { WalkInForm } from './WalkInForm';
```
2. Replace:
```tsx
/** Start a job — a walk-in, or from a request (`?request=<id>`) with fields prefilled. */
export function NewJobPage() {
```
with:
```tsx
/** Owner: any job (client walk-in, or from a request). Staff: walk-in check-in only (D5). */
export function NewJobPage() {
  return useRole() === 'owner' ? <OwnerNewJobPage /> : <WalkInForm />;
}

/** Start a job — a walk-in, or from a request (`?request=<id>`) with fields prefilled. */
function OwnerNewJobPage() {
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run src/admin/pages/jobs/WalkInForm.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Gate + commit**

```bash
npm run typecheck && npm run lint && npm run test
npx prettier --check src/admin/pages/jobs/WalkInForm.tsx src/admin/pages/jobs/WalkInForm.test.tsx src/admin/pages/jobs/NewJobPage.tsx
git add src/admin/pages/jobs/WalkInForm.tsx src/admin/pages/jobs/WalkInForm.test.tsx src/admin/pages/jobs/NewJobPage.tsx
git commit -m "feat(jobs): staff check in walk-ins from vehicle details alone

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Job schedule for staff (and owner)

**Files:**
- Create: `src/admin/pages/jobs/JobAgenda.tsx`
- Test: `src/admin/pages/jobs/JobAgenda.test.tsx`
- Modify: `src/admin/pages/SchedulePage.tsx` (the `SchedulePage` export at the bottom)

**Interfaces:**
- Consumes: `useJobAgenda()`, `AgendaJob`, `groupAgendaByDay`, `agendaDayLabel`, `jobStatusLabel`, `jobStatusTone` (Task 4); `useRole()`.
- Produces: `JobAgendaList({ jobs }: { jobs: AgendaJob[] })`, `JobAgendaSection()`.

- [ ] **Step 1: Write the failing test**

Create `src/admin/pages/jobs/JobAgenda.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { JobAgendaList } from './JobAgenda';
import type { AgendaJob } from '../../lib/jobs';

const jobs: AgendaJob[] = [
  {
    id: 'j2',
    job_number: 'PP-2026-0043',
    vehicle_label: '2015 Mazda Demio',
    status: 'checked_in',
    booked_at: '2026-10-02T06:00:00+00:00',
  },
  {
    id: 'j1',
    job_number: 'PP-2026-0042',
    vehicle_label: '2014 Toyota Fielder',
    status: 'in_repair',
    booked_at: '2026-10-01T06:00:00+00:00',
  },
];

describe('<JobAgendaList />', () => {
  it('lists booked jobs by day with number, vehicle and status — no customer data', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <JobAgendaList jobs={jobs} />
      </MemoryRouter>,
    );
    const links = screen.getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/admin/jobs/j1', '/admin/jobs/j2']);
    expect(screen.getByText('PP-2026-0042')).toBeInTheDocument();
    expect(screen.getByText('2014 Toyota Fielder')).toBeInTheDocument();
    expect(screen.getByText('In repair')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/admin/pages/jobs/JobAgenda.test.tsx`
Expected: FAIL — `./JobAgenda` does not exist.

- [ ] **Step 3: Create the agenda**

Create `src/admin/pages/jobs/JobAgenda.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { Badge, Card, EmptyState, Spinner } from '../../components/ui';
import { useJobAgenda } from '../../lib/jobData';
import {
  agendaDayLabel,
  groupAgendaByDay,
  jobStatusLabel,
  jobStatusTone,
  type AgendaJob,
} from '../../lib/jobs';

/** Job schedule (D6): job number, vehicle, status by booked day — no customer data. */
export function JobAgendaList({ jobs }: { jobs: AgendaJob[] }) {
  return (
    <div className="space-y-4">
      {groupAgendaByDay(jobs).map((d) => (
        <div key={d.day}>
          <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
            {agendaDayLabel(d.day)}
          </h3>
          <Card className="divide-y divide-[color:var(--color-line)] p-0">
            {d.jobs.map((j) => (
              <Link
                key={j.id}
                to={`/admin/jobs/${j.id}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-[color:var(--color-ground)]"
              >
                <span className="font-mono text-xs text-steel">{j.job_number}</span>
                <span className="font-semibold text-[color:var(--color-ink)]">
                  {j.vehicle_label}
                </span>
                <span className="ml-auto">
                  <Badge tone={jobStatusTone(j.status)}>{jobStatusLabel[j.status]}</Badge>
                </span>
              </Link>
            ))}
          </Card>
        </div>
      ))}
    </div>
  );
}

export function JobAgendaSection() {
  const q = useJobAgenda();
  if (q.isLoading) return <Spinner />;
  if (q.isError) return <p className="text-sm text-signal">{(q.error as Error).message}</p>;
  if ((q.data ?? []).length === 0) {
    return <EmptyState>No open jobs with a booked date.</EmptyState>;
  }
  return <JobAgendaList jobs={q.data!} />;
}
```

- [ ] **Step 4: Schedule page by role**

In `src/admin/pages/SchedulePage.tsx`:

1. Add imports after the `customerEmail` import:
```tsx
import { useRole } from '../auth/authContext';
import { JobAgendaSection } from './jobs/JobAgenda';
```
2. Replace the whole `export function SchedulePage() { … }` at the bottom of the file with:
```tsx
/** Owner: booking requests to confirm + the job agenda. Staff: the job agenda only (D6). */
export function SchedulePage() {
  const isOwner = useRole() === 'owner';
  return (
    <section className="space-y-8">
      <PageTitle>Schedule</PageTitle>
      {isOwner && (
        <div className="space-y-3">
          <h2 className="font-semibold text-[color:var(--color-ink)]">Bookings to confirm</h2>
          <BookingSchedule />
        </div>
      )}
      <div className="space-y-3">
        <h2 className="font-semibold text-[color:var(--color-ink)]">Booked jobs</h2>
        <JobAgendaSection />
      </div>
    </section>
  );
}

function BookingSchedule() {
  const q = useScheduleItems();
  if (q.isLoading) return <Spinner />;
  if ((q.data ?? []).length === 0) return <EmptyState>No bookings to confirm.</EmptyState>;
  return (
    <div className="space-y-3">
      {q.data!.map((r) => (
        <ScheduleRow key={r.id} r={r} />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run src/admin/pages/jobs/JobAgenda.test.tsx`
Expected: PASS.

- [ ] **Step 6: Gate + commit**

```bash
npm run typecheck && npm run lint && npm run test
npx prettier --check src/admin/pages/jobs/JobAgenda.tsx src/admin/pages/jobs/JobAgenda.test.tsx src/admin/pages/SchedulePage.tsx
git add src/admin/pages/jobs/JobAgenda.tsx src/admin/pages/jobs/JobAgenda.test.tsx src/admin/pages/SchedulePage.tsx
git commit -m "feat(schedule): job agenda by booked date; booking requests stay owner-only

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Live RLS checks for the new matrix

These tests run against the live project and are skipped unless the env is present; they go green only after Task 10's `db push`.

**Files:**
- Modify: `src/shared/supabase/rls.test.ts`

- [ ] **Step 1: Add the checks**

In `src/shared/supabase/rls.test.ts`:

1. After `const adminPassword = process.env.TEST_ADMIN_PASSWORD;` add:
```ts
// An active STAFF account (RBAC R-B). TEST_ADMIN_* must be an OWNER account.
const staffEmail = process.env.TEST_STAFF_EMAIL;
const staffPassword = process.env.TEST_STAFF_PASSWORD;
```
2. Inside the `'RLS — anon role'` describe, after the `'CANNOT read the job tables (J1)'` test, add:
```ts
  it('CANNOT read the job cost tables (RBAC)', async () => {
    for (const table of ['job_cost', 'job_part_cost']) {
      const { error } = await db.from(table).select('*').limit(1);
      expect(error?.code, `${table} must be sealed from anon`).toBe('42501');
    }
  });
```
3. Inside the `'RLS — authenticated admin'` describe, after the J1 job-tables test, add:
```ts
  it('owner can read the job cost tables (RBAC)', async () => {
    for (const table of ['job_cost', 'job_part_cost']) {
      const { error } = await admin.from(table).select('*').limit(1);
      expect(error, `${table} should be readable by the owner`).toBeNull();
    }
  });
```
4. At the end of the file add:
```ts
describe.skipIf(!anon || !staffEmail || !staffPassword)('RLS — authenticated staff (RBAC)', () => {
  let staff: SupabaseClient;

  beforeAll(async () => {
    staff = createClient(url!, key!, { auth: { persistSession: false } });
    const { error } = await staff.auth.signInWithPassword({
      email: staffEmail!,
      password: staffPassword!,
    });
    if (error) throw new Error(`staff sign-in failed: ${error.message}`);
  });

  afterAll(async () => {
    await staff?.auth.signOut();
  });

  it('sees no rows in owner-only tables', async () => {
    for (const table of [
      'client',
      'service_request',
      'notification',
      'site_settings',
      'testimonial',
      'job_cost',
      'job_part_cost',
    ]) {
      const { data, error } = await staff.from(table).select('*').limit(5);
      expect(error, `${table} query`).toBeNull();
      expect(data, `${table} must be empty for staff`).toEqual([]);
    }
  });

  it('reads jobs and only its own profile', async () => {
    const jobs = await staff.from('job').select('id').limit(1);
    expect(jobs.error).toBeNull();
    const profiles = await staff.from('profile').select('user_id');
    expect(profiles.error).toBeNull();
    expect(profiles.data).toHaveLength(1);
  });

  it('never gets a client name through a job', async () => {
    const { data, error } = await staff
      .from('job')
      .select('client_id, client(name)')
      .not('client_id', 'is', null)
      .limit(5);
    expect(error).toBeNull();
    for (const row of data ?? []) expect(row.client).toBeNull();
  });

  it('cannot create a client', async () => {
    const { error } = await staff.from('client').insert({ name: 'RLS staff probe' });
    expect(error?.code).toBe('42501');
  });
});
```

- [ ] **Step 2: Gate + commit**

```bash
npm run typecheck && npm run lint && npm run test
npx prettier --check src/shared/supabase/rls.test.ts
git add src/shared/supabase/rls.test.ts
git commit -m "test(rls): cost tables sealed; staff matrix checks (RBAC)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
(`npm run test` passes locally: the new anon checks fail only if run against the live DB before Task 10 — if `.env.local` is present, expect the two `job_cost` anon checks to fail until the push; note it and continue.)

---

### Task 10: STOP — apply live, deploy functions, verify

**Files:** none (live changes + checks).

- [ ] **Step 1: STOP — ask for the push**

Tell the user: "R-B is ready to apply `20261001090000_rbac_owner_staff.sql` to the live project (`aonpdrqtosmqhmomghca`). It changes permissions for every admin table, moves labour/part costs to owner-only tables (copying existing values) and drops the old cost columns. The currently deployed admin reads those columns, so I'll push, verify, and then you merge the PR straight away so Vercel ships the matching UI. OK to run `npx supabase db push`?" Wait for an explicit yes.

- [ ] **Step 2: Push**

```bash
npx supabase db push
```
Expected: `Applying migration 20261001090000_rbac_owner_staff.sql...` then `Finished supabase db push.`

- [ ] **Step 3: Run all SQL tests live**

```bash
for T in rbac jobs_j1 profile_guard; do echo "== $T"; npx supabase db query --linked -f supabase/tests/$T.sql; done
```
Expected: each prints `ALL_PASSED`.

- [ ] **Step 4: Confirm costs survived the move (read-only)**

```bash
npx supabase db query --linked "select (select count(*) from public.job_cost) as labour_rows, (select count(*) from public.job_part_cost) as part_cost_rows"
```
Expected: counts equal the number of jobs / parts that had a cost before (compare with the owner's Wrap-up screens after merge).

- [ ] **Step 5: STOP — ask to deploy the owner-only functions, then deploy**

Ask: "OK to deploy `rebuild` and `notify-customer` (now owner-only)?" After a yes:
```bash
npx supabase functions deploy rebuild
npx supabase functions deploy notify-customer
```

- [ ] **Step 6: Live RLS suite**

With `TEST_ADMIN_EMAIL`/`TEST_ADMIN_PASSWORD` (owner) and `TEST_STAFF_EMAIL`/`TEST_STAFF_PASSWORD` (active staff) exported in the shell:
```bash
npx vitest run src/shared/supabase/rls.test.ts
```
Expected: all anon, owner and staff checks PASS.

- [ ] **Step 7: Manual check with the user (`npm run dev`, or staging after merge)**

Staff account:
1. Lands on **Jobs**; nav shows only Jobs + Schedule. Visiting `/admin/clients` shows "This part of the admin is for the owner" + Sign out + Go to Jobs.
2. **New job** shows the walk-in form (no client picker) → check in a vehicle → job opens.
3. Job header shows registration + status, no client; status list has no "Cancelled".
4. Repair tab: add a part — no cost field; add after photos (upload works).
5. Wrap-up: labour hours only; no cost summary, Cancel or Delete; **Mark completed** works.
6. Schedule: only "Booked jobs".

Owner account:
7. Opens the staff walk-in → header shows "Walk-in — no client yet" → **Link** a client → client name appears; the client's page lists the vehicle.
8. Wrap-up shows labour cost + cost summary with the old values intact; Cancel / Delete present.
9. Schedule shows "Bookings to confirm" and "Booked jobs". Publishing content still works (rebuild not 403).

Any failure → superpowers:systematic-debugging before changing code.

---

### Task 11: Docs + final gates

**Files:**
- Modify: `docs/owner-guide.md` (section "Getting around" — the `Team` bullet; section "Adding a staff member")
- Modify: `docs/pick-up-here.md` (the R-A staff bullet)

- [ ] **Step 1: Owner guide**

In `docs/owner-guide.md`, replace the line `- **Team** — (owner only) add or remove staff logins.` with:
```markdown
- **Team** — (owner only) add or remove staff logins.

**What staff can do:** staff see only **Jobs** and **Schedule** (booked jobs). They can
check in a walk-in from the vehicle details, record diagnosis, repairs, photos, parts
(no prices), labour hours, and complete or re-open a job. They never see clients,
phone numbers, requests, costs, website content or settings, and they can't cancel or
delete a job. A walk-in they check in shows **"Walk-in — no client yet"** on the job —
pick the client there and tap **Link**.
```
and in "## Adding a staff member (owner only)" step 1, replace `pick **Staff** (or **Owner**)` with `pick **Staff** (jobs & schedule only) or **Owner** (everything)`.

- [ ] **Step 2: Pick-up-here**

In `docs/pick-up-here.md`, replace the sentence `Until RBAC R-B ships, staff still have full admin access.` with `Staff see Jobs + Schedule only (RBAC R-B, migration 20261001090000); costs live in the owner-only job_cost / job_part_cost tables.`

- [ ] **Step 3: Full gates**

```bash
npm run typecheck && npm run lint && npm run test && npm run build
npx prettier --check src
```
Expected: all green.

- [ ] **Step 4: Commit + hand off**

```bash
git add docs/owner-guide.md docs/pick-up-here.md
git commit -m "docs: what staff can do (RBAC R-B)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
Use superpowers:finishing-a-development-branch. Push / open the PR only when the user asks (PR body ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`); remind the user to merge promptly after Task 10's push.

---

## Self-review (spec coverage)

| Spec item | Task |
|---|---|
| §3 matrix: staff = Jobs + job schedule; owner everything | 1 (DB), 3 (nav/routes), 6-8 (pages) |
| §4.1 `is_staff()` | 1 |
| §4.2 11 tables → `"<table>: owner all"` | 1 |
| §4.3 `vehicle.client_id` nullable; owner all; staff select/update job vehicles; staff insert only `client_id is null`; trigger blocks staff changing `client_id` | 1 (+ `created_by` read so INSERT…RETURNING works — see Spec issues) |
| §4.4 job policies + guard trigger (client_id, service_request_id, cancel); no staff delete; children `is_admin()`; costs → `job_cost` / `job_part_cost`, copy then drop | 1 |
| §4.4 staff can't read client names (embed null) | 1, 9 |
| §4.5 media owner all / staff insert own / staff read own or job photos; storage update/delete owner-only | 1 |
| §5 auth context exposes role; `<RequireOwner>` with no-access + sign-out | 3 |
| §5 nav: staff Jobs + Schedule, land on `/admin/jobs` | 3 |
| §5 staff job pages hide client, request link, labour cost, part cost, cost summary, Cancel, Delete; walk-in form without client picker | 5, 6, 7 |
| §5 schedule: staff job agenda; owner keeps bookings + sees agenda | 8 |
| §7 staff never read client / service_request / job_cost / job_part_cost / notification / site_settings / other profiles | 1 (`rbac.sql`), 9 |
| §8 SQL `rbac.sql`, keep `jobs_j1.sql` + `profile_guard.sql` green, Vitest RequireOwner / nav / job page hides costs & client | 1, 3, 6, 10 |
| §8 manual staging run (staff sees Jobs + Schedule only, records repair with photos) | 10 |
| Activity log, dashboard feed, Activity tab (§4.6, §5 activity parts) | **R-C** |
