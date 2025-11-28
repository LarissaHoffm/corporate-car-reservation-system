import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReservationStatusBadge } from "./reservation-status-badge";

describe("ReservationStatusBadge", () => {
  it("renderiza o texto passado em children", () => {
    render(
      <ReservationStatusBadge status="pending">
        Pending status
      </ReservationStatusBadge>,
    );

    expect(screen.getByText("Pending status")).toBeInTheDocument();
  });

  it("aplica as classes corretas para status 'approved'", () => {
    render(
      <ReservationStatusBadge status="approved">
        Approved
      </ReservationStatusBadge>,
    );

    const badge = screen.getByText("Approved");
    expect(badge.className).toContain("bg-emerald-400/15");
    expect(badge.className).toContain("ring-emerald-400/30");
  });

  it("faz merge com className extra", () => {
    render(
      <ReservationStatusBadge status="cancelled" className="extra-class">
        Canceled
      </ReservationStatusBadge>,
    );

    const badge = screen.getByText("Canceled");
    expect(badge.className).toContain("extra-class");
    expect(badge.className).toContain("bg-rose-400/15");
  });
});
