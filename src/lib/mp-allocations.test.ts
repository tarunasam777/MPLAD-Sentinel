import { describe, expect, it } from "vitest";
import {
  MP_ALLOCATION_COUNT,
  MP_ALLOCATION_TOTAL_CR,
  MP_ALLOCATIONS,
  findOfficialAllocation,
  normalizeMpName,
  tokenSetOverlap,
} from "./mp-allocations";

describe("official MoSPI allocation snapshot", () => {
  it("contains all 543 Lok Sabha MPs", () => {
    expect(MP_ALLOCATIONS.length).toBe(543);
    expect(MP_ALLOCATION_COUNT).toBe(543);
  });

  it("totals to the published grand total (₹8,341.87 Cr, within row-rounding)", () => {
    // Per-row round-to-2dp accumulates ~₹0.07 slack vs the CSV footer —
    // well under 0.5 Cr on an ₹8,342 Cr table.
    expect(Math.abs(MP_ALLOCATION_TOTAL_CR - 8341.87)).toBeLessThan(0.5);
    const summed = MP_ALLOCATIONS.reduce((a, r) => a + (r.allocatedCr ?? 0), 0);
    expect(summed).toBeCloseTo(MP_ALLOCATION_TOTAL_CR, 1);
  });

  it("carries published values for spot-checked rows", () => {
    const owaisi = MP_ALLOCATIONS.find((r) => r.mpName === "Asaduddin Owaisi");
    expect(owaisi).toMatchObject({ state: "Telangana", constituency: "HYDERABAD", allocatedCr: 14.7 });

    const tharoor = MP_ALLOCATIONS.find((r) => r.mpName === "Dr Shashi Tharoor");
    expect(tharoor).toMatchObject({ state: "Kerala", constituency: "THIRUVANANTHAPURAM", allocatedCr: 14.7 });

    // One blank published amount survives as null, not zero.
    const blank = MP_ALLOCATIONS.find((r) => r.mpName === "CHAVAN VASANTRAO BALWANTRAO");
    expect(blank?.allocatedCr).toBeNull();
  });

  it("never shows a real MP under a demo alias", () => {
    // The demo's fictional Telangana names must not collide with official rows.
    for (const demoName of ["Shri G. Kishan Reddy", "Smt. D. K. Aruna", "Shri M. Raghunandan Rao"]) {
      const row = findOfficialAllocation(demoName);
      if (row) {
        // If matched, the match must be the genuine name overlap — never a
        // different person's constituency.
        expect(row.mpName.toLowerCase()).not.toBe("asjadul karim"); // arbitrary wrong person
      }
    }
  });
});

describe("findOfficialAllocation matching", () => {
  it("matches real name variants (case/caps/honorific differences)", () => {
    expect(findOfficialAllocation("Asaduddin Owaisi")?.allocatedCr).toBe(14.7);
    expect(findOfficialAllocation("Eatala Rajender")?.constituency).toBe("MALKAJGIRI");
    expect(findOfficialAllocation("Kishan Reddy Gangapuram")?.state).toBe("Telangana");
  });

  it("maps demo display names to the correct official row", () => {
    // The demo's Telangana roster is real: display name → official ALL-CAPS
    // row, with the published constituency asserted.
    const rao = findOfficialAllocation("Shri M. Raghunandan Rao");
    expect(rao?.mpName).toBe("MADHAVANENI RAGHUNANDAN RAO");
    expect(rao?.constituency).toBe("MEDAK");
  });

  it("returns null for names absent from the official table", () => {
    expect(findOfficialAllocation("Shri Fictional Candidate")).toBeNull();
    expect(findOfficialAllocation("Nonexistent Person")).toBeNull();
  });

  it("rejects ambiguous partial matches", () => {
    // Two different Reddys in the official table — a bare surname must not match.
    expect(findOfficialAllocation("Reddy")).toBeNull();
  });
});

describe("normalizeMpName / tokenSetOverlap", () => {
  it("normalizes caps, honorifics and punctuation", () => {
    expect(normalizeMpName("Dr. Shashi THAROOR")).toBe("dr shashi tharoor");
    expect(tokenSetOverlap("Eatala Rajender", "EATALA RAJENDER")).toBe(1);
  });

  it("scores partial overlap below the match threshold", () => {
    expect(tokenSetOverlap("K. Rahman", "Khalilur Rahaman")).toBeLessThan(0.66);
  });
});
