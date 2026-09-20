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

let demoToken: string | null = DEFAULT_DEMO_TOKEN;

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
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
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
}

export async function fetchBootstrap(): Promise<BootstrapData> {
  return request<BootstrapData>("/api/v1/bootstrap");
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

export async function fetchCases(): Promise<{ cases: WorkCase[] }> {
  return request<{ cases: WorkCase[] }>("/api/v1/cases");
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
  ok: boolean;
}> {
  return request<{ validity: boolean[]; tampered: number[]; ok: boolean }>(
    "/api/v1/ledger/verify"
  );
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