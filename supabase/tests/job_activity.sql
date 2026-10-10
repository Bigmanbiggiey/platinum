-- Job activity log (spec §4.6, §8) — checks against the linked project.
-- Run (after the migration is applied):
--   npx supabase db query --linked -f supabase/tests/job_activity.sql
-- Before it is applied, run it as a dry run (see the R-C plan, Task 1).
--
-- One DO block that ends with `raise exception 'ALL_PASSED'`, rolling back everything.
-- PASS = the output error is exactly ALL_PASSED. Anything else = a failed check.
do $$
declare
  owner_id uuid := gen_random_uuid();
  staff_id uuid := gen_random_uuid();
  j uuid; f uuid; p uuid; ph uuid;
  m1 uuid; m2 uuid; m3 uuid; m4 uuid;
  a record;
  cnt integer;
  n integer;
begin
  -- ---------------------------------------------------------------- fixtures (postgres)
  insert into auth.users (id, email, aud, role)
    values (owner_id, 'act-owner@example.test', 'authenticated', 'authenticated'),
           (staff_id, 'act-staff@example.test', 'authenticated', 'authenticated');
  update public.profile set role = 'owner', is_active = true, display_name = 'Owner Test'
    where user_id = owner_id;
  update public.profile set role = 'staff', is_active = true, display_name = 'Kevin Test'
    where user_id = staff_id;
  insert into public.media (storage_path, alt_text) values ('act/1.jpg', '1') returning id into m1;
  insert into public.media (storage_path, alt_text) values ('act/2.jpg', '2') returning id into m2;
  insert into public.media (storage_path, alt_text) values ('act/3.jpg', '3') returning id into m3;
  insert into public.media (storage_path, alt_text) values ('act/4.jpg', '4') returning id into m4;

  -- ---------------------------------------------------------------- as STAFF
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', staff_id, 'role', 'authenticated')::text, true);

  -- 1. Check-in, attributed to the staff member
  insert into public.job (vehicle_label) values ('2014 Toyota Fielder') returning id into j;
  select * into a from public.job_activity where job_id = j and action = 'checked_in';
  if not found then raise exception 'FAIL no checked_in entry'; end if;
  if a.actor_id is distinct from staff_id
     or a.actor_name is distinct from 'Kevin Test'
     or a.actor_role is distinct from 'staff' then
    raise exception 'FAIL wrong actor: % / % / %', a.actor_id, a.actor_name, a.actor_role;
  end if;
  if a.detail ->> 'job_number' is null then raise exception 'FAIL checked_in has no job_number'; end if;

  -- 2. Status change
  update public.job set status = 'diagnosing' where id = j;
  select * into a from public.job_activity where job_id = j and action = 'status_changed';
  if a.detail ->> 'from' is distinct from 'checked_in' or a.detail ->> 'to' is distinct from 'diagnosing' then
    raise exception 'FAIL status detail: %', a.detail;
  end if;

  -- 3. Findings: added, updated; a reorder is not logged
  insert into public.job_finding (job_id, title) values (j, 'Worn pads') returning id into f;
  update public.job_finding set outcome = 'fixed' where id = f;
  update public.job_finding set display_order = 5 where id = f;
  select count(*) into cnt from public.job_activity
    where job_id = j and action = 'finding_added' and detail ->> 'title' = 'Worn pads';
  if cnt <> 1 then raise exception 'FAIL finding_added count %', cnt; end if;
  select count(*) into cnt from public.job_activity where job_id = j and action = 'finding_updated';
  if cnt <> 1 then raise exception 'FAIL finding_updated count % (reorder logged?)', cnt; end if;
  select * into a from public.job_activity where job_id = j and action = 'finding_updated';
  if a.detail ->> 'outcome' is distinct from 'fixed' then raise exception 'FAIL finding outcome %', a.detail; end if;

  -- 4. Three after-photos in a row → ONE entry with count 3
  insert into public.job_photo (job_id, finding_id, media_id, stage) values (j, f, m1, 'repair');
  insert into public.job_photo (job_id, finding_id, media_id, stage) values (j, f, m2, 'repair');
  insert into public.job_photo (job_id, finding_id, media_id, stage) values (j, f, m3, 'repair');
  select count(*), max((detail ->> 'count')::int) into cnt, n
    from public.job_activity where job_id = j and action = 'photo_added';
  if cnt <> 1 or n <> 3 then raise exception 'FAIL photo merge: % entries, count %', cnt, n; end if;

  --    …a different stage starts a new entry
  insert into public.job_photo (job_id, media_id, stage) values (j, m4, 'diagnosis') returning id into ph;
  select count(*) into cnt from public.job_activity where job_id = j and action = 'photo_added';
  if cnt <> 2 then raise exception 'FAIL new stage did not start a new entry (%)', cnt; end if;

  -- 5. Photo removed
  delete from public.job_photo where id = ph;
  select count(*) into cnt from public.job_activity
    where job_id = j and action = 'photo_removed' and detail ->> 'stage' = 'diagnosis';
  if cnt <> 1 then raise exception 'FAIL photo_removed count %', cnt; end if;

  -- 6. Parts (name + quantity only — never a cost)
  insert into public.job_part (job_id, name, quantity) values (j, 'Brake pads', 2) returning id into p;
  delete from public.job_part where id = p;
  select * into a from public.job_activity where job_id = j and action = 'part_added';
  if a.detail ->> 'name' is distinct from 'Brake pads' or (a.detail ->> 'quantity')::numeric <> 2 then
    raise exception 'FAIL part_added detail %', a.detail;
  end if;
  if a.detail ? 'cost_kes' then raise exception 'FAIL a cost leaked into the log'; end if;
  select count(*) into cnt from public.job_activity where job_id = j and action = 'part_removed';
  if cnt <> 1 then raise exception 'FAIL part_removed count %', cnt; end if;

  -- 7. Labour hours + consent
  update public.job set labour_hours = 1.5 where id = j;
  select * into a from public.job_activity where job_id = j and action = 'labour_updated';
  if (a.detail ->> 'to')::numeric <> 1.5 then raise exception 'FAIL labour detail %', a.detail; end if;
  update public.job set public_consent = true where id = j;
  select * into a from public.job_activity where job_id = j and action = 'consent_changed';
  if a.detail ->> 'to' is distinct from 'true' then raise exception 'FAIL consent detail %', a.detail; end if;

  -- 8. Staff read the log but can't write it in any way
  select count(*) into cnt from public.job_activity where job_id = j;
  if cnt < 10 then raise exception 'FAIL staff sees only % entries', cnt; end if;
  begin
    insert into public.job_activity (job_id, action) values (j, 'checked_in');
    raise exception 'FAIL staff inserted activity';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.job_activity set actor_name = 'forged' where job_id = j;
    raise exception 'FAIL staff edited activity';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.job_activity where job_id = j;
    raise exception 'FAIL staff deleted activity';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.log_job_activity(j, 'checked_in', '{}'::jsonb);
    raise exception 'FAIL staff called log_job_activity';
  exception when insufficient_privilege then null;
  end;

  -- ---------------------------------------------------------------- as OWNER
  perform set_config('request.jwt.claims',
    json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);

  -- 9. Owner actions are attributed to the owner
  update public.job set status = 'in_repair' where id = j;
  select * into a from public.job_activity
    where job_id = j and action = 'status_changed' order by created_at desc limit 1;
  if a.actor_role is distinct from 'owner' or a.actor_name is distinct from 'Owner Test' then
    raise exception 'FAIL owner attribution: % / %', a.actor_name, a.actor_role;
  end if;

  -- 10. Deleting a job that still has photos and parts works and clears its log
  insert into public.job_part (job_id, name) values (j, 'Oil filter');
  delete from public.job where id = j;

  -- ---------------------------------------------------------------- system (postgres, no user)
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);

  select count(*) into cnt from public.job_activity where job_id = j;
  if cnt <> 0 then raise exception 'FAIL log not cleared with the job (%)', cnt; end if;

  -- 11. System writes have no actor
  insert into public.job (vehicle_label) values ('System job') returning id into j;
  select * into a from public.job_activity where job_id = j and action = 'checked_in';
  if a.actor_id is not null or a.actor_name is not null or a.actor_role is not null then
    raise exception 'FAIL system entry has an actor';
  end if;

  raise exception 'ALL_PASSED';
end $$;
