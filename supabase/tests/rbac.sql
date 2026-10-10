-- RBAC owner/staff matrix (spec §3, §4, §8) — checks against the linked project.
-- Run (after the migration is applied):
--   npx supabase db query --linked -f supabase/tests/rbac.sql
-- Before it is applied, run it as a dry run (see the R-B plan, Task 1).
--
-- One DO block that ends with `raise exception 'ALL_PASSED'`, rolling back everything.
-- PASS = the output error is exactly ALL_PASSED. Anything else = a failed check.
-- It creates its own throwaway users, so it never depends on real accounts.
do $$
declare
  owner_id uuid := gen_random_uuid();
  staff_id uuid := gen_random_uuid();
  c uuid; r uuid;
  v_client uuid; v_other uuid; v_walkin uuid;
  j_owner uuid; j_staff uuid;
  p uuid; m_owner uuid; m_staff uuid;
  cnt integer;
  s text;
  t text;
begin
  -- ---------------------------------------------------------------- fixtures (postgres)
  insert into auth.users (id, email, aud, role)
    values (owner_id, 'rbac-owner@example.test', 'authenticated', 'authenticated'),
           (staff_id, 'rbac-staff@example.test', 'authenticated', 'authenticated');
  update public.profile set role = 'owner', is_active = true where user_id = owner_id;
  update public.profile set role = 'staff', is_active = true where user_id = staff_id;

  insert into public.client (name) values ('RBAC client') returning id into c;
  insert into public.vehicle (client_id, make, registration)
    values (c, 'Toyota', 'KDA 100A') returning id into v_client;
  insert into public.vehicle (client_id, make) values (c, 'Nissan') returning id into v_other;
  insert into public.service_request
    (request_type, contact_name, contact_phone, status, client_id, vehicle_id)
    values ('general_repair', 'RBAC test', '0700000000', 'scheduled', c, v_client)
    returning id into r;
  insert into public.job (client_id, vehicle_id, vehicle_label, service_request_id)
    values (c, v_client, 'Toyota', r) returning id into j_owner;
  insert into public.job_cost (job_id, labour_cost_kes) values (j_owner, 5000);
  insert into public.job_part (job_id, name) values (j_owner, 'Pads') returning id into p;
  insert into public.job_part_cost (part_id, cost_kes) values (p, 3500);
  insert into public.media (storage_path, alt_text) values ('rbac/owner.jpg', 'owner only')
    returning id into m_owner;

  -- 0. Costs left the shared rows
  select count(*) into cnt from information_schema.columns
    where table_schema = 'public'
      and ((table_name = 'job' and column_name = 'labour_cost_kes')
        or (table_name = 'job_part' and column_name = 'cost_kes'));
  if cnt <> 0 then raise exception 'FAIL cost columns still on job/job_part'; end if;

  -- ---------------------------------------------------------------- as STAFF
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', staff_id, 'role', 'authenticated')::text, true);

  if public.is_staff() is not true then raise exception 'FAIL is_staff() false for staff'; end if;
  if public.is_owner() then raise exception 'FAIL staff is_owner()'; end if;

  -- 1. Owner-only tables return nothing to staff
  foreach t in array array['client', 'service_request', 'notification', 'site_settings',
      'service', 'portfolio_project', 'portfolio_media', 'testimonial', 'content_block',
      'service_area', 'partner', 'job_cost', 'job_part_cost'] loop
    begin
      execute format('select count(*) from public.%I', t) into cnt;
    exception when insufficient_privilege then
      cnt := 0; -- no table grant at all is also "can't read"
    end;
    if cnt <> 0 then raise exception 'FAIL staff can read %', t; end if;
  end loop;
  select count(*) into cnt from public.profile;
  if cnt <> 1 then raise exception 'FAIL staff sees % profiles', cnt; end if;

  -- 2. …and can't be written
  begin
    insert into public.client (name) values ('staff client');
    raise exception 'FAIL staff inserted a client';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.job_cost (job_id, labour_cost_kes) values (j_owner, 1);
    raise exception 'FAIL staff wrote job_cost';
  exception when insufficient_privilege then null;
  end;

  -- 3. Jobs: staff see every job; vehicles only when on a job
  select count(*) into cnt from public.job where id = j_owner;
  if cnt <> 1 then raise exception 'FAIL staff cannot see the job'; end if;
  select count(*) into cnt from public.vehicle where id = v_client;
  if cnt <> 1 then raise exception 'FAIL staff cannot see the job vehicle'; end if;
  select count(*) into cnt from public.vehicle where id = v_other;
  if cnt <> 0 then raise exception 'FAIL staff can see a vehicle that is on no job'; end if;

  -- 4. Walk-in: a vehicle with no client, then a job (RETURNING needs SELECT on both)
  insert into public.vehicle (make, model) values ('Mazda', 'Demio') returning id into v_walkin;
  insert into public.job (vehicle_id, vehicle_label) values (v_walkin, 'Mazda Demio')
    returning id into j_staff;

  -- 5. Staff can't attach a client or request
  begin
    insert into public.vehicle (client_id, make) values (c, 'Honda');
    raise exception 'FAIL staff added a client vehicle';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.job (client_id, vehicle_label) values (c, 'x');
    raise exception 'FAIL staff created a job with a client';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.job (service_request_id, vehicle_label) values (r, 'x');
    raise exception 'FAIL staff created a job from a request';
  exception when insufficient_privilege then null;
  end;

  -- 6. Staff record work
  update public.job set status = 'diagnosing', labour_hours = 2.5 where id = j_owner;
  update public.vehicle set registration = 'KDB 200B' where id = v_walkin;
  insert into public.job_finding (job_id, title) values (j_owner, 'Worn pads');
  insert into public.job_part (job_id, name, quantity) values (j_owner, 'Brake fluid', 1);
  insert into public.media (storage_path, alt_text) values ('rbac/staff.jpg', 'staff')
    returning id into m_staff;
  insert into public.job_photo (job_id, media_id, stage) values (j_owner, m_staff, 'diagnosis');

  -- 7. …but can't relink, cancel or un-cancel
  begin
    update public.job set client_id = null where id = j_owner;
    raise exception 'FAIL staff unlinked the client';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.job set service_request_id = null where id = j_owner;
    raise exception 'FAIL staff unlinked the request';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.job set status = 'cancelled' where id = j_staff;
    raise exception 'FAIL staff cancelled a job';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.vehicle set client_id = c where id = v_walkin;
    raise exception 'FAIL staff linked a vehicle to a client';
  exception when insufficient_privilege then null;
  end;

  -- 8. …and can't delete (no policy → nothing deleted)
  delete from public.job where id = j_staff;
  select count(*) into cnt from public.job where id = j_staff;
  if cnt <> 1 then raise exception 'FAIL staff deleted a job'; end if;

  -- 9. Media: own uploads + job photos only; can't forge created_by
  select count(*) into cnt from public.media where id = m_staff;
  if cnt <> 1 then raise exception 'FAIL staff cannot see own upload'; end if;
  select count(*) into cnt from public.media where id = m_owner;
  if cnt <> 0 then raise exception 'FAIL staff can see unrelated media'; end if;
  begin
    insert into public.media (storage_path, alt_text, created_by) values ('x', 'x', owner_id);
    raise exception 'FAIL staff forged media.created_by';
  exception when insufficient_privilege then null;
  end;

  -- 10. Staff completing a job moves its (owner-only) request to completed
  update public.job set status = 'completed' where id = j_owner;

  -- ---------------------------------------------------------------- as OWNER
  perform set_config('request.jwt.claims',
    json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  if public.is_staff() then raise exception 'FAIL owner is_staff()'; end if;

  select count(*) into cnt from public.job_cost where job_id = j_owner;
  if cnt <> 1 then raise exception 'FAIL owner cannot read job_cost'; end if;
  select count(*) into cnt from public.job_part_cost where part_id = p;
  if cnt <> 1 then raise exception 'FAIL owner cannot read job_part_cost'; end if;
  select count(*) into cnt from public.media where id = m_owner;
  if cnt <> 1 then raise exception 'FAIL owner cannot read media'; end if;

  -- The owner links the walk-in later, cancels and deletes.
  update public.vehicle set client_id = c where id = v_walkin;
  update public.job set client_id = c where id = j_staff;
  insert into public.job_cost (job_id, labour_cost_kes) values (j_staff, 1000);
  update public.job set status = 'cancelled' where id = j_staff;
  delete from public.job where id = j_staff;

  -- ---------------------------------------------------------------- results (postgres)
  perform set_config('role', 'postgres', true);

  select status::text into s from public.service_request where id = r;
  if s <> 'completed' then raise exception 'FAIL request not completed by staff completion: %', s; end if;
  select count(*) into cnt from public.job where id = j_owner and labour_hours = 2.5;
  if cnt <> 1 then raise exception 'FAIL staff labour hours not saved'; end if;
  select count(*) into cnt from public.job where id = j_staff;
  if cnt <> 0 then raise exception 'FAIL owner could not delete the job'; end if;
  select count(*) into cnt from public.job_cost where job_id = j_staff;
  if cnt <> 0 then raise exception 'FAIL job_cost not cascaded'; end if;
  select count(*) into cnt from public.vehicle where id = v_walkin and client_id = c;
  if cnt <> 1 then raise exception 'FAIL owner could not link the walk-in vehicle'; end if;
  select count(*) into cnt from public.media where id = m_staff and created_by = staff_id;
  if cnt <> 1 then raise exception 'FAIL media.created_by default not auth.uid()'; end if;

  raise exception 'ALL_PASSED';
end $$;
