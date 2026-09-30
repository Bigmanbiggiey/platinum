-- Platinum Point Automotive Engineering — security hotfix: stop self-promotion.
--
-- The "profile: self update" policy (20260907100100_admin_rls.sql) lets a signed-in
-- user update their OWN profile row, and `authenticated` has a table-wide UPDATE
-- grant — so any account, even an inactive invitee, could run
--   update profile set role = 'owner', is_active = true where user_id = auth.uid()
-- and become an active owner, bypassing "inactive by default" and every is_admin()
-- / is_owner() check. Confirmed on the live project (rolled-back probe).
--
-- Fix: a BEFORE UPDATE trigger. For API callers (current_user = 'authenticated'),
-- only an active owner may change role, is_active, user_id or email. Everyone may
-- still edit their own display name. Server-side roles (postgres, service_role —
-- e.g. the admin-invite function, migrations, handle_new_user) are unaffected.
--
-- SECURITY INVOKER on purpose: current_user must be the caller's role, not the owner.

create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated'
     and (new.role is distinct from old.role
          or new.is_active is distinct from old.is_active
          or new.user_id is distinct from old.user_id
          or new.email is distinct from old.email)
     and not public.is_owner()
  then
    raise exception 'Only an owner can change a member''s role, access or email.'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger profile_guard_privileges
  before update on public.profile
  for each row execute function public.guard_profile_privileges();
