# Job review, assignment & walk-in clients — Design (R-D)

> Status: **proposed 2026-10-10** — owner requests after accepting R-B on staging.
> Builds on: RBAC spec `2026-09-30-rbac-and-invites-design.md` (R-A ✅, R-B ✅, R-C next)
> and the jobs spec `2026-09-30-jobs-work-orders-design.md` (J1 ✅, J2 after this).
> Delivery order (owner decision): **R-C → R-D → J2**.

## 1. Problems (from the owner's staging test)

1. Staff can mark a job **completed** with no check by the owner.
2. The owner can't hand a job to particular staff; staff can't see what is waiting for them.
3. A walk-in checked in by staff while the owner was away can only be linked to an
   **existing** client — the owner can't create the client from the job card.
4. (Not a defect) Ticking "customer allowed posting" doesn't put the job on the site —
   that is **J2 — Publish to portfolio**, scheduled after R-D.

## 2. Decisions

| # | Topic | Decision |
|---|---|---|
| D1 | Completion by staff | Staff **Submit for review**; only the owner completes. |
| D2 | Review outcome | Owner **Approve** (→ `completed`) or **Send back** with a note (→ `in_repair`). |
| D3 | Assignees | A job has **zero, one or several** staff assigned (one-person or team task). |
| D4 | What staff see | **My jobs first** (assigned to me, or checked in by me), then **Other jobs** — staff can still open any job (cover for each other). |
| D5 | Walk-in client | Owner can **create a client** from the job card; the job's vehicle (from check-in) is attached to that client automatically. |

## 3. Data model (migration R-D)

### 3.1 Review status
- `alter type public.job_status add value 'awaiting_review' before 'completed'`.
- `job.review_note text` — the owner's latest send-back note (cleared on approve).
- `job.submitted_at timestamptz` — set when a job enters `awaiting_review`.
- Extend `guard_job_privileges()` (R-B) for non-owners (`current_user = 'authenticated'`
  and not `is_owner()`):
  - may set `status = 'awaiting_review'` only from an open status;
  - may **not** set `status = 'completed'`, and may not change status **out of**
    `awaiting_review` or `completed` (owner approves, sends back, or re-opens);
  - may not write `review_note`.
- Notification: `notification.type` check gains `'job_review'`; a SECURITY DEFINER
  `AFTER UPDATE` trigger on `job` inserts "Job ready for review · PP-2026-0042 · 2014
  Toyota Fielder" (`entity_type = 'job'`) when status becomes `awaiting_review`.
- The J1 trigger that completes the linked request keeps firing on `completed` only.

### 3.2 Assignment
New table `public.job_assignee`:
```
job_id      uuid references job (id) on delete cascade
user_id     uuid references profile (user_id) on delete cascade
assigned_by uuid references auth.users (id) default auth.uid()
assigned_at timestamptz not null default now()
primary key (job_id, user_id)
```
- RLS: owner all; staff **select** all rows (so they can see who else is on a job).
- Only active **staff or owner** profiles can be assigned (check in a trigger).
- R-C activity: `assigned` / `unassigned` actions `{ name }` (extends `log_job_activity`).

### 3.3 Walk-in clients
No schema change: R-B already lets the owner set `vehicle.client_id` and `job.client_id`.

## 4. Admin UI

### Staff
- **Wrap-up:** **Mark completed** becomes **Submit for review** (same pending-problems
  confirm). While awaiting review: "Waiting for the owner's review" and no status
  changes. After a send-back: a highlighted card with the owner's note.
- **Status options** never include Completed or Cancelled; Awaiting review shows as a
  locked badge.
- **Jobs page:** **My jobs** (assigned to me or checked in by me) above **Other jobs**.
- **Schedule:** booked jobs assigned to me are marked "Yours".

### Owner
- **Job header:** **Assigned to** — chips for each assignee + an "Assign" picker of active
  staff; remove with ×. Also on the owner's New job form.
- **Wrap-up when `awaiting_review`:** review card — what was done (problems, outcomes,
  parts, labour hours, after photos count) with **Approve & complete** and **Send back**
  (note required).
- **Jobs page:** a **To review** filter (with count) and the existing filters.
- **Dashboard:** "Jobs to review" count tile; notifications list shows job reviews and
  links to the job.
- **Walk-in header:** "Walk-in — no client yet" offers **Link existing** (today) or
  **New client** — name (required), phone, email; shows the vehicle from check-in
  ("2015 Mazda Demio · KDC 1") that will be attached. Creates the client, links vehicle +
  job in one step.

## 5. Security notes
- All rules are enforced in the database (guard trigger + RLS); the UI mirrors them.
- Staff still never see client details; assignee rows expose only staff display names.
- Notifications stay owner-only (R-B).

## 6. Tests
- SQL (`supabase/tests/job_review.sql`, rolled back): staff submit ✓; staff complete ✗;
  staff leave awaiting_review ✗; staff write review_note ✗; owner approve → request
  completed; owner send back → in_repair + note; notification row created; assignee
  insert by staff ✗, by owner ✓, of an inactive profile ✗; staff read assignees ✓.
- Unit/RTL: status options per role; Submit for review; review card approve/send-back;
  assignee picker; My jobs grouping; New client from walk-in.
- Live RLS: staff cannot insert `job_assignee`; staff cannot set `completed`.

## 7. Delivery
One package **R-D** after R-C (it extends R-C's activity log), same workflow: migration
dry-run → code → STOP for `db push` → merge immediately after → owner acceptance.
