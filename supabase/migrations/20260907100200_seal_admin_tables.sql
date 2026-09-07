-- Platinum Point Automotive Engineering — Phase 3: seal the private admin tables from
-- anon entirely (hard permission-denied, matching how service_request behaves —
-- Phase 2 pattern). RLS already denies anon rows; this removes the table grant too.

revoke all on public.profile      from anon;
revoke all on public.client       from anon;
revoke all on public.vehicle      from anon;
revoke all on public.notification from anon;
