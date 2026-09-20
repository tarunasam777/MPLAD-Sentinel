"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Shell } from "@/components/shell";
import { useApp } from "@/store/AppStore";
import { Card, HelpNote, SectionTitle } from "@/components/ui";
import { StatStrip } from "@/components/dashboard/StatStrip";
import { ModeBanner } from "@/components/dashboard/ModeBanner";
import { IngestSyncButton } from "@/components/dashboard/IngestSyncButton";
import { STATE_NAME } from "@/lib/data";
import { GateBadge } from "@/components/dashboard/risk";
import { HeatmapGrid } from "@/components/dashboard/heatmap";
import { LineTrend, OfficialsBar } from "@/components/dashboard/charts";

export default function StateDashboardPage() {
  const { state } = useApp();

  const officials = state.officials;
  const peerAvg =
    officials.reduce((a, o) => a + o.gateOverrides + o.thresholdOverrides, 0) /
    Math.max(1, officials.reduce((a, o) => a + o.highRiskDecisions, 0));

  const avgUtil = Math.round(
    state.analytics.districtUtilization.reduce((a, d) => a + d.ytd, 0) /
      state.analytics.districtUtilization.length
  );

  const openGates = state.cases.filter((c) => c.gate.fired && c.status === "hold_active");

  const trendSeries = useMemo(() => {
    const first = state.analytics.districtTrend[0];
    if (!first) return [];
    const palette = ["#16a34a", "#1b4775", "#d97706", "#dc2626", "#7c3aed"];
    return Object.keys(first)
      .filter((k) => k !== "month")
      .slice(0, 5)
      .map((k, i) => ({ key: k, color: palette[i % palette.length] }));
  }, [state.analytics.districtTrend]);

  return (
    <Shell active="home">
      <div className="mb-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-500">
          State Nodal Authority · {STATE_NAME}
        </div>
        <h1 className="mt-1 text-2xl font-extrabold text-navy-950">State oversight</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Districts side by side — utilisation, release momentum, and the override behaviour of every
          official. The point of this desk is patterns, not single cases.
        </p>
      </div>

      <StatStrip
        items={[
          { label: "Districts tracked", value: state.analytics.districtUtilization.length, detail: "all under nodal supervision", icon: <span aria-hidden>🗺️</span> },
          { label: "Utilisation (state)", value: `${avgUtil}%`, detail: "of sanctioned amount released", accent: "text-teal-700" },
          { label: "Open gate holds", value: openGates.length, detail: "across districts", accent: "text-gate" },
          { label: "Peer override rate", value: `${(peerAvg * 100).toFixed(1)}%`, detail: "overrides ÷ high-risk decisions" },
        ]}
      />

      <div className="mt-6">
        <ModeBanner />
      </div>

      <div className="mt-4">
        <IngestSyncButton />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="rounded-xl p-6">
          <SectionTitle
            title="Inter-district utilisation heatmap"
            subtitle="Release of sanctioned amount by district, quarterly — FY 2025–26"
          />
          <div className="mt-4">
            <HeatmapGrid
              rows={state.analytics.districtUtilization.map((d) => ({ label: d.district }))}
              columns={[
                { key: "q1", label: "Q1" },
                { key: "q2", label: "Q2" },
                { key: "q3", label: "Q3" },
                { key: "q4", label: "Q4" },
                { key: "ytd", label: "YTD" },
              ]}
              cellKey={(row, col) => {
                const d = state.analytics.districtUtilization.find((x) => x.district === row);
                if (!d) return -1;
                const key = col as keyof typeof d;
                return Number(d[key]);
              }}
            />
          </div>
        </Card>

        <Card className="rounded-xl p-6">
          <SectionTitle
            title="Cross-district trend"
            subtitle="Quarterly release % vs month — the districts that fall behind, and stay behind"
          />
          <div className="mt-2">
            <LineTrend data={state.analytics.districtTrend} series={trendSeries} />
          </div>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <Card className="rounded-xl p-6 lg:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <SectionTitle
              title="Override-rate by official"
              subtitle="High-risk decisions and their two override flavours — gate vs threshold"
            />
            <Link
              href="/override-audit"
              className="shrink-0 rounded-md border border-navy-300 bg-white px-3 py-1.5 text-xs font-bold text-navy-800 transition hover:bg-navy-50"
            >
              Open full register →
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-navy-200">
                  <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Official</th>
                  <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">High-risk decisions</th>
                  <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Override rate</th>
                  <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-red-700">Gate overrides</th>
                  <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-amber-700">Threshold overrides</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {officials.map((o) => {
                  const rate = (o.gateOverrides + o.thresholdOverrides) / o.highRiskDecisions;
                  const outlierRate = rate > peerAvg * 1.5;
                  const gateFlag = o.gateOverrides >= 1;
                  return (
                    <tr key={o.id} className={outlierRate || gateFlag ? "bg-red-50/50" : ""}>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-navy-950">{o.name}</span>
                          {(outlierRate || gateFlag) && (
                            <span className="rounded border border-red-300 bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-800">
                              OUTLIER
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">DM · {o.district}</div>
                        {o.flaggedNote && (
                          <div className="mt-0.5 text-[10px] text-red-700">{o.flaggedNote}</div>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-right font-bold tabular-nums text-navy-900">{o.highRiskDecisions}</td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded bg-navy-100">
                            <div className="h-full rounded bg-navy-700" style={{ width: `${Math.min(100, rate * 100)}%` }} />
                          </div>
                          <span className={`text-xs font-bold tabular-nums ${outlierRate ? "text-gate" : "text-navy-900"}`}>
                            {(rate * 100).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <span className={`inline-block min-w-[28px] rounded px-1.5 py-0.5 text-xs font-extrabold tabular-nums ${gateFlag ? "bg-gate text-white" : "text-slate-400"}`}>
                          {o.gateOverrides}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-amber-700 font-bold">{o.thresholdOverrides}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="rounded-xl p-6 lg:col-span-2">
          <SectionTitle
            title="Officials at a glance"
            subtitle="Horizontal bars: override rate, gate overrides (red), threshold (amber)"
          />
          <div className="mt-3">
            <OfficialsBar
              data={officials.map((o) => ({
                name: o.name.split(" ").pop() ?? o.name,
                rate: +((o.gateOverrides + o.thresholdOverrides / o.highRiskDecisions) * 100).toFixed(1),
                gate: +(((o.gateOverrides / o.highRiskDecisions) * 100) * 3).toFixed(1),
                threshold: +(((o.thresholdOverrides / o.highRiskDecisions) * 100) * 3).toFixed(1),
              }))}
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Gate/threshold bars are scaled ×3 for visibility; the rate bar is exact.
          </p>
        </Card>
      </div>

      <div className="mb-6">
        <SectionTitle
          title="Open gate holds in the state"
          subtitle="The gate fires independent of score — these demand a district decision"
        />
        <div className="mt-3 space-y-2">
          {openGates.length === 0 && (
            <Card className="p-4 text-sm text-slate-500">No gate holds are currently open.</Card>
          )}
          {openGates.map((c) => (
            <Link key={c.id} href={`/cases/${c.id}?from=state`} className="block">
              <Card className="flex flex-wrap items-center justify-between gap-3 p-3.5 transition hover:border-navy-500 hover:shadow-md">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <GateBadge small />
                    <span className="truncate text-sm font-bold text-navy-950">{c.title}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {c.id} · {c.district} · DM {c.dmName} · rule: {c.gate.rule}
                  </div>
                </div>
                <span className="text-xs font-bold text-navy-700">Open case →</span>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <HelpNote>
        Every decision a district official makes appears here in real time. A gate override is treated as
        <span className="font-bold"> serious by policy</span> — nothing on this desk treats it like an ordinary
        threshold override.
      </HelpNote>
    </Shell>
  );
}