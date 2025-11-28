import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// mocks "hoisted" para evitar o erro de mock antes da inicialização
const hookMocks = vi.hoisted(() => ({
  cancelReservation: vi.fn(),
  refreshMy: vi.fn(),
}));

vi.mock("@/lib/auth", () => {
  return {
    __esModule: true,
    useAuth: () => ({
      user: {
        name: "Lari",
        email: "lari@example.com",
        role: "REQUESTER",
      },
    }),
  };
});

vi.mock("@/hooks/use-reservations", () => {
  return {
    __esModule: true,
    default: () => ({
      myItems: [
        {
          id: "r1",
          origin: "HQ",
          destination: "Client",
          startAt: "2024-01-01T10:00:00.000Z",
          endAt: "2024-01-01T12:00:00.000Z",
          status: "PENDING",
        },
      ],
      loading: { my: false, cancel: false },
      errors: {},
      refreshMy: hookMocks.refreshMy,
      cancelReservation: hookMocks.cancelReservation,
    }),
  };
});

// evita chamadas reais na montagem dos status de docs/checklists
vi.mock("@/lib/http/documents", () => ({
  __esModule: true,
  listDocumentsByReservation: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/http/checklists", () => ({
  __esModule: true,
  ChecklistsAPI: {
    listReservationSubmissions: vi.fn().mockResolvedValue([]),
  },
}));

import RequesterDashboard from "./page";

describe("RequesterDashboard (requester/page.tsx)", () => {
  it("renderiza o dashboard com info básica do usuário e da reserva", async () => {
    render(
      <MemoryRouter>
        <RequesterDashboard />
      </MemoryRouter>,
    );

    // Espera a tabela renderizar a linha da reserva (efeitos + state)
    await screen.findByText("HQ");
    await screen.findByText("Client");

    expect(
      screen.getByRole("heading", { name: /Welcome back, Lari/i }),
    ).toBeInTheDocument();

    // Os cards de ação são <a> (links) com role="link"
    expect(
      screen.getByRole("link", { name: /New Reservation/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Upload Documents/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Return Checklist/i }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /View All/i }),
    ).toBeInTheDocument();
  });

  it("abre o dossier ao clicar em View", async () => {
    render(
      <MemoryRouter>
        <RequesterDashboard />
      </MemoryRouter>,
    );

    // garante que a linha está renderizada
    await screen.findByText("HQ");

    const viewButton = screen.getAllByRole("button", { name: /View/i })[0];
    fireEvent.click(viewButton);

    expect(
      screen.getByText(/Reservation dossier/i),
    ).toBeInTheDocument();
  });

  it("chama cancelReservation ao clicar em Cancel", async () => {
    render(
      <MemoryRouter>
        <RequesterDashboard />
      </MemoryRouter>,
    );

    await screen.findByText("HQ");

    const cancelButton = screen.getByRole("button", { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(hookMocks.cancelReservation).toHaveBeenCalledWith("r1");
  });
});
