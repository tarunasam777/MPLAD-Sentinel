export type Role = "mp" | "district" | "state" | "ministry" | "vendor";

export type PfmsStage = "mobilization" | "stage1" | "stage2" | "final";

export interface Proposal {
  id: string;
  title: string;
  hindiTitle: string;
  category: string;
  district: string;
  constituency: string;
  mpName: string;
  sanctionedAmountLakh: number;
  reserved: { scWorks: number; stWorks: number; generalWorks: number };
  location: { lat: number; lng: number };
  status: "recommended" | "under_review" | "sanctioned" | "rejected";
  submittedAt: string;
}

export interface BankDetails {
  workId: string;
  bank: string;
  accountNoMasked: string;
  ifsc: string;
  pan: string;
  submittedAt: string;
}

export interface MilestoneRequest {
  workId: string;
  stage: PfmsStage;
  amountLakh: number;
  status: "photo_pending" | "approved";
  requestedAt: string;
}

export type RiskBand = "low" | "medium" | "high";

export type ModuleKind =
  | "trend"
  | "duplicate"
  | "cost"
  | "compliance"
  | "payment"
  | "predictive"
  | "photo";

export type CaseState =
  | "submitted"
  | "evaluating"
  | "auto_cleared"
  | "hold_active"
  | "override_approved"
  | "escalated"
  | "released"
  | "rejected";

export type LedgerCategory =
  | "genesis"
  | "submit"
  | "clear"
  | "hold"
  | "override"
  | "escalate"
  | "release"
  | "reject"
  | "audit"
  | "system"
  | "ingestion";

export type OverrideKind = "gate" | "threshold";

export type Evidence =
  | {
      kind: "duplicate";
      twinTitle: string;
      twinId: string;
      distanceMeters: number;
      textSimilarityPct: number;
      mapX: number;
      mapY: number;
    }
  | {
      kind: "cost";
      sanctionedLakh: number;
      peerLowLakh: number;
      peerHighLakh: number;
      peerMeanLakh: number;
      zScore: number;
      categoryLabel: string;
      baselineSource?: "terrain+district" | "district" | "state" | "manual";
      baselineNote?: string;
      expectedLakh?: number;
      residualPct?: number;
      model?: string;
      shapTop?: { feature: string; contribution: number }[];
    }
  | {
      kind: "compliance";
      field: string;
      actual: string;
      required: string;
      ruleRef: string;
      clauseText: string;
    }
  | {
      kind: "photo";
      photos: { label: string; color: string; pHash: string }[];
      pHashMatchPct: number;
      exif: { field: string; photoA: string; photoB: string; corroborating: boolean }[];
    }
  | {
      kind: "predictive";
      stallProbabilityPct: number;
      factors: string[];
      model?: string;
      districtStallRate?: number;
      disbursalVelocity?: number;
      extensions?: number;
    }
  | {
      kind: "trend";
      caseReleasePct: number;
      peerReleasePct: number;
      peerSd: number;
      basis: string;
      longitudinal: boolean;
    }
  | {
      kind: "pfms";
      stageNumber: number;
      accountMatch: boolean;
      fundRedirectionAlert: boolean;
      vendorSimilarityPct: number;
      vendorMatchedName?: string;
      flags: string[];
      detail: string;
    };

export interface ModuleBreakdown {
  module: ModuleKind;
  subScore: number;
  description: string;
  triggered: boolean;
  evidence?: Evidence;
}

export interface GateInfo {
  fired: boolean;
  rule?: string;
  detail?: string;
  heldIndependent: boolean;
}

export interface WorkCase {
  id: string;
  title: string;
  hindiTitle: string;
  category: string;
  state: string;
  district: string;
  constituency: string;
  mpName: string;
  dmName: string;
  sanctionedAmountLakh: number;
  sanctionedDate: string;
  status: CaseState;
  statusSince: string;
  overview: string;
  mpPlainStatus: string;
  compositeScore: number;
  gate: GateInfo;
  moduleBreakdown: ModuleBreakdown[];
  path: CaseState[];
  facts?: Record<string, unknown>;
}

export interface LedgerEntry {
  index: number;
  action: string;
  category: LedgerCategory;
  actor: string;
  actorRole: string;
  body: string;
  timestamp: string;
  caseId?: string;
  hash: string;
  prevHash: string;
}

export interface OfficialStat {
  id: string;
  name: string;
  role: string;
  district: string;
  state: string;
  highRiskDecisions: number;
  gateOverrides: number;
  thresholdOverrides: number;
  flaggedNote?: string;
}

export interface AnalyticsData {
  districtUtilization: { district: string; q1: number; q2: number; q3: number; q4: number; ytd: number }[];
  districtTrend: { month: string; [district: string]: string | number }[];
  nationalHeatmap: { state: string; utilization: number; cases: number }[];
  categoryExpenditure: { category: string; releasesCr: number; sanctionsCr: number }[];
  entitlements: {
    mpName: string;
    annualCr: number;
    usedCr: number;
    breakdown: { category: string; lakh: number }[];
  }[];
  mpAllocations: MpAllocationData;
}

/** Official MoSPI “Allocated Limit for Hon'ble MPs” table. */
export interface MpAllocationData {
  source: string;
  mpCount: number;
  totalCr: number;
  mps: { mpName: string; state: string; constituency: string; allocatedCr: number | null }[];
}