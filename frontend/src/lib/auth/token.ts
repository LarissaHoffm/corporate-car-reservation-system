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

function notify() { listeners.forEach((cb) => cb()); }

export function setAccessToken(token: string | null) {
  _accessToken = token;
  if (_refreshTimer) clearTimeout(_refreshTimer);
  _refreshTimer = null;

  if (token) {
    const expSec = decodeJwtExp(token);
    _expiresAtMs = expSec ? expSec * 1000 : null;
  } else {
    _expiresAtMs = null;
  }
  notify();
}

export function getAccessToken() { return _accessToken; }
export function getExpiresAtMs() { return _expiresAtMs; }

export function isTokenExpired(skewSeconds = 0) {
  if (!_accessToken || !_expiresAtMs) return true;
  return Date.now() >= _expiresAtMs - skewSeconds * 1000;
}

export function schedulePreemptiveRefresh(refreshFn: () => Promise<void>, skewSeconds = 30) {
  if (!_expiresAtMs) return;
  const delay = Math.max(_expiresAtMs - skewSeconds * 1000 - Date.now(), 0);
  if (_refreshTimer) clearTimeout(_refreshTimer);
  _refreshTimer = setTimeout(async () => {
    _refreshTimer = null;
    try { await refreshFn(); } catch { /* silencioso */ }
  }, delay);
}

export function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function clearToken() { setAccessToken(null); }
