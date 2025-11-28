import { describe, it, expect } from "vitest";
import { makeFriendlyReservationCode } from "./friendly-reservation-code";

describe("makeFriendlyReservationCode", () => {
  it("retorna placeholder quando input é vazio / falsy", () => {
    expect(makeFriendlyReservationCode("" as any)).toBe("RES-????????");
    expect(makeFriendlyReservationCode(null as any)).toBe("RES-????????");
    expect(makeFriendlyReservationCode(undefined as any)).toBe("RES-????????");
  });

  it("gera código a partir de string simples, normalizando e preenchendo com zeros à esquerda", () => {
    const code = makeFriendlyReservationCode("abc123");
    // "ABC123" -> "ABC123" -> padStart(8, '0') -> "00ABC123"
    expect(code).toBe("RES-00ABC123");
  });

  it("usa apenas os últimos 8 caracteres alfanuméricos de uma string longa (ex: código customizado)", () => {
    const code = makeFriendlyReservationCode("meu-codigo-123");
    // "meu-codigo-123" -> MEUCODIGO123
    // slice(-8) => "ODIGO123"
    expect(code).toBe("RES-ODIGO123");
  });

  it("para objeto com code preenchido, usa o code", () => {
    const code = makeFriendlyReservationCode({
      id: "ignored-id",
      code: "meu-codigo-123",
    });

    // Mesma regra do teste anterior
    expect(code).toBe("RES-ODIGO123");
  });

  it("para objeto com code vazio, usa o id", () => {
    const code = makeFriendlyReservationCode({
      id: "id-xyz-9999",
      code: "",
    });

    // "id-xyz-9999" -> "IDXYZ9999"
    // slice(-8) => "DXYZ9999"
    expect(code).toBe("RES-DXYZ9999");
  });

  it("para objeto sem id nem code válidos, volta para placeholder", () => {
    const code = makeFriendlyReservationCode({
      id: "" as any,
      code: null,
    });

    expect(code).toBe("RES-????????");
  });
});
