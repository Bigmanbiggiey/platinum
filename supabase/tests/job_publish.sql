-- Jobs J2: publishing to the portfolio (jobs spec §4.3–4.5, §8, §9) — checks against the
-- linked project. Run (after the migration is applied):
--   npx supabase db query --linked -f supabase/tests/job_publish.sql
--
-- One DO block that ends with `raise exception 'ALL_PASSED'`, rolling back everything.
-- PASS = the output error is exactly ALL_PASSED. Anything else = a failed check.
do $$
declare
  owner_id uuid := gen_random_uuid();
  staff_id uuid := gen_random_uuid();
  c uuid; v uuid; j uuid; f uuid; pp uuid;
  m_before uuid; m_after uuid; m_hidden uuid;
  row_text text;
  cnt integer;
  pub boolean;
  cols text;
begin
  -- ---------------------------------------------------------------- fixtures (postgres)
  insert into auth.users (id, email, aud, role)
    values (owner_id, 'j2-owner@example.test', 'authenticated', 'authenticated'),
           (staff_id, 'j2-staff@example.test', 'authenticated', 'authenticated');
  update public.profile set role = 'owner', is_active = true, display_name = 'Owner J2'
    where user_id = owner_id;
  update public.profile set role = 'staff', is_active = true, display_name = 'Kevin J2'
    where user_id = staff_id;

  insert into public.client (name, phone) values ('Secret Client', '0711111111') returning id into c;
  insert into public.vehicle (client_id, make, model, year, registration)
    values (c, 'Toyota', 'Fielder', 2014, 'KDA 999Z') returning id into v;
  insert into public.job (client_id, vehicle_id, vehicle_label, complaint, odometer_km,
                          labour_hours, internal_notes, status)
    values (c, v, '2014 Toyota Fielder', 'Squeal when braking', 123456, 3, 'owner only', 'in_repair')
    returning id into j;
  insert into public.job_finding (job_id, title, diagnosis, fix, outcome)
    values (j, 'Worn pads', 'Pads at 1 mm', 'Replaced front pads', 'fixed') returning id into f;
  insert into public.job_finding (job_id, title, outcome) values (j, 'Tired shocks', 'deferred');
  insert into public.job_part (job_id, finding_id, name, quantity) values (j, f, 'Brake pads', 2);
  insert into public.media (storage_path, alt_text) values ('j2/before.jpg', 'before') returning id into m_before;
  insert into public.media (storage_path, alt_text) values ('j2/after.jpg', 'after') returning id into m_after;
  insert into public.media (storage_path, alt_text) values ('j2/hidden.jpg', 'plate') returning id into m_hidden;
  insert into public.job_photo (job_id, finding_id, media_id, stage, is_public)
    values (j, f, m_before, 'diagnosis', true),
           (j, f, m_after, 'repair', true),
           (j, f, m_hidden, 'repair', false);

  -- ---------------------------------------------------------------- as OWNER
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);

  -- 1. Guard: not completed → refused
  begin
    insert into public.portfolio_project (job_id, slug, title, summary, is_published)
      values (j, 'j2-test-0001', 'Brake overhaul', 'Squeal when braking', true);
    raise exception 'FAIL published a job that is not completed';
  exception when check_violation then null;
  end;
  -- …completed but no consent → refused
  update public.job set status = 'completed' where id = j;
  begin
    insert into public.portfolio_project (job_id, slug, title, summary, is_published)
      values (j, 'j2-test-0001', 'Brake overhaul', 'Squeal when braking', true);
    raise exception 'FAIL published a job without consent';
  exception when check_violation then null;
  end;
  -- …completed + consent → published
  update public.job set public_consent = true where id = j;
  insert into public.portfolio_project (job_id, slug, title, summary, is_published)
    values (j, 'j2-test-0001', 'Brake overhaul', 'Squeal when braking', true)
    returning id into pp;

  -- ---------------------------------------------------------------- as ANON
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);

  -- 2. The public row: public photos and part names only
  select jp::text into row_text from public.job_public jp where jp.job_id = j;
  if row_text is null then raise exception 'FAIL anon cannot see the published job'; end if;
  if row_text not like '%j2/before.jpg%' or row_text not like '%j2/after.jpg%' then
    raise exception 'FAIL public photos missing';
  end if;
  if row_text like '%j2/hidden.jpg%' then raise exception 'FAIL hidden photo is public'; end if;
  if row_text not like '%Brake pads%' then raise exception 'FAIL part name missing'; end if;
  if row_text like '%Secret Client%' or row_text like '%0711111111%'
     or row_text like '%KDA 999Z%' or row_text like '%123456%' or row_text like '%owner only%' then
    raise exception 'FAIL private data in job_public: %', row_text;
  end if;
  select count(*) into cnt from public.job_public jp,
    jsonb_array_elements(jp.findings) fe
    where jp.job_id = j
      and jsonb_array_length(fe -> 'before') = 1 and jsonb_array_length(fe -> 'after') = 1;
  if cnt <> 1 then raise exception 'FAIL before/after not split by stage'; end if;

  -- 8. Job tables stay sealed from anon
  begin
    perform 1 from public.job limit 1;
    raise exception 'FAIL anon can read job';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.job_photo limit 1;
    raise exception 'FAIL anon can read job_photo';
  exception when insufficient_privilege then null;
  end;

  -- ---------------------------------------------------------------- as postgres
  perform set_config('role', 'postgres', true);

  -- 3. Exactly the public columns
  select string_agg(column_name, ',' order by column_name) into cols
    from information_schema.columns where table_schema = 'public' and table_name = 'job_public';
  if cols <> 'booked_at,checked_in_at,complaint,completed_at,findings,general_photos,job_id,job_number,portfolio_slug,service_id,service_title,vehicle_label' then
    raise exception 'FAIL job_public columns: %', cols;
  end if;

  -- 4. Staff untick consent → unpublished, gone from the view
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', staff_id, 'role', 'authenticated')::text, true);
  update public.job set public_consent = false where id = j;
  perform set_config('role', 'postgres', true);
  select is_published into pub from public.portfolio_project where id = pp;
  if pub then raise exception 'FAIL consent withdrawn but still published'; end if;
  select count(*) into cnt from public.job_public where job_id = j;
  if cnt <> 0 then raise exception 'FAIL unpublished job still in job_public'; end if;

  -- 5. Re-publish, then the owner re-opens the job → unpublished
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  update public.job set public_consent = true where id = j;
  update public.portfolio_project set is_published = true where id = pp;
  update public.job set status = 'in_repair' where id = j;
  select is_published into pub from public.portfolio_project where id = pp;
  if pub then raise exception 'FAIL re-opened job still published'; end if;

  -- 6. A job with a portfolio entry can't be deleted
  begin
    delete from public.job where id = j;
    raise exception 'FAIL deleted a job that has a portfolio entry';
  exception when foreign_key_violation then null;
  end;

  -- 7. Activity
  perform set_config('role', 'postgres', true);
  select count(*) into cnt from public.job_activity where job_id = j and action = 'published';
  if cnt <> 2 then raise exception 'FAIL expected 2 published entries, got %', cnt; end if;
  select count(*) into cnt from public.job_activity where job_id = j and action = 'unpublished';
  if cnt <> 2 then raise exception 'FAIL expected 2 unpublished entries, got %', cnt; end if;

  raise exception 'ALL_PASSED';
end $$;
