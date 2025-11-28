import { describe, it, expect, vi, beforeEach } from "vitest";

// mock compartilhado para o módulo de API HTTP
const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

// mock do módulo "@/lib/http/api"
// expõe tanto o default quanto o named export "api"
vi.mock("@/lib/http/api", () => {
  return {
    __esModule: true,
    default: apiMock,
    api: apiMock,
  };
});

import { CarsAPI } from "./cars";

describe("CarsAPI (lib/http/cars.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("list retorna array quando a API devolve array", async () => {
    const payload = [{ id: "c1" }, { id: "c2" }] as any[];
    apiMock.get.mockResolvedValueOnce({ data: payload });

    const result = await CarsAPI.list();

    expect(apiMock.get).toHaveBeenCalledTimes(1);
    expect(result).toEqual(payload);
  });

  it("list retorna exatamente o payload vindo da API, mesmo se não for array", async () => {
    const payload = { foo: "bar" } as any;
    apiMock.get.mockResolvedValueOnce({ data: payload });

    const result = await CarsAPI.list();

    // a implementação atual não normaliza, só repassa o data
    expect(apiMock.get).toHaveBeenCalledTimes(1);
    expect(result).toEqual(payload);
  });

  it("get retorna o carro vindo da API", async () => {
    const car = { id: "car-1", plate: "ABC1234" } as any;
    apiMock.get.mockResolvedValueOnce({ data: car });

    const result = await CarsAPI.get("car-1");

    expect(apiMock.get).toHaveBeenCalledTimes(1);
    expect(result).toEqual(car);
  });

  it("create chama a API e retorna o carro criado", async () => {
    const created = { id: "car-created" } as any;
    apiMock.post.mockResolvedValueOnce({ data: created });

    const body = {
      plate: "AAA0A00",
      model: "Onix",
      branchId: "b1",
    } as any;

    const result = await CarsAPI.create(body);

    expect(apiMock.post).toHaveBeenCalledTimes(1);
    expect(result).toEqual(created);
  });

  it("update chama a API e retorna o carro atualizado", async () => {
    const updated = { id: "car-updated", plate: "BBB1B11" } as any;
    apiMock.patch.mockResolvedValueOnce({ data: updated });

    const result = await CarsAPI.update("car-updated", {
      plate: "BBB1B11",
    } as any);

    expect(apiMock.patch).toHaveBeenCalledTimes(1);
    expect(result).toEqual(updated);
  });

  it("remove chama a API para excluir o carro", async () => {
    apiMock.delete.mockResolvedValueOnce({});

    await CarsAPI.remove("car-1");

    expect(apiMock.delete).toHaveBeenCalledTimes(1);
  });
});
