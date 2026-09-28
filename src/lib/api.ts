import type { AnalyticsData, LedgerEntry, OfficialStat, WorkCase } from "@/lib/types";

export interface BootstrapData {
  cases: WorkCase[];
  ledger: LedgerEntry[];
  officials: OfficialStat[];
  analytics: AnalyticsData;
}

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

/** Demo auth token accepted by the backend (`DEMO_AUTH_TOKEN`, default
 *  "sentinel-demo-2026"). Attached to every API call; the decision
 *  surfaces show an explicit "Token Authenticated" banner while set. */
export const DEFAULT_DEMO_TOKEN =
  process.env.NEXT_PUBLIC_DEMO_AUTH_TOKEN ?? "sentinel-demo-2026";

/** Abort any single fetch after this many ms — a hung backend must never
 *  freeze a page (the browser default is minutes). */
const REQUEST_TIMEOUT_MS = 20_000;

let demoToken: string | null = DEFAULT_DEMO_TOKEN;

/** Coalesces concurrent GETs of the same URL into one fetch: hydration
 *  mounts several surfaces that each fetch bootstrap/metrics/summary at the
 *  same moment, and N parallel identical requests is pure waste. Failed or
 *  aborted requests remove themselves so a retry always re-fetches. */
const IN_FLIGHT = new Map<string, Promise<unknown>>();

function getRequest<T>(path: string): Promise<T> {
  const key = `GET ${path}`;
  const existing = IN_FLIGHT.get(key);
  if (existing) return existing as Promise<T>;
  const promise = request<T>(path).finally(() => IN_FLIGHT.delete(key));
  IN_FLIGHT.set(key, promise);
  return promise;
}

export function setDemoToken(token: string | null) {
  demoToken = token && token.trim() ? token.trim() : null;
}

export function getDemoToken(): string | null {
  return demoToken;
}

export function isTokenAuthenticated(): boolean {
  return demoToken !== null;
}

export interface PhotoVerifyResult {
  hash_a: string;
  hash_b: string;
  hamming_distance: number;
  similarity_percentage: number;
  is_duplicate_flag: boolean;
  exif_data: {
    image_a_gps: { lat: number; lng: number } | null;
    image_b_gps: { lat: number; lng: number } | null;
    spatial_distance_meters: number | null;
    timestamp_a: string | null;
    timestamp_b: string | null;
    exif_inconsistencies?: string[];
  };
  verdict: "FLAGGED_FORGED_DUPLICATE" | "VERIFIED_DISTINCT";
  source?: "live" | "offline";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (demoToken) headers["Authorization"] = `Bearer ${demoToken}`;
  if (init?.headers) {
    const extra =
      init.headers instanceof Headers
        ? Object.fromEntries(init.headers.entries())
        : Array.isArray(init.headers)
        ? Object.fromEntries(init.headers)
        : (init.headers as Record<string, string>);
    Object.assign(headers, extra);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const signal = init?.signal ?? controller.signal;
  try {
    const res = await fetch(`${API_BASE}${path}`, { ...init, headers, signal });
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        if (body?.detail) detail = String(body.detail);
      } catch {
        /* non-JSON error body */
      }
      throw new Error(detail);
    }
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchBootstrap(): Promise<BootstrapData> {
  return getRequest<BootstrapData>("/api/v1/bootstrap");
}

/* ── Universal search ─────────────────────────────────────────────── */

export interface SearchHit {
  id?: string;
  title?: string;
  name?: string;
  actor?: string;
  mpName?: string;
  district?: string;
  state?: string;
  category?: string;
  status?: string;
  role?: string;
  action?: string;
  body?: string;
  index?: number;
  sanctionedLakh?: number;
  riskScore?: number;
  usedCr?: number;
  href: string;
}

export interface SearchGroup {
  key: "works" | "cases" | "mps" | "officials" | "ledger" | "states";
  label: string;
  total: number;
  results: SearchHit[];
}

export interface SearchResponse {
  query: string;
  groups: SearchGroup[];
}

/** One search across the whole program: real works register, demo cases,
 *  MPs, officials, sealed ledger blocks and states — each hit carries a
 *  deep-link href so no result is ever a dead end. */
export async function fetchUniversalSearch(q: string, limit = 6): Promise<SearchResponse> {
  return getRequest<SearchResponse>(
    `/api/v1/search?q=${encodeURIComponent(q)}&limit=${limit}`
  );
}

export interface MlMetrics {
  stall: { version: string; model: string; n_train: number; n_test: number; accuracy: number; roc_auc: number; features: string[] };
  cost: { version: string; model: string; n_train: number; n_test: number; mae_lakh: number; r2_log: number; features: string[]; target: string };
  fusionWeights: Record<string, number>;
  modelVersions: Record<string, string>;
}

/** Fetch trained-model metrics (single source of truth for the methodology page). */
export async function fetchMlMetrics(): Promise<MlMetrics> {
  return getRequest<MlMetrics>("/api/v1/ml/metrics");
}

export interface MpAllocationsPayload {
  source: string;
  mpCount: number;
  totalCr: number;
  mps: { mpName: string; state: string; constituency: string; allocatedCr: number | null }[];
}

/** Official MoSPI MP allocation table (all Lok Sabha MPs). */
export async function fetchMpAllocations(): Promise<MpAllocationsPayload> {
  return getRequest<MpAllocationsPayload>("/api/v1/mps/allocations");
}

export async function postDecide(
  caseId: string,
  decision: "approve" | "inspect" | "escalate",
  note: string
): Promise<{ case: WorkCase }> {
  return request<{ case: WorkCase }>(`/api/v1/cases/${caseId}/decide`, {
    method: "POST",
    body: JSON.stringify({ decision, note }),
  });
}

export async function patchCaseTitle(caseId: string, title: string): Promise<{ case: WorkCase }> {
  return request<{ case: WorkCase }>(`/api/v1/cases/${caseId}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export interface IngestSyncResult {
  total: number;
  ingested: number;
  quarantined: number;
  held: number;
  evaluating: number;
  /** Real rows already on record that were skipped without re-evaluation
   *  (absent on older backends — never assume > 0). */
  skipped?: number;
  cases: string[];
  portal_live: boolean;
  provenance: string;
  districts: { district: string; records: number; portal_live: boolean }[];
}

export async function postIngestSync(districts?: string[]): Promise<IngestSyncResult> {
  return request<IngestSyncResult>("/api/v1/ingest/sync", {
    method: "POST",
    body: JSON.stringify(districts ? { districts } : {}),
  });
}

export async function fetchCases(ids?: string[]): Promise<{ cases: WorkCase[] }> {
  // Id-filtered: the backend excludes the real WS/* register from this
  // endpoint, and fetching every serialized demo case just to merge a dozen
  // sync rows is wasted bandwidth. Cap at 200 ids (server-side too).
  const path = ids?.length ? `/api/v1/cases?ids=${encodeURIComponent(ids.slice(0, 200).join(","))}` : "/api/v1/cases";
  return getRequest<{ cases: WorkCase[] }>(path);
}

/* ------------------------------------------------------------------ */
/* Real works register (eSAKSHI work-level exports, seeded server-side) */
/* ------------------------------------------------------------------ */

export interface WorkRow {
  id: string;
  title: string;
  state: string;
  district: string;
  constituency: string;
  mpName: string;
  category: string;
  sanctionedLakh: number;
  sanctionedDate: string;
  releasedPct: number;
  completionPct: number;
  monthsSinceSanction: number;
  statusLabel: string;
  riskScore: number;
  kind: string;
}

export interface WorksPage {
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  works: WorkRow[];
}

export interface WorksSummaryState {
  state: string;
  works: number;
  sanctionedCr: number;
  avgCompletionPct: number;
  highRisk: number;
}

export interface WorksSummary {
  totalWorks: number;
  totalSanctionedCr: number;
  noPaymentYet: number;
  source: string;
  states: WorksSummaryState[];
}

export interface WorksQuery {
  state?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchWorks(params: WorksQuery = {}): Promise<WorksPage> {
  const usp = new URLSearchParams();
  if (params.state) usp.set("state", params.state);
  if (params.q?.trim()) usp.set("q", params.q.trim());
  if (params.page) usp.set("page", String(params.page));
  if (params.pageSize) usp.set("page_size", String(params.pageSize));
  const qs = usp.toString();
  return getRequest<WorksPage>(`/api/v1/works${qs ? `?${qs}` : ""}`);
}

export async function fetchWorksSummary(): Promise<WorksSummary> {
  return getRequest<WorksSummary>("/api/v1/works/summary");
}

export interface ScaleSeedResult {
  seeded: boolean;
  count?: number;
  quarantined?: number;
  held?: number;
  existing?: number;
  existing_total: number;
  states: { state: string; cases: number }[];
  note: string;
}

export async function postScaleSeed(count = 750, force = false): Promise<ScaleSeedResult> {
  return request<ScaleSeedResult>("/api/v1/demo/scale-seed", {
    method: "POST",
    body: JSON.stringify({ count, seed: 7, force }),
  });
}

export async function postTamper(index: number, body: string): Promise<{ block: LedgerEntry }> {
  const timestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return request<{ block: LedgerEntry }>(`/api/v1/ledger/tamper`, {
    method: "POST",
    body: JSON.stringify({ index, body, timestamp }),
  });
}

export async function postUntamper(): Promise<{ restored: number }> {
  return request<{ restored: number }>(`/api/v1/ledger/untamper`, { method: "POST" });
}

export async function verifyChainLive(): Promise<{
  validity: boolean[];
  tampered: number[];
  editedBlocks?: number[];
  ok: boolean;
}> {
  return request<{
    validity: boolean[];
    tampered: number[];
    editedBlocks?: number[];
    ok: boolean;
  }>("/api/v1/ledger/verify");
}

/** Manual inline edit of a sealed block (amount/status) — the "attacker with
 *  DB access" path. The backend stores the row directly and re-signs ONLY
 *  that block's hash; the chain break surfaces on the next /verify, exactly
 *  like the Simulate Database Tampering button. */
export async function postTamperFields(
  index: number,
  amount: number,
  status: string
): Promise<{ block: LedgerEntry }> {
  return request<{ block: LedgerEntry }>(`/api/v1/ledger/tamper-fields`, {
    method: "POST",
    body: JSON.stringify({ index, amount, status }),
  });
}

export async function postResetDemo(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/api/v1/demo/reset", { method: "POST" });
}

const BACKENDS = [
  API_BASE,
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  "http://127.0.0.1:8000",
];

function offlineVerifyResult(): PhotoVerifyResult {
  return {
    hash_a: "f1d7908181e9ffff",
    hash_b: "f1d7908181e9fffe",
    hamming_distance: 1,
    similarity_percentage: 98.4,
    is_duplicate_flag: true,
    exif_data: {
      image_a_gps: { lat: 17.385, lng: 78.4867 },
      image_b_gps: { lat: 17.3852, lng: 78.4869 },
      spatial_distance_meters: 24.3,
      timestamp_a: "2026-08-10T10:00:00",
      timestamp_b: "2026-08-10T10:05:00",
    },
    verdict: "FLAGGED_FORGED_DUPLICATE",
    source: "offline",
  };
}

export async function verifyPhotos(formData: FormData): Promise<PhotoVerifyResult> {
  let httpErr: Error | null = null;
  let sawNetworkFailure = false;
  for (const base of [...new Set(BACKENDS)]) {
    try {
      const res = await fetch(`${base}/api/v1/verify-photos`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body?.detail) detail = String(body.detail);
        } catch {
          /* non-JSON error body */
        }
        throw new Error(detail);
      }
      return (await res.json()) as PhotoVerifyResult;
    } catch (err) {
      if (err instanceof TypeError) {
        sawNetworkFailure = true;
        continue;
      }
      httpErr = err instanceof Error ? err : new Error(String(err));
    }
  }
  if (httpErr) throw httpErr;
  if (sawNetworkFailure) return offlineVerifyResult();
  throw new Error("Photo-verification backend unreachable.");
}