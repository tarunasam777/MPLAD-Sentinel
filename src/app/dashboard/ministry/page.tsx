"use client";

import Link from "next/link";
import { useState } from "react";
import { Shell } from "@/components/shell";
import { useApp } from "@/store/AppStore";
import { Card, HelpNote, Pill, SectionTitle } from "@/components/ui";
import { StatStrip } from "@/components/dashboard/StatStrip";
import { ModeBanner } from "@/components/dashboard/ModeBanner";
import { IngestSyncButton } from "@/components/dashboard/IngestSyncButton";
import { GateBadge, ScoreChip } from "@/components/dashboard/risk";
import { NationalHeatmap } from "@/components/dashboard/heatmap";
import { Donut, SpendBars } from "@/components/dashboard/charts";
import { scoreBand } from "@/lib/format";
import { postScaleSeed } from "@/lib/api";

export default function MinistryDashboardPage() {
  const { state } = useApp();
  const categoryExpenditure = state.analytics.categoryExpenditure;
  const nationalHeatmap = state.analytics.nationalHeatmap;
  const allocations = state.analytics.mpAllocations;

  const escalated = state.cases.filter((c) => c.status === "escalated" || scoreBand(c.compositeScore) === "high");
  const openGatesAll = state.cases.filter((c) => c.gate.fired && c.status === "hold_active").length;
  const totalSanctions = categoryExpenditure.reduce((a, c) => a + c.sanctionsCr, 0);
  const totalReleases = categoryExpenditure.reduce((a, c) => a + c.releasesCr, 0);

  const donutData = categoryExpenditure
    .map((c) => ({ name: c.category, value: +((c.releasesCr / totalReleases) * 100).toFixed(1) }))
    .sort((a, b) => b.value - a.value);

  return (
    <Shell active="home">
      <div className="mb-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-500">
          MoSPI Ministry · national overview
        </div>
        <h1 className="mt-1 text-2xl font-extrabold text-navy-950">National picture</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Footprint of the scheme across states and categories, with the escalated cases that climbed to
          this desk. Seed the national scale sample below to spread evaluated works across the official
          543-constituency allocation table — the heatmap then reflects real per-state evaluation output.
        </p>
      </div>

      <StatStrip
        items={[
          { label: "National utilisation", value: "59%", detail: "of ₹1,850 Cr sanctioned", accent: "text-teal-700", icon: <span aria-hidden>🇮🇳</span> },
          { label: "States/UTs covered", value: nationalHeatmap.length, detail: `${allocations.mpCount} official MP allocations tracked` },
          { label: "Open gates (all states)", value: openGatesAll, detail: "hard-rule holds", accent: "text-gate" },
          { label: "Escalated this week", value: escalated.length, detail: "climbed to ministry feed" },
        ]}
      />

      <div className="mt-6">
        <ModeBanner />
      </div>

      <div className="mt-4">
        <IngestSyncButton />
      </div>

      <div className="mt-8">
        <Card className="rounded-xl p-6">
          <SectionTitle
            title="National utilisation heatmap"
            subtitle="Utilisation % of sanctioned amount by state — the laggards are the story"
            eyebrow="Utilisation"
          />
          <div className="mt-4">
            <NationalHeatmap data={nationalHeatmap} />
          </div>
          <div className="mt-4 border-t border-navy-100 pt-4">
            <ScaleSeedPanel />
          </div>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="rounded-xl p-6">
          <SectionTitle
            title="Expenditure by category"
            subtitle={`Releases ₹${totalReleases} Cr against sanctions ₹${totalSanctions} Cr`}
          />
          <div className="mt-2">
            <SpendBars data={categoryExpenditure} />
          </div>
        </Card>
        <Card className="rounded-xl p-6">
          <SectionTitle title="Category share of releases" subtitle="Donut of actual release value" />
          <div className="mt-2">
            <Donut data={donutData} />
          </div>
        </Card>
      </div>

      <div>
        <SectionTitle
          eyebrow="Escalation feed"
          title="Top escalated & high-risk cases across states"
          subtitle="What reached (or should reach) ministry attention — newest first"
        />
        <div className="mt-3 space-y-2.5">
          {[...escalated]
            .sort((a, b) => b.compositeScore - a.compositeScore)
            .map((c) => (
              <Link key={c.id} href={`/cases/${c.id}?from=ministry`} className="block">
                <Card className="flex flex-wrap items-center justify-between gap-3 border-l-4 border-l-red-500 p-3.5 transition hover:shadow-md">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <ScoreChip score={c.compositeScore} />
                      {c.gate.fired && <GateBadge small />}
                      <span className="truncate text-sm font-bold text-navy-950">{c.title}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {c.id} · {c.state} · {c.district} district · {c.category} · status since {c.statusSince}
                    </div>
                  </div>
                  <div className="shrink-0 text-xs font-bold text-navy-700">Review →</div>
                </Card>
              </Link>
            ))}
          <Card className="flex items-start gap-3 border-dashed border-navy-300 bg-navy-50/60 p-3.5">
            <Pill className="border-navy-300 bg-white text-navy-700">Signal only</Pill>
            <div>
              <div className="text-sm font-bold text-navy-900">Vindhya Pradakshin · Headworks dredging repeats</div>
              <div className="mt-0.5 text-xs text-slate-600">
                Illustrative, out-of-queue signal: category-level release gap in dredging works flagged to the
                Rajya Sabha-estimates cell. (Not linked — outside the demo queue.)
              </div>
            </div>
          </Card>
          <Card className="flex items-start gap-3 border-dashed border-navy-300 bg-navy-50/60 p-3.5">
            <Pill className="border-navy-300 bg-white text-navy-700">Signal only</Pill>
            <div>
              <div className="text-sm font-bold text-navy-900">North Karnapura · vendor concentration risk</div>
              <div className="mt-0.5 text-xs text-slate-600">
                Illustrative signal: three awards to one vendor within a single quarter in the same sector,
                surfaced by the trend module. (Not linked — outside the demo queue.)
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <HelpNote>
          This is the top of the funnel: the ministry should be reading <b>patterns</b>. The{" "}
          <Link href="/override-audit" className="font-bold underline">Override-Audit register</Link> (state &
          ministry only) is the single most informative table on this demo — gate overrides are the red flag.
        </HelpNote>
      </div>
    </Shell>
  );
}
function ScaleSeedPanel() {
  const { state, api } = useApp();
  const [status, setStatus] = useState<"idle" | "seeding" | "done" | "error">("idle");
  const [detail, setDetail] = useState<string | null>(null);

  const run = async (force: boolean) => {
    setStatus("seeding");
    setDetail(null);
    try {
      const res = await postScaleSeed(750, force);
      if (state.mode === "live") await api.retryLive();
      setStatus("done");
      setDetail(
        res.seeded
          ? `${res.count} synthetic works across ${res.states.length} states · ${res.held} held — heatmap and metrics above now reflect live coverage`
          : `Scale sample already present (${res.existing_total} works) — re-run with force to regenerate`
      );
    } catch (err) {
      setStatus("error");
      setDetail(err instanceof Error ? err.message : "Scale seeding failed — is the API running?");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div>
        <div className="text-xs font-bold text-navy-950">National scale sample — works across all 543 real constituencies</div>
        <div className="text-[11px] text-slate-500">
          Obviously-synthetic <span className="font-mono">MPL-SC-*</span> works attributed to the official
          allocation table (real states, constituencies, MPs, allocation limits); amounts drawn as a fraction of
          each constituency&apos;s published allocation.
          {state.mode === "mock" ? " Visible on the heatmap in Live mode." : " Heatmap and metrics above update after seeding."}
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => run(false)}
          disabled={status === "seeding"}
          className="rounded-md bg-navy-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-navy-800 disabled:opacity-50"
        >
          {status === "seeding" ? "Seeding…" : "Seed scale sample"}
        </button>
        <button
          onClick={() => run(true)}
          disabled={status === "seeding"}
          className="rounded-md border border-navy-300 bg-white px-3 py-1.5 text-xs font-bold text-navy-800 transition hover:bg-navy-50 disabled:opacity-50"
        >
          Force re-seed
        </button>
        {detail && (
          <span
            role="status"
            className={`text-xs font-semibold ${status === "done" ? "text-teal-700" : status === "error" ? "text-gate" : "text-navy-600"}`}
          >
            {detail}
          </span>
        )}
      </div>
    </div>
  );
}
