-- Platinum Point Automotive Engineering — Phase 2 core schema
-- (docs/phase-2-plan.md §5). Public read models + the consolidated intake table.
-- RLS is enabled here but policies live in the next migration.
--
-- No admin/CRM tables yet (client, vehicle, profile arrive in Phase 3). service_request
-- carries nullable client_id/vehicle_id so Phase 3 adds those without altering it.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.request_type as enum (
  'booking',
  'general_repair',
  'diagnostics',
  'maintenance',
  'assessment',
  'road_test',
  'mechanical_inspection',
  'pre_purchase_inspection',
  'engineering',
  'other',
  'general_contact'
);

create type public.request_status as enum (
  'new',
  'contacted',
  'scheduled',
  'completed',
  'closed',
  'spam',
  'archived'
);

create type public.testimonial_status as enum ('pending', 'approved', 'rejected');

create type public.partner_type as enum ('bodywork', 'garage', 'parts', 'other');

-- ---------------------------------------------------------------------------
-- media  (uploaded images + metadata; files live in the public-media bucket)
-- ---------------------------------------------------------------------------
create table public.media (
  id           uuid primary key default gen_random_uuid(),
  storage_path text not null,
  alt_text     text not null,
  caption      text,
  tags         text[] not null default '{}',
  width        integer,
  height       integer,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger media_updated_at before update on public.media
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- service  (a service the business offers; SEO landing pages)
-- ---------------------------------------------------------------------------
create table public.service (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  title             text not null,
  category          text,
  summary           text not null,
  description_md     text not null default '',
  whats_included_md  text,
  faqs              jsonb not null default '[]'::jsonb, -- [{q,a}]
  icon              text,
  display_order     integer not null default 100,
  is_published      boolean not null default false,
  seo_title         text,
  seo_description    text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index service_published_idx on public.service (is_published, display_order);
create trigger service_updated_at before update on public.service
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- portfolio_project  (a documented piece of work)
-- ---------------------------------------------------------------------------
create table public.portfolio_project (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  title          text not null,
  category       text,
  vehicle_make   text,
  vehicle_model  text,
  vehicle_year   integer,
  summary        text not null,
  body_md        text not null default '',
  outcome        text,
  service_id     uuid references public.service (id) on delete set null,
  project_date   date,
  cover_media_id uuid references public.media (id) on delete set null,
  is_published   boolean not null default false,
  display_order  integer not null default 100,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index portfolio_published_idx on public.portfolio_project (is_published, display_order);
create trigger portfolio_project_updated_at before update on public.portfolio_project
  for each row execute function public.set_updated_at();

-- gallery join (project <-> media, ordered)
create table public.portfolio_media (
  project_id    uuid not null references public.portfolio_project (id) on delete cascade,
  media_id      uuid not null references public.media (id) on delete cascade,
  display_order integer not null default 100,
  primary key (project_id, media_id)
);

-- ---------------------------------------------------------------------------
-- testimonial  (site-submitted; only approved shown, first name + vehicle only)
-- ---------------------------------------------------------------------------
create table public.testimonial (
  id            uuid primary key default gen_random_uuid(),
  first_name    text not null,
  vehicle_label text not null,
  rating        integer check (rating between 1 and 5),
  comment       text not null,
  consent       boolean not null default false,
  source        text not null default 'public_form',
  status        public.testimonial_status not null default 'pending',
  is_featured   boolean not null default false,
  submitted_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index testimonial_status_idx on public.testimonial (status, is_featured);
create trigger testimonial_updated_at before update on public.testimonial
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- content_block  (editable site copy, keyed)
-- ---------------------------------------------------------------------------
create table public.content_block (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,
  label      text not null,
  "group"    text not null default 'general',
  value_md   text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger content_block_updated_at before update on public.content_block
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- service_area  (areas served)
-- ---------------------------------------------------------------------------
create table public.service_area (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  region        text,
  is_primary    boolean not null default false,
  note          text,
  display_order integer not null default 100,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger service_area_updated_at before update on public.service_area
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- partner  (trusted bodywork / garage affiliates — name + note only, no URLs)
-- ---------------------------------------------------------------------------
create table public.partner (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  type          public.partner_type not null default 'other',
  note          text,
  area          text,
  display_order integer not null default 100,
  is_published  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger partner_updated_at before update on public.partner
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- site_settings  (single row; a view exposes only the public subset)
-- ---------------------------------------------------------------------------
create table public.site_settings (
  id                     boolean primary key default true check (id), -- enforce single row
  business_name          text not null,
  legal_name             text,
  tagline                text,
  phone                  text not null,
  whatsapp               text not null,
  email                  text not null,
  hours                  jsonb not null default '[]'::jsonb, -- [{days,open,close,label}]
  base_area              text not null,
  geo                    jsonb, -- {lat,lng} approx
  social_links           jsonb not null default '{}'::jsonb,
  gbp_url                text,
  default_seo            jsonb not null default '{}'::jsonb, -- {title,description,ogImage}
  -- private / operational (never in the public view):
  notification_channel   text not null default 'email',
  notification_email     text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create trigger site_settings_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- service_request  (consolidated intake — ADR-0005; no public read)
-- ---------------------------------------------------------------------------
create table public.service_request (
  id                   uuid primary key default gen_random_uuid(),
  request_type         public.request_type not null,
  status               public.request_status not null default 'new',
  contact_name         text not null,
  contact_phone        text not null,
  contact_whatsapp     text,
  contact_email        text,
  vehicle_description   text,
  area                 text,
  requested_date       date,
  requested_time_window text,
  confirmed_at         timestamptz,
  message              text,
  consent              boolean not null default false,
  source               text not null default 'public_form',
  -- linked on conversion in Phase 3 (tables added then):
  client_id            uuid,
  vehicle_id           uuid,
  internal_notes       text,
  outcome_notes        text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index service_request_status_idx on public.service_request (status, created_at desc);
create index service_request_type_idx on public.service_request (request_type, created_at desc);
create trigger service_request_updated_at before update on public.service_request
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere (policies in the next migration)
-- ---------------------------------------------------------------------------
alter table public.media              enable row level security;
alter table public.service            enable row level security;
alter table public.portfolio_project  enable row level security;
alter table public.portfolio_media    enable row level security;
alter table public.testimonial        enable row level security;
alter table public.content_block      enable row level security;
alter table public.service_area       enable row level security;
alter table public.partner            enable row level security;
alter table public.site_settings      enable row level security;
alter table public.service_request    enable row level security;
