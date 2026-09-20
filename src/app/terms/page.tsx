import type { Metadata } from "next";
import { DocPage } from "@/components/doc-page";

export const metadata: Metadata = {
  title: "Terms of Use — MPLADS Sentinel",
  description:
    "Terms of use for the MPLADS Sentinel demonstration prototype. Synthetic data only; not a live government service.",
};

export default function TermsPage() {
  return (
    <DocPage eyebrow="Government of India · MoSPI" title="Terms of Use">
      <section className="rounded-md border border-navy-200 bg-navy-50/50 p-4">
        <h2 className="text-sm font-bold text-navy-950">Demonstration purpose only</h2>
        <p className="mt-1 text-slate-700">
          This portal is an interactive demonstration prototype. It does not constitute an official government
          service, nor does it exchange data with live MPLADS, PFMS, GSTN, e-Sakshi or NIC systems. By accessing
          this portal you acknowledge that everything you see — cases, officials, amounts, photos, videos and
          audit entries — is synthetic demonstration data created for capability illustration.
        </p>
      </section>
      <section className="rounded-md border border-navy-200 bg-navy-50/50 p-4">
        <h2 className="text-sm font-bold text-navy-950">No collection of personal data</h2>
        <p className="mt-1 text-slate-700">
          The demo runs entirely in your browser against bundled seed data. No personal information is collected,
          stored or transmitted to any government system. Any account numbers, PANs, GSTINs or vendor names entered
          are held only in the volatile in-memory demo state and are discarded on reset or page close.
        </p>
      </section>
      <section className="rounded-md border border-navy-200 bg-navy-50/50 p-4">
        <h2 className="text-sm font-bold text-navy-950">No warranty, no liability</h2>
        <p className="mt-1 text-slate-700">
          The prototype is provided on an &quot;as-is&quot; basis for evaluation. Automated scores, gate holds and
          integrity alerts are illustrative and are not an audit, adjudication or legal determination. Neither the
          Ministry of Statistics &amp; Programme Implementation, NIC, nor the demonstration team shall be liable for
          any decision made based on the contents of this prototype.
        </p>
      </section>
      <section className="rounded-md border border-navy-200 bg-navy-50/50 p-4">
        <h2 className="text-sm font-bold text-navy-950">Contact</h2>
        <p className="mt-1 text-slate-700">
          Queries about this demonstration may be directed through the{" "}
          <a className="font-semibold text-navy-700 underline underline-offset-2" href="/contact">
            Contact page
          </a>
          .
        </p>
      </section>
    </DocPage>
  );
}