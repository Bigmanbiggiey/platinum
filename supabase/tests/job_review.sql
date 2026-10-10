-- R-D: job review + team assignment (design 2026-10-10 §3, §6) — checks against the
-- linked project. Needs both R-D migrations; run with:
--   npx supabase db query --linked -f supabase/tests/job_review.sql
--
-- One DO block that ends with `raise exception 'ALL_PASSED'`, rolling back everything.
-- PASS = the output error is exactly ALL_PASSED. Anything else = a failed check.
do $$
declare
  owner_id uuid := gen_random_uuid();
  staff_id uuid := gen_random_uuid();
  staff2_id uuid := gen_random_uuid();
  gone_id  uuid := gen_random_uuid();
  c uuid; r uuid; j uuid; w uuid;
  cnt integer;
  s text;
  t timestamptz;
begin
  -- ---------------------------------------------------------------- fixtures (postgres)
  insert into auth.users (id, email, aud, role)
    values (owner_id,  'rd-owner@example.test',  'authenticated', 'authenticated'),
           (staff_id,  'rd-staff@example.test',  'authenticated', 'authenticated'),
           (staff2_id, 'rd-staff2@example.test', 'authenticated', 'authenticated'),
           (gone_id,   'rd-gone@example.test',   'authenticated', 'authenticated');
  update public.profile set role = 'owner', is_active = true, display_name = 'Owner RD'
    where user_id = owner_id;
  update public.profile set role = 'staff', is_active = true, display_name = 'Kevin RD'
    where user_id = staff_id;
  update public.profile set role = 'staff', is_active = true, display_name = 'Ann RD'
    where user_id = staff2_id;
  update public.profile set role = 'staff', is_active = false, display_name = 'Gone RD'
    where user_id = gone_id;

  insert into public.client (name) values ('RD client') returning id into c;
  insert into public.service_request
    (request_type, contact_name, contact_phone, status, client_id)
    values ('general_repair', 'RD test', '0700000000', 'scheduled', c) returning id into r;
  insert into public.job (client_id, vehicle_label, service_request_id)
    values (c, '2014 Toyota Fielder', r) returning id into j;

  -- ---------------------------------------------------------------- as OWNER: assign
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);

  insert into public.job_assignee (job_id, user_id) values (j, staff_id), (j, staff2_id);
  select count(*) into cnt from public.job_assignee where job_id = j;
  if cnt <> 2 then raise exception 'FAIL owner could not assign a team (%)', cnt; end if;
  begin
    insert into public.job_assignee (job_id, user_id) values (j, gone_id);
    raise exception 'FAIL an inactive profile was assigned';
  exception when check_violation then null;
  end;
  select count(*) into cnt from public.job_activity
    where job_id = j and action = 'assigned' and detail ->> 'name' = 'Kevin RD';
  if cnt <> 1 then raise exception 'FAIL assigned not logged (%)', cnt; end if;
  delete from public.job_assignee where job_id = j and user_id = staff2_id;
  select count(*) into cnt from public.job_activity
    where job_id = j and action = 'unassigned' and detail ->> 'name' = 'Ann RD';
  if cnt <> 1 then raise exception 'FAIL unassigned not logged (%)', cnt; end if;

  -- ---------------------------------------------------------------- as STAFF
  perform set_config('request.jwt.claims',
    json_build_object('sub', staff_id, 'role', 'authenticated')::text, true);

  -- Assignments: read all (names via the view), write none
  select count(*) into cnt from public.job_assignee where job_id = j;
  if cnt <> 1 then raise exception 'FAIL staff cannot read assignees (%)', cnt; end if;
  select display_name into s from public.job_assignee_named where job_id = j;
  if s is distinct from 'Kevin RD' then raise exception 'FAIL assignee name via view: %', s; end if;
  begin
    insert into public.job_assignee (job_id, user_id) values (j, staff2_id);
    raise exception 'FAIL staff assigned someone';
  exception when insufficient_privilege then null;
  end;
  delete from public.job_assignee where job_id = j;   -- no policy → nothing deleted
  select count(*) into cnt from public.job_assignee where job_id = j;
  if cnt <> 1 then raise exception 'FAIL staff removed an assignee'; end if;

  -- Staff can't complete, can't start a job completed, can't write a review note
  begin
    update public.job set status = 'completed' where id = j;
    raise exception 'FAIL staff completed a job';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.job (vehicle_label, status) values ('x', 'completed');
    raise exception 'FAIL staff inserted a completed job';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.job set review_note = 'looks fine' where id = j;
    raise exception 'FAIL staff wrote a review note';
  exception when insufficient_privilege then null;
  end;

  -- Staff submit for review → submitted_at set, owner notified
  update public.job set status = 'awaiting_review', submitted_at = '2000-01-01' where id = j;
  select submitted_at into t from public.job where id = j;
  if t is null or t < now() - interval '1 minute' then
    raise exception 'FAIL submitted_at not set by the trigger: %', t;
  end if;

  -- …and then the job is locked for them
  begin
    update public.job set status = 'in_repair' where id = j;
    raise exception 'FAIL staff left awaiting_review';
  exception when insufficient_privilege then null;
  end;

  -- Walk-in check-in still works for staff
  insert into public.job (vehicle_label) values ('2015 Mazda Demio') returning id into w;

  -- ---------------------------------------------------------------- as OWNER: review
  perform set_config('request.jwt.claims',
    json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);

  select count(*) into cnt from public.notification
    where type = 'job_review' and entity_type = 'job' and entity_id = j
      and body like '%Kevin RD%';
  if cnt <> 1 then raise exception 'FAIL no review notification (%)', cnt; end if;

  -- Send back with a note
  update public.job set status = 'in_repair', review_note = 'Torque the wheel nuts' where id = j;
  select review_note into s from public.job where id = j;
  if s is distinct from 'Torque the wheel nuts' then raise exception 'FAIL note not saved'; end if;

  -- Staff fix it and resubmit (note stays for them to read)
  perform set_config('request.jwt.claims',
    json_build_object('sub', staff_id, 'role', 'authenticated')::text, true);
  update public.job set status = 'awaiting_review' where id = j;

  -- Owner approves → completed, note cleared, request completed
  perform set_config('request.jwt.claims',
    json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  update public.job set status = 'completed' where id = j;

  perform set_config('role', 'postgres', true);
  select review_note into s from public.job where id = j;
  if s is not null then raise exception 'FAIL note not cleared on approve: %', s; end if;
  select status::text into s from public.service_request where id = r;
  if s <> 'completed' then raise exception 'FAIL request not completed on approve: %', s; end if;
  select count(*) into cnt from public.notification where type = 'job_review' and entity_id = j;
  if cnt <> 2 then raise exception 'FAIL expected 2 review notifications, got %', cnt; end if;
  select count(*) into cnt from public.job_assignee where job_id = j;
  if cnt <> 1 then raise exception 'FAIL assignee lost'; end if;

  -- Deleting the job removes its assignees
  delete from public.job where id = j;
  select count(*) into cnt from public.job_assignee where job_id = j;
  if cnt <> 0 then raise exception 'FAIL assignees not cascaded'; end if;

  raise exception 'ALL_PASSED';
end $$;
