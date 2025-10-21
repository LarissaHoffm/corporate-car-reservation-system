import axios, { AxiosError } from "axios";

const baseURL =
  (import.meta as any)?.env?.VITE_API_URL?.replace(/\/$/, "") || "/api";

export const api = axios.create({
  baseURL,
  withCredentials: true,
  xsrfCookieName: "csrf-token",
  xsrfHeaderName: "x-csrf-token",
});

let isRefreshing = false;
let queue: Array<() => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const { response, config } = err;
    if (!response || !config) return Promise.reject(err);
    if (response.status === 401 && !(config as any).__isRetry) {
      (config as any).__isRetry = true;
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          await api.post("/auth/refresh");
          queue.forEach((cb) => cb());
          queue = [];
        } catch (e) {
          queue.forEach((cb) => cb());
          queue = [];
          return Promise.reject(err);
        } finally {
          isRefreshing = false;
        }
      }
      return new Promise((resolve) => queue.push(() => resolve(api(config))));
    }
    return Promise.reject(err);
  }
);
