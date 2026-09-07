-- Platinum Point Automotive Engineering — Phase 2 Storage (ADR-0009)
--
-- One public bucket for website imagery. Public read; writes are admin-only and land
-- in Phase 3 (no admin/auth exists yet). Seed images are uploaded via the CLI.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-media',
  'public-media',
  true,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml']
)
on conflict (id) do nothing;

-- Public read of objects in the bucket.
create policy "public-media: anyone can read"
  on storage.objects for select
  using (bucket_id = 'public-media');

-- Writes/updates/deletes: Phase 3 will add `to authenticated` + admin-role checks.
-- Until then, only the service-role key (CLI / functions) can write.
