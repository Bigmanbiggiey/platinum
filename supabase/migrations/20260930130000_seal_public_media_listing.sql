-- Platinum Point — seal anonymous listing of the public-media bucket (Jobs J1)
--
-- The original policy "public-media: anyone can read" had no role, so anon could list every
-- object in public-media through the storage API. Jobs J1 stores private job photos there
-- (plates, hidden photos, photos removed from jobs), so listing must be admin-only.
--
-- Public buckets serve /object/public/... and /render/image/public/... URLs WITHOUT any
-- SELECT policy, so website imagery keeps working. This only removes anon listing/reads
-- through the authenticated storage API.

drop policy "public-media: anyone can read" on storage.objects;

create policy "public-media: admin read"
  on storage.objects for select to authenticated
  using (bucket_id = 'public-media' and public.is_admin());
