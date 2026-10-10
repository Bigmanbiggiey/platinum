-- Jobs J2: publish completed, consented jobs to the portfolio (jobs spec §4.3–4.5).

-- 4.3 Link (restrict = "unpublish before deleting a published job")
alter table public.portfolio_project
  add column job_id uuid unique references public.job (id) on delete restrict;

-- 4.4 Publish guard: a job entry can only be published when completed + consented.
create or replace function public.guard_portfolio_publish()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.job_id is not null and new.is_published and not exists (
       select 1 from public.job j
       where j.id = new.job_id and j.status = 'completed' and j.public_consent)
  then
    raise exception 'Only a completed job with the client''s consent can be published.'
      using errcode = 'check_violation';
  end if;
  return new;
end; $$;
create trigger portfolio_publish_guard
  before insert or update on public.portfolio_project
  for each row execute function public.guard_portfolio_publish();

-- 4.4 Consent withdrawn, or the job leaves `completed` → unpublish (staff can change
-- consent, so SECURITY DEFINER: portfolio_project is owner-only).
create or replace function public.job_auto_unpublish()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (old.public_consent and not new.public_consent)
     or (old.status = 'completed' and new.status <> 'completed') then
    update public.portfolio_project set is_published = false
      where job_id = new.id and is_published;
  end if;
  return null;
end; $$;
create trigger job_auto_unpublish
  after update of public_consent, status on public.job
  for each row execute function public.job_auto_unpublish();

-- R-C activity: published / unpublished
alter table public.job_activity drop constraint job_activity_action_check;
alter table public.job_activity add constraint job_activity_action_check check (action in (
  'checked_in', 'status_changed', 'finding_added', 'finding_updated', 'photo_added',
  'photo_removed', 'part_added', 'part_removed', 'labour_updated', 'consent_changed',
  'assigned', 'unassigned', 'published', 'unpublished'));
create or replace function public.job_activity_on_publish()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.job_id is not null
     and new.is_published is distinct from coalesce(old.is_published, false) then
    perform public.log_job_activity(new.job_id,
      case when new.is_published then 'published' else 'unpublished' end,
      jsonb_build_object('slug', new.slug));
  end if;
  return null;
end; $$;
create trigger portfolio_publish_activity
  after insert or update of is_published on public.portfolio_project
  for each row execute function public.job_activity_on_publish();

-- 4.5 The only public window onto job data. Runs as its owner (bypasses RLS) and
-- selects ONLY public columns, ONLY for published + consented + completed jobs,
-- ONLY public photos.
create view public.job_public as
with pub as (
  select j.*, p.slug as portfolio_slug
  from public.job j
  join public.portfolio_project p on p.job_id = j.id and p.is_published
  where j.public_consent and j.status = 'completed'
),
photo as (
  select ph.job_id, ph.finding_id, ph.stage, ph.display_order, ph.created_at,
         jsonb_build_object('id', m.id, 'storage_path', m.storage_path,
           'alt_text', m.alt_text, 'caption', coalesce(ph.caption, m.caption),
           'width', m.width, 'height', m.height) as obj
  from public.job_photo ph join public.media m on m.id = ph.media_id
  where ph.is_public
)
select
  pub.id as job_id, pub.job_number, pub.portfolio_slug, pub.vehicle_label,
  pub.service_id, s.title as service_title,
  pub.booked_at, pub.checked_in_at, pub.completed_at, pub.complaint,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'title', f.title, 'diagnosis', f.diagnosis, 'fix', f.fix, 'outcome', f.outcome,
      'parts', coalesce((select jsonb_agg(pt.name order by pt.created_at)
                         from public.job_part pt where pt.finding_id = f.id), '[]'::jsonb),
      'before', coalesce((select jsonb_agg(ph.obj order by ph.display_order, ph.created_at)
                          from photo ph where ph.finding_id = f.id and ph.stage = 'diagnosis'), '[]'::jsonb),
      'after', coalesce((select jsonb_agg(ph.obj order by ph.display_order, ph.created_at)
                         from photo ph where ph.finding_id = f.id and ph.stage = 'repair'), '[]'::jsonb)
    ) order by f.display_order, f.created_at)
    from public.job_finding f where f.job_id = pub.id), '[]'::jsonb) as findings,
  coalesce((select jsonb_agg(ph.obj order by ph.display_order, ph.created_at)
            from photo ph
            where ph.job_id = pub.id and (ph.stage = 'check_in' or ph.finding_id is null)),
           '[]'::jsonb) as general_photos
from pub left join public.service s on s.id = pub.service_id;

revoke all on public.job_public from public;
grant select on public.job_public to anon, authenticated;
