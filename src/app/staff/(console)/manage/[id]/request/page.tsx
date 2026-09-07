import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SignedRequestView } from "@/components/SignedRequestView";
import { data } from "@/lib/data";

export const metadata: Metadata = {
  title: "Signed Trailer Request",
};

export const dynamic = "force-dynamic";

export default async function SignedTrailerRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const donation = await data.getDonation(id);
  if (!donation) notFound();

  return <SignedRequestView donation={donation} />;
}
