"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, FileCheck2, MapPin, ShieldCheck } from "lucide-react";
import {
  HOLD_HARMLESS_TEXT,
  NON_DONATABLE_ITEMS,
  SERVICE_TOWNS,
} from "@/lib/hold-harmless";

function AgreementCheckbox({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-line bg-white p-4 text-sm font-semibold">
      <input
        type="checkbox"
        name={name}
        required
        className="mt-0.5 size-5 shrink-0 accent-[var(--gw-blue)]"
      />
      <span>{children}</span>
    </label>
  );
}

export function TrailerRequestForm() {
  const [addressType, setAddressType] = useState("residential");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [referenceCode, setReferenceCode] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!formElement.reportValidity()) return;

    setSubmitting(true);
    setError("");
    const response = await fetch("/api/requests", {
      method: "POST",
      body: new FormData(formElement),
    });
    const body = await response.json().catch(() => ({}));
    setSubmitting(false);

    if (!response.ok) {
      setError(body.error || "Unable to submit your request.");
      if (body.field) {
        const field = formElement.elements.namedItem(String(body.field));
        if (field instanceof HTMLElement) {
          field.focus();
          field.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
      return;
    }

    setReferenceCode(body.reference_code);
    formElement.reset();
    setAddressType("residential");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      {referenceCode && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-ink/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="request-complete-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="bg-gw-blue-deep px-6 py-7 text-center text-white">
              <CheckCircle2 className="mx-auto size-16" aria-hidden="true" />
              <h2
                id="request-complete-title"
                className="mt-4 text-2xl font-bold text-white"
              >
                Request Received
              </h2>
              <p className="mt-2 text-xl font-bold text-white">
                Work Order #{referenceCode}
              </p>
            </div>
            <div className="p-6 text-center">
              <p className="text-muted">
                This request is not yet a guaranteed reservation. Goodwill staff
                will contact you after reviewing availability and placement.
              </p>
              <button
                type="button"
                className="btn btn-primary mt-6 min-h-14 w-full text-lg"
                onClick={() => setReferenceCode(null)}
                autoFocus
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="space-y-6">
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          className="absolute left-[-10000px]"
          aria-hidden="true"
        />

        <section className="panel overflow-hidden">
          <div className="border-b border-line bg-white px-4 py-5 sm:px-6">
            <p className="text-xs font-bold uppercase tracking-wider text-gw-blue">
              Step 1
            </p>
            <h2 className="mt-1 text-2xl font-bold">Contact Information</h2>
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
            <label className="text-sm font-semibold">
              First name *
              <input
                name="first_name"
                autoComplete="given-name"
                className="input mt-1.5"
                required
                maxLength={80}
              />
            </label>
            <label className="text-sm font-semibold">
              Last name *
              <input
                name="last_name"
                autoComplete="family-name"
                className="input mt-1.5"
                required
                maxLength={80}
              />
            </label>
            <label className="text-sm font-semibold sm:col-span-2">
              Organization or business name
              <input
                name="organization"
                autoComplete="organization"
                className="input mt-1.5"
                maxLength={150}
              />
            </label>
            <label className="text-sm font-semibold">
              Address type *
              <select
                name="address_type"
                className="select mt-1.5"
                required
                value={addressType}
                onChange={(event) => setAddressType(event.target.value)}
              >
                <option value="residential">Residential address</option>
                <option value="organization">
                  Organization or business address
                </option>
              </select>
            </label>
            <label className="text-sm font-semibold">
              Drop-off town *
              <select name="dropoff_town" className="select mt-1.5" required>
                {SERVICE_TOWNS.map((town) => (
                  <option key={town}>{town}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold sm:col-span-2">
              Street address *
              <input
                name="address_line1"
                autoComplete="address-line1"
                className="input mt-1.5"
                required
              />
            </label>
            <label className="text-sm font-semibold sm:col-span-2">
              Address line 2
              <input
                name="address_line2"
                autoComplete="address-line2"
                className="input mt-1.5"
              />
            </label>
            <label className="text-sm font-semibold">
              City *
              <input
                name="city"
                autoComplete="address-level2"
                className="input mt-1.5"
                required
              />
            </label>
            <label className="text-sm font-semibold">
              State / province / region *
              <input
                name="state"
                autoComplete="address-level1"
                className="input mt-1.5"
                defaultValue="CT"
                required
              />
            </label>
            <label className="text-sm font-semibold">
              Postal / ZIP code *
              <input
                name="zip"
                autoComplete="postal-code"
                className="input mt-1.5"
                required
              />
            </label>
            <label className="text-sm font-semibold">
              Country *
              <input
                name="country"
                autoComplete="country-name"
                className="input mt-1.5"
                defaultValue="United States"
                required
              />
            </label>
            <label className="text-sm font-semibold">
              Phone number *
              <input
                type="tel"
                name="phone"
                autoComplete="tel"
                className="input mt-1.5"
                placeholder="203-555-0123"
                required
              />
            </label>
            <label className="text-sm font-semibold">
              Email *
              <input
                type="email"
                name="email"
                autoComplete="email"
                className="input mt-1.5"
                required
              />
            </label>
            {addressType === "organization" && (
              <p className="rounded-lg bg-gw-blue-soft p-3 text-sm text-gw-blue-deep sm:col-span-2">
                Ensure you are authorized to reserve and place a trailer at this
                organization or business address.
              </p>
            )}
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="border-b border-line bg-white px-4 py-5 sm:px-6">
            <p className="text-xs font-bold uppercase tracking-wider text-gw-blue">
              Step 2
            </p>
            <h2 className="mt-1 text-2xl font-bold">Reservation Request</h2>
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
            <label className="text-sm font-semibold">
              Number of days *
              <select
                name="requested_duration_days"
                className="select mt-1.5"
                required
              >
                <option value="2">2 days</option>
                <option value="3">3 days</option>
              </select>
            </label>
            <label className="text-sm font-semibold">
              Requested drop-off date *
              <input
                type="date"
                name="scheduled_date"
                className="input mt-1.5"
                min={today}
                required
                onChange={(event) => {
                  const date = new Date(`${event.target.value}T12:00:00`);
                  const weekend = date.getDay() === 0 || date.getDay() === 6;
                  event.target.setCustomValidity(
                    weekend
                      ? "Please select a Monday through Friday."
                      : "",
                  );
                }}
              />
              <span className="mt-1 block text-xs font-normal text-muted">
                Drop-offs and pickups occur Monday–Friday only.
              </span>
            </label>
            <label className="text-sm font-semibold sm:col-span-2">
              Describe the trailer parking location *
              <textarea
                name="parking_location_description"
                className="textarea mt-1.5 min-h-32"
                required
                minLength={10}
                maxLength={2000}
                placeholder="Describe the flat surface, street or driveway access, clearance, and exact placement."
              />
            </label>
            <div className="rounded-lg bg-gw-blue-soft p-4 text-sm text-gw-blue-deep sm:col-span-2">
              <MapPin className="mb-2 size-5" aria-hidden="true" />
              The trailer must be parked on a lawful, safe, flat surface and
              remain stationary for the reservation. Load the heaviest items
              first and toward the front. Close and latch all doors securely.
              Goodwill does not provide a lock.
            </div>
            <label className="text-sm font-semibold">
              Parking-location photo *
              <input
                type="file"
                name="parking_photo"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="mt-1.5 block w-full rounded-lg border border-line bg-white p-3 text-sm"
                required
              />
              <span className="mt-1 block text-xs font-normal text-muted">
                JPG, PNG, or WebP; maximum 8 MB.
              </span>
            </label>
            <label className="text-sm font-semibold">
              Driver’s license for identity verification *
              <input
                type="file"
                name="license_photo"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="mt-1.5 block w-full rounded-lg border border-line bg-white p-3 text-sm"
                required
              />
              <span className="mt-1 block text-xs font-normal text-muted">
                Stored privately and available only to authorized staff.
              </span>
            </label>
            <label className="text-sm font-semibold sm:col-span-2">
              How did you hear about Mobile Donation Centers? *
              <select name="heard_about" className="select mt-1.5" required>
                <option value="">Select one</option>
                <option>Social media</option>
                <option>Goodwill website</option>
                <option>Friend or family</option>
                <option>Community organization</option>
                <option>Past reservation</option>
                <option>Other</option>
              </select>
            </label>
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="border-b border-line bg-white px-4 py-5 sm:px-6">
            <p className="text-xs font-bold uppercase tracking-wider text-gw-blue">
              Step 3
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              Hold Harmless Agreement
            </h2>
            <p className="mt-1 text-sm text-muted">
              Read the complete agreement before accepting and signing.
            </p>
          </div>
          <div className="p-4 sm:p-6">
            <div
              className="max-h-[34rem] overflow-y-auto rounded-lg border border-line bg-surface p-4 sm:p-6"
              tabIndex={0}
            >
              <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-ink">
                {HOLD_HARMLESS_TEXT}
              </pre>
            </div>
            <div className="mt-4">
              <AgreementCheckbox name="hold_harmless_agreed">
                I have read and agree to the Hold Harmless Agreement.
              </AgreementCheckbox>
            </div>
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="border-b border-line bg-white px-4 py-5 sm:px-6">
            <p className="text-xs font-bold uppercase tracking-wider text-gw-blue">
              Step 4
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              Donation Rules & Acknowledgments
            </h2>
          </div>
          <div className="space-y-4 p-4 sm:p-6">
            <div className="rounded-lg border border-line bg-surface p-4">
              <h3 className="font-bold">Non-donatable items</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
                {NON_DONATABLE_ITEMS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <AgreementCheckbox name="non_donatable_agreed">
              I reviewed the list and understand these items cannot be donated.
              Goodwill may refuse unacceptable donations and return prohibited,
              wet, moldy, broken, or trash items to the property. The reserving
              party may be responsible for removal or disposal costs.
            </AgreementCheckbox>
            <AgreementCheckbox name="intended_use_agreed">
              I have read and agree to use the Mobile Donation Center for its
              intended purpose.
            </AgreementCheckbox>
            <AgreementCheckbox name="lock_removal_agreed">
              I understand that Goodwill may cut and remove any personal lock
              left on the trailer at the scheduled pickup time.
            </AgreementCheckbox>
            <AgreementCheckbox name="stationary_agreed">
              I understand that after placement, the trailer cannot be moved or
              repositioned.
            </AgreementCheckbox>
            <AgreementCheckbox name="goodwill_only_agreed">
              I agree to use the Mobile Donation Center only to collect
              donations for Goodwill.
            </AgreementCheckbox>
            <AgreementCheckbox name="lawn_sign_agreed">
              I agree to display the Goodwill lawn sign visibly for the
              duration of the trailer’s use.
            </AgreementCheckbox>
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="border-b border-line bg-white px-4 py-5 sm:px-6">
            <p className="text-xs font-bold uppercase tracking-wider text-gw-blue">
              Step 5
            </p>
            <h2 className="mt-1 text-2xl font-bold">Electronic Signature</h2>
          </div>
          <div className="p-4 sm:p-6">
            <div className="flex gap-3 rounded-lg bg-gw-blue-soft p-4 text-sm text-gw-blue-deep">
              <ShieldCheck className="size-6 shrink-0" aria-hidden="true" />
              <p>
                Typing your full legal name constitutes your electronic
                signature and records the date and time of acceptance.
              </p>
            </div>
            <label className="mt-5 block text-sm font-semibold">
              Full legal signature *
              <input
                name="signature"
                className="input mt-1.5 text-2xl italic"
                style={{ fontFamily: "cursive" }}
                placeholder="Type your full legal name"
                required
                maxLength={150}
              />
            </label>
          </div>
        </section>

        {error && (
          <div
            className="rounded-lg border border-red-300 bg-red-50 p-4 font-semibold text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3 text-sm text-muted">
            <FileCheck2 className="size-5 shrink-0 text-gw-blue" />
            <p>
              Submission does not guarantee a reservation. Goodwill will review
              your request and contact you.
            </p>
          </div>
          <button
            type="submit"
            className="btn btn-primary min-h-14 shrink-0 px-8 text-base"
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "Submit Trailer Request"}
          </button>
        </div>
      </form>
    </>
  );
}
