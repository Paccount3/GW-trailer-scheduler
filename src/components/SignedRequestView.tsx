"use client";

import Link from "next/link";
import { useState } from "react";
import { downloadSignedAgreementPdf } from "@/lib/agreement-pdf";
import { HOLD_HARMLESS_TEXT } from "@/lib/hold-harmless";
import { DonationRequest, fullName } from "@/lib/types";
import { formatDate } from "@/lib/utils";

function DocumentLink({
  path,
  children,
}: {
  path: string | null;
  children: React.ReactNode;
}) {
  if (!path) return <span className="text-muted">Not available</span>;
  return (
    <a
      href={`/api/request-documents?path=${encodeURIComponent(path)}`}
      target="_blank"
      rel="noreferrer"
      className="btn btn-secondary"
    >
      {children}
    </a>
  );
}

export function SignedRequestView({
  donation: initialDonation,
}: {
  donation: DonationRequest;
}) {
  const [donation, setDonation] = useState(initialDonation);
  const [staffName, setStaffName] = useState(donation.staff_signer_name || "");
  const [staffSignature, setStaffSignature] = useState(
    donation.staff_signature || "",
  );
  const [editingSignature, setEditingSignature] = useState(
    !donation.staff_signature,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const agreements = donation.agreements || {};
  const agreementText =
    typeof agreements.agreement_snapshot === "string"
      ? agreements.agreement_snapshot
      : HOLD_HARMLESS_TEXT;
  const accepted = [
    ["Hold Harmless Agreement", agreements.hold_harmless_agreed],
    ["Non-donatable item restrictions", agreements.non_donatable_agreed],
    ["Intended use", agreements.intended_use_agreed],
    ["Personal lock removal", agreements.lock_removal_agreed],
    ["Trailer remains stationary", agreements.stationary_agreed],
    ["Goodwill donations only", agreements.goodwill_only_agreed],
    ["Display Goodwill lawn sign", agreements.lawn_sign_agreed],
  ];
  const countersigned = Boolean(donation.staff_signature && donation.staff_signed_at);

  async function saveCountersign() {
    setSaving(true);
    setError("");
    setMessage("");

    const res = await fetch(`/api/donations/${donation.id}/countersign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        staff_signer_name: staffName,
        staff_signature: staffSignature,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setError(body.error || "Unable to save counter-signature");
      return;
    }

    setDonation(body as DonationRequest);
    setEditingSignature(false);
    setMessage("Goodwill counter-signature saved.");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-gw-blue">
            Work Order #{donation.reference_code}
          </p>
          <h1 className="text-3xl font-bold">Signed Trailer Request</h1>
          <p className="mt-1 text-muted">
            Submitted {formatDate(donation.created_at)}
            {countersigned ? " · Counter-signed by Goodwill" : " · Awaiting Goodwill signature"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => downloadSignedAgreementPdf(donation)}
          >
            Export agreement PDF
          </button>
          <Link href="/staff/manage" className="btn btn-secondary">
            Back to Manage Donations
          </Link>
        </div>
      </div>

      <section className="panel overflow-hidden">
        <div className="bg-gw-blue-deep px-4 py-4 text-white sm:px-6">
          <h2 className="text-xl font-bold text-white">Applicant</h2>
        </div>
        <dl className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
          {[
            ["Name", fullName(donation)],
            ["Organization", donation.organization || "Not applicable"],
            ["Address type", donation.address_type || "—"],
            ["Town", donation.dropoff_town || donation.city || "—"],
            [
              "Address",
              [
                donation.address_line1,
                donation.address_line2,
                donation.city,
                donation.state,
                donation.zip,
              ]
                .filter(Boolean)
                .join(", "),
            ],
            ["Phone", donation.phone || "—"],
            ["Email", donation.email || "—"],
            [
              "Requested reservation",
              donation.requested_duration_days
                ? `${donation.requested_duration_days} days`
                : donation.requested_days || "—",
            ],
            ["Requested drop-off", formatDate(donation.scheduled_date)],
            ["How they heard", donation.heard_about || "—"],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                {label}
              </dt>
              <dd className="mt-1 font-semibold capitalize">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="panel p-4 sm:p-6">
        <h2 className="text-xl font-bold">Placement Review</h2>
        <p className="mt-3 whitespace-pre-wrap text-muted">
          {donation.parking_location_description || "No description provided."}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <DocumentLink path={donation.parking_photo_path}>
            View parking photo
          </DocumentLink>
          <DocumentLink path={donation.license_photo_path}>
            View private license photo
          </DocumentLink>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-4 py-4 sm:px-6">
          <h2 className="text-xl font-bold">Accepted Acknowledgments</h2>
        </div>
        <div className="divide-y divide-line">
          {accepted.map(([label, value]) => (
            <div
              key={String(label)}
              className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6"
            >
              <span className="font-semibold">{String(label)}</span>
              <span
                className={`status-pill ${
                  value
                    ? "bg-emerald-600 text-white"
                    : "bg-red-600 text-white"
                }`}
              >
                {value ? "Accepted" : "Not recorded"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-4 sm:p-6">
        <h2 className="text-xl font-bold">Applicant Electronic Signature</h2>
        <p
          className="mt-5 border-b-2 border-ink pb-2 text-3xl italic"
          style={{ fontFamily: "cursive" }}
        >
          {donation.signature || "No signature recorded"}
        </p>
        <p className="mt-2 text-sm text-muted">
          Signed {formatDate(donation.signed_at)} · Agreement version{" "}
          {donation.agreement_version || "not recorded"}
        </p>
      </section>

      <section className="panel p-4 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">Goodwill Counter-Signature</h2>
            <p className="mt-1 text-sm text-muted">
              A Goodwill team member can sign this agreement before exporting
              the PDF.
            </p>
          </div>
          <span
            className={`status-pill ${
              countersigned
                ? "bg-emerald-600 text-white"
                : "bg-amber-100 text-amber-900"
            }`}
          >
            {countersigned ? "Counter-signed" : "Needs signature"}
          </span>
        </div>

        {countersigned && !editingSignature ? (
          <div className="mt-5">
            <p
              className="border-b-2 border-ink pb-2 text-3xl italic"
              style={{ fontFamily: "cursive" }}
            >
              {donation.staff_signature}
            </p>
            <p className="mt-2 text-sm text-muted">
              Signed by {donation.staff_signer_name} on{" "}
              {formatDate(donation.staff_signed_at)}
            </p>
            <button
              type="button"
              className="btn btn-secondary mt-4"
              onClick={() => {
                setStaffName(donation.staff_signer_name || "");
                setStaffSignature(donation.staff_signature || "");
                setEditingSignature(true);
                setMessage("");
              }}
            >
              Replace counter-signature
            </button>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Printed name
              <input
                className="input mt-1.5"
                value={staffName}
                onChange={(event) => setStaffName(event.target.value)}
                placeholder="Goodwill team member"
                disabled={saving}
              />
            </label>
            <label className="block text-sm font-semibold">
              Signature (typed name)
              <input
                className="input mt-1.5"
                value={staffSignature}
                onChange={(event) => setStaffSignature(event.target.value)}
                placeholder="Type full name to sign"
                disabled={saving}
                style={{ fontFamily: "cursive", fontSize: "1.15rem" }}
              />
            </label>
            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving || !staffName.trim() || !staffSignature.trim()}
                onClick={saveCountersign}
              >
                {saving ? "Saving…" : "Save Goodwill signature"}
              </button>
              {countersigned && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={saving}
                  onClick={() => {
                    setStaffName(donation.staff_signer_name || "");
                    setStaffSignature(donation.staff_signature || "");
                    setEditingSignature(false);
                    setError("");
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
        {message && !error && (
          <p className="mt-3 text-sm text-emerald-700">{message}</p>
        )}
      </section>

      <details className="panel overflow-hidden">
        <summary className="cursor-pointer px-4 py-4 text-lg font-bold sm:px-6">
          View signed Hold Harmless Agreement
        </summary>
        <div className="max-h-[40rem] overflow-y-auto border-t border-line bg-surface p-4 sm:p-6">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-6">
            {agreementText}
          </pre>
        </div>
      </details>
    </div>
  );
}
