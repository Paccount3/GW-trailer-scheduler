-- Additional cash / online donations recorded by staff for a trailer request.
alter table public.donation_requests
  add column if not exists additional_monetary_donations numeric(12, 2) not null default 0;
