import type { CaseState, ModuleKind, PfmsStage, RiskBand } from "@/lib/types";

export const inr = (lakh: number): string => `₹${lakh.toLocaleString("en-IN")} L`;

export const inrCr = (cr: number): string => `₹${cr.toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`;

export const inrFull = (lakh: number): string => `₹${(lakh * 100000).toLocaleString("en-IN")}`;

export const inrWords = (lakh: number): string =>
  lakh >= 100 ? `₹${(lakh / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Crore` : inrFull(lakh);

export const inrCompact = (lakh: number): string =>
  lakh >= 100
    ? `₹${(lakh / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`
    : `₹${lakh.toLocaleString("en-IN", { maximumFractionDigits: 1 })} L`;

export const pct = (value: number): string => `${Math.round(value)}%`;

export const stageLabel: Record<PfmsStage, string> = {
  mobilization: "Mobilization Advance",
  stage1: "Stage 1 — Groundwork",
  stage2: "Stage 2 — Civil Works",
  final: "Final Completion",
};

export const officialStatus: Record<CaseState, string> = {
  submitted: "RECOMMENDED",
  evaluating: "FEASIBILITY_APPROVED",
  auto_cleared: "SANCTIONED",
  hold_active: "HOLD_ACTIVE",
  override_approved: "SANCTIONED",
  escalated: "ESCALATED",
  released: "DISBURSED",
  rejected: "REJECTED",
};

export const officialStatusColor: Record<CaseState, string> = {
  submitted: "bg-navy-800 text-white border-navy-900",
  evaluating: "bg-teal-700 text-white border-teal-900",
  auto_cleared: "bg-green-700 text-white border-green-900",
  hold_active: "bg-amber-500 text-navy-950 border-amber-700",
  override_approved: "bg-teal-700 text-white border-teal-900",
  escalated: "bg-red-700 text-white border-red-900",
  released: "bg-green-700 text-white border-green-900",
  rejected: "bg-slate-600 text-white border-slate-800",
};

export function scoreBand(score: number): RiskBand {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export const bandLabel: Record<RiskBand, string> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
};

export const bandColor = {
  low: { text: "text-green-900", bg: "bg-green-100", border: "border-green-200", bar: "bg-green-600", dot: "bg-green-600", chipBg: "bg-green-50", ring: "stroke-green-600" },
  medium: { text: "text-amber-900", bg: "bg-amber-100", border: "border-amber-200", bar: "bg-amber-500", dot: "bg-amber-500", chipBg: "bg-amber-50", ring: "stroke-amber-500" },
  high: { text: "text-red-800", bg: "bg-red-100", border: "border-red-200", bar: "bg-red-600", dot: "bg-red-600", chipBg: "bg-red-50", ring: "stroke-red-600" },
} as const;

export const statusLabel: Record<CaseState, string> = {
  submitted: "Submitted",
  evaluating: "Evaluating",
  auto_cleared: "Auto-Cleared",
  hold_active: "Hold Active",
  override_approved: "Override Approved",
  escalated: "Escalated",
  released: "Released",
  rejected: "Rejected",
};

export const statusPillColor: Record<CaseState, string> = {
  submitted: "bg-navy-100 text-navy-800 border-navy-200",
  evaluating: "bg-navy-100 text-navy-800 border-navy-200",
  auto_cleared: "bg-green-100 text-green-800 border-green-200",
  hold_active: "bg-amber-100 text-amber-900 border-amber-200",
  override_approved: "bg-teal-100 text-teal-900 border-teal-200",
  escalated: "bg-red-100 text-red-800 border-red-200",
  released: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-slate-200 text-slate-700 border-slate-300",
};

export const moduleMeta: Record<
  ModuleKind,
  { name: string; short: string; weight: number; description: string }
> = {
  trend: {
    name: "Trend Analysis",
    short: "Trend",
    weight: 0.12,
    description: "Pattern of sanctions & releases across peer works compared over time.",
  },
  duplicate: {
    name: "Duplicate-Works",
    short: "Duplicate",
    weight: 0.16,
    description: "Text & geo-similarity of the proposal against 3 years of work history.",
  },
  cost: {
    name: "Cost & Delay Anomaly",
    short: "Cost & Delay",
    weight: 0.18,
    description: "Robust z-score of sanctioned cost vs peer baseline; schedule slippage.",
  },
  compliance: {
    name: "Compliance Rules",
    short: "Compliance",
    weight: 0.22,
    description: "Hard-coded guideline checks: land tenure, standards, certifications.",
  },
  payment: {
    name: "Payment Efficiency",
    short: "Payment",
    weight: 0.12,
    description: "Release vs physical-progress correlation across payment milestones.",
  },
  predictive: {
    name: "Predictive Early-Warning",
    short: "Predictive",
    weight: 0.1,
    description: "Model odds of stall derived from early-stage signals.",
  },
  photo: {
    name: "Photo Verification",
    short: "Photo",
    weight: 0.1,
    description: "pHash & EXIF cross-checks across submitted photographs.",
  },
};