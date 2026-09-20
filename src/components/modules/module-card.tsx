"use client";

import type { ModuleBreakdown } from "@/lib/types";
import { moduleMeta } from "@/lib/format";
import { Card } from "@/components/ui";

function MiniSpark({ points }: { points: number[] }) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const coords = points
    .map((p, i) => `${(i * 100) / (points.length - 1)},${46 - ((p - min) / range) * 42}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 52" className="h-10 w-full">
      <polyline points={coords} fill="none" stroke="#2e6fb0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ModuleMiniVisual({ m }: { m: ModuleBreakdown }) {
  if (m.module === "trend")
    return <MiniSpark points={[30, 28, 33, 31, 29, 34, 32, 30]} />;
  if (m.module === "duplicate")
    return (
      <svg viewBox="0 0 100 40" className="h-10 w-full">
        <path d="M6 34 L24 34 L14 22 Z" fill="#0c2440" opacity="0.9" />
        <path d="M62 18 L80 18 L71 6 Z" fill="#d97706" opacity="0.95" />
        <line x1={24} y1={32} x2={62} y2={18} stroke="#b42318" strokeWidth="1.5" strokeDasharray="4 3" />
        <text x={43} y={38} textAnchor="middle" fontSize={7} fill="#b42318" fontWeight={700}>
          overlap
        </text>
      </svg>
    );
  if (m.module === "cost")
    return (
      <svg viewBox="0 0 100 40" className="h-10 w-full">
        <rect x={8} y={24} width={12} height={14} fill="#9fb6d6" />
        <rect x={24} y={20} width={12} height={18} fill="#b9ceec" />
        <rect x={40} y={26} width={12} height={12} fill="#dce8f5" />
        <rect x={60} y={6} width={16} height={32} fill="#dc2626" />
        <text x={68} y={38} textAnchor="middle" fontSize={7} fontWeight={700} fill="#dc2626">
          +41%
        </text>
      </svg>
    );
  if (m.module === "compliance")
    return (
      <svg viewBox="0 0 100 40" className="h-10 w-full">
        <circle cx={30} cy={20} r={12} fill="#dcfce7" stroke="#16a34a" strokeWidth="2" />
        <path d="M24 20 L29 25 L37 15" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={74} cy={20} r={12} fill="#fee2e2" stroke="#dc2626" strokeWidth="2" />
        <path d="M69 15 L79 25 M79 15 L69 25" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  if (m.module === "payment")
    return (
      <svg viewBox="0 0 100 40" className="h-10 w-full">
        <rect x={8} y={24} width={84} height={8} rx={4} fill="#e3e9f2" />
        <rect x={8} y={24} width={34} height={8} rx={4} fill="#14b8a6" />
        <rect x={8} y={12} width={84} height={8} rx={4} fill="#e3e9f2" />
        <rect x={8} y={12} width={70} height={8} rx={4} fill="#2e6fb0" />
        <text x={86} y={10} fontSize={6} fill="#64748b" textAnchor="end">released 100%</text>
        <text x={86} y={38} fontSize={6} fill="#64748b" textAnchor="end">completed 8%</text>
      </svg>
    );
  if (m.module === "predictive")
    return (
      <svg viewBox="0 0 100 40" className="h-10 w-full">
        <path d="M8 32 L28 30 L48 24 L68 16 L92 8" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={92} cy={8} r={3.5} fill="#dc2626" />
        <text x={56} y={40} textAnchor="middle" fontSize={8} fontWeight={800} fill="#92400e">
          62% stall
        </text>
      </svg>
    );
  return (
    <svg viewBox="0 0 100 40" className="h-10 w-full">
      <rect x={8} y={10} width={36} height={26} rx={2} fill="#2e6fb0" opacity="0.85" />
      <rect x={54} y={10} width={36} height={26} rx={2} fill="#1b4775" opacity="0.85" />
      <text x={26} y={34} textAnchor="middle" fontSize={7} fontWeight={700} fill="#fff">B</text>
      <text x={72} y={34} textAnchor="middle" fontSize={7} fontWeight={700} fill="#fff">A</text>
      <path d="M44 23 L54 23" stroke="#dc2626" strokeWidth="2" />
      <circle cx={49} cy={23} r={2.5} fill="#fff" stroke="#b42318" strokeWidth="1.5" />
    </svg>
  );
}

export function ModuleCard({ m }: { m: ModuleBreakdown }) {
  const meta = moduleMeta[m.module];
  const scoreTone =
    m.subScore >= 70
      ? "text-red-700"
      : m.subScore >= 40
      ? "text-amber-700"
      : "text-green-700";
  return (
    <Card className={`relative flex flex-col p-3.5 ${m.triggered ? "ring-2 ring-red-300" : ""}`}>
      {m.triggered && (
        <div className="absolute right-2 top-2 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-red-200">
          FLAGGED
        </div>
      )}
      <div className="mb-2 flex items-center justify-between gap-2 pr-14">
        <div className="text-sm font-bold text-navy-950">{meta.name}</div>
      </div>
      <div className="mt-auto">
        <div className="mb-0.5 flex items-baseline justify-between">
          <span className="text-[11px] text-slate-500">Sub-score</span>
          <span className={`text-lg font-extrabold tabular-nums ${scoreTone}`}>
            {m.subScore}
            <span className="text-[10px] font-semibold text-slate-400">/100</span>
          </span>
        </div>
        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-navy-100">
          <div
            className={`h-full rounded-full ${
              m.subScore >= 70 ? "bg-red-600" : m.subScore >= 40 ? "bg-amber-500" : "bg-green-600"
            }`}
            style={{ width: `${Math.min(100, m.subScore)}%` }}
          />
        </div>
        <div className="mb-2 h-10 overflow-hidden rounded border border-navy-100 bg-navy-50/60">
          <ModuleMiniVisual m={m} />
        </div>
        <p className="text-[11px] leading-snug text-slate-600">{m.description}</p>
      </div>
    </Card>
  );
}