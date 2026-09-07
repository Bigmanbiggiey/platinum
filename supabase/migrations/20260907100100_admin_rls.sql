-- Platinum Point Automotive Engineering — Phase 3 admin RLS (docs/phase-3-plan.md §5)
--
-- Adds `authenticated` + role-checked policies so admins (profile role owner/staff,
-- is_active) get full CRUD. Anon policies from Phase 2 are unchanged and re-verified
-- by src/shared/supabase/rls.test.ts.

-- ===========================================================================
-- profile
-- ===========================================================================
create policy "profile: self read" on public.profile
  for select to authenticated using (user_id = auth.uid() or public.is_owner());
create policy "profile: self update" on public.profile
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "profile: owner manages all" on public.profile
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- ===========================================================================
-- Full admin CRUD on the CRM + notification tables
-- ===========================================================================
create policy "client: admin all" on public.client
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "vehicle: admin all" on public.vehicle
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "notification: admin all" on public.notification
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ===========================================================================
-- Full admin CRUD on every Phase 2 table (anon policies stay as-is)
-- ===========================================================================
create policy "service: admin all" on public.service
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "portfolio_project: admin all" on public.portfolio_project
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "portfolio_media: admin all" on public.portfolio_media
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "testimonial: admin all" on public.testimonial
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "media: admin all" on public.media
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "content_block: admin all" on public.content_block
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "service_area: admin all" on public.service_area
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "partner: admin all" on public.partner
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "site_settings: admin all" on public.site_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "service_request: admin all" on public.service_request
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Phase 2 revoked base-table grants from anon; make sure authenticated has them
-- (Supabase grants these by default on new public tables, but be explicit for the
-- three that were locked down).
grant select, insert, update, delete on public.service_request to authenticated;
grant select, insert, update, delete on public.testimonial to authenticated;
grant select, insert, update, delete on public.site_settings to authenticated;
grant select, insert, update, delete on public.profile to authenticated;
grant select, insert, update, delete on public.client to authenticated;
grant select, insert, update, delete on public.vehicle to authenticated;
grant select, insert, update, delete on public.notification to authenticated;

-- ===========================================================================
-- Storage: admins can write to public-media (Phase 2 left it service-role only)
-- ===========================================================================
create policy "public-media: admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'public-media' and public.is_admin());
create policy "public-media: admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'public-media' and public.is_admin());
create policy "public-media: admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'public-media' and public.is_admin());
