-- Jobs J3: client review links + reviews on job pages (jobs spec §4.2–4.5, §7.2;
-- plan docs/superpowers/plans/2026-10-12-jobs-j3-reviews.md).

-- 4.2 One-time review links. Only the token's SHA-256 is stored; the raw token is shown
-- to the owner once. Owner reads (for the Wrap-up status); nobody writes directly.
create table public.review_invite (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references public.job (id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null default now() + interval '30 days',
  used_at     timestamptz,
  created_by  uuid references auth.users (id) default auth.uid(),
  created_at  timestamptz not null default now()
);
create index review_invite_job_idx on public.review_invite (job_id, created_at desc);
alter table public.review_invite enable row level security;
revoke all on public.review_invite from anon;
revoke insert, update, delete on public.review_invite from authenticated;
grant select on public.review_invite to authenticated;
create policy "review_invite: owner reads" on public.review_invite
  for select to authenticated using (public.is_owner());

-- 4.3 Testimonials can belong to a job; known sources only ('seed' = the starter rows).
alter table public.testimonial
  add column job_id uuid references public.job (id) on delete set null;
create index testimonial_job_idx on public.testimonial (job_id) where job_id is not null;
alter table public.testimonial add constraint testimonial_source_check
  check (source in ('public_form', 'review_link', 'owner_entered', 'seed'));

-- R-C activity: review_link_created / review_received / testimonial_added
alter table public.job_activity drop constraint job_activity_action_check;
alter table public.job_activity add constraint job_activity_action_check check (action in (
  'checked_in', 'status_changed', 'finding_added', 'finding_updated', 'photo_added',
  'photo_removed', 'part_added', 'part_removed', 'labour_updated', 'consent_changed',
  'assigned', 'unassigned', 'published', 'unpublished',
  'review_link_created', 'review_received', 'testimonial_added'));

-- Owner only. Expires the job's earlier unused links and returns a new raw token ONCE.
create function public.create_review_invite(p_job_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  raw text;
begin
  if not public.is_owner() then
    raise exception 'Only the owner can create review links.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.job where id = p_job_id and status = 'completed') then
    raise exception 'Complete the job before asking for a review.'
      using errcode = 'check_violation';
  end if;
  update public.review_invite set expires_at = now()
    where job_id = p_job_id and used_at is null and expires_at > now();
  raw := translate(rtrim(encode(extensions.gen_random_bytes(32), 'base64'), '='), '+/', '-_');
  insert into public.review_invite (job_id, token_hash)
    values (p_job_id, encode(extensions.digest(raw, 'sha256'), 'hex'));
  perform public.log_job_activity(p_job_id, 'review_link_created', '{}'::jsonb);
  return raw;
end; $$;
revoke all on function public.create_review_invite(uuid) from public, anon;
grant execute on function public.create_review_invite(uuid) to authenticated;

-- 4.5 What the review page shows: vehicle, service, completion date — no client data.
-- Zero rows for an unknown, expired or used token.
create function public.review_invite_summary(token text)
returns table (vehicle_label text, service_title text, completed_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select j.vehicle_label, s.title, j.completed_at
  from public.review_invite r
  join public.job j on j.id = r.job_id
  left join public.service s on s.id = j.service_id
  where r.token_hash = encode(extensions.digest(token, 'sha256'), 'hex')
    and r.used_at is null and r.expires_at > now();
$$;
revoke all on function public.review_invite_summary(text) from public;
grant execute on function public.review_invite_summary(text) to anon, authenticated;

-- 7.2 service_role only (the `submit` function). One statement marks the link used, so
-- a double submit cannot both succeed. The review waits for the owner's approval.
create function public.redeem_review_invite(
  token text, first_name text, rating integer, comment text, consent boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  jid uuid;
  tid uuid;
begin
  if consent is not true then
    raise exception 'consent required';
  end if;
  update public.review_invite set used_at = now()
    where token_hash = encode(extensions.digest(token, 'sha256'), 'hex')
      and used_at is null and expires_at > now()
    returning job_id into jid;
  if jid is null then
    raise exception 'invalid invite';
  end if;
  insert into public.testimonial (first_name, vehicle_label, rating, comment, consent,
                                  source, status, job_id)
    select redeem_review_invite.first_name, j.vehicle_label, redeem_review_invite.rating,
           redeem_review_invite.comment, true, 'review_link', 'pending', j.id
    from public.job j where j.id = jid
    returning id into tid;
  perform public.log_job_activity(jid, 'review_received', '{}'::jsonb);
  return tid;
end; $$;
revoke all on function public.redeem_review_invite(text, text, integer, text, boolean)
  from public, anon, authenticated;
grant execute on function public.redeem_review_invite(text, text, integer, text, boolean)
  to service_role;

-- The owner added a testimonial for the client → job activity.
create or replace function public.job_activity_on_testimonial()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.job_id is not null and new.source = 'owner_entered' then
    perform public.log_job_activity(new.job_id, 'testimonial_added', '{}'::jsonb);
  end if;
  return null;
end; $$;
create trigger testimonial_job_activity
  after insert on public.testimonial
  for each row execute function public.job_activity_on_testimonial();

-- job_public: same view plus `testimonial` (appended last) — the job's latest approved
-- review: first name, vehicle, rating, comment, source. Nothing else.
create or replace view public.job_public as
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
           'width', m.width, 'height', m.height, 'variants', m.variants) as obj
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
           '[]'::jsonb) as general_photos,
  (select jsonb_build_object('first_name', t.first_name, 'vehicle_label', t.vehicle_label,
            'rating', t.rating, 'comment', t.comment, 'source', t.source)
   from public.testimonial t
   where t.job_id = pub.id and t.status = 'approved' and t.consent
   order by t.submitted_at desc
   limit 1) as testimonial
from pub left join public.service s on s.id = pub.service_id;
