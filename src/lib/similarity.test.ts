import { describe, expect, it } from "vitest";
import {
  DUPLICATE_DIST_THRESHOLD_M,
  DUPLICATE_SIM_THRESHOLD,
  duplicateSubScore,
  indelRatio,
  tokenSortRatio,
} from "./similarity";

/* Expected values below were produced by thefuzz==0.22.1
 * (token_sort_ratio) against the installed backend — the contract the
 * mock-mode port must hold bit-for-bit. */

describe("tokenSortRatio (thefuzz parity)", () => {
  it("matches thefuzz on the seeded duplicate pairs", () => {
    expect(
      tokenSortRatio(
        "Community Knowledge & Study Centre, Ward 14, Amberpet, Hyderabad",
        "Community Knowledge & Study Centre, Ward 16, Amberpet, Hyderabad"
      )
    ).toBe(98);
    expect(
      tokenSortRatio(
        "Construction of CC Road and Storm Drain, Pragathi Nagar, Medchal",
        "Laying of CC Road and Storm Drain, Pragathi Nagar, Medchal"
      )
    ).toBe(86);
  });

  it("handles identity, empties and case/punctuation noise", () => {
    expect(tokenSortRatio("Construction of CC Road", "Construction of CC Road")).toBe(100);
    expect(tokenSortRatio("", "Something")).toBe(0);
    expect(tokenSortRatio("", "")).toBe(100);
    expect(tokenSortRatio("Road work", "road WORK!!")).toBe(100);
  });

  it("is order-insensitive to token order", () => {
    expect(tokenSortRatio("alpha beta gamma", "gamma alpha beta")).toBe(100);
  });
});

describe("indelRatio", () => {
  it("scores identical and disjoint strings", () => {
    expect(indelRatio("abc", "abc")).toBe(100);
    expect(indelRatio("a", "b")).toBe(0);
  });
});

describe("duplicateSubScore", () => {
  it("mirrors the backend scoring formula", () => {
    expect(duplicateSubScore(98, 160)).toBe(99);
    expect(duplicateSubScore(86, 210)).toBe(87);
    expect(duplicateSubScore(0, 500)).toBe(4);
  });

  it("exposes the watch thresholds", () => {
    expect(DUPLICATE_SIM_THRESHOLD).toBe(85);
    expect(DUPLICATE_DIST_THRESHOLD_M).toBe(500);
  });
});
