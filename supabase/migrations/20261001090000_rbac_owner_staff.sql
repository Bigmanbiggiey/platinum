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
