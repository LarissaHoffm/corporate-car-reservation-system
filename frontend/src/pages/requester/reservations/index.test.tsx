import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/use-reservations", () => {
  const mockHook = {
    myItems: [
      {
        id: "r1",
        origin: "Joinville",
        destination: "Curitiba",
        startAt: new Date("2024-01-01T10:00:00Z").toISOString(),
        endAt: new Date("2024-01-01T12:00:00Z").toISOString(),
        status: "PENDING",
      },
    ],
    loading: { my: false, cancel: false } as any,
    errors: {} as any,
    refreshMy: vi.fn(),
    cancelReservation: vi.fn(),
  };

  return {
    __esModule: true,
    default: () => mockHook,
  };
});

vi.mock("@/lib/http/documents", () => ({
  listDocumentsByReservation: vi
    .fn()
    .mockResolvedValue([]), // sem documentos por padrão
}));

vi.mock("@/lib/http/checklists", () => ({
  ChecklistsAPI: {
    listReservationSubmissions: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/lib/friendly-reservation-code", () => ({
  makeFriendlyReservationCode: (id: string) => `RES-MOCK-${id}`,
}));

import RequesterReservationsListPage from "./index";

describe("RequesterReservationsListPage", () => {
  it("renderiza título, contador de resultados e a reserva mockada", async () => {
    render(
      <MemoryRouter>
        <RequesterReservationsListPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByText("My Reservations"),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Results \(1\)/)).toBeInTheDocument();
    });

    // código amigável mockado
    expect(screen.getByText("RES-MOCK-r1")).toBeInTheDocument();

    // origem/destino
    expect(screen.getByText("Joinville")).toBeInTheDocument();
    expect(screen.getByText("Curitiba")).toBeInTheDocument();

    // botão Details
    expect(screen.getByText("Details")).toBeInTheDocument();

    // botão Cancel (para status PENDING)
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });
});
