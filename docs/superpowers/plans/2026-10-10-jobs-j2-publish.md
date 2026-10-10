# Jobs J2 — Publish completed jobs to the Portfolio — Implementation Plan

**Goal:** On a **completed** job whose client **consented**, the owner taps **Publish to
website**, checks a preview, and the job appears under **Work** (`/portfolio`) as a
documented timeline — complaint → diagnosis (before photos) → repair (after photos, part
names) → completed — with no private data.

**Spec:** `docs/superpowers/specs/2026-09-30-jobs-work-orders-design.md` — D2, D3, D5, §4.3
(`portfolio_project.job_id`), §4.4 (publish guard, unpublish rules), §4.5 (`job_public`),
§5.5 (publish panel), §5.6 (Content lock), §6.1–6.2 (public list + timeline), §8, §9.
Delivery package **J2** (§10). Builds on J1, RBAC R-A/R-B/R-C and R-D (all live).

**Architecture:** One migration adds `portfolio_project.job_id` (unique, `on delete
restrict`), a publish guard, auto-unpublish triggers and a security-definer view
`job_public` that is the **only** public window onto job data. Publishing is an
owner-only upsert of the job's `portfolio_project` row (R-B: `portfolio_project` is
owner-only), then the existing `usePublish()` rebuild. The public portfolio loaders read
`job_public` for linked entries and render a new `JobTimeline`; the admin preview renders
the same component from the admin's own data through a pure `toPublicTimeline()` that
applies the same filters as the view.

**Tech stack:** Supabase Postgres 17 · React 19 + TS · React Router 6.28 · vite-react-ssg
(prerendered public pages) · TanStack Query 5 · Tailwind v4 · Vitest + RTL.

## Deviations from the spec (for owner approval with this plan)

| Spec | This plan | Why |
|---|---|---|
| §4.5 extend the anon `media` policy for job photos | **Not needed.** `job_public` embeds each public photo's `storage_path`, alt text and size; the bucket is already public-read. The cover keeps using the existing "cover of a published project" policy. | Smaller public surface: anon still can't list `media` rows for jobs. |
| §4.5 `testimonial` inside `job_public` | **Deferred to J3** (reviews). | J3 adds `testimonial.job_id`. |
| §5.5 "any edit to a published job triggers a rebuild" | Publish / Unpublish rebuild automatically; on a published job the panel shows **Update website** for later edits. | One explicit button instead of a rebuild on every keystroke/photo toggle. |
| — | Activity log gains `published` / `unpublished` (R-C). | Owner asked for who-did-what everywhere. |

## Operational prerequisite — flag to the owner

The public site is **prerendered**: a published job appears only after a rebuild. The
`VERCEL_DEPLOY_HOOK_URL` secret is **still not set** (Phase 3 WP10), so today publishing
would say "Saved — goes live on the next deploy". Task 7 asks the owner to create the
hook (Vercel → Project Settings → Git → Deploy Hooks, branch `main`) and set the secret;
otherwise each publish needs a manual Redeploy (build cache **off**).

## Global constraints

- **Branch** `feature/jobs-j2-publish` from up-to-date `main`. Commits authored by the
  user only — **no `Co-Authored-By` trailer** (user preference).
- **One Supabase project** serves staging: migration dry-run first (`begin;` + migration +
  tests + `rollback;` via `npx supabase db query --linked -f`), then STOP for the owner's
  OK before `db push`. This migration only **adds** (column, triggers, view), so the live
  admin keeps working before the UI merges.
- **Never public:** any `client` column, `vehicle.registration`/`vin`, `odometer_km`,
  `labour_hours`, `job_cost`, `job_part_cost`, `job_part.quantity`, `internal_notes`,
  `review_note`, assignees, `job_activity`, non-public photos, `created_by`.
- **Publishing is owner-only** (RLS on `portfolio_project` = owner all, R-B). Staff never
  see the panel.
- Gates per task: `npm run typecheck && npm run lint && npm run test`,
  `npx prettier --check <changed files>`; final task also `npm run build` (content guard).

## File map

| File | Status | Responsibility |
|---|---|---|
| `supabase/migrations/20261010120000_jobs_j2_publish.sql` | Create | `job_id` link, publish guard, auto-unpublish, `job_public`, activity actions |
| `supabase/tests/job_publish.sql` | Create | Rolled-back checks (guard, unpublish, view filters, columns, restrict) |
| `src/shared/jobs/publicTimeline.ts` + test | Create | `JobPublic` types, `toPublicTimeline()`, `jobSlug()`, deferred wording |
| `src/public/components/JobTimeline.tsx` + test | Create | Public timeline (shared with the admin preview) |
| `src/shared/content/queries.ts` | Modify | `job_id` on projects; `getJobPublic(jobId)` |
| `src/shared/supabase/types.ts` | Modify | `PortfolioProjectRow.job_id` |
| `src/public/components/cards.tsx` | Modify | "Documented job" tag on `ProjectCard` |
| `src/public/pages/PortfolioDetailPage.tsx` | Modify | Timeline for linked entries; Service JSON-LD |
| `src/admin/lib/publishJob.ts` + test | Create | `usePublishedProject(jobId)`, `usePublishJob`, `useUnpublishJob`, defaults |
| `src/admin/pages/jobs/PublishCard.tsx` + test | Create | Owner panel: reasons, title/summary, preview, publish/unpublish/update |
| `src/admin/pages/jobs/WrapUpTab.tsx` | Modify | Render `PublishCard` (owner); delete blocked while published |
| `src/admin/pages/content/PortfolioListPage.tsx`, `PortfolioEditPage.tsx` | Modify | Badge + read-only + "Edit in Jobs →" for job entries |
| `src/admin/lib/activity.ts` (+ test) | Modify | `published` / `unpublished` wording |
| `src/shared/supabase/rls.test.ts` | Modify | anon reads `job_public`; job tables still sealed |
| `docs/owner-guide.md`, `docs/pick-up-here.md` | Modify | How to publish; deploy hook |

---

## Task 1 — Migration + SQL test (dry run only)

`supabase/migrations/20261010120000_jobs_j2_publish.sql`:

```sql
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
```

`supabase/tests/job_publish.sql` (DO block ending `raise exception 'ALL_PASSED'`, own
throwaway owner/staff users, as in `job_review.sql`) checks:
1. Owner inserts a published entry for an **in-repair** job → `check_violation`; for a
   completed job **without consent** → `check_violation`; completed + consent → OK.
2. `job_public` returns that job; it contains a public photo but **not** a photo with
   `is_public = false`; parts appear by name; `findings[].before/after` are split by stage.
3. The view's column list (from `information_schema.columns`) is exactly the public set —
   no `client_id`, `odometer_km`, `labour_hours`, `internal_notes`, `review_note`,
   `created_by`, `public_consent`.
4. Staff unticks consent → entry `is_published = false` and `job_public` is empty for it.
5. Re-publish, then owner re-opens (`completed → in_repair`) → unpublished.
6. Deleting a job with a portfolio entry → `foreign_key_violation`.
7. Activity has `published` and `unpublished` rows for the job.
8. As **anon** (`set role anon`): `job_public` readable; `job`, `job_finding`, `job_photo`,
   `job_part` still `insufficient_privilege`.

Dry run (rolled back) with `job_publish`, `job_review`, `rbac`, `job_activity`,
`jobs_j1`, `profile_guard` → all `ALL_PASSED`; then confirm nothing was left behind.
Commit: `feat(db): publish completed, consented jobs to the portfolio (J2)`.

## Task 2 — Shared timeline model (pure, tested)

`src/shared/jobs/publicTimeline.ts`:
- Types `PublicPhoto { id; storage_path; alt_text; caption; width; height }`,
  `PublicFinding { title; diagnosis; fix; outcome; parts: string[]; before: PublicPhoto[]; after: PublicPhoto[] }`,
  `JobPublic` (the view row).
- `toPublicTimeline(job, findings, parts, photos, media)` — builds a `JobPublic` from admin
  data with **the same rules as the view** (public photos only, part names only, findings
  in display order) so the preview equals the published page.
- `jobSlug({ vehicle_label, service_title, job_number })` →
  `2014-toyota-fielder-brake-overhaul-0042` (slugify; digits of the job number last).
- `DEFERRED_LABEL = 'Recommended — not done at client’s request'` (spec §6.2; open item 2).
Tests: slug cases (missing service, accents/punctuation), filters (private photo and
quantity never appear), ordering.

## Task 3 — `JobTimeline` component (public, also used by the preview)

`src/public/components/JobTimeline.tsx` — five steps (Booked/checked in + complaint ·
Diagnosis with before photos · Repair with fix, part names and after photos · Completed),
before/after side by side (stacked on mobile), deferred findings with `DEFERRED_LABEL`,
mono job number + dates, `Img`-style rendering from `storage_path` (via `publicImageUrl`).
RTL tests: renders steps, deferred wording, before/after pairing, no quantity/cost text.

## Task 4 — Public site

- `types.ts`: `PortfolioProjectRow.job_id: string | null`.
- `queries.ts`: projects already `select('*')` (gains `job_id`); add
  `getJobPublic(jobId)` (from `job_public`, `safe()` fallback null).
- `ProjectCard`: **Documented job** tag when `job_id`.
- `PortfolioDetailPage`: loader also fetches `getJobPublic(project.job_id)` when linked;
  renders `JobTimeline` instead of `body_md`/gallery; JSON-LD adds a `Service`
  (`name` = service title, `description` = summary, vehicle in `description` text only)
  beside the breadcrumb. **No client data in meta/OG/JSON-LD.**
- Ordering on `/portfolio`: `project_date desc nulls last`, then `display_order`.
Tests: card tag; detail page renders timeline for a linked project (loader data mocked).

## Task 5 — Admin publish panel (owner)

`src/admin/lib/publishJob.ts`:
- `usePublishedProject(jobId)` → the job's `portfolio_project` row or null.
- `usePublishJob(job)` → upsert: first time insert `{ job_id, slug: jobSlug(…), title,
  summary, service_id, project_date: completed_at::date, cover_media_id, vehicle_make/
  model/year (from the vehicle), is_published: true }`; later publishes update title,
  summary, cover, date and `is_published = true` (slug kept stable). Then `usePublish()`.
- `useUnpublishJob(job)` → `is_published = false`, then `usePublish()`.
- `publishBlockers(job)` → reasons: not completed / no consent / no public photos (warning
  only).
- Defaults: title `"<service> — <vehicle label>"` (or vehicle label alone), summary = first
  line of the complaint; cover = first public repair photo, else first public photo.

`src/admin/pages/jobs/PublishCard.tsx` (owner only, on Wrap-up):
- Disabled with the reason(s) until completed + consent.
- Title + summary inputs, **Preview** (renders `JobTimeline` from `toPublicTimeline`),
  **Publish to website**; when published: link to `/portfolio/<slug>`, **Update website**
  and **Unpublish**; shows the `usePublish()` message ("live in ~1–2 min" / "goes live on
  next deploy").
- Delete job while published → friendly "Unpublish it first" (FK `23503`).
Tests: blockers, defaults, publish payload, unpublish, preview hides private photos.

## Task 6 — Content-side lock + activity wording + RLS checks

- Portfolio list: **Documented job** badge; edit page read-only for `job_id` entries with
  **Edit in Jobs →** (`/admin/jobs/<job_id>?tab=wrap-up`).
- `activity.ts`: `published` → "published the job to the website"; `unpublished` → "took
  the job off the website".
- `rls.test.ts`: anon can `select` from `job_public` (no error); job tables still 42501.

## Task 7 — STOP: deploy hook, apply live, verify

1. Ask the owner to create the Vercel Deploy Hook and run
   `npx supabase secrets set VERCEL_DEPLOY_HOOK_URL=<hook>` (or accept manual redeploys).
2. Ask for OK → `npx supabase db push`; run all six SQL suites live; live RLS suite.
3. Owner merges the PR (additive migration: no ordering risk).
4. Acceptance on staging: complete a consented job with before/after photos (one hidden)
   → Publish → preview matches → live at `/portfolio/<slug>` after the rebuild: timeline,
   part names, no plate/odometer/costs/client, hidden photo absent → untick consent →
   gone after the next rebuild → Content shows the entry as read-only "Documented job".

## Task 8 — Docs + final gates

Owner guide ("Publishing a job"), `pick-up-here.md` (J2 live, deploy hook status, J3
next). Full gates incl. `npm run build`.

## Self-review against the spec

D2 manual publish after completion + consent (guard + panel) ✓ · D3 linked entry,
manual entries untouched ✓ · D5 part names only, odometer/costs private ✓ · §4.4 consent
revoke + re-open unpublish ✓ · §4.5 view is the only public window ✓ · §5.5 panel +
preview + stable slug ✓ · §5.6 Content lock ✓ · §6.1/6.2 list tag + timeline + JSON-LD ✓
· §8 delete blocked, cancelled can't publish (not completed) ✓ · Testimonials → J3.
