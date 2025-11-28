import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do módulo de token usado pelo AuthAPI
vi.mock("@/lib/auth/token", () => {
  return {
    getAccessToken: vi.fn(() => null),
    setAccessToken: vi.fn(),
    clearAccessToken: vi.fn(),
  };
});

import api, { AuthAPI, ReportsAPI } from "@/lib/http/api";
import { setAccessToken, clearAccessToken } from "@/lib/auth/token";

describe("AuthAPI", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // reset de cookies entre os testes
    Object.defineProperty(document, "cookie", {
      value: "",
      writable: true,
      configurable: true,
    });
  });

  it("csrf chama GET /auth/csrf quando não há cookie de CSRF", async () => {
    const getSpy = vi.spyOn(api, "get").mockResolvedValue({} as any);

    await AuthAPI.csrf();

    expect(getSpy).toHaveBeenCalledWith("/auth/csrf");
  });

  it("login (objeto) chama /auth/csrf e /auth/login e seta accessToken", async () => {
    const getSpy = vi.spyOn(api, "get").mockResolvedValue({} as any);
    const postSpy = vi
      .spyOn(api, "post")
      .mockResolvedValue({ data: { accessToken: "token-123" } } as any);

    await AuthAPI.login({
      email: "user@test.com",
      password: "secret",
      rememberMe: true,
    });

    expect(getSpy).toHaveBeenCalledWith("/auth/csrf");
    expect(postSpy).toHaveBeenCalledWith("/auth/login", {
      email: "user@test.com",
      password: "secret",
      rememberMe: true,
    });
    expect(setAccessToken).toHaveBeenCalledWith("token-123");
  });

  it("login (string) também funciona com assinatura antiga", async () => {
    vi.spyOn(api, "get").mockResolvedValue({} as any);
    const postSpy = vi
      .spyOn(api, "post")
      .mockResolvedValue({ data: { accessToken: "abc" } } as any);

    await AuthAPI.login("legacy@test.com", "pwd-123", false);

    expect(postSpy).toHaveBeenCalledWith("/auth/login", {
      email: "legacy@test.com",
      password: "pwd-123",
      rememberMe: false,
    });
    expect(setAccessToken).toHaveBeenCalledWith("abc");
  });

  it("refresh usa cookie de CSRF e seta novo accessToken", async () => {
    // já existe cookie -> ensureCsrf NÃO deve chamar /auth/csrf
    Object.defineProperty(document, "cookie", {
      value: "rcsrftoken=csrf-xyz",
      writable: true,
      configurable: true,
    });

    const getSpy = vi.spyOn(api, "get").mockResolvedValue({} as any);
    const postSpy = vi
      .spyOn(api, "post")
      .mockResolvedValue({ data: { accessToken: "new-token" } } as any);

    await AuthAPI.refresh();

    expect(getSpy).not.toHaveBeenCalled(); // ensureCsrf pulou porque já tinha cookie
    expect(postSpy).toHaveBeenCalledTimes(1);

    const [url, body, options] = postSpy.mock.calls[0];
    expect(url).toBe("/auth/refresh");
    expect(body).toEqual({});
    expect(options?.headers?.["x-csrf-token"]).toBe("csrf-xyz");
    expect(setAccessToken).toHaveBeenCalledWith("new-token");
  });

  it("logout envia CSRF header e sempre limpa o accessToken", async () => {
    Object.defineProperty(document, "cookie", {
      value: "rcsrftoken=logout-csrf",
      writable: true,
      configurable: true,
    });

    const getSpy = vi.spyOn(api, "get").mockResolvedValue({} as any);
    const postSpy = vi.spyOn(api, "post").mockResolvedValue({} as any);

    await AuthAPI.logout();

    // ensureCsrf não chama /auth/csrf pois já tem cookie
    expect(getSpy).not.toHaveBeenCalled();

    expect(postSpy).toHaveBeenCalledTimes(1);
    const [url, body, options] = postSpy.mock.calls[0];
    expect(url).toBe("/auth/logout");
    expect(body).toEqual({});
    expect(options?.headers?.["x-csrf-token"]).toBe("logout-csrf");

    expect(clearAccessToken).toHaveBeenCalledTimes(1);
  });

  it("changePassword chama /auth/change-password e atualiza accessToken", async () => {
    const postSpy = vi.spyOn(api, "post").mockResolvedValue({
      data: {
        accessToken: "pwd-token",
        user: { id: "u1", name: "User", email: "user@test.com" },
      },
    } as any);

    await AuthAPI.changePassword("old", "new-strong-pwd");

    expect(postSpy).toHaveBeenCalledWith(
      "/auth/change-password",
      { currentPassword: "old", newPassword: "new-strong-pwd" },
    );
    expect(setAccessToken).toHaveBeenCalledWith("pwd-token");
  });
});

describe("ReportsAPI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getReservationsReport chama /reports/reservations com params", async () => {
    const getSpy = vi
      .spyOn(api, "get")
      .mockResolvedValue({ data: { total: 0, items: [], summary: null } } as any);

    const params = { status: "APPROVED", branchId: "b1", skip: 0, take: 10 };
    await ReportsAPI.getReservationsReport(params);

    expect(getSpy).toHaveBeenCalledWith("/reports/reservations", {
      params,
    });
  });

  it("getMyReservationsReport ignora userId no params e chama /reports/my-reservations", async () => {
    const getSpy = vi
      .spyOn(api, "get")
      .mockResolvedValue({ data: { total: 0, items: [], summary: null } } as any);

    await ReportsAPI.getMyReservationsReport({
      userId: "u1",
      status: "PENDING",
      carId: "c1",
    });

    expect(getSpy).toHaveBeenCalledTimes(1);
    const [url, options] = getSpy.mock.calls[0];

    expect(url).toBe("/reports/my-reservations");
    expect(options.params).toEqual({
      status: "PENDING",
      carId: "c1",
    }); // sem userId
  });
});
