// In-browser mock layer used by the Lovable preview.
// On the self-hosted Debian server, set VITE_USE_MOCK=false so api.ts hits the
// real Express backend instead.

import { GAMMA_COUNTRIES, ROUTE_CATALOG } from "./routes";

type User = {
  id: string;
  email: string;
  username: string;
  name: string;
  role: "admin" | "customer";
  status: "active" | "suspended";
  createdAt: string;
  mustChangePassword?: boolean;
  password: string; // mock only
};

const STORAGE = {
  users: "svp_users",
  logs: "svp_logs",
  audit: "svp_audit",
  me: "svp_me",
  wallets: "svp_wallets",        // { [userId]: number }
  walletTx: "svp_wallet_tx",     // { [userId]: Tx[] }
};

// Bump this whenever we want to wipe stale demo data from existing browsers.
const SEED_VERSION = "3";
const SEED_VERSION_KEY = "svp_seed_version";

type WalletTx = {
  id: string;
  at: string;
  amount_eur: number;
  type: "topup" | "adjustment" | "charge" | "refund";
  note?: string;
  created_by?: string;
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid() { return Math.random().toString(36).slice(2, 10); }
function now() { return new Date().toISOString(); }
function fmt(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ----- Seeding -----
function seed() {
  // Force a clean slate when SEED_VERSION changes (wipes any old demo logs/audit).
  const currentVersion = localStorage.getItem(SEED_VERSION_KEY);
  if (currentVersion !== SEED_VERSION) {
    localStorage.removeItem(STORAGE.logs);
    localStorage.removeItem(STORAGE.audit);
    localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
  }

  let users = read<User[]>(STORAGE.users, []);
  if (users.length === 0) {
    users = [
      {
        id: "u_admin",
        email: "admin@secretvoip.com",
        username: "admin",
        name: "Super Admin",
        role: "admin",
        status: "active",
        createdAt: now(),
        mustChangePassword: true,
        password: "ChangeMe!2026",
      },
      {
        id: "u_demo",
        email: "demo@secretvoip.com",
        username: "demo",
        name: "Demo Customer",
        role: "customer",
        status: "active",
        createdAt: now(),
        password: "demo1234",
      },
    ];
    write(STORAGE.users, users);
  }

  // Start with empty logs and empty audit log — no fake activity.
  if (!localStorage.getItem(STORAGE.logs)) write(STORAGE.logs, []);
  if (!localStorage.getItem(STORAGE.audit)) write(STORAGE.audit, []);
}
seed();

function audit(actor: string, action: string, target: string, meta = "") {
  const list = read<any[]>(STORAGE.audit, []);
  list.unshift({ id: uid(), at: now(), actor, action, target, meta });
  write(STORAGE.audit, list.slice(0, 500));
}

function me(): User | null {
  return read<User | null>(STORAGE.me, null);
}

function delay<T>(v: T, ms = 250): Promise<T> {
  return new Promise((r) => setTimeout(() => r(v), ms));
}

export const mockApi = {
  // ---- Auth ----
  async login(identifier: string, password: string) {
    const users = read<User[]>(STORAGE.users, []);
    const u = users.find(
      (x) => (x.email.toLowerCase() === identifier.toLowerCase() || x.username.toLowerCase() === identifier.toLowerCase()) && x.password === password
    );
    if (!u) throw new Error("Invalid credentials");
    if (u.status === "suspended") throw new Error("Account suspended. Contact your administrator.");
    const token = `mock.${u.id}.${Date.now()}`;
    localStorage.setItem("svp_token", token);
    write(STORAGE.me, u);
    audit(u.email, "auth.login", u.id);
    return delay({ token, user: { ...u, password: undefined }, mustChangePassword: !!u.mustChangePassword });
  },

  async changePassword(_current: string, next: string) {
    const m = me();
    if (!m) throw new Error("Not authenticated");
    const users = read<User[]>(STORAGE.users, []);
    const updated = users.map((u) => (u.id === m.id ? { ...u, password: next, mustChangePassword: false } : u));
    write(STORAGE.users, updated);
    write(STORAGE.me, { ...m, password: next, mustChangePassword: false });
    audit(m.email, "auth.password_changed", m.id);
    return delay({ ok: true as const });
  },

  async forgot(email: string) {
    audit(email, "auth.password_reset_requested", email);
    return delay({ ok: true as const });
  },

  // ---- SMS ----
  async sendSms(payload: any) {
    const m = me();
    const recipients: string[] = Array.isArray(payload.to) ? payload.to : [payload.to];
    const segments = Math.max(1, Math.ceil((payload.message?.length || 1) / 160));
    const perCost = 0.014;
    const total_cost = +(recipients.length * segments * perCost).toFixed(3);
    const messages = recipients.map((r, i) => ({
      id: 9000 + Math.floor(Math.random() * 9999),
      recipient: r,
      status: Math.random() > 0.05 ? "sent" : "failed",
    }));
    const failed = messages.filter((x) => x.status === "failed").length;

    // store in logs
    const logs = read<any[]>(STORAGE.logs, []);
    messages.forEach((mm) => {
      logs.unshift({
        id: mm.id,
        date: fmt(),
        recipient: mm.recipient,
        sender_id: payload.sender_id || "SecretVoIP",
        segments,
        cost: +(perCost * segments).toFixed(3),
        status: mm.status === "sent" ? (Math.random() > 0.1 ? "delivered" : "sent") : "failed",
        message: payload.message,
        direction: "Auto-routed",
        customer_id: m?.id || "u_demo",
      });
    });
    write(STORAGE.logs, logs.slice(0, 1000));
    if (m) audit(m.email, "sms.send", `${recipients.length} recipients`, `route=${payload.route_option_id || "auto"}`);

    return delay({
      status: failed === 0 ? "sent" : failed === recipients.length ? "failed" : "partial",
      sent: recipients.length - failed,
      failed,
      segments,
      total_cost,
      wallet_balance: 19.986,
      messages,
    });
  },

  async testRoutes(payload: any) {
    const tested: string[] = payload.test_all_routes
      ? ROUTE_CATALOG.map((r) => r.option_id)
      : payload.test_routes || [];
    const m = me();
    if (m) audit(m.email, "sms.route_test", payload.to, `routes=${tested.join(",")}`);
    return delay({
      status: "tested",
      results: tested.map((r) => ({
        route: r,
        status: Math.random() > 0.15 ? "delivered" : Math.random() > 0.5 ? "sent" : "failed",
        latency_ms: 200 + Math.floor(Math.random() * 1500),
        cost: +(0.01 + Math.random() * 0.05).toFixed(3),
      })),
    });
  },

  async routes(_expandGamma = true) {
    return delay({
      routes: ROUTE_CATALOG,
      gamma_by_country: GAMMA_COUNTRIES,
      gamma_options: GAMMA_COUNTRIES.flatMap((c) => c.channels.map((ch) => ({ ...ch, country: c.country, dial: c.dial }))),
      usage: { sent_today: 124, balance: 19.986 },
    });
  },

  async logs(params: any) {
    const m = me();
    let list = read<any[]>(STORAGE.logs, []);
    if (m && m.role === "customer") list = list.filter((x) => x.customer_id === m.id);
    if (params.customer_id) list = list.filter((x) => x.customer_id === params.customer_id);
    if (params.search) list = list.filter((x) => x.recipient.includes(params.search));
    if (params.status && params.status !== "all") list = list.filter((x) => x.status === params.status);
    if (params.from) list = list.filter((x) => x.date >= params.from);
    if (params.to) list = list.filter((x) => x.date <= params.to + " 23:59:59");
    const page = +params.page || 1;
    const limit = +params.limit || 10;
    const start = (page - 1) * limit;
    const data = list.slice(start, start + limit);
    return delay({ data, page, limit, has_more: start + limit < list.length, total: list.length });
  },

  // ---- Admin ----
  async customers() {
    const users = read<User[]>(STORAGE.users, []);
    const wallets = read<Record<string, number>>(STORAGE.wallets, {});
    return delay(
      users
        .filter((u) => u.role === "customer")
        .map((u) => ({ ...u, password: undefined, balance_eur: wallets[u.id] ?? 0 }))
    );
  },

  // ---- Wallet / manual top-up ----
  async customerWallet(id: string) {
    const wallets = read<Record<string, number>>(STORAGE.wallets, {});
    const tx = read<Record<string, WalletTx[]>>(STORAGE.walletTx, {});
    return delay({ balance_eur: wallets[id] ?? 0, transactions: tx[id] ?? [] });
  },
  async topUpCustomer(id: string, amount_eur: number, note?: string, type: WalletTx["type"] = "topup") {
    const wallets = read<Record<string, number>>(STORAGE.wallets, {});
    const tx = read<Record<string, WalletTx[]>>(STORAGE.walletTx, {});
    const m = me();
    const next = +(((wallets[id] ?? 0) + amount_eur).toFixed(4));
    wallets[id] = next;
    const list = tx[id] ?? [];
    list.unshift({ id: uid(), at: now(), amount_eur, type, note, created_by: m?.email });
    tx[id] = list.slice(0, 100);
    write(STORAGE.wallets, wallets);
    write(STORAGE.walletTx, tx);
    audit(m?.email || "system", "wallet.topup", id, JSON.stringify({ amount: amount_eur, type, note }));
    return delay({ ok: true, balance_eur: next });
  },
  async myWallet() {
    const m = me();
    if (!m) return { balance_eur: 0, transactions: [] };
    const wallets = read<Record<string, number>>(STORAGE.wallets, {});
    const tx = read<Record<string, WalletTx[]>>(STORAGE.walletTx, {});
    return delay({ balance_eur: wallets[m.id] ?? 0, transactions: tx[m.id] ?? [] });
  },
  async createCustomer(payload: { name: string; email: string; username: string; password: string; mustChangePassword?: boolean }) {
    const users = read<User[]>(STORAGE.users, []);
    if (users.some((u) => u.email.toLowerCase() === payload.email.toLowerCase()))
      throw new Error("Email already exists");
    const u: User = {
      id: "u_" + uid(),
      email: payload.email,
      username: payload.username,
      name: payload.name,
      role: "customer",
      status: "active",
      createdAt: now(),
      mustChangePassword: !!payload.mustChangePassword,
      password: payload.password,
    };
    write(STORAGE.users, [...users, u]);
    const m = me();
    audit(m?.email || "system", "user.create", u.id, u.email);
    return delay({ ...u, password: undefined });
  },
  async updateCustomer(id: string, patch: any) {
    const users = read<User[]>(STORAGE.users, []);
    const updated = users.map((u) => (u.id === id ? { ...u, ...patch } : u));
    write(STORAGE.users, updated);
    const m = me();
    audit(m?.email || "system", "user.update", id, JSON.stringify(patch));
    return delay({ ok: true });
  },
  async deleteCustomer(id: string) {
    const users = read<User[]>(STORAGE.users, []);
    write(STORAGE.users, users.filter((u) => u.id !== id));
    const m = me();
    audit(m?.email || "system", "user.delete", id);
    return delay({ ok: true });
  },
  async resetCustomerPassword(id: string) {
    const newPass = "Tmp" + Math.random().toString(36).slice(2, 8) + "!";
    const users = read<User[]>(STORAGE.users, []);
    write(STORAGE.users, users.map((u) => (u.id === id ? { ...u, password: newPass, mustChangePassword: true } : u)));
    const m = me();
    audit(m?.email || "system", "user.password_reset", id);
    return delay({ tempPassword: newPass });
  },

  async auditLog() {
    return delay(read<any[]>(STORAGE.audit, []));
  },

  async stats() {
    const users = read<User[]>(STORAGE.users, []);
    const logs = read<any[]>(STORAGE.logs, []);
    return delay({
      customers: users.filter((u) => u.role === "customer").length,
      total_sms: logs.length,
      delivered: logs.filter((l) => l.status === "delivered").length,
      failed: logs.filter((l) => l.status === "failed").length,
      routes: ROUTE_CATALOG.length,
      recent: logs.slice(0, 6),
    });
  },
  async customerStats() {
    const m = me();
    const logs = read<any[]>(STORAGE.logs, []).filter((l) => !m || l.customer_id === m.id);
    const wallets = read<Record<string, number>>(STORAGE.wallets, {});
    return delay({
      sent: logs.length,
      delivered: logs.filter((l) => l.status === "delivered").length,
      failed: logs.filter((l) => l.status === "failed").length,
      routes: ROUTE_CATALOG.length,
      recent: logs.slice(0, 6),
      balance_eur: m ? wallets[m.id] ?? 0 : 0,
    });
  },
};
