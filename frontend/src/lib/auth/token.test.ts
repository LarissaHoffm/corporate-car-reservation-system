import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

function makeTokenWithExp(secondsFromNow: number): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = { exp: nowSec + secondsFromNow };
  const b64 = Buffer.from(JSON.stringify(payload))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `header.${b64}.sig`;
}

describe("auth/token helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("setAccessToken armazena o token e notifica subscribers", async () => {
    const mod = await import("./token");
    const { getAccessToken, setAccessToken, subscribe } = mod;

    const cb = vi.fn();
    const unsubscribe = subscribe(cb);

    expect(getAccessToken()).toBeNull();

    setAccessToken("meu-token");
    expect(getAccessToken()).toBe("meu-token");
    expect(cb).toHaveBeenCalledTimes(1);

    // depois de desinscrever, não deve mais notificar
    unsubscribe();
    setAccessToken("outro-token");
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("clearToken limpa o token armazenado", async () => {
    const mod = await import("./token");
    const { getAccessToken, setAccessToken, clearToken } = mod;

    setAccessToken("abc");
    expect(getAccessToken()).toBe("abc");

    clearToken();
    expect(getAccessToken()).toBeNull();
  });

  it("schedulePreemptiveRefresh não faz nada se não houver token", async () => {
    const mod = await import("./token");
    const { schedulePreemptiveRefresh, clearToken } = mod;

    const refreshFn = vi.fn().mockResolvedValue(undefined);

    clearToken();
    schedulePreemptiveRefresh(refreshFn, 1);

    vi.runAllTimers();
    expect(refreshFn).not.toHaveBeenCalled();
  });

  it("schedulePreemptiveRefresh agenda o refresh antes do exp e reusa enquanto houver token", async () => {
    const mod = await import("./token");
    const { setAccessToken, schedulePreemptiveRefresh, clearToken } = mod;

    const token = makeTokenWithExp(120); // expira em ~2min
    const refreshFn = vi.fn().mockResolvedValue(undefined);

    setAccessToken(token);
    schedulePreemptiveRefresh(refreshFn, 60);

    // dispara o timer agendado
    await vi.runOnlyPendingTimersAsync();

    expect(refreshFn).toHaveBeenCalledTimes(1);

    // limpa pra não ficar re-agendando indefinidamente
    clearToken();
  });
});
