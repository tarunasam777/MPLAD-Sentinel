"use client";

import { bandColor, scoreBand } from "@/lib/format";

export function RadialGauge({
  score,
  size = 200,
  label = "Composite risk",
  gateFired = false,
}: {
  score: number;
  size?: number;
  label?: string;
  gateFired?: boolean;
}) {
  const band = scoreBand(score);
  const c = bandColor[band];
  const stroke = 16;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, score)) / 100) * circumference;

  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e3e9f2" strokeWidth={stroke} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={band === "low" ? "#16a34a" : band === "medium" ? "#f59e0b" : "#dc2626"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          className="transition-all duration-1000"
        />
        {gateFired && (
          <>
            <circle cx={cx} cy={cy} r={r + 1} fill="none" stroke="#b42318" strokeWidth={2.5} strokeDasharray="3 7" />
          </>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className={`text-4xl font-extrabold tabular-nums ${c.text}`}>{score}</div>
        <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </div>
        {gateFired && (
          <div className="mt-1 inline-flex items-center gap-1 rounded border border-red-900 bg-gate px-1.5 py-0.5 text-[10px] font-bold text-white">
            ⚠ GATE FIRED
          </div>
        )}
      </div>
    </div>
  );
}