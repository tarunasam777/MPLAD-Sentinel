"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { useApp } from "@/store/AppStore";
import { mps } from "@/lib/data";
import type { Proposal, WorkCase } from "@/lib/types";
import { Card, HelpNote, Pill, ProgressBar, SectionTitle, SelectInput } from "@/components/ui";
import { StatusPill } from "@/components/dashboard/stepper";
import { inr, inrCompact, inrCr } from "@/lib/format";
import { ProposalForm } from "@/components/dashboard/proposal-form";
import { StatStrip } from "@/components/dashboard/StatStrip";
import { ModeBanner } from "@/components/dashboard/ModeBanner";

function plainTone(c: WorkCase): { label: string; cls: string } {
  if (c.status === "released" || c.status === "auto_cleared")
    return { label: "All clear", cls: "bg-green-100 text-green-800" };
  if (c.status === "escalated")
    return { label: "Being investigated", cls: "bg-red-100 text-red-800" };
  if (c.status === "hold_active")
    return { label: "Needs a check", cls: "bg-amber-100 text-amber-900" };
  return { label: "In progress", cls: "bg-navy-100 text-navy-800" };
}

export default function MPDashboardPage() {
  const { state } = useApp();
  const [selectedMp, setSelectedMp] = useState(mps[6]);
  const [showForm, setShowForm] = useState(false);

  const myWorks = useMemo(
    () => state.cases.filter((c) => c.mpName === selectedMp),
    [state.cases, selectedMp]
  );
  const myProposals = useMemo(
    () => state.proposals.filter((p) => p.mpName === selectedMp),
    [state.proposals, selectedMp]
  );
  const entRecord = state.analytics.entitlements.find((e) => e.mpName === selectedMp);
  const ent = {
    usedCr: entRecord?.usedCr ?? 0,
    category: (entRecord?.breakdown ?? []).map((b) => ({
      label: b.category,
      pct: Math.round((b.lakh / Math.max(1, entRecord?.breakdown.reduce((a, c) => a + c.lakh, 0) || 1)) * 100),
    })),
  };
  const sanctioned = myWorks.reduce((a, c) => a + c.sanctionedAmountLakh, 0);
  const utilPct = (ent.usedCr / 5) * 100;

  return (
    <Shell active="home">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-navy-500">
            Member of Parliament · dashboard
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-navy-950">Your recommended works</h1>
          <p className="mt-1 text-sm text-slate-600">
            Plain-language status only — no scoring jargon on this desk. Anything that needs you goes
            through the district office.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-md bg-navy-950 px-3 py-2 text-xs font-bold text-white hover:bg-navy-800"
          >
            {showForm ? "− Hide recommendation form" : "+ New Recommendation"}
          </button>
          <span className="text-xs font-semibold text-slate-500">Viewing works for</span>
          <SelectInput
            value={selectedMp}
            onChange={setSelectedMp}
            options={mps.map((m) => ({ value: m, label: m }))}
            className="min-w-[230px]"
          />
        </div>
      </div>

      {showForm && (
        <div className="mb-6">
          <ProposalForm />
        </div>
      )}

      {myProposals.length > 0 && (
        <Card className="mb-6 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-bold text-navy-950">Your formal recommendations this session</span>
            <Pill className="border-navy-200 bg-navy-50 text-navy-800">{myProposals.length} filed</Pill>
          </div>
          <div className="space-y-2">
            {myProposals.map((p: Proposal) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-navy-100 bg-navy-50/50 px-3 py-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-500">{p.id}</span>
                    <Pill className="border-green-200 bg-green-50 text-green-800">SC {p.reserved.scWorks} · ST {p.reserved.stWorks} · Gen {p.reserved.generalWorks}</Pill>
                    <Pill
                      className={
                        p.status === "sanctioned"
                          ? "border-teal-200 bg-teal-50 text-teal-800"
                          : "border-amber-300 bg-amber-50 text-amber-900"
                      }
                    >
                      {p.status.toUpperCase()}
                    </Pill>
                  </div>
                  <p className="mt-1 truncate text-sm font-bold text-navy-950">{p.title}</p>
                  <p className="text-[10px] text-slate-500">{p.district} · {p.category} · geotag {p.location.lat.toFixed(4)}, {p.location.lng.toFixed(4)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-extrabold tabular-nums text-navy-900">{inr(p.sanctionedAmountLakh)}</div>
                  <div className="text-[10px] text-slate-400">{p.submittedAt}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <StatStrip
        items={[
          { label: `FY 2025–26 entitlement · ${selectedMp}`, value: "₹5.00 Cr", detail: "Annual MPLADS entitlement", icon: <span aria-hidden>🏛️</span> },
          { label: "Utilised so far", value: inrCr(ent.usedCr), detail: `${utilPct.toFixed(0)}% of entitlement released/committed`, accent: "text-teal-700" },
          { label: "Works on your watch-list", value: myWorks.length, detail: `${inrCompact(sanctioned)} sanctioned this year` },
        ]}
      />

      <div className="mt-6">
        <ModeBanner />
      </div>

      <Card className="mt-8 rounded-xl p-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold text-navy-950">Entitlement utilisation</span>
          <span className="text-sm font-extrabold tabular-nums text-navy-900">{utilPct.toFixed(0)}%</span>
        </div>
        <ProgressBar value={utilPct} barColor="bg-teal-500" />
        <div className="mt-3 flex flex-wrap gap-4">
          {ent.category.map((c) => (
            <div key={c.label} className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600">{c.label}</span>
              <div className="h-2 w-16 overflow-hidden rounded bg-navy-100">
                <div className="h-full rounded bg-teal-500" style={{ width: `${c.pct}%` }} />
              </div>
              <span className="tabular-nums text-slate-500">{c.pct}%</span>
            </div>
          ))}
        </div>
      </Card>

      <SectionTitle
        eyebrow="Watch-list"
        title="Recommended works"
        subtitle={`${selectedMp} · ${myWorks.length} work${myWorks.length === 1 ? "" : "s"} tracked this fiscal`}
      />

      <div className="mt-3 space-y-2.5">
        {myWorks.length === 0 && (
          <Card className="p-6 text-center text-sm text-slate-500">
            No works from this MP are currently tracked in the demo dataset.
          </Card>
        )}
        {myWorks.map((c) => {
          const tone = plainTone(c);
          return (
            <Link key={c.id} href={`/cases/${c.id}?from=mp`} className="block">
              <Card className="p-4 transition hover:border-navy-500 hover:shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">{c.id}</span>
                      <Pill className={tone.cls}>{tone.label}</Pill>
                      <StatusPill status={c.status} gateFired={c.gate.fired} />
                    </div>
                    <h3 className="mt-1 truncate text-sm font-bold text-navy-950">{c.title}</h3>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      {c.hindiTitle}
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{c.mpPlainStatus}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-lg font-extrabold tabular-nums text-navy-900">
                      {inr(c.sanctionedAmountLakh)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {c.category}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-6">
        <HelpNote>
          Want to see the specialist queue, the critical-gate holds, or act on a hold? Switch to the{" "}
          <Link href="/dashboard/district" className="font-bold underline">District Magistrate</Link> role from the
          role-switcher above. Everything is demo data — nothing leaves this browser.
        </HelpNote>
      </div>
    </Shell>
  );
}