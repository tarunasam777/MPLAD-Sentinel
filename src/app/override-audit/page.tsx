"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Shell } from "@/components/shell";
import { useApp } from "@/store/AppStore";
import { Card, HelpNote, Pill, SectionTitle, StatCard } from "@/components/ui";
import { OfficialsBar } from "@/components/dashboard/charts";
import type { LedgerEntry } from "@/lib/types";

export default function OverrideAuditPage() {
  const { state } = useApp();
  const officials = state.officials;

  const peerAvg =
    officials.reduce((a, o) => a + o.gateOverrides + o.thresholdOverrides, 0) /
    Math.max(1, officials.reduce((a, o) => a + o.highRiskDecisions, 0));

  const overrides = useMemo(
    () =>
      state.ledger
        .filter((e) => e.category === "override")
        .sort((a, b) => b.index - a.index) as LedgerEntry[],
    [state.ledger]
  );

  const isStateOrMinistry = state.role === "state" || state.role === "ministry";
  const total = officials.reduce((a, o) => a + o.gateOverrides + o.thresholdOverrides, 0);
  const totalDecisions = officials.reduce((a, o) => a + o.highRiskDecisions, 0);

  return (
    <Shell active="override">
      <div className="mb-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-500">
          Override audit · due diligence on decisions
        </div>
        <h1 className="mt-1 text-2xl font-extrabold text-navy-950">Override-Audit register</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          When a District Magistrate clears a case that was <b>Hold Active</b>, the decision is an override and
          lands here in <span className="text-red-800 font-bold">two separate columns</span>. A{" "}
          <b>Threshold Override</b> overturns a composite-score hold. A <b>Gate Override</b> overturns a
          Critical-Risk Gate hold — a hard rule was broken, so this is always the more serious event and is
          highlighted against peers.
        </p>
        {!isStateOrMinistry && (
          <div className="mt-3">
            <Pill className="border-amber-300 bg-amber-50 text-amber-900">
              Restricted desk — normally State Nodal Authority & MoSPI Ministry only. Left open here so the demo can move quickly.
            </Pill>
          </div>
        )}
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <StatCard label="Officials tracked" value={String(officials.length)} detail="district magistrates" />
        <StatCard label="High-risk decisions" value={String(totalDecisions)} detail="cases reviewed since FY start" />
        <StatCard
          label="Overrides recorded"
          value={String(total)}
          detail={`peer rate ${(peerAvg * 100).toFixed(1)}%`}
        />
        <StatCard
          label="Gate overrides live"
          value={String(officials.reduce((a, o) => a + o.gateOverrides, 0))}
          detail="serious — every one is flagged"
          accent="text-gate"
        />
      </div>

      <div className="mb-6 grid gap-5 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-3">
          <SectionTitle
            title="Officials by override behaviour"
            subtitle="Rate = total overrides ÷ high-risk decisions. Any row with a gate override — or a rate 1.5× above the peer average — is flagged."
          />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="border-b border-navy-200">
                <tr>
                  <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Official / district</th>
                  <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">High-risk decisions</th>
                  <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Override rate</th>
                  <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-red-700">Gate overrides</th>
                  <th className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-amber-700">Threshold overrides</th>
                  <th className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {officials.map((o) => {
                  const rate = (o.gateOverrides + o.thresholdOverrides) / o.highRiskDecisions;
                  const outlierRate = rate > peerAvg * 1.5;
                  const gateFlag = o.gateOverrides >= 1;
                  const flagged = outlierRate || gateFlag;
                  return (
                    <tr key={o.id} className={flagged ? "bg-red-50/60" : ""}>
                      <td className="px-2 py-3">
                        <div className="font-semibold text-navy-950">{o.name}</div>
                        <div className="text-[11px] text-slate-500">DM · {o.district}</div>
                        {flagged && <div className="mt-1 text-[10px] font-bold text-red-800">{o.flaggedNote}</div>}
                      </td>
                      <td className="px-2 py-3 text-right font-bold tabular-nums text-navy-900">{o.highRiskDecisions}</td>
                      <td className="px-2 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded bg-navy-100">
                            <div className={flagged ? "h-full rounded bg-red-600" : "h-full rounded bg-navy-700"} style={{ width: `${Math.min(100, rate * 100)}%` }} />
                          </div>
                          <span className={`text-xs font-bold tabular-nums ${flagged ? "text-gate" : "text-navy-900"}`}>{(rate * 100).toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-right">
                        <span className={`inline-block min-w-[30px] rounded px-1.5 py-0.5 text-xs font-extrabold tabular-nums ${gateFlag ? "bg-gate text-white" : "bg-slate-100 text-slate-400"}`}>
                          {o.gateOverrides}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-right">
                        <span className="inline-block min-w-[30px] rounded bg-amber-100 px-1.5 py-0.5 text-xs font-extrabold tabular-nums text-amber-900">
                          {o.thresholdOverrides}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center">
                        {flagged ? (
                          <span className="rounded border border-red-300 bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">FLAGGED</span>
                        ) : (
                          <span className="text-[10px] font-semibold text-green-700">within norms</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-gate" /> Gate override present — always serious</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-red-600" /> Rate &gt;1.5× peer avg ({((peerAvg * 1.5) * 100).toFixed(1)}%) — outlier</span>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <SectionTitle title="Peer comparison" subtitle="Override rate and the two override columns, per official" />
          <div className="mt-3">
            <OfficialsBar
              data={officials.map((o) => ({
                name: o.name.split(" ").splice(-1)[0] ?? o.name,
                rate: +(((o.gateOverrides + o.thresholdOverrides) / o.highRiskDecisions) * 100).toFixed(1),
                gate: +((o.gateOverrides / Math.max(1, o.highRiskDecisions)) * 100).toFixed(1),
                threshold: +((o.thresholdOverrides / Math.max(1, o.highRiskDecisions)) * 100).toFixed(1),
              }))}
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            The red (gate) segment always needs an explanation. An official clustering at the top of the rate
            bar without a reason becomes a supervision priority.
          </p>
        </Card>
      </div>

      <div>
        <SectionTitle
          eyebrow="Ledger extraction"
          title="Override blocks on record"
          subtitle="Every override is a first-class ledger block — these are the most recent, newest first"
        />
        <div className="mt-3 space-y-2">
          {overrides.length === 0 && <Card className="p-4 text-sm text-slate-500">No overrides recorded yet this session.</Card>}
          {overrides.map((e) => {
            const isGate = e.action.includes("GATE OVERRIDE");
            return (
              <Card key={e.index} className={`flex flex-wrap items-center justify-between gap-3 p-3.5 ${isGate ? "border-l-4 border-l-gate" : "border-l-4 border-l-amber-500"}`}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold ${isGate ? "bg-gate text-white" : "bg-amber-100 text-amber-900"}`}>
                      {e.action}
                    </span>
                    <span className="text-sm font-bold text-navy-950">{e.actor}</span>
                    <span className="text-xs text-slate-500">· {e.actorRole}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-600">{e.body}</div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-mono text-[10px] text-slate-400">{e.timestamp}</span>
                  <span className="font-mono text-[10px] text-slate-400">block #{e.index}</span>
                  {e.caseId && (
                    <Link href={`/cases/${e.caseId}?from=ledger`} className="font-mono text-[11px] font-bold text-navy-600 underline">
                      {e.caseId} →
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        <HelpNote>
          Live demo: from the District queue, open a held case and hit <b>Approve &amp; Release</b>. If the hold
          came from the Critical-Risk Gate it records a Gate Override; otherwise a Threshold Override — and this
          page updates instantly. The{" "}
          <Link href="/ledger" className="font-bold underline">ledger</Link> holds the matching block.
        </HelpNote>
      </div>
    </Shell>
  );
}