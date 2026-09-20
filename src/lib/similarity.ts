/* Live duplicate-similarity port of thefuzz.token_sort_ratio (v0.22.x).
 *
 * thefuzz 0.22 delegates scoring to rapidfuzz, so this mirrors the
 * rapidfuzz pipeline exactly (verified element-by-element against the
 * installed backend):
 *   1. full_process  ->  drop chars 0x80-0xFF, lowercase, every
 *                         non-alphanumeric char becomes ONE space, trim
 *                         (whitespace runs are NOT collapsed)
 *   2. token_sort    ->  split on whitespace, code-point sort, join " "
 *   3. ratio         ->  normalised Indel similarity 200*LCS/(n+m),
 *                         Python banker's rounding to int
 *
 * LCS dynamic programming matches rapidfuzz bit-for-bit on realistic
 * inputs (verified). Only astral-plane characters (>U+FFFF) could diverge
 * (UTF-16 units vs code points); work descriptions are ASCII/BMP.
 */

export const DUPLICATE_SIM_THRESHOLD = 85;
export const DUPLICATE_DIST_THRESHOLD_M = 500;

function asciiOnly(s: string): string {
  return (s ?? "").replace(/[^\x00-\x7F]/g, "");
}

function defaultProcess(s: string): string {
  return asciiOnly(s)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, " ")
    .trim();
}

function pyRound(x: number): number {
  const f = Math.floor(x);
  const d = x - f;
  if (d < 0.5 || d > 0.5) return Math.round(x);
  return f % 2 === 0 ? f : f + 1;
}

function lcsLength(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  let prev = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    const cur = new Array<number>(n + 1).fill(0);
    const ai = a[i - 1];
    for (let j = 1; j <= n; j++) {
      cur[j] = ai === b[j - 1] ? prev[j - 1] + 1 : prev[j] >= cur[j - 1] ? prev[j] : cur[j - 1];
    }
    prev = cur;
  }
  return prev[n];
}

export function indelRatio(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 100;
  if (a.length === 0 || b.length === 0) return 0;
  // Identical operation order to rapidfuzz (IEEE-754 doubles), so even
  // float dust at .5 boundaries rounds the same way downstream.
  const total = a.length + b.length;
  const dist = total - 2 * lcsLength(a, b);
  return pyRound((1.0 - dist / total) * 100.0);
}

export function tokenSortRatio(s1: string, s2: string): number {
  const t1 = defaultProcess(s1).split(/\s+/).filter(Boolean).sort().join(" ");
  const t2 = defaultProcess(s2).split(/\s+/).filter(Boolean).sort().join(" ");
  return indelRatio(t1, t2);
}

/** Mirrors backend duplicate_sub_score: clamp(min(100, sim*0.9 + proximity + 4)). */
export function duplicateSubScore(sim: number, distM: number): number {
  const v = Math.min(100, sim * 0.9 + ((DUPLICATE_DIST_THRESHOLD_M - distM) / 500) * 10 + 4);
  return Math.max(0, pyRound(v));
}
