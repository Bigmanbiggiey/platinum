-- Jobs J1 — trigger / constraint checks against the linked project.
-- Run:  npx supabase db query --linked -f supabase/tests/jobs_j1.sql
--
-- Everything runs in ONE DO block that ends with `raise exception 'ALL_PASSED'`, which
-- rolls back every row it created (including job-number counter increments).
-- PASS = the output error is exactly ALL_PASSED. Anything else = a failed check.
do $$
declare
  c  uuid; v uuid; r uuid; m uuid; f uuid;
  j1 uuid; j2 uuid; j3 uuid;
  n1 text; n2 text; n3 text;
  s  text;
  t  timestamptz; t2 timestamptz;
  cnt integer;
  y  text := extract(year from (now() at time zone 'Africa/Nairobi'))::int::text;
begin
  insert into public.client (name) values ('J1 test client') returning id into c;
  insert into public.vehicle (client_id, make, model, year, registration)
    values (c, 'Toyota', 'Fielder', 2014, 'KDA 123A') returning id into v;
  insert into public.service_request
    (request_type, contact_name, contact_phone, status, client_id, vehicle_id)
    values ('general_repair', 'J1 test', '0700000000', 'scheduled', c, v) returning id into r;

  -- 1. Job numbers: PP-<year>-NNNN, sequential, caller-supplied value ignored
  insert into public.job (client_id, vehicle_id, vehicle_label, service_request_id)
    values (c, v, '2014 Toyota Fielder', r) returning id, job_number into j1, n1;
  insert into public.job (client_id, vehicle_id, vehicle_label)
    values (c, v, '2014 Toyota Fielder') returning id, job_number into j2, n2;
  insert into public.job (job_number, vehicle_label)
    values ('HACKED', 'Walk-in') returning id, job_number into j3, n3;
  if n1 !~ ('^PP-' || y || '-[0-9]{4}$') then
    raise exception 'FAIL job_number format: %', n1;
  end if;
  if right(n2, 4)::int <> right(n1, 4)::int + 1 then
    raise exception 'FAIL job_number sequence: % then %', n1, n2;
  end if;
  if n3 = 'HACKED' then raise exception 'FAIL caller set job_number'; end if;

  -- 2. Defaults
  select status::text into s from public.job where id = j1;
  if s <> 'checked_in' then raise exception 'FAIL default status: %', s; end if;

  -- 3. Consent timestamp follows the checkbox
  update public.job set public_consent = true where id = j1;
  select consent_recorded_at into t from public.job where id = j1;
  if t is null then raise exception 'FAIL consent_recorded_at not set'; end if;
  update public.job set public_consent = false where id = j1;
  select consent_recorded_at into t from public.job where id = j1;
  if t is not null then raise exception 'FAIL consent_recorded_at not cleared'; end if;

  -- 3b. A caller cannot forge consent_recorded_at while consent stays true
  update public.job set public_consent = true where id = j1;
  select consent_recorded_at into t from public.job where id = j1;
  update public.job set consent_recorded_at = '2000-01-01' where id = j1;
  select consent_recorded_at into t2 from public.job where id = j1;
  if t2 is distinct from t then raise exception 'FAIL consent_recorded_at forged: %', t2; end if;
  update public.job set public_consent = false where id = j1;

  -- 4. Completing sets completed_at and moves the linked request to completed
  update public.job set status = 'completed' where id = j1;
  select completed_at into t from public.job where id = j1;
  if t is null then raise exception 'FAIL completed_at not set'; end if;
  select status::text into s from public.service_request where id = r;
  if s <> 'completed' then raise exception 'FAIL request status after completion: %', s; end if;

  -- 5. Re-opening clears completed_at; a closed request is never re-opened
  update public.service_request set status = 'closed' where id = r;
  update public.job set status = 'in_repair' where id = j1;
  select completed_at into t from public.job where id = j1;
  if t is not null then raise exception 'FAIL completed_at not cleared on re-open'; end if;
  update public.job set status = 'completed' where id = j1;
  select status::text into s from public.service_request where id = r;
  if s <> 'closed' then raise exception 'FAIL closed request changed to: %', s; end if;

  -- 6. One job per request
  begin
    insert into public.job (vehicle_label, service_request_id) values ('dup', r);
    raise exception 'FAIL second job allowed for the same request';
  exception when unique_violation then null;
  end;

  -- 7. Children cascade with the job; deleting a finding only unlinks photos/parts
  insert into public.media (storage_path, alt_text) values ('test/j1.jpg', 'j1 test')
    returning id into m;
  insert into public.job_finding (job_id, title) values (j2, 'Worn pads') returning id into f;
  insert into public.job_photo (job_id, finding_id, media_id, stage) values (j2, f, m, 'diagnosis');
  insert into public.job_part (job_id, finding_id, name, quantity, cost_kes)
    values (j2, f, 'Brake pads', 1, 3500);
  delete from public.job_finding where id = f;
  select count(*) into cnt from public.job_photo where job_id = j2 and finding_id is null;
  if cnt <> 1 then raise exception 'FAIL photo not unlinked from deleted finding'; end if;
  select count(*) into cnt from public.job_part where job_id = j2 and finding_id is null;
  if cnt <> 1 then raise exception 'FAIL part not unlinked from deleted finding'; end if;
  delete from public.job where id = j2;
  select count(*) into cnt from public.job_photo where job_id = j2;
  if cnt <> 0 then raise exception 'FAIL job_photo not cascaded'; end if;
  select count(*) into cnt from public.job_part where job_id = j2;
  if cnt <> 0 then raise exception 'FAIL job_part not cascaded'; end if;
  select count(*) into cnt from public.media where id = m;
  if cnt <> 1 then raise exception 'FAIL media row deleted with the job'; end if;

  -- 8. Deleting the client keeps the job, unlinks client + vehicle
  delete from public.client where id = c;
  select count(*) into cnt from public.job where id = j1 and client_id is null and vehicle_id is null;
  if cnt <> 1 then raise exception 'FAIL job not kept/unlinked after client delete'; end if;

  -- 9. Quantity must be positive
  begin
    insert into public.job_part (job_id, name, quantity) values (j1, 'bad', 0);
    raise exception 'FAIL zero quantity allowed';
  exception when check_violation then null;
  end;

  -- 10. Job numbers never truncate past 9999
  update public.job_number_counter set last_value = 9999 where year = y::int;
  insert into public.job (vehicle_label) values ('overflow') returning job_number into n1;
  if n1 !~ ('^PP-' || y || '-10000$') then
    raise exception 'FAIL job_number overflow: %', n1;
  end if;

  raise exception 'ALL_PASSED';
end $$;
