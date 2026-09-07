-- Run this only if the original schema has already been installed.
create sequence if not exists public.donation_reference_seq start 1001;

alter table public.donation_requests
  alter column reference_code set default nextval('public.donation_reference_seq')::text;

alter table public.trailer_reports
  add column if not exists is_completed boolean not null default false,
  add column if not exists completed_at timestamptz;

create unique index if not exists trailer_reports_donation_type_uidx
  on public.trailer_reports (donation_request_id, report_type);

-- Replace complex references on existing requests with 1001, 1002, ...
with renumbered as (
  select id, (1000 + row_number() over (order by created_at, id))::text as new_code
  from public.donation_requests
)
update public.donation_requests d
set reference_code = r.new_code
from renumbered r
where d.id = r.id;

select setval(
  'public.donation_reference_seq',
  greatest(
    1000,
    coalesce((select max(reference_code::bigint) from public.donation_requests), 1000)
  )
);
