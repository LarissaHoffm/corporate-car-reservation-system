import { describe, it, expect, vi, beforeEach } from "vitest";

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/http/api", () => {
  return {
    __esModule: true,
    default: apiMock,
  };
});

import {
  listReservationsByCar,
  ReservationsAPI,
} from "./reservations";

describe("ReservationsAPI & listReservationsByCar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listReservationsByCar normaliza resposta em array", async () => {
    apiMock.get.mockResolvedValueOnce({
      data: [{ id: "1" }, { id: "2" }],
    });

    const result = await listReservationsByCar("car-1");

    expect(apiMock.get).toHaveBeenCalledWith("/reservations/car/car-1");
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("1");
  });

  it("list usa payload.items quando o back retorna { items }", async () => {
    apiMock.get.mockResolvedValueOnce({
      data: { items: [{ id: "a" }] },
    });

    const result = await ReservationsAPI.list();

    expect(apiMock.get).toHaveBeenCalledWith("/reservations", {
      params: undefined,
    });
    expect(result).toEqual([{ id: "a" }]);
  });

  it("listMine retorna [] quando payload inesperado", async () => {
    apiMock.get.mockResolvedValueOnce({
      data: { foo: "bar" },
    });

    const result = await ReservationsAPI.listMine();

    expect(apiMock.get).toHaveBeenCalledWith("/reservations/me", {
      params: undefined,
    });
    expect(result).toEqual([]);
  });

  it("get/create/approve/cancel/complete/remove chamam os endpoints corretos", async () => {
    apiMock.get.mockResolvedValueOnce({
      data: { id: "r1" },
    });
    const r1 = await ReservationsAPI.get("r1");
    expect(apiMock.get).toHaveBeenCalledWith("/reservations/r1");
    expect(r1.id).toBe("r1");

    apiMock.post.mockResolvedValueOnce({
      data: { id: "r2" },
    });
    const created = await ReservationsAPI.create({
      origin: "A",
      destination: "B",
      startAt: "2024-01-01T10:00:00Z",
      endAt: "2024-01-01T12:00:00Z",
    });
    expect(apiMock.post).toHaveBeenCalledWith("/reservations", {
      origin: "A",
      destination: "B",
      startAt: "2024-01-01T10:00:00Z",
      endAt: "2024-01-01T12:00:00Z",
    });
    expect(created.id).toBe("r2");

    apiMock.patch.mockResolvedValueOnce({
      data: { id: "r3" },
    });
    await ReservationsAPI.approve("r3", { carId: "car-1" });
    expect(apiMock.patch).toHaveBeenCalledWith(
      "/reservations/r3/approve",
      { carId: "car-1" },
    );

    apiMock.patch.mockResolvedValueOnce({
      data: { id: "r4" },
    });
    await ReservationsAPI.cancel("r4");
    expect(apiMock.patch).toHaveBeenCalledWith(
      "/reservations/r4/cancel",
      { reason: "Cancelled by requester via web app" },
    );

    apiMock.patch.mockResolvedValueOnce({
      data: { id: "r5" },
    });
    await ReservationsAPI.complete("r5");
    expect(apiMock.patch).toHaveBeenCalledWith(
      "/reservations/r5/complete",
      {},
    );

    apiMock.delete.mockResolvedValueOnce({});
    await ReservationsAPI.remove("r6");
    expect(apiMock.delete).toHaveBeenCalledWith("/reservations/r6");
  });

  it("getStationsOnRoute devolve [] quando resposta não é array", async () => {
    apiMock.get.mockResolvedValueOnce({
      data: { something: "else" },
    });

    const stations = await ReservationsAPI.getStationsOnRoute("r1");

    expect(apiMock.get).toHaveBeenCalledWith(
      "/reservations/r1/stations-on-route",
    );
    expect(stations).toEqual([]);
  });
});
