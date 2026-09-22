-- Counter-signature fields for Hold Harmless agreements.
alter table public.donation_requests
  add column if not exists staff_signer_name text,
  add column if not exists staff_signature text,
  add column if not exists staff_signed_at timestamptz;
