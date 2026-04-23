import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "@/lib/api";

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  name: string;
  role: "admin" | "customer";
  status: "active" | "suspended";
  mustChangePassword?: boolean;
};

type AuthCtx = {
  user: AuthUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  changePassword: (current: string, next: string) => Promise<void>;
  refresh: () => void;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("svp_me");
      if (raw) setUser(JSON.parse(raw));
    } catch {}
    setLoading(false);
  }, []);

  const login = async (identifier: string, password: string) => {
    const res: any = await api.login(identifier, password);
    const u: AuthUser = {
      id: res.user.id,
      email: res.user.email,
      username: res.user.username,
      name: res.user.name,
      role: res.user.role,
      status: res.user.status,
      mustChangePassword: res.mustChangePassword,
    };
    localStorage.setItem("svp_me", JSON.stringify(u));
    localStorage.setItem("svp_token", res.token);
    setUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem("svp_me");
    localStorage.removeItem("svp_token");
    setUser(null);
  };

  const changePassword = async (current: string, next: string) => {
    await api.changePassword(current, next);
    if (user) {
      const updated = { ...user, mustChangePassword: false };
      setUser(updated);
      localStorage.setItem("svp_me", JSON.stringify(updated));
    }
  };

  const refresh = () => {
    try {
      const raw = localStorage.getItem("svp_me");
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  };

  return <Ctx.Provider value={{ user, loading, login, logout, changePassword, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be inside AuthProvider");
  return v;
}
