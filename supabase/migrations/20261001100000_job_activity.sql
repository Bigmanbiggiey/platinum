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
