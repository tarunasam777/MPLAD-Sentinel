import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatStrip } from "./StatStrip";

describe("StatStrip (Zone 1 KPI tiles)", () => {
  it("renders each tile with label, value and detail", () => {
    render(
      <StatStrip
        items={[
          { label: "Total MPs Covered", value: 543, detail: "official MoSPI allocation table" },
          { label: "Flag rate", value: "12%", accent: "text-gate" },
        ]}
      />
    );
    expect(screen.getByText("Total MPs Covered")).toBeInTheDocument();
    expect(screen.getByText("543")).toBeInTheDocument();
    expect(screen.getByText("official MoSPI allocation table")).toBeInTheDocument();
    expect(screen.getByText("12%")).toBeInTheDocument();
  });

  it("renders 3 or 4 tiles per the layout contract", () => {
    const { container } = render(
      <StatStrip
        items={[
          { label: "A", value: 1 },
          { label: "B", value: 2 },
          { label: "C", value: 3 },
          { label: "D", value: 4 },
        ]}
      />
    );
    expect(container.querySelectorAll(".grid > *")).toHaveLength(4);
  });
});
