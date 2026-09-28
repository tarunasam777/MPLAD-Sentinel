import { describe, expect, it } from "vitest";
import { ledgerHash, shortHash } from "./hash";
import { sha256, sha256Ok } from "./sha256";
import { buildLedger } from "./data";
import { chainValidity } from "@/store/AppStore";

describe("sha256 (FIPS 180-4 self-check)", () => {
  it("matches the known test vectors", () => {
    expect(sha256Ok()).toBe(true);
    expect(sha256("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });
});

describe("ledgerHash", () => {
  it("is deterministic and field-sensitive", () => {
    const a = ledgerHash("prev", 1, "ACT", "actor", "body", "ts");
    const b = ledgerHash("prev", 1, "ACT", "actor", "body", "ts");
    const c = ledgerHash("prev", 1, "ACT", "actor", "body!", "ts");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toHaveLength(64);
    expect(shortHash(a)).toHaveLength(10);
  });

  it("changes when any chained field changes", () => {
    const base = ledgerHash("p", 0, "A", "B", "C", "D");
    expect(ledgerHash("p2", 0, "A", "B", "C", "D")).not.toBe(base);
    expect(ledgerHash("p", 1, "A", "B", "C", "D")).not.toBe(base);
    expect(ledgerHash("p", 0, "A2", "B", "C", "D")).not.toBe(base);
  });
});

describe("seed ledger integrity (mock dataset)", () => {
  it("builds a fully valid hash chain", () => {
    const ledger = buildLedger();
    expect(ledger.length).toBeGreaterThan(3);
    const validity = chainValidity(ledger);
    expect(validity.every(Boolean)).toBe(true);
    // Re-derive the hash of the first block from its fields — the client
    // formula must reproduce the seed exactly (backend parity).
    const first = ledger[0];
    expect(first.hash).toBe(
      ledgerHash(first.prevHash, first.index, first.action, first.actor, first.body, first.timestamp)
    );
  });
});
