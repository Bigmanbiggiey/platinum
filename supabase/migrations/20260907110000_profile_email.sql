-- Platinum Point Automotive Engineering — Phase 3 WP3b: store email on profile so the
-- admin Team screen can list users without reading auth.users.

alter table public.profile add column if not exists email text;

-- Backfill existing rows.
update public.profile p
set email = u.email
from auth.users u
where u.id = p.user_id and p.email is null;

-- Keep it populated for new users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profile (user_id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (user_id) do update set email = excluded.email;
  return new;
end;
$$;
