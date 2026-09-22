import { jsPDF } from "jspdf";
import { DonationRequest, fullName } from "@/lib/types";
import { HOLD_HARMLESS_TEXT } from "@/lib/hold-harmless";
import { formatDate } from "@/lib/utils";

function agreementText(donation: DonationRequest) {
  const snapshot = donation.agreements?.agreement_snapshot;
  return typeof snapshot === "string" ? snapshot : HOLD_HARMLESS_TEXT;
}

function writeWrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 5,
) {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  for (const line of lines) {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

export function downloadSignedAgreementPdf(donation: DonationRequest) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const left = 18;
  const width = 180;
  let y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Good to Go Mobile Donation Trailer Agreement", left, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Work Order #${donation.reference_code}`, left, y);
  y += 6;
  doc.text(`Submitted ${formatDate(donation.created_at)}`, left, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Applicant Information", left, y);
  y += 6;
  doc.setFont("helvetica", "normal");

  const details = [
    `Name: ${fullName(donation)}`,
    `Organization: ${donation.organization || "Not applicable"}`,
    `Address type: ${donation.address_type || "—"}`,
    `Town: ${donation.dropoff_town || donation.city || "—"}`,
    `Address: ${[
      donation.address_line1,
      donation.address_line2,
      donation.city,
      donation.state,
      donation.zip,
    ]
      .filter(Boolean)
      .join(", ")}`,
    `Phone: ${donation.phone || "—"}`,
    `Email: ${donation.email || "—"}`,
    `Requested reservation: ${
      donation.requested_duration_days
        ? `${donation.requested_duration_days} days`
        : donation.requested_days || "—"
    }`,
    `Requested drop-off: ${formatDate(donation.scheduled_date)}`,
    `How they heard: ${donation.heard_about || "—"}`,
  ];

  for (const line of details) {
    y = writeWrapped(doc, line, left, y, width, 5.5);
  }

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text("Parking Location", left, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  y = writeWrapped(
    doc,
    donation.parking_location_description || "No description provided.",
    left,
    y,
    width,
    5.5,
  );

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Hold Harmless Agreement", left, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  y = writeWrapped(doc, agreementText(donation), left, y, width, 4.2);

  y += 6;
  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Applicant Electronic Signature", left, y);
  y += 8;
  doc.setFont("times", "italic");
  doc.setFontSize(18);
  doc.text(donation.signature || "No signature recorded", left, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Signed ${formatDate(donation.signed_at)} · Agreement version ${
      donation.agreement_version || "not recorded"
    }`,
    left,
    y,
  );

  y += 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Goodwill Counter-Signature", left, y);
  y += 8;

  if (donation.staff_signature) {
    doc.setFont("times", "italic");
    doc.setFontSize(18);
    doc.text(donation.staff_signature, left, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
      `Signed by ${donation.staff_signer_name || "Goodwill team member"} on ${formatDate(
        donation.staff_signed_at,
      )}`,
      left,
      y,
    );
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Awaiting Goodwill team member counter-signature.", left, y);
  }

  doc.save(`GTG-Agreement-${donation.reference_code}.pdf`);
}
