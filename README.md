# Good to Go Trailers

Next.js + Supabase app for Goodwill mobile donation trailer scheduling and staff operations.

## Pages

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Native trailer request and signed agreement |
| `/donate` | Public | Make a Donation — Square / 3rd-party links |
| `/staff/login` | Public | Staff password gate |
| `/staff/manage` | Staff | Manage Donations table + status / trailer assignment |
| `/staff/trailer-reports` | Staff | Drop-off / pickup condition reports linked to requests |
| `/staff/reports` | Staff | Charts & metrics (expandable later) |
| `/staff/settings` | Staff | Trailer inventory + load value estimate variables |

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Staff password defaults to `goodwill` (override with `STAFF_PASSWORD`).

Without Supabase env vars, the app runs on an in-memory **demo store** so you can click through the full staff UI immediately.

## Supabase

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Add to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Native public request form

The public form saves requests directly to `donation_requests`. Supabase assigns
the next human-readable work-order number. Parking and identity photos are kept
in the private `request-documents` Storage bucket and are opened through a
staff-authorized, short-lived signed URL.

If the original database schema is already installed, run:

```text
supabase/migration_native_request_form.sql
```

The in-memory demo accepts submissions but does not persist uploaded files.

## Trailer scheduling rules

Statuses that hold a trailer: **Scheduled**, **Trailer On-Site**, **Ready for Pickup**.

- A trailer can only be on one active request at a time.
- Completing or cancelling a request frees the trailer.

## Load value estimates

In Settings, configure pounds and $/lb for:

- 1/4, 1/3, 1/2, 3/4, and full trailer

Manage Donations applies those variables when a load size is selected.

## Deploy (Vercel)

1. Push repo and import into Vercel.
2. Add the same env vars.
3. Deploy. Point Wufoo webhook at the production `/api/webhooks/wufoo` URL.
