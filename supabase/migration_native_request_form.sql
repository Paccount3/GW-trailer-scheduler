-- Run this only if the original schema has already been installed.
alter table public.donation_requests
  add column if not exists address_type text
    check (address_type in ('residential', 'organization')),
  add column if not exists dropoff_town text,
  add column if not exists requested_duration_days integer
    check (requested_duration_days in (2, 3)),
  add column if not exists parking_location_description text,
  add column if not exists parking_photo_path text,
  add column if not exists license_photo_path text,
  add column if not exists heard_about text,
  add column if not exists signature text,
  add column if not exists signed_at timestamptz,
  add column if not exists agreement_version text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'request-documents',
  'request-documents',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;
