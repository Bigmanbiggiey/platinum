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
set search_path = ''
as $$
declare
  y integer := extract(year from (coalesce(new.checked_in_at, now()) at time zone 'Africa/Nairobi'))::int;
  n integer;
begin
  insert into public.job_number_counter as c (year, last_value)
    values (y, 1)
    on conflict (year) do update set last_value = c.last_value + 1
    returning c.last_value into n;
  new.job_number := format('PP-%s-%s', y, case when n < 10000 then lpad(n::text, 4, '0') else n::text end);
  return new;
end;
$$;

create trigger job_assign_number before insert on public.job
  for each row execute function public.assign_job_number();

-- Consent + completion timestamps.
create or replace function public.job_stamp_times()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.public_consent then
    if tg_op = 'INSERT' then
      new.consent_recorded_at := now();
    elsif not old.public_consent then
      new.consent_recorded_at := now();
    else
      -- consent stays true: the timestamp is immutable (callers cannot forge it)
      new.consent_recorded_at := old.consent_recorded_at;
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
set search_path = ''
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
