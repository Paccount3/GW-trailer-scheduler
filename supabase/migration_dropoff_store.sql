-- Store / yard location where the trailer is staged for customer drop-off.
alter table public.donation_requests
  add column if not exists dropoff_store text;
