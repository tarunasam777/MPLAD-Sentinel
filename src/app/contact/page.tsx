import type { Metadata } from "next";
import { DocPage } from "@/components/doc-page";

export const metadata: Metadata = {
  title: "Contact / Help Desk — MPLADS Sentinel",
  description:
    "Contact details for the MPLADS Sentinel demonstration: NIC Help Desk, MoSPI and a demonstration feedback channel.",
};

export default function ContactPage() {
  return (
    <DocPage eyebrow="Government of India · MoSPI" title="Contact / Help Desk">
      <section className="rounded-md border border-navy-200 bg-navy-50/50 p-4">
        <h2 className="text-sm font-bold text-navy-950">Demonstration contact channel</h2>
        <p className="mt-1 text-slate-700">
          This portal is a prototype. For feedback on the demonstration, feature requests or bug reports, write to
          <span className="font-mono text-xs"> mplads-sentinel-demo@nic.in</span> (illustrative address). Please
          include the page URL and the steps that triggered any unexpected behaviour.
        </p>
      </section>
      <section className="rounded-md border border-navy-200 bg-navy-50/50 p-4">
        <h2 className="text-sm font-bold text-navy-950">Official channels</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-slate-700">
          <li>NIC Help Desk: 1800-11-1555 (10:00–17:30 hrs, IST)</li>
          <li>MeitY / NIC website: nic.in</li>
          <li>Ministry of Statistics &amp; Programme Implementation: mospi.gov.in</li>
          <li>PFMS portal: pfms.nic.in</li>
        </ul>
        <p className="mt-2 text-slate-600">
          Queries about an actual MPLADS work, entitlement or disbursement must be addressed to the concerned
          District Magistrate / State Nodal Authority — not to this demonstration.
        </p>
      </section>
    </DocPage>
  );
}