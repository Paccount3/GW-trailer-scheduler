import type { Metadata } from "next";
import { TrailerRequestForm } from "@/components/TrailerRequestForm";
import { SERVICE_TOWNS } from "@/lib/hold-harmless";

export const metadata: Metadata = {
  title: "Request a Trailer",
};

export default function RequestTrailerPage() {
  return (
    <div>
      <section className="hero-band">
        <div className="content-shell py-8 sm:py-10 lg:py-12">
          <p className="text-sm font-semibold tracking-wide text-white/75 mb-2">
            Goodwill Good to Go
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold text-white max-w-3xl leading-tight">
            Mobile Donation Trailer Request
          </h1>
          <p className="mt-3 max-w-2xl text-base sm:text-lg text-white/85">
            Thank you for your interest in reserving a Good to Go Mobile
            Donation Center.
          </p>
        </div>
      </section>

      <section className="content-shell py-6 sm:py-8 pb-12">
        <div className="panel mb-6 p-4 sm:p-6">
          <h2 className="text-xl font-bold">Before you begin</h2>
          <p className="mt-2 text-muted">
            Mobile Donation Centers are currently available in{" "}
            {SERVICE_TOWNS.join(", ")}.
          </p>
          <p className="mt-3 text-muted">
            We strive to accommodate as many requests as possible, but
            submitting this form does not guarantee a reservation. Due to the
            program’s popularity and limited number of trailers, we may be
            unable to fulfill every request for the selected dates.
          </p>
          <p className="mt-3 font-semibold">
            We appreciate your understanding.
          </p>
        </div>

        <div className="mx-auto max-w-5xl">
          <TrailerRequestForm />
        </div>
      </section>
    </div>
  );
}
