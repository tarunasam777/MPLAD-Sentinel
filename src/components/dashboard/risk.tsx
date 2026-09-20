"use client";

import { bandColor, scoreBand } from "@/lib/format";
import type { RiskBand } from "@/lib/types";
import type { WorkCase } from "@/lib/types";
import { Pill } from "@/components/ui";

export function scoreStyling(capped: RiskBand) {
  return bandColor[capped];
}

export function ScoreChip({
  score,
  size = "md",
}: {
  score: number;
  size?: "sm" | "md" | "lg";
}) {
  const s = scoreBand(score);
  const c = bandColor[s];
  const pad = size === "sm" ? "px-2 py-0.5 text-xs" : size === "lg" ? "px-3 py-1 text-lg" : "px-2.5 py-1 text-sm";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-bold tabular-nums ${c.bg} ${c.border} ${c.text} ${pad}`}
    >
      {score}
      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">/100</span>
    </span>
  );
}

export function ScoreBar({ score, width = 90 }: { score: number; width?: number }) {
  const c = bandColor[scoreBand(score)];
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 rounded-full bg-navy-100" style={{ width }}>
        <div
          className={`h-full rounded-full ${c.bar}`}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
      <span className={`text-sm font-bold tabular-nums ${c.text}`}>{score}</span>
    </div>
  );
}

const RISK_DOT_LABEL: Record<RiskBand, string> = {
  high: "High risk band",
  medium: "Medium risk band",
  low: "Low risk band",
};

export function RiskDot({ band }: { band: RiskBand }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${bandColor[band].dot}`}
      role="img"
      aria-label={RISK_DOT_LABEL[band]}
      title={RISK_DOT_LABEL[band]}
    />
  );
}

export function GateBadge({ small = false }: { small?: boolean }) {
  return (
    <span
      className={`gate-pulse inline-flex items-center gap-1 rounded border border-red-900 bg-gate font-bold text-white ${
        small ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]"
      }`}
      title="Critical-Risk Gate fired — hard rule violation, independent of the composite score"
    >
      <span aria-hidden>⚠</span> GATE
    </span>
  );
}

export function RowTint(c: WorkCase): string {
  if (c.gate.fired) return "";
  const band = scoreBand(c.compositeScore);
  if (band === "high") return "bg-red-50/40";
  if (band === "medium") return "bg-amber-50/40";
  return "";
}

export function GatePill() {
  return (
    <Pill className="border-red-200 bg-red-50 text-red-800">
      <span aria-hidden>⚠</span> Critical-Risk Gate
    </Pill>
  );
}