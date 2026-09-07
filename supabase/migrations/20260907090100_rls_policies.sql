-- Platinum Point Automotive Engineering — Phase 2 RLS policies (docs/phase-2-plan.md §6)
--
-- Model: the public site (build-time + browser) uses the `anon` role.
--   * anon may SELECT only published/approved rows of the public read models.
--   * anon may NOT read private tables (service_request) or the raw testimonial /
--     site_settings tables — it uses column-limited views instead.
--   * anon may NOT INSERT/UPDATE/DELETE anything. All writes go through the `submit`
--     Edge Function, which uses the service-role key and bypasses RLS.
--   * `authenticated` (admin) policies are added in Phase 3.

-- ===========================================================================
-- Seal the private tables from anon entirely (no policy + no grant = no access)
-- ===========================================================================
revoke all on public.service_request from anon;
revoke all on public.testimonial     from anon;  -- anon uses testimonial_public
revoke all on public.site_settings   from anon;  -- anon uses site_settings_public

-- ===========================================================================
-- Public read policies (RLS default-denies; these grant filtered SELECT to anon)
-- ===========================================================================

-- service ------------------------------------------------------------------
create policy "service: anon reads published"
  on public.service for select to anon
  using (is_published);

-- portfolio_project ------------------------------------------------------------------
create policy "portfolio_project: anon reads published"
  on public.portfolio_project for select to anon
  using (is_published);

-- portfolio_media (gallery join) ------------------------------------------------------
create policy "portfolio_media: anon reads rows of published projects"
  on public.portfolio_media for select to anon
  using (
    exists (
      select 1 from public.portfolio_project p
      where p.id = portfolio_media.project_id and p.is_published
    )
  );

-- media: only images attached to published work ------------------------------------
create policy "media: anon reads images of published work"
  on public.media for select to anon
  using (
    exists (
      select 1 from public.portfolio_project p
      where p.cover_media_id = media.id and p.is_published
    )
    or exists (
      select 1 from public.portfolio_media pm
      join public.portfolio_project p on p.id = pm.project_id
      where pm.media_id = media.id and p.is_published
    )
  );

-- partner ------------------------------------------------------------------
create policy "partner: anon reads published"
  on public.partner for select to anon
  using (is_published);

-- service_area — all rows public --------------------------------------------------
create policy "service_area: anon reads all"
  on public.service_area for select to anon
  using (true);

-- content_block — all rows public (site copy) -----------------------------------
create policy "content_block: anon reads all"
  on public.content_block for select to anon
  using (true);

-- ===========================================================================
-- Column-limited public views (security-definer; filter to the safe subset)
-- ===========================================================================

-- Approved testimonials, exposing only display columns (first name + vehicle + text).
create view public.testimonial_public as
  select id, first_name, vehicle_label, rating, comment, is_featured, submitted_at
  from public.testimonial
  where status = 'approved';

grant select on public.testimonial_public to anon, authenticated;

-- Public subset of site settings — excludes notification_* and other operational keys.
create view public.site_settings_public as
  select
    business_name, legal_name, tagline, phone, whatsapp, email, hours,
    base_area, geo, social_links, gbp_url, default_seo
  from public.site_settings
  where id = true;

grant select on public.site_settings_public to anon, authenticated;

-- ===========================================================================
-- Notes
-- ===========================================================================
-- * No INSERT/UPDATE/DELETE policies for anon exist, so every write by anon is
--   denied. `supabase/functions/submit` performs the only public writes, using the
--   service-role key (RLS-exempt), forcing status/request_type/source server-side.
-- * Phase 3 adds `to authenticated` policies (full CRUD for the admin) and the
--   Storage bucket policies for `public-media`.
