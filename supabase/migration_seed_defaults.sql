-- Seed default trailer inventory for Manage Donations / Settings.
-- Safe to re-run: only inserts when the trailers table is empty.

insert into public.trailers (name, notes, is_active)
select *
from (
  values
    ('Trailer A', 'Main community trailer', true),
    ('Trailer B', 'Backup / overflow', true),
    ('Trailer C', null::text, true)
) as seed(name, notes, is_active)
where not exists (select 1 from public.trailers limit 1);

-- Ensure load fullness settings exist at program rates.
insert into public.load_value_settings (load_size, label, estimated_pounds, value_per_pound)
values
  ('quarter', '25% Full', 1000, 0.26),
  ('half', '50% Full', 2000, 0.26),
  ('three_quarter', '75% Full', 3000, 0.26),
  ('full', '100% Full', 4000, 0.26)
on conflict (load_size) do update set
  label = excluded.label,
  estimated_pounds = excluded.estimated_pounds,
  value_per_pound = excluded.value_per_pound,
  updated_at = now();
