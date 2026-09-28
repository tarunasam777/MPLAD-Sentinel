"use client";

import { useState } from "react";
import Link from "next/link";
import type { WorkCase } from "@/lib/types";
import { inr, scoreBand } from "@/lib/format";
import { Card } from "@/components/ui";
import { GateBadge, ScoreChip } from "@/components/dashboard/risk";
import { StatusPill } from "@/components/dashboard/stepper";

const MODULE_ICON: Record<string, string> = {
  trend: "📈",
  duplicate: "👯",
  cost: "💰",
  compliance: "📋",
  payment: "🏦",
  predictive: "🔮",
  photo: "📷",
};

const MODULE_LABEL: Record<string, string> = {
  trend: "Trend Analysis",
  duplicate: "Duplicate Works",
  cost: "Cost Variance",
  compliance: "Compliance Rules",
  payment: "Payment Integrity",
  predictive: "Stall Prediction",
  photo: "Photo Integrity (pHash)",
};

function barTone(score: number): string {
  const b = scoreBand(score);
  if (b === "high") return "bg-red-600";
  if (b === "medium") return "bg-amber-500";
  return "bg-green-600";
}

/**
 * Zone 3 of the 3-Zone dashboard hierarchy: a collapsible side inspector
 * that drills into a selected case — module breakdown, score attribution
 * drivers and gate status — without cluttering the main workspace.
 */
export function InspectorPanel({
  kase,
  onClose,
}: {
  kase: WorkCase | null;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(true);

  if (!kase) {
    return (
      <Card className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 rounded-xl p-8 text-center">
        <span className="text-2xl" aria-hidden>🗂️</span>
        <p className="text-sm font-semibold text-navy-900">Case inspector</p>
        <p className="max-w-[240px] text-xs text-slate-500">
          Select any row in the queue to drill into its module breakdown and risk drivers here.
        </p>
      </Card>
    );
  }

  const drivers = [...kase.moduleBreakdown]
    .sort((a, b) => b.subScore - a.subScore)
    .slice(0, 3);

  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-xl">
      <div className="flex w-full items-center justify-between gap-2 border-b border-navy-100 bg-navy-50/70 px-2 pl-4">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex flex-1 items-center gap-2 py-3 text-left"
        >
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-navy-700">
            Inspector — {kase.id}
          </span>
          <span className="text-xs font-bold text-navy-500" aria-hidden>
            {open ? "▾" : "▸"}
          </span>
        </button>
        {onClose && (
          <button
            onClick={onClose}
            aria-label={`Close inspector for ${kase.id}`}
            title="Close inspector"
            className="rounded px-2 py-1 text-xs font-bold text-slate-400 transition hover:bg-navy-100 hover:text-navy-800"
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={kase.status} gateFired={kase.gate.fired} />
              {kase.gate.fired && <GateBadge small />}
            </div>
            <h3 className="mt-2 text-sm font-extrabold leading-snug text-navy-950">{kase.title}</h3>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {kase.district} · {kase.category} · {inr(kase.sanctionedAmountLakh)}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <ScoreChip score={kase.compositeScore} size="lg" />
              <div className="text-[11px] leading-tight text-slate-500">
                Composite risk score
                <br />
                <span className="font-semibold text-navy-800">{scoreBand(kase.compositeScore)} band</span>
              </div>
            </div>
          </div>

          {kase.gate.fired && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-red-700">
                Critical-Risk Gate — hard rule
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-red-800">{kase.gate.detail}</p>
            </div>
          )}

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Top risk drivers
            </p>
            <div className="space-y-2">
              {drivers.map((m) => (
                <div key={m.module} className="rounded-lg border border-navy-100 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-navy-900">
                      <span aria-hidden>{MODULE_ICON[m.module]}</span>
                      {MODULE_LABEL[m.module] ?? m.module}
                    </span>
                    <span className="text-xs font-extrabold tabular-nums text-navy-900">{m.subScore}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-navy-100">
                    <div
                      className={`h-full rounded-full ${barTone(m.subScore)}`}
                      style={{ width: `${Math.min(100, m.subScore)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-slate-600">{m.description}</p>
                </div>
              ))}
            </div>
          </div>

          <Link
            href={`/cases/${kase.id}`}
            className="mt-auto rounded-lg bg-navy-950 px-3 py-2 text-center text-xs font-bold text-white transition hover:bg-navy-800"
          >
            Open full case file →
          </Link>
        </div>
      )}
    </Card>
  );
}
