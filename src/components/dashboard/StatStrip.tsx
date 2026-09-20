"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui";

/**
 * Zone 1 of the 3-Zone dashboard hierarchy: a compact strip of 3–4 KPI
 * tiles. Deliberately capped in height and font count to keep dashboards
 * un-crowded.
 */
export function StatStrip({
  items,
  columns = 4,
}: {
  items: { label: string; value: string | number; detail?: string; accent?: string; icon?: ReactNode }[];
  columns?: 3 | 4;
}) {
  return (
    <div
      className={`grid gap-4 ${
        columns === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"
      }`}
    >
      {items.map((s) => (
        <Card key={s.label} className="flex flex-col gap-1 rounded-xl p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              {s.label}
            </span>
            {s.icon}
          </div>
          <div className={`text-[26px] font-extrabold leading-tight tabular-nums ${s.accent ?? "text-navy-950"}`}>
            {s.value}
          </div>
          {s.detail && <div className="text-xs text-slate-500">{s.detail}</div>}
        </Card>
      ))}
    </div>
  );
}
