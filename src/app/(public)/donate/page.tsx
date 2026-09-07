import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Make a Donation",
};

const donationMethods = [
  {
    title: "Give online",
    description: "Support Goodwill with a secure one-time or recurring gift.",
    href: process.env.NEXT_PUBLIC_SQUARE_DONATION_URL || "#",
    cta: "Donate with Square",
    note: "Configure NEXT_PUBLIC_SQUARE_DONATION_URL",
  },
  {
    title: "Other giving options",
    description:
      "Add PayPal, network for good, or regional Goodwill donation links here.",
    href: process.env.NEXT_PUBLIC_ALT_DONATION_URL || "#",
    cta: "Open donation link",
    note: "Configure NEXT_PUBLIC_ALT_DONATION_URL",
  },
];

export default function DonatePage() {
  return (
    <div>
      <section className="hero-band">
        <div className="content-shell py-8 sm:py-10">
          <p className="text-sm font-semibold tracking-wide text-white/75">
            Support the mission
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mt-2">
            Make a Donation
          </h1>
          <p className="mt-3 max-w-2xl text-base sm:text-lg text-white/85">
            Prefer to give financially? Use one of the trusted third-party options
            below. Trailer pickup requests stay on the{" "}
            <Link href="/" className="text-white font-semibold underline underline-offset-2">
              Request a Trailer
            </Link>{" "}
            page.
          </p>
        </div>
      </section>

      <div className="content-shell py-8 sm:py-10 pb-12">
        <div className="grid gap-5 md:grid-cols-2">
          {donationMethods.map((method) => (
            <article key={method.title} className="panel p-6 flex flex-col">
              <h2 className="text-2xl font-bold text-ink">{method.title}</h2>
              <p className="mt-2 text-muted flex-1">{method.description}</p>
              <a
                href={method.href}
                target={method.href === "#" ? undefined : "_blank"}
                rel="noreferrer"
                className="btn btn-primary mt-6 self-start"
              >
                {method.cta}
              </a>
              {method.href === "#" && (
                <p className="mt-3 text-xs text-muted">{method.note}</p>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
