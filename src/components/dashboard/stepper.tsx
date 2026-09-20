"use client";

import type { CaseState } from "@/lib/types";
import { statusLabel } from "@/lib/format";

interface Stage {
  key: string;
  label: string;
  states: CaseState[];
}

const STAGES: Stage[] = [
  { key: "submitted", label: "Submitted", states: ["submitted"] },
  { key: "evaluating", label: "Evaluating", states: ["evaluating"] },
  { key: "gate", label: "Auto-Cleared / Hold Active", states: ["auto_cleared", "hold_active"] },
  { key: "decision", label: "Override Approved / Escalated", states: ["override_approved", "escalated"] },
  { key: "terminal", label: "Released / Rejected", states: ["released", "rejected"] },
];

export function Stepper({ path }: { path: CaseState[] }) {
  const completed: string[] = [];
  for (const st of path) {
    const stage = STAGES.find((g) => g.states.includes(st));
    if (stage && !completed.includes(stage.key)) completed.push(stage.key);
  }

  return (
    <div className="flex items-start overflow-x-auto pb-1">
      {STAGES.map((stage, i) => {
        const active = completed.includes(stage.key);
        const isCurrent = path.length > 0 && stage.states.includes(path[path.length - 1]);
        return (
          <div key={stage.key} className="flex items-start">
            {i > 0 && (
              <div className={`mt-[13px] h-0.5 w-6 shrink-0 ${completed.includes(STAGES[i - 1].key) ? "bg-navy-700" : "bg-slate-300"}`} />
            )}
            <div className="flex flex-col items-center gap-1.5 px-1">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                  active
                    ? isCurrent
                      ? "bg-navy-900 text-white ring-4 ring-navy-100"
                      : "bg-navy-700 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {active ? "✓" : i + 1}
              </div>
              <div
                className={`whitespace-nowrap text-center text-[10px] font-semibold leading-tight ${
                  active ? "text-navy-900" : "text-slate-400"
                }`}
              >
                {stage.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function StatusPill({ status, gateFired = false }: { status: CaseState; gateFired?: boolean }) {
  const base = statusLabel[status];
  if (gateFired && status === "hold_active") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-900 bg-gate px-2.5 py-0.5 text-[11px] font-bold text-white">
        <span aria-hidden>⚠</span> Hold Active · Gate
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
        status === "hold_active"
          ? "border-amber-300 bg-amber-100 text-amber-900"
          : status === "escalated"
          ? "border-red-200 bg-red-100 text-red-800"
          : status === "released" || status === "auto_cleared"
          ? "border-green-200 bg-green-100 text-green-800"
          : "border-navy-200 bg-navy-100 text-navy-800"
      }`}
    >
      {base}
    </span>
  );
}