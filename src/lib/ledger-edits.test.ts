import { describe, expect, it } from "vitest";
import { encodeBody, formatAmount, sanitizeStatus, splitBody } from "./ledger-edits";
import { chainValidity } from "@/store/AppStore";
import { ledgerHash } from "./hash";

describe("ledger field-edit codec", () => {
  it("round-trips an amount/status edit without touching prose containing ₹", () => {
    const original = "Released ₹14.20 for stage 2 of MPL-2025-1007";
    const edited = encodeBody(original, 45.5, "FALSIFIED");
    // The original prose is preserved verbatim as the head.
    expect(splitBody(edited)).toEqual({ head: original, amount: 45.5, status: "FALSIFIED" });
    // Re-edit keeps parsing stable (attacker edits twice).
    const again = encodeBody(splitBody(edited).head, 0.01, "HELD");
    expect(splitBody(again)).toEqual({ head: original, amount: 0.01, status: "HELD" });
  });

  it("treats legacy/plain bodies as unencoded", () => {
    expect(splitBody("Plain historical record with no fields")).toEqual({
      head: "Plain historical record with no fields",
      amount: null,
      status: null,
    });
    // An amount token with whitespace is prose, not the encoded tail.
    expect(splitBody("cost ₹12 lakh approved").amount).toBeNull();
  });

  it("formats amounts and sanitizes status against the separator", () => {
    expect(formatAmount(14.2)).toBe("14.2");
    expect(formatAmount(45)).toBe("45");
    expect(formatAmount(0)).toBe("0");
    expect(sanitizeStatus("STAGE 2 ₹ RELEASED")).toBe("STAGE 2 RELEASED");
  });

  it("manual edit breaks chainValidity exactly like simulateDbTamper", () => {
    const seed = (i: number, body: string) => ({
      index: i,
      action: "ACT",
      category: "release" as const,
      actor: "a",
      actorRole: "r",
      body,
      timestamp: `t${i}`,
      prevHash: "",
      hash: "",
    });
    const ledger = [seed(0, "genesis"), seed(1, "Released ₹10"), seed(2, "Cleared ₹5")].reduce(
      (acc, e, i) => {
        // reduce (not map): the chained prevHash must read the previously
        // BUILT block, and map's third arg is the pre-build seed array.
        const prevHash = i === 0 ? "0".repeat(16) : acc[i - 1].hash;
        const hash = ledgerHash(prevHash, e.index, e.action, e.actor, e.body, e.timestamp);
        return [...acc, { ...e, prevHash, hash }];
      },
      [] as { index: number; action: string; category: "release"; actor: string; actorRole: string; body: string; timestamp: string; prevHash: string; hash: string }[]
    );
    expect(chainValidity(ledger).every(Boolean)).toBe(true);

    // Inline manual edit: rewrite body, re-sign ONLY the block's own hash.
    const edited = ledger.map((e) =>
      e.index === 1
        ? {
            ...e,
            body: encodeBody(e.body, 99.5, "FALSIFIED"),
            hash: ledgerHash(e.prevHash, e.index, e.action, e.actor, encodeBody(e.body, 99.5, "FALSIFIED"), e.timestamp),
          }
        : e
    );
    const validity = chainValidity(edited);
    expect(validity[1]).toBe(true); // attacker re-sealed own hash
    expect(validity[2]).toBe(false); // child link broken — detection
  });
});
