"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/store/AppStore";
import type { Role } from "@/lib/types";
import { STATE_NAME } from "@/lib/data";
import { Card } from "@/components/ui";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/hero/Hero";
import { StatStrip } from "@/components/dashboard/StatStrip";
import { ModeBanner } from "@/components/dashboard/ModeBanner";

const roles: {
  role: Role;
  title: string;
  org: string;
  tagline: string;
  bullets: string[];
  icon: string;
  badge?: string;
}[] = [
  {
    role: "mp",
    title: "Member of Parliament",
    org: "Constituency works",
    tagline: "Recommended works and their plain-language status — no risk jargon.",
    bullets: ["Recommended works list", "Entitlement utilisation", "Plain status per work"],
    icon: "🏛️",
  },
  {
    role: "district",
    title: "District Authority",
    org: "Case queue & decisions",
    tagline: "The working queue: colour-coded risk, gate holds, and approve / inspect / escalate.",
    bullets: ["Sortable case queue", "Gate badge — independent of score", "Milestone photo approvals"],
    icon: "⚖️",
    badge: "Recommended",
  },
  {
    role: "state",
    title: "State Nodal Authority",
    org: STATE_NAME,
    tagline: "District heatmaps, cross-district trends and override-rate oversight.",
    bullets: ["Utilisation heatmap", "Cross-sectional trends", "Override-rate register"],
    icon: "🗺️",
  },
  {
    role: "ministry",
    title: "MoSPI Ministry",
    org: "National overview",
    tagline: "National heatmap, category spend patterns and the escalated-case feed.",
    bullets: ["National heatmap", "Category expenditure", "Escalated case feed"],
    icon: "🏢",
  },
  {
    role: "vendor",
    title: "Implementing Agency",
    org: "Execution portal",
    tagline: "Geo-tagged stage photos (auto-verified), PFMS bank linking, stage disbursements.",
    bullets: ["pHash photo verification", "PFMS bank linking", "Stage disbursement requests"],
    icon: "🏗️",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { state, api } = useApp();

  const openGates = state.cases.filter((c) => c.gate.fired).length;
  const flagged = state.cases.filter(
    (c) => c.gate.fired || c.compositeScore >= 70 || c.moduleBreakdown.some((m) => m.triggered)
  ).length;
  const flagRate = state.cases.length ? Math.round((flagged / state.cases.length) * 100) : 0;

  const enter = (r: Role) => {
    api.setRole(r);
    router.push(`/dashboard/${r}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Header active="public" />

      <main id="main-content" className="flex-1">
        <Hero />

        <div className="mx-auto w-full max-w-7xl px-4 py-10">
          {/* Top public impact metrics */}
          <StatStrip
            items={[
              { label: "Total MPs Covered", value: "543", detail: "Lok Sabha constituencies", icon: <span aria-hidden>🏛️</span> },
              { label: "Total Funds Sanctioned", value: "₹8,341+ Cr", detail: "across all monitored works", accent: "text-teal-700" },
              { label: "Active Works Monitored", value: state.cases.length, detail: `${STATE_NAME} · FY 2025–26 demo slice` },
              {
                label: "Real-Time Anomaly Flag Rate",
                value: `${flagRate}%`,
                detail: `${flagged} of ${state.cases.length} works flagged`,
                accent: flagRate > 0 ? "text-gate" : "text-teal-700",
              },
            ]}
          />

          <div className="mt-6">
            <ModeBanner />
          </div>

          {/* Six desks */}
          <div className="mt-14">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gov-gold">One system · six desks</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-navy-950 sm:text-3xl">
                Anomaly → gate → ledger, end to end
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Sentinel scans every recommended work for duplicates, inflated costs, ghosts, rule violations,
                payment leaks and stalled projects. A <b>Critical-Risk Gate</b> enforces hard guidelines on top of a
                soft composite score; every human decision lands in a SHA-256 hash-chained ledger and every
                override is auto-flagged for audit. Pick a desk to explore.
              </p>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {roles.map((r) => (
                <button
                  key={r.role}
                  onClick={() => enter(r.role)}
                  className="group relative flex flex-col rounded-xl border border-navy-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-navy-500 hover:shadow-md"
                >
                  {r.badge && (
                    <span className="absolute -top-2.5 right-5 rounded-full bg-gov-gold px-2 py-0.5 text-[10px] font-bold text-white">
                      {r.badge}
                    </span>
                  )}
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-navy-50 text-xl ring-1 ring-navy-100">
                    {r.icon}
                  </div>
                  <div className="text-sm font-extrabold text-navy-950">{r.title}</div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-500">{r.org}</div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">{r.tagline}</p>
                  <ul className="mt-3 space-y-1.5">
                    {r.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <span className="text-teal-600">✓</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 text-xs font-bold text-navy-700 opacity-0 transition group-hover:opacity-100">
                    Enter dashboard →
                  </div>
                </button>
              ))}

              {/* Citizen desk */}
              <Link
                href="/public"
                className="group relative flex flex-col rounded-xl border border-gov-gold/40 bg-gradient-to-br from-white to-amber-50/60 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-xl">
                  🌐
                </div>
                <div className="text-sm font-extrabold text-navy-950">Citizen Public View</div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-gov-gold">
                  Transparency · भागीदारी
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Every sanctioned work with its geo-pin, official status and the public audit chain — read-only.
                </p>
                <ul className="mt-3 space-y-1.5">
                  {["Interactive asset map", "Public asset directory", "SHA-256 ledger explorer"].map((b) => (
                    <li key={b} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                      <span className="text-teal-600">✓</span>
                      {b}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 text-xs font-bold text-gov-gold opacity-0 transition group-hover:opacity-100">
                  Open public explorer →
                </div>
              </Link>
            </div>
          </div>

          {/* Pipeline explainer strip */}
          <div className="mt-14 grid gap-6 rounded-xl border border-navy-200 bg-white p-6 shadow-sm sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Detect",
                body: "Seven modules score every work — duplicates, cost variance, compliance, payments, stall risk, photo integrity and trend deviation.",
              },
              {
                step: "02",
                title: "Gate",
                body: "A Critical-Risk Gate freezes releases on hard-rule violations, independent of the composite score — no officer can waive it silently.",
              },
              {
                step: "03",
                title: "Ledger",
                body: "Every decision is appended to a SHA-256 hash chain. Tampering is detectable, overrides are audited, and the public sees the trail.",
              },
            ].map((s) => (
              <div key={s.step} className="flex gap-4">
                <span className="text-2xl font-extrabold tabular-nums text-navy-100">{s.step}</span>
                <div>
                  <h3 className="text-sm font-extrabold text-navy-950">{s.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
