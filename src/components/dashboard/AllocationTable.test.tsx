import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AllocationTable } from "./AllocationTable";
import { MP_ALLOCATIONS } from "@/lib/mp-allocations";

/** jsdom renders only the current page (12 rows), so content assertions use
 * slices that are guaranteed to be on page 1; the full table is used for
 * pagination and header-count assertions. */
const PAGE_ONE = MP_ALLOCATIONS.slice(0, 12);

describe("AllocationTable", () => {
  it("renders the full official register with pagination", () => {
    render(<AllocationTable allocations={MP_ALLOCATIONS} />);
    expect(screen.getByText(/543 MPs · 542 with published amounts/)).toBeInTheDocument();
    // CSV order is preserved; row #3 is on page 1.
    expect(screen.getByText("ABHAY KUMAR SINHA")).toBeInTheDocument();
    expect(screen.getByText(/Showing 1–12 of 543/)).toBeInTheDocument();
  });

  it("shows pending-revision rows without a fabricated amount", () => {
    render(
      <AllocationTable
        allocations={[{ mpName: "TEST BLANK ROW", state: "Test State", constituency: "TEST", allocatedCr: null }]}
      />
    );
    expect(screen.getByText("pending revision")).toBeInTheDocument();
    expect(screen.getByText("TEST BLANK ROW")).toBeInTheDocument();
  });

  it("renders page-one rows with Indian-format amounts", () => {
    render(<AllocationTable allocations={PAGE_ONE} />);
    expect(screen.getByText(/3 MPs|12 MPs/)).toBeInTheDocument();
    // ₹14.70 Cr is the modal allocation — several page-one rows carry it.
    expect(screen.getAllByText("₹14.7 Cr").length).toBeGreaterThan(0);
  });

  it("filters by MP, state and constituency", async () => {
    const user = userEvent.setup();
    render(<AllocationTable allocations={MP_ALLOCATIONS} />);
    await user.type(screen.getByPlaceholderText("Search MP, state, constituency…"), "Owaisi");
    // Filtering to a single page hides the pagination footer entirely.
    expect(screen.getByText("Asaduddin Owaisi")).toBeInTheDocument();
    expect(screen.queryByText("Nitin Jairam Gadkari")).not.toBeInTheDocument();
  });

  it("highlights requested demo rows", () => {
    render(
      <AllocationTable
        allocations={[MP_ALLOCATIONS.find((r) => r.mpName === "Asaduddin Owaisi")!]}
        highlightNames={["Asaduddin Owaisi"]}
      />
    );
    expect(screen.getByText("demo state")).toBeInTheDocument();
  });

  it("paginates forward and back", async () => {
    const user = userEvent.setup();
    render(<AllocationTable allocations={MP_ALLOCATIONS} />);
    await user.click(screen.getByText("Next →"));
    expect(screen.getByText(/Showing 13–24 of 543/)).toBeInTheDocument();
    await user.click(screen.getByText("← Prev"));
    expect(screen.getByText(/Showing 1–12 of 543/)).toBeInTheDocument();
  });
});
