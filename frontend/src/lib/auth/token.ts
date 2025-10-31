// frontend/src/lib/auth/token.ts

let _accessToken: string | null = null;
let _expiresAtMs: number | null = null;
let _refreshTimer: ReturnType<typeof setTimeout> | null = null;

const listeners = new Set<() => void>();

function decodeJwtExp(token: string): number | null {
  try {
    const [, payloadB64] = token.split(".");
    if (!payloadB64) return null;
    const b64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(b64);
    const payload = JSON.parse(json);
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return _accessToken;
}

export function setAccessToken(token: string | null) {
  _accessToken = token;
  const exp = token ? decodeJwtExp(token) : null;
  _expiresAtMs = exp ? exp * 1000 : null;

  if (_refreshTimer) clearTimeout(_refreshTimer);
  _refreshTimer = null;

  listeners.forEach((cb) => cb());
}

/**
 * Agenda uma renovação proativa do access token
 * @param refreshFn função que chama /auth/refresh e atualiza o access token
 * @param skewSeconds antecedência em segundos (padrão 60s antes de expirar)
 */
export function schedulePreemptiveRefresh(
  refreshFn: () => Promise<void>,
  skewSeconds: number = 60
) {
  if (!_accessToken || !_expiresAtMs) return;

  const now = Date.now();
  const fireAt = _expiresAtMs - skewSeconds * 1000;
  const delay = Math.max(5_000, fireAt - now);

  if (_refreshTimer) clearTimeout(_refreshTimer);
  _refreshTimer = setTimeout(async () => {
    _refreshTimer = null;
    try {
      await refreshFn();
    } catch {
      // silencioso; se falhar, o interceptor 401 cobre
    } finally {
      if (_accessToken) {
        schedulePreemptiveRefresh(refreshFn, skewSeconds);
      }
    }
  }, delay);
}

export function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function clearAccessToken() {
  setAccessToken(null);
}

/** 🔧 Alias de compatibilidade para código legado que importa `clearToken` */
export function clearToken() {
  clearAccessToken();
}
