-- Stored responsive copies of uploaded images.
--
-- The Supabase plan has no image transforms (storage/v1/render/image answers 403
-- FeatureNotEnabled), so the site showed no photos. The admin now makes smaller copies
-- at upload (`uploads/<id>-w480.webp` …) and lists their widths here; the site builds
-- `srcset` from them and otherwise serves the original file. Older rows stay empty.

alter table public.media
  add column variants integer[] not null default '{}';

-- job_public: same view, photos now carry `variants`.
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
           '[]'::jsonb) as general_photos
from pub left join public.service s on s.id = pub.service_id;
