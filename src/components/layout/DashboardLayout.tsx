import { ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard, Send, Radar, Map, FileText, ScrollText, Settings, Users,
  LogOut, ShieldCheck, User as UserIcon, Zap, HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { to: string; label: string; icon: React.ComponentType<any> };

const adminItems: Item[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/routes", label: "Routes & Rates", icon: Map },
  { to: "/admin/logs", label: "SMS Logs", icon: FileText },
  { to: "/admin/audit", label: "Audit Log", icon: ScrollText },
  { to: "/admin/help", label: "Help & Guide", icon: HelpCircle },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];
const customerItems: Item[] = [
  { to: "/app", label: "Overview", icon: LayoutDashboard },
  { to: "/app/send", label: "Send SMS", icon: Send },
  { to: "/app/tester", label: "Route Tester", icon: Radar },
  { to: "/app/routes", label: "Routes & Rates", icon: Map },
  { to: "/app/logs", label: "SMS Logs", icon: FileText },
  { to: "/app/help", label: "Help & Guide", icon: HelpCircle },
  { to: "/app/profile", label: "Profile", icon: UserIcon },
];

export default function DashboardLayout({ children, kind }: { children: ReactNode; kind: "admin" | "customer" }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const items = kind === "admin" ? adminItems : customerItems;

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="px-5 py-5 flex items-center gap-2 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-lg bg-gradient-primary grid place-items-center shadow-glow-primary">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display font-semibold text-foreground">SecretVoIP</div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">SMS Platform</div>
          </div>
        </div>

        <div className="px-3 py-2 mt-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 mb-2">
            {kind === "admin" ? "Administration" : "Workspace"}
          </div>
          <nav className="flex flex-col gap-1">
            {items.map((it) => {
              const active = location.pathname === it.to || (it.to !== "/admin" && it.to !== "/app" && location.pathname.startsWith(it.to));
              const Icon = it.icon;
              return (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.to === "/admin" || it.to === "/app"}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-smooth",
                    active
                      ? "bg-sidebar-accent text-foreground shadow-card relative"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                  )}
                >
                  {active && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-gradient-primary" />}
                  <Icon className={cn("w-4 h-4", active ? "text-primary-glow" : "text-muted-foreground group-hover:text-foreground")} />
                  <span>{it.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-3 border-t border-sidebar-border">
          <div className="glass rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-accent grid place-items-center text-secondary-foreground font-semibold text-sm">
              {user?.name?.[0] || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{user?.name}</div>
              <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                {user?.role === "admin" ? <ShieldCheck className="w-3 h-3 text-primary-glow" /> : null}
                {user?.role === "admin" ? "Super Admin" : "Customer"}
              </div>
            </div>
            <button onClick={handleLogout} className="text-muted-foreground hover:text-destructive transition-smooth" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary grid place-items-center"><Zap className="w-4 h-4 text-primary-foreground" /></div>
            <span className="font-display font-semibold">SecretVoIP SMS</span>
          </div>
          <button onClick={handleLogout} className="text-muted-foreground"><LogOut className="w-5 h-5" /></button>
        </header>

        <div className="p-4 md:p-8 animate-fade-in">{children}</div>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 glass-strong border-t border-border flex justify-around py-2">
          {items.slice(0, 5).map((it) => {
            const active = location.pathname === it.to;
            const Icon = it.icon;
            return (
              <NavLink key={it.to} to={it.to} end className={cn("flex flex-col items-center gap-1 text-[10px] px-2 py-1 rounded-md", active ? "text-primary-glow" : "text-muted-foreground")}>
                <Icon className="w-5 h-5" />
                {it.label}
              </NavLink>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
