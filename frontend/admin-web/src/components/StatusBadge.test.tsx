import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("infers a success tone for active statuses", () => {
    render(<StatusBadge value="Active" />);

    expect(screen.getByText("Active")).toHaveClass("status-success");
  });

  it("allows an explicit tone override", () => {
    render(<StatusBadge value="Manual Review" tone="warning" />);

    expect(screen.getByText("Manual Review")).toHaveClass("status-warning");
  });
});
