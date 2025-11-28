import { describe, it, expect, vi } from "vitest";

// mock do módulo de token usado pelos interceptors
vi.mock("@/lib/auth/token", () => {
  return {
    getAccessToken: vi.fn(() => "test-access-token"),
    setAccessToken: vi.fn(),
    clearAccessToken: vi.fn(),
  };
});

// importa depois do mock pra garantir que os interceptors usem o mock
import { api } from "@/lib/http/api";
import { getAccessToken } from "@/lib/auth/token";

describe("api interceptors", () => {
  it("deve anexar Authorization com Bearer <token> quando houver accessToken", async () => {
    (getAccessToken as any).mockReturnValue("abc-123");

    // pega o primeiro interceptor de request registrado
    const handler = api.interceptors.request.handlers[0]?.fulfilled;
    expect(handler).toBeInstanceOf(Function);

    const config = await handler!({ headers: {} } as any);
    const authHeader =
      (config.headers as any).Authorization ??
      (config.headers as any).authorization;

    expect(authHeader).toBe("Bearer abc-123");
  });

  it("não deve quebrar quando não houver token", async () => {
    (getAccessToken as any).mockReturnValue(null);

    const handler = api.interceptors.request.handlers[0]?.fulfilled;
    const config = await handler!({ headers: {} } as any);

    const authHeader =
      (config.headers as any).Authorization ??
      (config.headers as any).authorization;

    expect(authHeader === undefined || authHeader === null).toBe(true);
  });

  it("normaliza erro 403 usando mensagem da API e flags de permissão", async () => {
    const handler = api.interceptors.response.handlers[0]?.rejected;
    expect(handler).toBeInstanceOf(Function);

    const error: any = {
      config: { url: "/users" },
      message: "Request failed",
      response: {
        status: 403,
        data: { message: "Sem permissão para acessar este recurso" },
      },
    };

    await expect(handler!(error)).rejects.toMatchObject({
      statusCode: 403,
      userMessage: "Sem permissão para acessar este recurso",
      isForbidden: true,
      isClientError: true,
      isServerError: false,
      isNetworkError: false,
    });
  });

  it("normaliza erro de rede sem status com mensagem amigável", async () => {
    const handler = api.interceptors.response.handlers[0]?.rejected;
    expect(handler).toBeInstanceOf(Function);

    const error: any = {
      config: { url: "/users" },
      message: "Network Error",
      response: undefined,
    };

    await expect(handler!(error)).rejects.toMatchObject({
      isNetworkError: true,
      userMessage: expect.stringContaining(
        "Não foi possível conectar ao servidor",
      ),
    });
  });
});
