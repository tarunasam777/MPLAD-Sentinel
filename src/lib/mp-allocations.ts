import { MP_ALLOCATIONS, MP_ALLOCATION_COUNT, MP_ALLOCATION_TOTAL_CR, type MpAllocationRow } from "./mp-allocations.generated";

export { MP_ALLOCATIONS, MP_ALLOCATION_COUNT, MP_ALLOCATION_TOTAL_CR };
export type { MpAllocationRow };

/**
 * Official MoSPI names are ALL-CAPS variants of the demo's display names
 * (“EATALA RAJENDER” vs “Shri Eatala Rajender”). Matching is deliberately
 * conservative: alphanumeric-only, case-folded, token-subset in BOTH
 * directions — so a demo name matches at most one official row, and a
 * threshold of 0.66 rejects the noisy near-matches (e.g. two different
 * “Reddy”s) rather than mis-attaching official figures.
 */
export function normalizeMpName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function tokenSetOverlap(a: string, b: string): number {
  const at = new Set(normalizeMpName(a).split(" ").filter(Boolean));
  const bt = new Set(normalizeMpName(b).split(" ").filter(Boolean));
  if (at.size === 0 || bt.size === 0) return 0;
  let inter = 0;
  for (const t of at) if (bt.has(t)) inter += 1;
  // Overlap relative to the smaller set: “Eatala Rajender” ⊂ “EATALA RAJENDER” → 1
  return inter / Math.min(at.size, bt.size);
}

export function findOfficialAllocation(displayName: string): MpAllocationRow | null {
  const needle = normalizeMpName(displayName);
  const needleTokens = needle.split(" ").filter(Boolean);
  let best: MpAllocationRow | null = null;
  let bestScore = 0;
  for (const row of MP_ALLOCATIONS) {
    const candidate = normalizeMpName(row.mpName);
    let score = 0;
    if (candidate === needle) {
      score = 1;
    } else if (needleTokens.length >= 2) {
      // Multi-token needles may use overlap/containment scoring; a bare
      // surname must match exactly or not at all — otherwise “Reddy”
      // would attach to whichever Reddy sorts first.
      const overlap = tokenSetOverlap(displayName, row.mpName);
      const containment =
        (candidate.includes(needle) || needle.includes(candidate)) &&
        Math.min(needle.length, candidate.length) >= 8
          ? 0.9
          : 0;
      score = Math.max(overlap, containment);
    }
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }
  return bestScore >= 0.66 ? best : null;
}
