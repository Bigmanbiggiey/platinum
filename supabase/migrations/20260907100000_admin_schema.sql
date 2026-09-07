-- Platinum Point Automotive Engineering — Phase 3 admin schema
-- (docs/phase-3-plan.md §4). Adds the auth profile/role model, the CRM tables
-- (client, vehicle), and the in-app notification feed. RLS policies are in the next
-- migration.

-- ---------------------------------------------------------------------------
-- profile  (1:1 with auth.users; role gates admin access)
-- ---------------------------------------------------------------------------
create table public.profile (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role         text not null default 'staff' check (role in ('owner', 'staff')),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger profile_updated_at before update on public.profile
  for each row execute function public.set_updated_at();

-- Auto-create a profile row for every new auth user (default role 'staff').
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profile (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role helpers (security definer → bypass RLS on profile).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profile
    where user_id = auth.uid() and is_active
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profile
    where user_id = auth.uid() and is_active and role = 'owner'
  );
$$;

-- ---------------------------------------------------------------------------
-- client  (a customer — person or business)
-- ---------------------------------------------------------------------------
create table public.client (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       text not null default 'individual' check (type in ('individual', 'fleet')),
  phone      text,
  whatsapp   text,
  email      text,
  area       text,
  source     text,
  notes      text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index client_name_idx on public.client (lower(name));
create trigger client_updated_at before update on public.client
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- vehicle  (a client's vehicle)
-- ---------------------------------------------------------------------------
create table public.vehicle (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.client (id) on delete cascade,
  make         text not null,
  model        text,
  year         integer,
  registration text,
  vin          text,
  colour       text,
  mileage      integer,
  fuel         text,
  transmission text,
  notes        text,
  created_by   uuid references auth.users (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index vehicle_client_idx on public.vehicle (client_id);
create trigger vehicle_updated_at before update on public.vehicle
  for each row execute function public.set_updated_at();

-- Wire the (existing, nullable) service_request links to the new tables.
alter table public.service_request
  add constraint service_request_client_fk
    foreign key (client_id) references public.client (id) on delete set null,
  add constraint service_request_vehicle_fk
    foreign key (vehicle_id) references public.vehicle (id) on delete set null;

-- ---------------------------------------------------------------------------
-- notification  (in-app admin feed; written by triggers)
-- ---------------------------------------------------------------------------
create table public.notification (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('request', 'booking', 'testimonial')),
  title       text not null,
  body        text,
  entity_type text not null,
  entity_id   uuid not null,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index notification_unread_idx on public.notification (read_at, created_at desc);

create or replace function public.notify_on_service_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notification (type, title, body, entity_type, entity_id)
  values (
    case when new.request_type = 'booking' then 'booking' else 'request' end,
    case when new.request_type = 'booking' then 'New booking request' else 'New enquiry' end,
    concat_ws(' · ', new.contact_name, new.contact_phone, new.area),
    'service_request',
    new.id
  );
  return new;
end;
$$;

create or replace function public.notify_on_testimonial()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notification (type, title, body, entity_type, entity_id)
  values (
    'testimonial',
    'New testimonial (pending)',
    concat_ws(' · ', new.first_name, new.vehicle_label),
    'testimonial',
    new.id
  );
  return new;
end;
$$;

create trigger service_request_notify
  after insert on public.service_request
  for each row execute function public.notify_on_service_request();

create trigger testimonial_notify
  after insert on public.testimonial
  for each row execute function public.notify_on_testimonial();

-- ---------------------------------------------------------------------------
-- created_by on the content tables that benefit from it
-- ---------------------------------------------------------------------------
alter table public.portfolio_project add column created_by uuid references auth.users (id);
alter table public.media add column created_by uuid references auth.users (id);

-- ---------------------------------------------------------------------------
-- Enable RLS on the new tables (policies in the next migration)
-- ---------------------------------------------------------------------------
alter table public.profile      enable row level security;
alter table public.client       enable row level security;
alter table public.vehicle      enable row level security;
alter table public.notification enable row level security;
