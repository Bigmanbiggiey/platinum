-- Platinum Point Automotive Engineering — R-D (part 1): the "awaiting review" job status.
-- Spec: docs/superpowers/specs/2026-10-10-job-review-assignment-design.md §3.1.
--
-- On its own because Postgres can't use a new enum value in the transaction that adds
-- it; 20261010090100_job_review_assignment.sql (part 2) uses it.
alter type public.job_status add value if not exists 'awaiting_review' before 'completed';
