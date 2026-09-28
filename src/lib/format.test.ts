import { describe, expect, it } from "vitest";
import { inr, inrCr, inrFull, officialStatus, scoreBand, statusLabel, moduleMeta } from "./format";

describe("currency formatting (en-IN)", () => {
  it("formats lakh amounts with Indian digit grouping", () => {
    expect(inr(147)).toBe("₹147 L");
    expect(inrFull(147)).toBe("₹1,47,00,000");
    expect(inrCr(4.82)).toBe("₹4.82 Cr");
  });
});

describe("score bands", () => {
  it("maps thresholds consistently (low <40, medium 40–69, high ≥70)", () => {
    expect(scoreBand(0)).toBe("low");
    expect(scoreBand(39.9)).toBe("low");
    expect(scoreBand(40)).toBe("medium");
    expect(scoreBand(69.9)).toBe("medium");
    expect(scoreBand(70)).toBe("high");
    expect(scoreBand(100)).toBe("high");
  });
});

describe("status vocabulary", () => {
  it("covers every workflow state with labels and official codes", () => {
    for (const key of Object.keys(statusLabel) as (keyof typeof statusLabel)[]) {
      expect(officialStatus[key]).toBeTruthy();
      expect(statusLabel[key]).toBeTruthy();
    }
    expect(officialStatus.hold_active).toBe("HOLD_ACTIVE");
    expect(statusLabel.override_approved).toBe("Override Approved");
  });
});

describe("module weights (fusion parity with backend)", () => {
  it("sums to exactly 1.0 and matches the published 28/20/20/10/8/7/7 split", () => {
    const weights = Object.values(moduleMeta).map((m) => m.weight);
    const sum = weights.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 6);
    expect(moduleMeta.compliance.weight).toBe(0.28);
    expect(moduleMeta.duplicate.weight).toBe(0.2);
    expect(moduleMeta.cost.weight).toBe(0.2);
    expect(moduleMeta.payment.weight).toBe(0.1);
    expect(moduleMeta.trend.weight).toBe(0.08);
    expect(moduleMeta.predictive.weight).toBe(0.07);
    expect(moduleMeta.photo.weight).toBe(0.07);
  });

  it("defines all seven modules", () => {
    expect(Object.keys(moduleMeta)).toHaveLength(7);
  });
});
