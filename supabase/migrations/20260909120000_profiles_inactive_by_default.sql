-- Platinum Point Automotive Engineering — security hardening (Finding 1).
--
-- Before this, `handle_new_user` created every profile with the column default
-- is_active = true, and public.is_admin() grants access to ANY active profile.
-- So any auth.users row (e.g. from an accidentally-enabled signup provider) became
-- a live admin with full CRUD on the CMS + CRM. The admin boundary rested entirely
-- on the hosted "disable signup" toggle, with no backstop in the schema.
--
-- Fix: new profiles are created INACTIVE. An owner activates them from the Team
-- screen (profile "owner manages all" RLS policy) after the person sets a password.
-- Existing rows are untouched — `alter ... set default` does not backfill.

alter table public.profile alter column is_active set default false;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profile (user_id, email, display_name, is_active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    false
  )
  on conflict (user_id) do update set email = excluded.email;
  return new;
end;
$$;

-- Keep the bootstrap owner explicitly active so the new default can never lock the
-- owner out. Idempotent; matches 0 rows until Paul's auth account exists.
update public.profile p
set role = 'owner',
    is_active = true,
    display_name = coalesce(nullif(p.display_name, ''), 'Paul Ndirangu Gatama')
from auth.users u
where p.user_id = u.id
  and u.email = 'gatama98p@gmail.com'
  and (p.role <> 'owner' or p.is_active is not true);
