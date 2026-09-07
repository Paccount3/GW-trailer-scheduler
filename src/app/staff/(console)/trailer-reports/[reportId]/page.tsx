import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CompletedReportView } from "@/components/CompletedReportView";
import { data } from "@/lib/data";

export const metadata: Metadata = {
  title: "Completed Pickup Report",
};

export const dynamic = "force-dynamic";

export default async function CompletedTrailerReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const reports = await data.listReports();
  const report = reports.find(
    (item) =>
      item.id === reportId &&
      item.report_type === "pickup" &&
      item.is_completed,
  );

  if (!report) notFound();

  const donation = await data.getDonation(report.donation_request_id);
  if (!donation) notFound();

  return <CompletedReportView report={report} donation={donation} />;
}
