# Jobs J3 — Client review links + reviews on job pages — Implementation Plan

**Goal:** On a **completed** job the owner taps **Get review link**, sends it to the client
on WhatsApp (or copies it), and the client leaves a rating + comment at `/review/<code>`
— once, within 30 days, without an account. After the owner approves it, the review shows
on the job's public page (and on `/testimonials`). When a client won't use a link, the
owner can **add the testimonial on the client's behalf**; it is labelled publicly as
*"Shared with us by the client"*.

**Spec:** `docs/superpowers/specs/2026-09-30-jobs-work-orders-design.md` — D4, §4.2
(`review_invite`), §4.3 (`testimonial.job_id`, `source` check), §4.5
(`review_invite_summary`, `testimonial` in `job_public`), §5.4 Wrap-up, §5.6
(moderation shows job number), §6.2 step 5, §6.3, §7.2, §8, §9. Delivery package **J3**
(§10). Builds on J1, J2, RBAC R-A–R-D (all live).

**Architecture:** One migration adds `review_invite`, `testimonial.job_id`, a `source`
check, three security-definer functions and a `testimonial` field on `job_public`:

- `create_review_invite(job_id) → text` (owner only): makes a random token in the
  database, stores only its SHA-256, expires earlier unused links for the job, returns
  the raw token once.
- `review_invite_summary(token)` (anon): vehicle, service and completion date for a
  live link, else nothing.
- `redeem_review_invite(...)` (`service_role` only): marks the link used and inserts a
  `pending` testimonial in one statement, so a double submit can't both succeed.

The `submit` Edge Function gains `kind: 'review'`, which calls the redeem function. A new
prerendered shell at `/review` reads the code from the URL client-side.

**Tech stack:** Supabase Postgres 17 (pgcrypto in `extensions`) · Deno Edge Functions ·
React 19 + TS · vite-react-ssg · TanStack Query 5 · Tailwind v4 · Vitest + RTL.

## Decisions / deviations from the spec (for owner approval with this plan)

| Spec | This plan | Why |
|---|---|---|
| §4.2 token "shown to the owner once" (generator unspecified) | The token is generated **in Postgres** (`gen_random_bytes(32)`, base64url, 43 chars) by `create_review_invite`. | The raw token never travels from the browser to the DB, and the "expire older links" rule happens in the same transaction. |
| §7.1 new tables `is_admin()` CRUD | **`review_invite` is owner-only** (select for the Wrap-up status; no direct insert/update). Owner-entered testimonials are owner-only (as `testimonial` already is, R-B). | Staff can't read client phone numbers (R-B), so they couldn't send the link anyway; keeps review handling with the owner. |
| §4.3 `source in ('public_form','review_link','owner_entered')` | Also allows **`'seed'`**. | One live row has `source = 'seed'`; the constraint would fail without it. |
| §6.3 consent tick on the review form | **Required** to submit, like today's testimonial form. | One rule for every public testimonial; nothing unconsented sits in the table. |
| §4.5 `testimonial` in `job_public` | The **latest approved** testimonial linked to the job (one per job page). | A job page shows one review. More than one still appear on `/testimonials`. |
| — | Job must be **completed** to create a link (DB check). The job need **not** be published. | Collect reviews early; they appear on the job page whenever it is published. |
| — | Activity log gains `review_link_created`, `review_received`, `testimonial_added`. | Who-did-what everywhere (R-C). |
| — | Approving or adding a testimonial on a job that is on the website rebuilds the site (existing debounced rebuild; owner-entered goes at once). | Same behaviour as other public edits. |

## Global constraints

- **Branch** `feature/jobs-j3-reviews` from up-to-date `main`. Commits authored by the
  user only — **no `Co-Authored-By` trailer, no Claude PR footer** (user preference).
- **One Supabase project** serves staging: dry-run the migration first (`begin;` +
  migration + `supabase/tests/job_reviews.sql` + `rollback;` via
  `npx supabase db query --linked -f`), then **STOP** for the owner to run
  `npx supabase db push`. The migration only **adds** (table, column, constraint,
  functions, one view column), so the live admin keeps working before the UI merges.
- The owner deploys `submit` (`npx supabase functions deploy submit`) — production deploys
  are the owner's.
- **Never public:** `review_invite` rows (anon gets nothing but `review_invite_summary`),
  client name/phone/email, registration, anything already private in J2. The review page
  shows the **vehicle label, service and completion date only**.
- Invalid / expired / used links always get **one generic message** — no hint which.
- Gates per task: `npm run typecheck && npm run lint && npm run test`,
  `npx prettier --check <changed files>`; final task also `npm run build`.

## File map

| File | Status | Responsibility |
|---|---|---|
| `supabase/migrations/20261012120000_jobs_j3_reviews.sql` | Create | `review_invite`, `testimonial.job_id` + source check, 3 functions, `job_public.testimonial`, activity |
| `supabase/tests/job_reviews.sql` | Create | Rolled-back checks (see Task 1) |
| `supabase/functions/submit/index.ts` | Modify | `kind: 'review'` → `redeem_review_invite` |
| `src/shared/jobs/publicTimeline.ts` + test | Modify | `JobPublic.testimonial`; `toPublicTimeline` takes one |
| `src/public/components/JobTimeline.tsx` + test | Modify | Step 5 "Client review" (+ owner-entered label) |
| `src/public/pages/ReviewPage.tsx` + test | Create | `/review/:code` shell: summary lookup → form → thanks / generic invalid |
| `src/public/forms/useSubmit.ts` | Modify | `SubmitKind` gains `'review'` |
| `src/routes.tsx` | Modify | `review` route (prerendered once) |
| `vercel.json` | Modify | rewrite `/review/:code → /review` |
| `scripts/finalize-seo.mjs` | Modify | `/review` out of the sitemap; `Disallow: /review` |
| `src/admin/lib/reviews.ts` + test | Create | `useReviewInvites(jobId)`, `useCreateReviewInvite`, `useAddOwnerTestimonial`, `reviewUrl()`, `whatsappLink()` |
| `src/admin/pages/jobs/ReviewCard.tsx` + test | Create | Wrap-up card (owner): link status, Get link / New link, Copy, WhatsApp, Add on client's behalf |
| `src/admin/pages/jobs/WrapUpTab.tsx` | Modify | Render `ReviewCard` for completed jobs (owner) |
| `src/admin/pages/content/TestimonialsPage.tsx` | Modify | Job number link + source badge |
| `src/admin/lib/resources.ts`, `src/shared/supabase/types.ts` | Modify | `job_id`, `source` on testimonial rows |
| `src/admin/lib/activity.ts` | Modify | Wording for the 3 new activity actions |
| `docs/pick-up-here.md` | Modify | Status |

## Task 1 — Migration + SQL test (dry run only)

```sql
-- Jobs J3: client review links (jobs spec §4.2–4.5, §7.2).

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
grant select on public.review_invite to authenticated;          -- no direct writes
create policy "review_invite: owner reads" on public.review_invite
  for select to authenticated using (public.is_owner());

alter table public.testimonial
  add column job_id uuid references public.job (id) on delete set null;
create index testimonial_job_idx on public.testimonial (job_id) where job_id is not null;
alter table public.testimonial add constraint testimonial_source_check
  check (source in ('public_form', 'review_link', 'owner_entered', 'seed'));

-- Owner only. Returns the raw token ONCE; only its hash is stored.
create function public.create_review_invite(p_job_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare raw text;
begin
  if not public.is_owner() then
    raise exception 'Only the owner can create review links.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.job where id = p_job_id and status = 'completed') then
    raise exception 'Complete the job before asking for a review.' using errcode = 'check_violation';
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

-- Anon: what the review page shows. Zero rows for bad / expired / used tokens.
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

-- service_role only (the `submit` function). Atomic: a link redeems once.
create function public.redeem_review_invite(
  token text, first_name text, rating int, comment text, consent bool)
returns uuid language plpgsql security definer set search_path = '' as $$
declare jid uuid; tid uuid;
begin
  if consent is not true then raise exception 'consent required'; end if;
  update public.review_invite set used_at = now()
    where token_hash = encode(extensions.digest(token, 'sha256'), 'hex')
      and used_at is null and expires_at > now()
    returning job_id into jid;
  if jid is null then raise exception 'invalid invite'; end if;
  insert into public.testimonial (first_name, vehicle_label, rating, comment, consent,
                                  source, status, job_id)
    select first_name, j.vehicle_label, rating, comment, true, 'review_link', 'pending', j.id
    from public.job j where j.id = jid
    returning id into tid;
  perform public.log_job_activity(jid, 'review_received', '{}'::jsonb);
  return tid;
end; $$;
revoke all on function public.redeem_review_invite(text, text, int, text, bool)
  from public, anon, authenticated;
grant execute on function public.redeem_review_invite(text, text, int, text, bool) to service_role;
```

Plus, in the same migration:
- **Activity:** extend `job_activity_action_check` with `review_link_created`,
  `review_received`, `testimonial_added`. Add a trigger on `testimonial` insert with
  `source = 'owner_entered'` and `job_id` set → `testimonial_added`.
  `log_job_activity` already accepts no signed-in user (the redeem runs as
  `service_role`, so the actor is null); the Activity tab names that actor "Client".
- **`job_public`:** `create or replace view` with one new column, added **last** (Postgres
  only allows appending columns): `testimonial` = latest approved testimonial with
  `job_id = pub.id` as `{first_name, vehicle_label, rating, comment, source}`, else null.
- **Moderation notification:** unchanged. `notify_on_testimonial` already fires on insert.

`supabase/tests/job_reviews.sql` (rolled back) checks:
- anon cannot select `review_invite` or execute `create_review_invite` /
  `redeem_review_invite`; staff cannot create a link.
- Creating a link on a non-completed job raises. A second link expires the first.
- Summary returns the row for a live token, and nothing for bad / expired / used tokens.
- Redeem succeeds once; the second redeem with the same token raises. Redeeming an
  expired token raises. Redeeming without consent raises.
- The testimonial lands `pending`, `review_link`, with `job_id` and the job's
  `vehicle_label`. `job_public.testimonial` is null until it is approved, then shows no
  private column.
- The source check rejects `'other'`. Deleting a job nulls `testimonial.job_id` and
  removes its invites.

**STOP:** show the dry-run output; the owner runs `npx supabase db push`.

## Task 2 — `submit`: `kind: 'review'`

- Same honeypot / timing / Turnstile layers (they run before the kind switch already).
- Validate `token` (base64url, 43 chars), `first_name` (≤80), `comment` (≤2000),
  `rating` 1–5 (required on reviews), `consent === true`. Bad shape → `422 validation`.
- `supabase.rpc('redeem_review_invite', {...})`. Any DB error → **`410
  { ok:false, error:'invalid-link' }`**, whatever the reason (no enumeration).
- Success → `notifyOwner('testimonial', …)` as today → `{ ok: true }`.
- **Owner deploys:** `npx supabase functions deploy submit`.

## Task 3 — Public review page

- Route `review` in `src/routes.tsx` → `ReviewPage` (no loader; prerenders one shell).
  `vercel.json` rewrite `{ "source": "/review/:code", "destination": "/review" }`.
- The page reads the code from `location.pathname`. Until the code is read it shows
  a spinner. It must not render differently at build time, to avoid a hydration mismatch.
- Next it calls `rpc('review_invite_summary', { token })`:
  - No row, or no code → *"This link is no longer valid — please contact us."* plus the
    WhatsApp/phone contact buttons.
  - A row → *"How did we do on your 2014 Toyota Fielder (Brake overhaul, completed
    12 Sep 2026)?"* and a form with first name, star rating (required), comment, consent
    tick, honeypot and Turnstile.
- Submit goes through `useSubmit('review', { token, … })`. `ok` → thank-you. `410` → the
  generic invalid message. Anything else → the existing "call or WhatsApp us" error.
- The page has `noindex,nofollow` meta. `finalize-seo.mjs` drops `/review` from the
  sitemap and adds `Disallow: /review` to the public robots.
- Tests (RTL): invalid state, valid state renders the vehicle, validation messages, and
  the success and 410 paths. `fetch` and `rpc` are mocked.

## Task 4 — Reviews on job pages

- `JobPublic.testimonial: { first_name; vehicle_label; rating: number|null; comment;
  source } | null`.
- `JobTimeline` step 5, **Client review**: stars, the comment, and "— First name,
  vehicle". `source === 'owner_entered'` adds *"Shared with us by the client"*. Nothing
  renders when there is no review.
- The admin preview (`toPublicTimeline`) is passed the job's latest approved testimonial,
  so the preview matches the public page.
- Tests: the timeline with and without a review, and the owner-entered label.

## Task 5 — Admin: Review card on Wrap-up (owner, completed jobs)

- `useReviewInvites(jobId)` reads the newest invite → the status line:
  - **No link yet**
  - **Link sent {date} — expires {date}**
  - **Review received {date}** (with a link to Testimonials)
  - **Link expired**
- **Get review link** / **New link** calls `rpc('create_review_invite')` and shows the URL
  **once**, `${location.origin}/review/<token>`, with:
  - **Copy**
  - **Send on WhatsApp**: `wa.me/<number>?text=…`, using `client.whatsapp ?? client.phone`.
    Kenyan numbers are normalised (`07…`/`01…` → `2547…`/`2541…`, strip `+`, spaces and
    dashes). With no number, only Copy is offered.
  - The wording: *"Hi {first name}, thanks for choosing Platinum Point. How did we do on
    your {vehicle}? Leave a quick review here: {url}"*
  - "New link" warns that the earlier link stops working.
- **Add testimonial on client's behalf**: a small form with the first name (prefilled
  from the client's first name), rating and comment. It inserts a testimonial with
  `source = 'owner_entered'`, `status = 'approved'`, `consent = true`, the `job_id` and
  the vehicle label. It requires the job's `public_consent` (the client agreed to being
  shown). If the job is on the website, `rebuildNow()` runs.
- Tests: `whatsappLink` normalisation, the URL is shown once, the status lines, and staff
  see no card.

## Task 6 — Moderation + activity wording

- `TestimonialsPage`:
  - Shows the job number as a link to `/admin/jobs/:id` when `job_id` is set.
  - Shows a source badge: "Review link", "Added by owner" or "Website form".
  - Approving or rejecting a testimonial linked to a job on the website calls
    `rebuildNow()`. All other changes keep the debounced trigger.
- Activity tab and Dashboard: wording for the 3 new actions ("sent a review link",
  "Client left a review", "added a testimonial").
- `resources.ts`/types: `TestimonialRow.job_id`, `source`. Select `job:job_id(job_number)`.

## Task 7 — STOP: apply live, deploy, verify (with the owner)

1. Owner: `npx supabase db push`, then `npx supabase functions deploy submit`. Merge.
2. On PP-2026-0001 (published), with the owner's OK for each live step:
   - Get a review link and open it in a private window. The vehicle shows, and no client
     data.
   - Submit the review. Reusing the link shows the generic invalid message.
   - Approve the review in Testimonials. After the rebuild, the job page shows the
     review.
   - Create a new link and check the old one is invalid.
   - Check that `/review` is not in `sitemap.xml` and is `noindex`.
3. Clean up test reviews afterwards, if the owner wants.

## Task 8 — Docs + final gates

`docs/pick-up-here.md` status. `npm run typecheck && npm run lint && npm run test &&
npm run build`. PR text without Claude attribution.

## Self-review against the spec

- D4: both paths are covered: the link (Tasks 1–3, 5) and owner-entered (Task 5) with
  its public label (Task 4).
- §4.2:
  - Only the token's hash is stored.
  - Links expire after 30 days.
  - A new link expires the earlier unused ones.
- §4.3: `testimonial.job_id` and the source check (+ `seed`) are both in Task 1.
- §4.5:
  - `review_invite_summary` is anon-callable and exposes no client data.
  - `job_public.testimonial` is in Task 1.
- §5.4 Wrap-up: Task 5. §5.6 moderation shows the job number: Task 6.
- §6.2 step 5: Task 4. §6.3: the route, rewrite, noindex, robots and sitemap are in Task 3.
- §7.2:
  - Redemption is atomic.
  - Only `service_role` can redeem.
  - Every failure gives the same generic error.
  - The existing moderation flow and notification are kept.
- §8 "two review links": Task 1 tests. §9 SQL and RTL tests: Tasks 1, 3, 4, 5.
- Out of scope (§11), unchanged: links are never sent automatically. The owner sends
  them.
