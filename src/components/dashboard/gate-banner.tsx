"use client";

import type { WorkCase } from "@/lib/types";
import { Card } from "@/components/ui";

export function GateBanner({ c }: { c: WorkCase }) {
  if (!c.gate.fired) return null;
  return (
    <Card className="border-2 border-gate bg-red-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gate text-lg font-bold text-white">
          ⚠
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-gate px-2 py-0.5 text-xs font-bold text-white">CRITICAL-RISK GATE FIRED</span>
            <span className="text-xs font-semibold text-red-900">{c.gate.rule}</span>
          </div>
          <p className="mt-1.5 text-sm text-red-900">{c.gate.detail}</p>
          {c.gate.heldIndependent && c.compositeScore < 70 && (
            <p className="mt-2 inline-block rounded-md border border-gate/40 bg-white px-2.5 py-1 text-xs font-bold text-gate">
              This hold is independent of the composite score ({c.compositeScore}/100).
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}