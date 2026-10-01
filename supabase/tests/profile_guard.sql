-- Profile privilege guard — checks against the linked project.
-- Run:  npx supabase db query --linked -f supabase/tests/profile_guard.sql
--
-- One DO block that ends with `raise exception 'ALL_PASSED'`, rolling back everything.
-- PASS = the output error is exactly ALL_PASSED. Anything else = a failed check.
-- It creates its own throwaway users, so it never depends on real accounts.
do $$
declare
  owner_id uuid := gen_random_uuid();
  staff_id uuid := gen_random_uuid();
  r text;
  a boolean;
  n text;
begin
  -- Fixtures (as postgres): an active owner and an INACTIVE staff member.
  insert into auth.users (id, email, aud, role)
    values (owner_id, 'guard-owner@example.test', 'authenticated', 'authenticated'),
           (staff_id, 'guard-staff@example.test', 'authenticated', 'authenticated');
  update public.profile set role = 'owner', is_active = true where user_id = owner_id;
  update public.profile set role = 'staff', is_active = false where user_id = staff_id;

  -- 1. Staff (inactive) tries to promote itself → must be refused.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', staff_id, 'role', 'authenticated')::text, true);
  begin
    update public.profile set role = 'owner', is_active = true where user_id = staff_id;
    raise exception 'FAIL staff could promote itself';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profile set is_active = true where user_id = staff_id;
    raise exception 'FAIL staff could activate itself';
  exception when insufficient_privilege then null;
  end;

  -- 2. Staff may still edit its own display name.
  update public.profile set display_name = 'Guard Staff' where user_id = staff_id;

  -- 3. Owner may activate staff and change roles.
  perform set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  update public.profile set is_active = true where user_id = staff_id;

  -- Back to postgres to read the results.
  perform set_config('role', 'postgres', true);
  select role, is_active, display_name into r, a, n from public.profile where user_id = staff_id;
  if r <> 'staff' then raise exception 'FAIL staff role changed to %', r; end if;
  if not a then raise exception 'FAIL owner could not activate staff'; end if;
  if n is distinct from 'Guard Staff' then raise exception 'FAIL staff could not edit own display name'; end if;

  -- 4. Server-side (postgres / service role) changes still work.
  update public.profile set is_active = false where user_id = staff_id;

  raise exception 'ALL_PASSED';
end $$;
