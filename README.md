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
| `/staff/reports` | Staff | Charts & metrics |
| `/staff/settings` | Staff | Trailer inventory + load value estimate variables |

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Staff password defaults to `goodwill` (override with `STAFF_PASSWORD`).

Without Supabase env vars, the app uses a **file-backed local store**:
- Locally: `.data/`
- On Vercel demo deploys: `/tmp/gtg-demo/` (writable; enough for a team
  prototype, but data can reset when serverless instances recycle)

When Supabase credentials are added later, the same app uses your hosted
database and storage instead.

## Supabase

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Add to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
```

`SUPABASE_SECRET_KEY` is required for this app (starts with `sb_secret_…`).
Legacy `SUPABASE_SERVICE_ROLE_KEY` (JWT starting with `eyJ…`) still works.
Staff APIs and the public request form use this secret on the server (RLS
bypass). Never put it in client code or commit it to git.

On Vercel:
- `NEXT_PUBLIC_*` vars can be type **Config** (they must stay public)
- `SUPABASE_SECRET_KEY` must be type **Secret** and must **not** use `NEXT_PUBLIC_`

If an earlier schema is already installed, also run migrations in `supabase/`,
including `migration_staff_countersign.sql`.

## Native public request form

The public form saves requests directly to `donation_requests`. Supabase assigns
the next human-readable work-order number. Parking and identity photos are kept
in the private `request-documents` Storage bucket and are opened through a
staff-authorized, short-lived signed URL.

Locally (no Supabase), photos are stored under `.data/uploads/` and served by
the same staff document endpoint.

From Manage Donations, staff can open the signed request, add a Goodwill
counter-signature, and export the full agreement as a PDF.

If the original database schema is already installed, run:

```text
supabase/migration_native_request_form.sql
supabase/migration_staff_countersign.sql
```

## Trailer scheduling rules

Statuses that hold a trailer: **Scheduled**, **Trailer On-Site**, **Ready for Pickup**.

- A trailer can only be on one active request at a time.
- Completing or cancelling a request frees the trailer.

## Load value estimates

In Settings, configure pounds and $/lb for:

- 1/4, 1/3, 1/2, 3/4, and full trailer

Manage Donations applies those variables when a load size is selected.

## Deploy (Vercel)

Without Supabase, the app runs in **demo mode** on Vercel using writable
`/tmp` storage for requests, photos, and staff edits. That is enough for a
team prototype, but data can reset when serverless instances recycle.

1. Push the repo and import it into Vercel.
2. Set at least:

```env
STAFF_PASSWORD=...
STAFF_SESSION_SECRET=...
```

3. Deploy and demo the full request → manage → report flow.

When you are ready for real hosted data, add Supabase env vars and run the
SQL schema/migrations (including the `request-documents` storage bucket).
