-- Platinum Point Automotive Engineering — bootstrap the owner role.
--
-- Idempotent: promotes Paul's profile to `owner` once his auth account exists
-- (created in the Supabase dashboard). Matches 0 rows until then; safe to re-run.
-- Kept as a migration (not seed) so every `db push` applies it.

update public.profile p
set role = 'owner',
    display_name = coalesce(nullif(p.display_name, ''), 'Paul Ndirangu Gatama')
from auth.users u
where p.user_id = u.id
  and u.email = 'gatama98p@gmail.com'
  and p.role <> 'owner';
