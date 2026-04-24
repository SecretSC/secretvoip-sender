// API client. In production (self-hosted), the backend lives at `${BASE}/api/*`
// (proxied by Nginx). In the Lovable preview we fall back to a local mock layer
// so the UI is fully clickable without a backend.

import { mockApi } from "./mockApi";

const BASE_PATH = (import.meta.env.VITE_APP_BASE_PATH as string | undefined) || "";
const API_BASE = `${BASE_PATH}/api`;

// In Lovable preview we never have a real backend, so always use the mock.
// On a self-hosted build, set VITE_USE_MOCK=false in .env.production.
const USE_MOCK =
  (import.meta.env.VITE_USE_MOCK as string | undefined) !== "false";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem("svp_token");
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // ---- Auth ----
  login: (identifier: string, password: string) =>
    USE_MOCK ? mockApi.login(identifier, password)
             : request<{ token: string; user: any; mustChangePassword: boolean }>("/auth/login", {
                 method: "POST", body: JSON.stringify({ identifier, password }),
               }),
  changePassword: (current: string, next: string) =>
    USE_MOCK ? mockApi.changePassword(current, next)
             : request<{ ok: true }>("/auth/change-password", {
                 method: "POST", body: JSON.stringify({ current, next }),
               }),
  forgot: (email: string) =>
    USE_MOCK ? mockApi.forgot(email)
             : request<{ ok: true }>("/auth/forgot", { method: "POST", body: JSON.stringify({ email }) }),

  // ---- SMS ----
  sendSms: (payload: any) =>
    USE_MOCK ? mockApi.sendSms(payload) : request("/sms/send", { method: "POST", body: JSON.stringify(payload) }),
  routes: (expandGamma = true) =>
    USE_MOCK ? mockApi.routes(expandGamma) : request(`/sms/available-routes${expandGamma ? "?expand=gamma" : ""}`),
  routesAdmin: (expandGamma = true) =>
    USE_MOCK ? mockApi.routes(expandGamma) : request(`/sms/available-routes?raw=1${expandGamma ? "&expand=gamma" : ""}`),
  markup: () =>
    USE_MOCK ? mockApi.markup() : request("/sms/markup"),
  testRoutes: (payload: any) =>
    USE_MOCK ? mockApi.testRoutes(payload) : request("/sms/test", { method: "POST", body: JSON.stringify(payload) }),
  logs: (params: { page?: number; limit?: number; search?: string; from?: string; to?: string; status?: string; customer_id?: string } = {}) =>
    USE_MOCK ? mockApi.logs(params) : request(`/sms/logs?${new URLSearchParams(params as any).toString()}`),

  // ---- Admin ----
  customers: () => USE_MOCK ? mockApi.customers() : request("/admin/customers"),
  createCustomer: (payload: any) =>
    USE_MOCK ? mockApi.createCustomer(payload) : request("/admin/customers", { method: "POST", body: JSON.stringify(payload) }),
  updateCustomer: (id: string, patch: any) =>
    USE_MOCK ? mockApi.updateCustomer(id, patch) : request(`/admin/customers/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteCustomer: (id: string) =>
    USE_MOCK ? mockApi.deleteCustomer(id) : request(`/admin/customers/${id}`, { method: "DELETE" }),
  resetCustomerPassword: (id: string) =>
    USE_MOCK ? mockApi.resetCustomerPassword(id) : request(`/admin/customers/${id}/reset-password`, { method: "POST" }),

  // Wallet / manual top-up
  customerWallet: (id: string) =>
    USE_MOCK ? mockApi.customerWallet(id) : request(`/admin/customers/${id}/wallet`),
  topUpCustomer: (id: string, amount_eur: number, note?: string, type: "topup" | "adjustment" | "charge" | "refund" = "topup") =>
    USE_MOCK
      ? mockApi.topUpCustomer(id, amount_eur, note, type)
      : request(`/admin/customers/${id}/topup`, { method: "POST", body: JSON.stringify({ amount_eur, note, type }) }),
  myWallet: () => USE_MOCK ? mockApi.myWallet() : request("/me/wallet"),

  auditLog: () => USE_MOCK ? mockApi.auditLog() : request("/admin/audit"),
  stats: () => USE_MOCK ? mockApi.stats() : request("/admin/stats"),
  customerStats: () => USE_MOCK ? mockApi.customerStats() : request("/me/stats"),
  diagnostics: () => USE_MOCK ? mockApi.diagnostics() : request("/sms/diagnostics"),
};
