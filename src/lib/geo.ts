import type { WorkCase } from "@/lib/types";

export const districtCenters: Record<string, { lat: number; lng: number }> = {
  Hyderabad: { lat: 17.385, lng: 78.4867 },
  Rangareddy: { lat: 17.2403, lng: 78.2031 },
  "Medchal-Malkajgiri": { lat: 17.63, lng: 78.48 },
  Sangareddy: { lat: 17.6249, lng: 78.0917 },
  Mahbubnagar: { lat: 16.743, lng: 78.0 },
};

export const DEFAULT_CENTER = { lat: 17.5, lng: 78.4 };

const JITTER = 0.028;

export function caseGeo(c: WorkCase, seq: number = 0): { lat: number; lng: number; name: string } {
  const base = districtCenters[c.district] ?? DEFAULT_CENTER;
  const theta = seq * 2.39996;
  const r = 0.006 + ((seq * 37) % 97) * 0.00035;
  const lat = base.lat + r * Math.cos(theta);
  const lng = base.lng + (JITTER * 0.35) * Math.sin(theta) + ((seq * 13) % 50) * 0.0004;
  return { lat: Math.round(lat * 10000) / 10000, lng: Math.round(lng * 10000) / 10000, name: c.district };
}

export function toApprox(px: number, py: number): { lat: number; lng: number } {
  const x = px / 100;
  const y = py / 100;
  const lat = 16.45 + y * 1.75;
  const lng = 77.55 + x * 1.9;
  return { lat: Math.round(lat * 10000) / 10000, lng: Math.round(lng * 10000) / 10000 };
}