-- Good to Go Trailers — Supabase schema
-- Run this in the Supabase SQL editor

create extension if not exists "pgcrypto";

-- Donation request lifecycle
create type public.donation_status as enum (
  'requested',
  'scheduled',
  'trailer_on_site',
  'ready_for_pickup',
  'completed',
  'cancelled'
);

create type public.condition_rating as enum ('poor', 'fair', 'good');

create type public.report_type as enum ('dropoff', 'pickup');

create type public.load_size as enum (
  'quarter',
  'half',
  'three_quarter',
  'full'
);

create sequence public.donation_reference_seq start 1001;

-- Available trailers (managed in Settings)
create table public.trailers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trailer requests from Wufoo (and staff edits)
create table public.donation_requests (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique default nextval('public.donation_reference_seq')::text,
  wufoo_entry_id text unique,
  first_name text not null,
  last_name text not null,
  organization text,
  address_type text check (address_type in ('residential', 'organization')),
  dropoff_town text,
  phone text,
  email text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  zip text,
  requested_days text,
  requested_duration_days integer check (requested_duration_days in (2, 3)),
  parking_location_description text,
  parking_photo_path text,
  license_photo_path text,
  heard_about text,
  signature text,
  signed_at timestamptz,
  agreement_version text,
  staff_signer_name text,
  staff_signature text,
  staff_signed_at timestamptz,
  hold_harmless boolean default false,
  agreements jsonb default '{}'::jsonb,
  raw_wufoo_payload jsonb,
  status public.donation_status not null default 'requested',
  trailer_id uuid references public.trailers (id) on delete set null,
  scheduled_date date,
  dropoff_store text,
  load_size public.load_size,
  estimated_pounds numeric(10, 2),
  estimated_value numeric(12, 2),
  staff_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index donation_requests_status_idx on public.donation_requests (status);
create index donation_requests_trailer_id_idx on public.donation_requests (trailer_id);
create index donation_requests_created_at_idx on public.donation_requests (created_at desc);

-- Prevent double-booking an active trailer assignment
create unique index donation_requests_active_trailer_uidx
  on public.donation_requests (trailer_id)
  where trailer_id is not null
    and status in ('scheduled', 'trailer_on_site', 'ready_for_pickup');

-- Condition reports linked to a donation request
create table public.trailer_reports (
  id uuid primary key default gen_random_uuid(),
  donation_request_id uuid not null references public.donation_requests (id) on delete cascade,
  report_type public.report_type not null,
  is_completed boolean not null default false,
  completed_at timestamptz,
  outside_condition public.condition_rating,
  notes text,
  submitted_by text,
  extras jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trailer_reports_donation_idx on public.trailer_reports (donation_request_id);
create unique index trailer_reports_donation_type_uidx
  on public.trailer_reports (donation_request_id, report_type);

-- Load value estimate variables (Settings)
create table public.load_value_settings (
  id uuid primary key default gen_random_uuid(),
  load_size public.load_size not null unique,
  label text not null,
  estimated_pounds numeric(10, 2) not null default 0,
  value_per_pound numeric(10, 4) not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.load_value_settings (load_size, label, estimated_pounds, value_per_pound) values
  ('quarter', '25% Full', 1000, 0.26),
  ('half', '50% Full', 2000, 0.26),
  ('three_quarter', '75% Full', 3000, 0.26),
  ('full', '100% Full', 4000, 0.26);

-- Default trailer inventory (staff can rename/add in Settings)
insert into public.trailers (name, notes, is_active) values
  ('Trailer A', 'Main community trailer', true),
  ('Trailer B', 'Backup / overflow', true),
  ('Trailer C', null, true);

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trailers_updated_at
  before update on public.trailers
  for each row execute function public.set_updated_at();

create trigger donation_requests_updated_at
  before update on public.donation_requests
  for each row execute function public.set_updated_at();

create trigger trailer_reports_updated_at
  before update on public.trailer_reports
  for each row execute function public.set_updated_at();

create trigger load_value_settings_updated_at
  before update on public.load_value_settings
  for each row execute function public.set_updated_at();

-- Auto-calc load estimates when load_size changes
create or replace function public.apply_load_estimate()
returns trigger
language plpgsql
as $$
declare
  settings public.load_value_settings%rowtype;
begin
  if new.load_size is null then
    new.estimated_pounds := null;
    new.estimated_value := null;
    return new;
  end if;

  select * into settings
  from public.load_value_settings
  where load_size = new.load_size;

  if found then
    new.estimated_pounds := settings.estimated_pounds;
    new.estimated_value := settings.estimated_pounds * settings.value_per_pound;
  end if;

  return new;
end;
$$;

create trigger donation_requests_load_estimate
  before insert or update of load_size
  on public.donation_requests
  for each row execute function public.apply_load_estimate();

-- RLS: public can insert via service role webhook; staff uses service role / authenticated later
alter table public.trailers enable row level security;
alter table public.donation_requests enable row level security;
alter table public.trailer_reports enable row level security;
alter table public.load_value_settings enable row level security;

-- For MVP, allow authenticated users full access; anon read of load settings only.
-- Server routes use the service role key and bypass RLS.

create policy "Authenticated full access trailers"
  on public.trailers for all
  to authenticated
  using (true) with check (true);

create policy "Authenticated full access donation_requests"
  on public.donation_requests for all
  to authenticated
  using (true) with check (true);

create policy "Authenticated full access trailer_reports"
  on public.trailer_reports for all
  to authenticated
  using (true) with check (true);

create policy "Authenticated full access load_value_settings"
  on public.load_value_settings for all
  to authenticated
  using (true) with check (true);

create policy "Anon read load_value_settings"
  on public.load_value_settings for select
  to anon
  using (true);

-- Private request documents. Files are accessed only through signed,
-- staff-authorized server routes; driver licenses must never be public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'request-documents',
  'request-documents',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;
