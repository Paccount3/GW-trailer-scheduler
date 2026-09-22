-- Align trailer fullness options and valuation with current program rates.
-- 25% = 1,000 lbs, 50% = 2,000 lbs, 75% = 3,000 lbs, 100% = 4,000 lbs @ $0.26/lb

update public.load_value_settings
set
  label = '25% Full',
  estimated_pounds = 1000,
  value_per_pound = 0.26,
  updated_at = now()
where load_size = 'quarter';

update public.load_value_settings
set
  label = '50% Full',
  estimated_pounds = 2000,
  value_per_pound = 0.26,
  updated_at = now()
where load_size = 'half';

update public.load_value_settings
set
  label = '75% Full',
  estimated_pounds = 3000,
  value_per_pound = 0.26,
  updated_at = now()
where load_size = 'three_quarter';

update public.load_value_settings
set
  label = '100% Full',
  estimated_pounds = 4000,
  value_per_pound = 0.26,
  updated_at = now()
where load_size = 'full';

-- Clear legacy 1/3 trailer setting if the enum still includes it.
delete from public.load_value_settings where load_size::text = 'third';

-- Refresh stored donation estimates for the new rates.
update public.donation_requests d
set
  estimated_pounds = s.estimated_pounds,
  estimated_value = round(s.estimated_pounds * s.value_per_pound, 2)
from public.load_value_settings s
where d.load_size = s.load_size;
