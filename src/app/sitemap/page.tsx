import type { Metadata } from "next";
import Link from "next/link";
import { DocPage } from "@/components/doc-page";

export const metadata: Metadata = {
  title: "Sitemap — MPLADS Sentinel",
  description: "Site map of every page in the MPLADS Sentinel demonstration portal.",
};

const GROUPS: { label: string; items: { href: string; label: string }[] }[] = [
  {
    label: "Portals & role views",
    items: [
      { href: "/", label: "Landing / public homepage" },
      { href: "/public", label: "Citizen transparency portal" },
      { href: "/dashboard/mp", label: "Member of Parliament portal" },
      { href: "/dashboard/district", label: "District Magistrate portal" },
      { href: "/dashboard/state", label: "State Nodal Authority portal" },
      { href: "/dashboard/ministry", label: "Ministry audit console" },
      { href: "/dashboard/vendor", label: "Implementing Agency (vendor) portal" },
    ],
  },
  {
    label: "Transparency & audit",
    items: [
      { href: "/cases/MPL-2025-1007", label: "Case detail (example — gate hold, land tenure)" },
      { href: "/cases/MPL-2025-1021", label: "Case detail (example — low composite, gate fired)" },
      { href: "/ledger", label: "Immutable SHA-256 audit ledger" },
      { href: "/override-audit", label: "Override-audit register" },
      { href: "/dashboard/verify-photo", label: "Photo verification console" },
    ],
  },
  {
    label: "Policies & help",
    items: [
      { href: "/about-methodology", label: "About · Methodology & Limitations" },
      { href: "/accessibility", label: "Accessibility Statement" },
      { href: "/terms", label: "Terms of Use" },
      { href: "/contact", label: "Contact / Help Desk" },
      { href: "/sitemap", label: "Sitemap (this page)" },
    ],
  },
];

export default function SitemapPage() {
  return (
    <DocPage eyebrow="Site index" title="Sitemap">
      {GROUPS.map((group) => (
        <section key={group.label} className="rounded-md border border-navy-200 bg-navy-50/50 p-4">
          <h2 className="text-sm font-bold text-navy-950">{group.label}</h2>
          <ul className="mt-2 space-y-1.5">
            {group.items.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-navy-700 underline-offset-2 hover:text-navy-950 hover:underline">
                  {item.label}
                </Link>
                <span className="ml-2 font-mono text-[10px] text-slate-400">{item.href}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </DocPage>
  );
}