import axios, { AxiosError } from "axios";
import type { ApiErrorBody } from "./types";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 20000,
});

// The auth store registers callbacks here to avoid a circular import
// (store -> client -> store). main/store wires these on init.
let tokenGetter: () => string | null = () => null;
let onUnauthorized: () => void = () => {};

export function configureApiAuth(opts: {
  getToken: () => string | null;
  onUnauthorized: () => void;
}) {
  tokenGetter = opts.getToken;
  onUnauthorized = opts.onUnauthorized;
}

// Attach the bearer token to every request.
api.interceptors.request.use((config) => {
  const token = tokenGetter();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear the session and bounce to login (handled by the store callback).
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      onUnauthorized();
    }
    return Promise.reject(error);
  },
);

/**
 * Turn any API/network error into a clear, plain-language message suitable to
 * show an elderly user. Never surfaces raw status codes or stack traces.
 */
export function friendlyError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<ApiErrorBody>;
    if (err.code === "ERR_NETWORK") {
      return "Can't reach the server. Check your internet connection.";
    }
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  }
  return fallback;
}
