import type { Metadata } from "next";
import { DocPage } from "@/components/doc-page";

export const metadata: Metadata = {
  title: "Accessibility Statement — MPLADS Sentinel",
  description:
    "Accessibility statement for the MPLADS Sentinel demo, aligned with the Guidelines for Indian Government Websites (GIGW 3.0).",
};

export default function AccessibilityPage() {
  return (
    <DocPage eyebrow="GIGW 3.0" title="Accessibility Statement">
      <p className="text-slate-700">
        The Ministry of Statistics &amp; Programme Implementation is committed to making this demonstration portal
        accessible to all users, in line with the Guidelines for Indian Government Websites (GIGW 3.0), the Rights
        of Persons with Disabilities (RPwD) Act 2016, and the Web Content Accessibility Guidelines (WCAG 2.x).
      </p>
      <ul className="list-disc space-y-1.5 pl-5 text-slate-700">
        <li>
          <span className="font-semibold">Text sizing:</span> use the A− / A / A+ controls in the header to resize
          text. Font size changes are reflected across the portal instantly.
        </li>
        <li>
          <span className="font-semibold">Keyboard navigation:</span> all pages are operable by keyboard alone, and
          a <span className="font-mono text-xs">Skip to main content</span> link is provided at the top of every page.
        </li>
        <li>
          <span className="font-semibold">Screen readers:</span> the dedicated screen-reader accessibility mode is
          not part of this demo build, but page structure uses semantic landmarks, labelled controls and descriptive
          alternative text for images and charts.
        </li>
        <li>
          <span className="font-semibold">Colour contrast:</span> risk bands are labelled by text and icon as well
          as colour, so information is not conveyed by colour alone.
        </li>
        <li>
          <span className="font-semibold">Browser support:</span> the portal is tested on current versions of
          Chrome, Edge, Firefox and Safari on desktop and mobile.
        </li>
      </ul>
      <p className="text-slate-700">
        For feedback or to report an accessibility barrier, please use the{" "}
        <a className="font-semibold text-navy-700 underline underline-offset-2" href="/contact">
          Contact page
        </a>{" "}
        or the NIC Help Desk at 1800-11-1555.
      </p>
    </DocPage>
  );
}