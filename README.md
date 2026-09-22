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

Without Supabase env vars, the app uses a **file-backed local store** in `.data/`
so public requests, uploaded photos, staff edits, and trailer reports survive
server restarts. When Supabase credentials are added later, the same app uses
your hosted database and storage instead.

## Supabase

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Add to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

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

1. Push the repo and import it into Vercel.
2. In **Project Settings → Environment Variables**, add at least:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STAFF_PASSWORD=...
STAFF_SESSION_SECRET=...
```

3. In Supabase, run `supabase/schema.sql` (or the migrations) and confirm the
   private `request-documents` storage bucket exists.
4. Redeploy. The live site cannot use the local `.data` demo store — uploads and
   form submissions require Supabase.
