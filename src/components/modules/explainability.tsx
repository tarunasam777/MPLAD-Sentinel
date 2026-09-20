"use client";

import { useState } from "react";
import type { WorkCase } from "@/lib/types";
import { moduleMeta } from "@/lib/format";
import { Card } from "@/components/ui";

function attributions(c: WorkCase): { name: string; pct: number; subScore: number }[] {
  const weighted = c.moduleBreakdown.map((m) => ({
    module: m.module,
    score: m.subScore,
    weight: moduleMeta[m.module].weight,
  }));
  const total = weighted.reduce((acc, m) => acc + m.weight * (100 - m.score), 0) || 1;
  return weighted
    .map((m) => ({
      name: moduleMeta[m.module].name,
      pct: Math.round((m.weight * (100 - m.score) * 100) / total),
      subScore: m.score,
    }))
    .sort((a, b) => b.pct - a.pct);
}

export function ExplainabilityPanel({ c }: { c: WorkCase }) {
  const [view, setView] = useState<"analyst" | "stakeholder">("analyst");
  const gateFired = c.gate.fired;
  const attrs = attributions(c);

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-navy-950">Explainability</h3>
          <p className="text-xs text-slate-500">Why this case was scored the way it was</p>
        </div>
        <div className="flex rounded-md border border-navy-300 bg-navy-50 p-0.5">
          {(["analyst", "stakeholder"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded px-3 py-1 text-xs font-semibold transition ${
                view === v ? "bg-navy-900 text-white" : "text-navy-700 hover:bg-white"
              }`}
            >
              {v === "analyst" ? "Analyst view" : "Stakeholder view"}
            </button>
          ))}
        </div>
      </div>

      {gateFired ? (
        <div className="rounded-md border border-gate bg-red-50 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gate">
            <span aria-hidden>⚠</span> {gatePathHeader()}
          </div>
          <p className="mt-2 text-sm text-red-900">{gatePathText(c)}</p>
        </div>
      ) : view === "analyst" ? (
        <div>
          <div className="mb-3 flex flex-wrap gap-4 rounded-md border border-navy-200 bg-navy-50 px-3 py-2 text-xs text-navy-800">
            <span>
              Fusion score: <span className="font-bold tabular-nums">{c.compositeScore}/100</span>
            </span>
            <span>
              Model: <span className="font-semibold">weighted early-fusion (7 modules)</span>
            </span>
            <span>
              Band: <span className="font-semibold">{c.compositeScore >= 70 ? "high" : c.compositeScore >= 40 ? "medium" : "low"}</span>
            </span>
          </div>
          <div className="space-y-2">
            {attrs.map((a) => (
              <div key={a.name} className="flex items-center gap-3">
                <div className="w-36 shrink-0 truncate text-xs font-medium text-navy-900">{a.name}</div>
                <div className="h-3 flex-1 overflow-hidden rounded bg-navy-100">
                  <div
                    className={`h-full rounded ${
                      a.subScore >= 70
                        ? "bg-red-600"
                        : a.subScore >= 40
                        ? "bg-amber-500"
                        : "bg-green-600"
                    }`}
                    style={{ width: `${a.pct}%` }}
                  />
                </div>
                <div className="w-16 shrink-0 text-right text-xs font-bold tabular-nums text-navy-900">
                  {a.pct}%
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            Attribution is the share of the composite risk signal explained by each module
            (module weight × inverted sub-score, normalised). The gate never alters this fusion path.
          </p>
        </div>
      ) : (
        <p className="text-sm text-navy-900">{stakeholderSentence(c)}</p>
      )}
    </Card>
  );
}

function gatePathHeader(): string {
  return `Held due to a hard rule violation, independent of the fusion score`;
}

function gatePathText(c: WorkCase): string {
  return `This case is held because the Critical-Risk Gate fired on a mandatory rule — ${c.gate.rule}. The composite (fusion) score of ${c.compositeScore}/100 is deliberately not what is holding the work: a hard rule cannot be reasoned away by weighting softer signals. The recommended action is to physically verify the ${c.gate.detail ? "rule condition and then decide at the district level with a gate-tagged decision" : "rule condition"} — any override is recorded as a Gate Override in the audit register.`;
}

function stakeholderSentence(c: WorkCase): string {
  if (c.gate.fired) {
    return `Hard-rule checkpoint: "${c.gate.rule}" is a required, non-negotiable guideline and was not satisfied, so this work is held regardless of the overall score. Recommended action: complete a site-level verification of the rule condition at the district office before any release.`;
  }
  const top = attributions(c)[0];
  if (c.compositeScore >= 70) {
    return `The dominant signal on this work is ${top.name.toLowerCase()} (${top.pct}% of the fused risk), which is why it scores ${c.compositeScore}/100 — a high-risk flag. Recommended action: have the district office review the flagged module evidence before this is permitted to move to release.`;
  }
  if (c.compositeScore >= 40) {
    return `The strongest concern is ${top.name.toLowerCase()} (${top.pct}% of the fused risk), giving a medium composite score of ${c.compositeScore}/100. Recommended action: keep the flagged item open for a routine check — no escalation is needed yet, but the watch should not be dropped.`;
  }
  return `No module contradicts a clean reading of this work — the composite score is ${c.compositeScore}/100 and no hard rule fired. Recommended action: none; allow the normal release path to continue.`;
}