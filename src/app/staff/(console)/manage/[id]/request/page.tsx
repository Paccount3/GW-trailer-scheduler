import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SignedRequestView } from "@/components/SignedRequestView";
import { data } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/server";

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
  const browserDemo = !isSupabaseConfigured();

  if (browserDemo) {
    return (
      <SignedRequestView
        donation={null}
        donationId={id}
        browserDemo
      />
    );
  }

  const donation = await data.getDonation(id);
  if (!donation) notFound();

  return (
    <SignedRequestView donation={donation} donationId={id} />
  );
}
