-- Jobs J3: review links (jobs spec §4.2–4.5, §7.2, §8, §9) — checks against the linked
-- project. Run (after the migration is applied, or appended to it in a dry run):
--   npx supabase db query --linked -f supabase/tests/job_reviews.sql
--
-- One DO block that ends with `raise exception 'ALL_PASSED'`, rolling back everything.
-- PASS = the output error is exactly ALL_PASSED. Anything else = a failed check.
do $$
declare
  owner_id uuid := gen_random_uuid();
  staff_id uuid := gen_random_uuid();
  c uuid; v uuid; j uuid; j_open uuid; pp uuid; tid uuid;
  tok1 text; tok2 text;
  row_text text;
  cnt integer;
  t public.testimonial%rowtype;
begin
  -- ---------------------------------------------------------------- fixtures (postgres)
  insert into auth.users (id, email, aud, role)
    values (owner_id, 'j3-owner@example.test', 'authenticated', 'authenticated'),
           (staff_id, 'j3-staff@example.test', 'authenticated', 'authenticated');
  update public.profile set role = 'owner', is_active = true, display_name = 'Owner J3'
    where user_id = owner_id;
  update public.profile set role = 'staff', is_active = true, display_name = 'Kevin J3'
    where user_id = staff_id;

  insert into public.client (name, phone) values ('Secret Client', '0722222222') returning id into c;
  insert into public.vehicle (client_id, make, model, year, registration)
    values (c, 'Toyota', 'Fielder', 2014, 'KDB 111A') returning id into v;
  insert into public.job (client_id, vehicle_id, vehicle_label, complaint, status, public_consent)
    values (c, v, '2014 Toyota Fielder', 'Squeal', 'completed', true) returning id into j;
  insert into public.job (client_id, vehicle_id, vehicle_label, status)
    values (c, v, '2014 Toyota Fielder', 'in_repair') returning id into j_open;
  insert into public.portfolio_project (job_id, slug, title, summary, is_published)
    values (j, 'j3-test-0001', 'Brake overhaul', 'Squeal', true) returning id into pp;

  -- ---------------------------------------------------------------- as STAFF
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', staff_id, 'role', 'authenticated')::text, true);
  begin
    perform public.create_review_invite(j);
    raise exception 'FAIL staff created a review link';
  exception when insufficient_privilege then null;
  end;
  select count(*) into cnt from public.review_invite;
  if cnt <> 0 then raise exception 'FAIL staff can read review_invite'; end if;

  -- ---------------------------------------------------------------- as OWNER
  perform set_config('request.jwt.claims',
    json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);

  -- 1. Only completed jobs get a link
  begin
    perform public.create_review_invite(j_open);
    raise exception 'FAIL link created for a job that is not completed';
  exception when check_violation then null;
  end;

  tok1 := public.create_review_invite(j);
  if tok1 !~ '^[A-Za-z0-9_-]{43}$' then raise exception 'FAIL token shape: %', tok1; end if;
  select count(*) into cnt from public.review_invite where job_id = j and token_hash = tok1;
  if cnt <> 0 then raise exception 'FAIL raw token stored'; end if;

  -- 2. No direct writes, even for the owner
  begin
    insert into public.review_invite (job_id, token_hash) values (j, 'x');
    raise exception 'FAIL owner inserted review_invite directly';
  exception when insufficient_privilege then null;
  end;

  -- 3. A second link expires the first
  tok2 := public.create_review_invite(j);
  select count(*) into cnt from public.review_invite
    where job_id = j and used_at is null and expires_at > now();
  if cnt <> 1 then raise exception 'FAIL expected 1 live link, got %', cnt; end if;

  -- ---------------------------------------------------------------- as ANON
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);

  -- 4. Summary: live token only, no client data
  select count(*) into cnt from public.review_invite_summary(tok1);
  if cnt <> 0 then raise exception 'FAIL expired token still summarised'; end if;
  select count(*) into cnt from public.review_invite_summary('nonsense');
  if cnt <> 0 then raise exception 'FAIL bad token summarised'; end if;
  select s::text into row_text from public.review_invite_summary(tok2) s;
  if row_text is null or row_text not like '%2014 Toyota Fielder%' then
    raise exception 'FAIL live token not summarised: %', row_text;
  end if;
  if row_text like '%Secret Client%' or row_text like '%KDB 111A%' or row_text like '%0722222222%' then
    raise exception 'FAIL private data in summary: %', row_text;
  end if;

  -- 5. Anon can't redeem, create or read invites
  begin
    perform public.redeem_review_invite(tok2, 'Amina', 5, 'Great', true);
    raise exception 'FAIL anon redeemed directly';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.create_review_invite(j);
    raise exception 'FAIL anon created a link';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.review_invite limit 1;
    raise exception 'FAIL anon can read review_invite';
  exception when insufficient_privilege then null;
  end;

  -- ---------------------------------------------------------------- as service_role
  perform set_config('role', 'service_role', true);
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);

  -- 6. No consent → refused (and the link stays live)
  begin
    perform public.redeem_review_invite(tok2, 'Amina', 5, 'Great', false);
    raise exception 'FAIL redeemed without consent';
  exception when raise_exception then
    if sqlerrm <> 'consent required' then raise; end if;
  end;
  -- Expired link → refused
  begin
    perform public.redeem_review_invite(tok1, 'Amina', 5, 'Great', true);
    raise exception 'FAIL redeemed an expired link';
  exception when raise_exception then
    if sqlerrm <> 'invalid invite' then raise; end if;
  end;
  -- 7. Redeems once
  tid := public.redeem_review_invite(tok2, 'Amina', 5, 'Great job on the brakes', true);
  begin
    perform public.redeem_review_invite(tok2, 'Amina', 5, 'Again', true);
    raise exception 'FAIL redeemed twice';
  exception when raise_exception then
    if sqlerrm <> 'invalid invite' then raise; end if;
  end;

  -- ---------------------------------------------------------------- as postgres
  perform set_config('role', 'postgres', true);
  select * into t from public.testimonial where id = tid;
  if t.status <> 'pending' or t.source <> 'review_link' or t.job_id <> j
     or t.vehicle_label <> '2014 Toyota Fielder' or t.first_name <> 'Amina' or t.rating <> 5 then
    raise exception 'FAIL redeemed testimonial: %', row_to_json(t);
  end if;
  select count(*) into cnt from public.review_invite_summary(tok2);
  if cnt <> 0 then raise exception 'FAIL used token still summarised'; end if;

  -- 8. job_public.testimonial: null until approved, then public fields only
  select jp.testimonial::text into row_text from public.job_public jp where jp.job_id = j;
  if row_text is not null then raise exception 'FAIL pending review is public'; end if;
  update public.testimonial set status = 'approved', submitted_at = now() - interval '1 day'
    where id = tid;
  select jp.testimonial::text into row_text from public.job_public jp where jp.job_id = j;
  if row_text is null or row_text not like '%Great job on the brakes%' then
    raise exception 'FAIL approved review missing from job_public: %', row_text;
  end if;
  if row_text like '%' || tid || '%' or row_text like '%Secret Client%' then
    raise exception 'FAIL extra data in job_public.testimonial: %', row_text;
  end if;

  -- 9. Source check
  begin
    insert into public.testimonial (first_name, vehicle_label, comment, source)
      values ('X', 'Y', 'Z', 'other');
    raise exception 'FAIL source check accepted other';
  exception when check_violation then null;
  end;

  -- 10. Activity
  select count(*) into cnt from public.job_activity where job_id = j and action = 'review_link_created';
  if cnt <> 2 then raise exception 'FAIL expected 2 review_link_created, got %', cnt; end if;
  select count(*) into cnt from public.job_activity
    where job_id = j and action = 'review_received' and actor_id is null;
  if cnt <> 1 then raise exception 'FAIL expected 1 review_received, got %', cnt; end if;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  insert into public.testimonial (first_name, vehicle_label, comment, consent, source, status, job_id)
    values ('Amina', '2014 Toyota Fielder', 'Told us in person', true, 'owner_entered', 'approved', j);
  perform set_config('role', 'postgres', true);
  select count(*) into cnt from public.job_activity where job_id = j and action = 'testimonial_added';
  if cnt <> 1 then raise exception 'FAIL expected 1 testimonial_added, got %', cnt; end if;
  -- latest approved one wins
  select jp.testimonial ->> 'source' into row_text from public.job_public jp where jp.job_id = j;
  if row_text <> 'owner_entered' then raise exception 'FAIL latest testimonial not shown'; end if;

  -- 11. Deleting a job: invites go, testimonials stay unlinked
  delete from public.portfolio_project where id = pp;
  delete from public.job where id = j;
  select count(*) into cnt from public.review_invite where job_id = j;
  if cnt <> 0 then raise exception 'FAIL invites left after job delete'; end if;
  select count(*) into cnt from public.testimonial where id = tid and job_id is null;
  if cnt <> 1 then raise exception 'FAIL testimonial not unlinked on job delete'; end if;

  raise exception 'ALL_PASSED';
end $$;
