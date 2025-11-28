import React, { useEffect } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";

// --- Mocks dos módulos de API usados pelo hook ---
// Esses mocks são hoisted, mas não dependem de variáveis externas,

vi.mock("@/lib/http/reservations", () => ({
  ReservationsAPI: {
    listMine: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    approve: vi.fn(),
    cancel: vi.fn(),
    complete: vi.fn(),
    remove: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock("@/lib/http/cars", () => ({
  CarsAPI: {
    list: vi.fn(),
  },
}));

// Importa DEPOIS dos mocks
import { ReservationsAPI } from "@/lib/http/reservations";
import { CarsAPI } from "@/lib/http/cars";
import useReservations from "./use-reservations";

function HookHost({
  onReady,
}: {
  onReady: (value: ReturnType<typeof useReservations>) => void;
}) {
  const value = useReservations();

  useEffect(() => {
    onReady(value);
  }, [value, onReady]);

  return null;
}

describe("useReservations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("carrega minhas reservas e atualiza estado/caches no refreshMy", async () => {
    const reservation = {
      id: "r1",
      origin: "A",
      destination: "B",
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 3600000).toISOString(),
      status: "PENDING",
    } as any;

    (ReservationsAPI as any).listMine.mockResolvedValue([reservation]);

    let hookValue: any;
    render(<HookHost onReady={(v) => (hookValue = v)} />);

    await waitFor(() => {
      expect(hookValue).toBeDefined();
    });

    await act(async () => {
      await hookValue.refreshMy();
    });

    expect((ReservationsAPI as any).listMine).toHaveBeenCalledTimes(1);
    expect(hookValue.myItems).toHaveLength(1);
    expect(hookValue.myItems[0].id).toBe("r1");
  });

  it("executa operações básicas de CRUD e retorna ok=true em sucesso", async () => {
    const baseReservation = {
      id: "r1",
      origin: "A",
      destination: "B",
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 3600000).toISOString(),
      status: "PENDING",
    } as any;

    (ReservationsAPI as any).list.mockResolvedValue([baseReservation]);
    (ReservationsAPI as any).create.mockResolvedValue({
      ...baseReservation,
      id: "r2",
    });
    (ReservationsAPI as any).approve.mockResolvedValue({
      ...baseReservation,
      id: "r1",
      status: "APPROVED",
    });
    (ReservationsAPI as any).cancel.mockResolvedValue({
      ...baseReservation,
      id: "r1",
      status: "CANCELED",
    });
    (ReservationsAPI as any).complete.mockResolvedValue({
      ...baseReservation,
      id: "r1",
      status: "COMPLETED",
    });
    (ReservationsAPI as any).remove.mockResolvedValue(undefined as any);
    (ReservationsAPI as any).get.mockResolvedValue(baseReservation);

    (CarsAPI as any).list.mockResolvedValue([
      { id: "c1", plate: "ABC1D23", model: "Car 1" },
    ]);

    let hookValue: any;
    render(<HookHost onReady={(v) => (hookValue = v)} />);

    await waitFor(() => {
      expect(hookValue).toBeDefined();
    });

    await act(async () => {
      await hookValue.refresh();
      await hookValue.createReservation({} as any);
      await hookValue.approveReservation("r1", {} as any);
      await hookValue.cancelReservation("r1");
      await hookValue.completeReservation("r1");
      await hookValue.removeReservation("r1");
      await hookValue.getReservation("r1");
      await hookValue.listAvailableCars({ branchId: "b1" });
    });

    expect((ReservationsAPI as any).list).toHaveBeenCalled();
    expect((ReservationsAPI as any).create).toHaveBeenCalled();
    expect((ReservationsAPI as any).approve).toHaveBeenCalledWith(
      "r1",
      expect.any(Object),
    );
    expect((ReservationsAPI as any).cancel).toHaveBeenCalledWith("r1");
    expect((ReservationsAPI as any).complete).toHaveBeenCalledWith("r1");
    expect((ReservationsAPI as any).remove).toHaveBeenCalledWith("r1");
    expect((ReservationsAPI as any).get).toHaveBeenCalledWith("r1");
    expect((CarsAPI as any).list).toHaveBeenCalledWith({
      status: "AVAILABLE",
      branchId: "b1",
    });
  });

  it("preenche errors quando createReservation falha", async () => {
    (ReservationsAPI as any).create.mockRejectedValue({
      message: "Falha ao criar",
    });

    let hookValue: any;
    render(<HookHost onReady={(v) => (hookValue = v)} />);

    await waitFor(() => {
      expect(hookValue).toBeDefined();
    });

    let result: any;
    await act(async () => {
      result = await hookValue.createReservation({} as any);
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Falha ao criar");
    expect(hookValue.errors.create).toBe("Falha ao criar");
  });
});
