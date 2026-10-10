-- Platinum Point Automotive Engineering — R-D (part 2): job review + team assignment.
-- Spec: docs/superpowers/specs/2026-10-10-job-review-assignment-design.md §3.
--
-- Staff submit a job for review; only the owner completes it (approve) or sends it back
-- with a note. The owner assigns jobs to one or several people. Walk-in clients (§3.3)
-- need no schema change. Server roles (postgres, service_role) are unaffected.

-- ===========================================================================
-- 3.1 Review
-- ===========================================================================
alter table public.job
  add column review_note  text,
  add column submitted_at timestamptz;

-- Non-owners (R-B rules + review rules). SECURITY INVOKER on purpose: current_user must
-- be the caller's role (same pattern as guard_profile_privileges).
create or replace function public.guard_job_privileges()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' or public.is_owner() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status not in ('checked_in', 'diagnosing', 'in_repair') then
      raise exception 'A new job starts open.' using errcode = 'insufficient_privilege';
    end if;
    if new.review_note is not null then
      raise exception 'Only the owner can write a review note.'
        using errcode = 'insufficient_privilege';
    end if;
    return new;
  end if;

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
  if new.review_note is distinct from old.review_note then
    raise exception 'Only the owner can write a review note.'
      using errcode = 'insufficient_privilege';
  end if;
  if new.status is distinct from old.status then
    if old.status in ('awaiting_review', 'completed') then
      raise exception 'Only the owner can change a job that is awaiting review or completed.'
        using errcode = 'insufficient_privilege';
    end if;
    if new.status = 'completed' then
      raise exception 'Only the owner can complete a job — submit it for review.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;

drop trigger job_guard_privileges on public.job;
create trigger job_guard_privileges
  before insert or update on public.job
  for each row execute function public.guard_job_privileges();

-- submitted_at is set only here (never from the browser); approving clears the note.
create or replace function public.job_review_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.submitted_at := case when new.status = 'awaiting_review' then now() end;
    return new;
  end if;
  if new.status = 'awaiting_review' and old.status is distinct from 'awaiting_review' then
    new.submitted_at := now();
  else
    new.submitted_at := old.submitted_at;
  end if;
  if new.status = 'completed' and old.status = 'awaiting_review' then
    new.review_note := null;
  end if;
  return new;
end;
$$;

create trigger job_review_fields
  before insert or update on public.job
  for each row execute function public.job_review_fields();

-- Tell the owner a job is waiting.
alter table public.notification drop constraint notification_type_check;
alter table public.notification add constraint notification_type_check
  check (type in ('request', 'booking', 'testimonial', 'job_review'));

create or replace function public.notify_job_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  who text;
begin
  if new.status = 'awaiting_review' and old.status is distinct from 'awaiting_review' then
    select coalesce(nullif(btrim(p.display_name), ''), p.email) into who
      from public.profile p where p.user_id = auth.uid();
    insert into public.notification (type, title, body, entity_type, entity_id)
    values (
      'job_review',
      'Job ready for review',
      concat_ws(' · ', new.job_number, new.vehicle_label, who),
      'job',
      new.id
    );
  end if;
  return null;
end;
$$;

create trigger job_notify_review
  after update of status on public.job
  for each row execute function public.notify_job_review();

revoke execute on function public.notify_job_review() from public, anon, authenticated;

-- ===========================================================================
-- 3.2 Assignment (one person or a team)
-- ===========================================================================
create table public.job_assignee (
  job_id      uuid not null references public.job (id) on delete cascade,
  user_id     uuid not null references public.profile (user_id) on delete cascade,
  assigned_by uuid references auth.users (id) on delete set null default auth.uid(),
  assigned_at timestamptz not null default now(),
  primary key (job_id, user_id)
);
create index job_assignee_user_idx on public.job_assignee (user_id);

create or replace function public.guard_job_assignee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.profile p where p.user_id = new.user_id and p.is_active) then
    raise exception 'Only active team members can be assigned to a job.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger job_assignee_guard
  before insert or update on public.job_assignee
  for each row execute function public.guard_job_assignee();

alter table public.job_assignee enable row level security;
create policy "job_assignee: owner all" on public.job_assignee
  for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "job_assignee: staff read" on public.job_assignee
  for select to authenticated using (public.is_staff());
revoke all on public.job_assignee from anon;
grant select, insert, update, delete on public.job_assignee to authenticated;

-- Staff can only read their own profile (R-B), so names come through this view: it
-- runs as its owner and exposes nothing but the assignee's display name.
create view public.job_assignee_named as
  select a.job_id, a.user_id, a.assigned_at,
         coalesce(nullif(btrim(p.display_name), ''), p.email) as display_name
  from public.job_assignee a
  join public.profile p on p.user_id = a.user_id
  where public.is_admin();
revoke all on public.job_assignee_named from anon, public;
grant select on public.job_assignee_named to authenticated;

-- Activity (R-C): "assigned Kevin" / "unassigned Kevin".
alter table public.job_activity drop constraint job_activity_action_check;
alter table public.job_activity add constraint job_activity_action_check
  check (action in (
    'checked_in', 'status_changed', 'finding_added', 'finding_updated',
    'photo_added', 'photo_removed', 'part_added', 'part_removed',
    'labour_updated', 'consent_changed', 'assigned', 'unassigned'));

create or replace function public.job_activity_on_assignee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec  public.job_assignee%rowtype;
  name text;
begin
  if tg_op = 'INSERT' then rec := new; else rec := old; end if;
  select coalesce(nullif(btrim(p.display_name), ''), p.email) into name
    from public.profile p where p.user_id = rec.user_id;
  perform public.log_job_activity(rec.job_id,
    case when tg_op = 'INSERT' then 'assigned' else 'unassigned' end,
    jsonb_build_object('name', name));
  return null;
end;
$$;

create trigger job_assignee_activity_log
  after insert or delete on public.job_assignee
  for each row execute function public.job_activity_on_assignee();

revoke execute on function public.job_activity_on_assignee() from public, anon, authenticated;
revoke execute on function public.guard_job_assignee() from public, anon, authenticated;
