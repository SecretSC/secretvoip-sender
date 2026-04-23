import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  actions,
}: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label, value, hint, icon, accent = "primary",
}: {
  label: string; value: ReactNode; hint?: string;
  icon?: ReactNode; accent?: "primary" | "accent" | "success" | "warning" | "destructive";
}) {
  const accentMap = {
    primary: "from-primary/30 to-primary/0 text-primary-glow",
    accent: "from-secondary/30 to-secondary/0 text-secondary-glow",
    success: "from-success/30 to-success/0 text-success",
    warning: "from-warning/30 to-warning/0 text-warning",
    destructive: "from-destructive/30 to-destructive/0 text-destructive",
  } as const;
  return (
    <div className="ring-gradient relative glass rounded-2xl p-5 shadow-card overflow-hidden">
      <div className={cn("absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl bg-gradient-to-br", accentMap[accent])} />
      <div className="flex items-start justify-between relative">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
          <div className="font-display text-3xl font-semibold mt-2">{value}</div>
          {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
        </div>
        {icon && <div className={cn("w-10 h-10 rounded-xl grid place-items-center bg-muted/40", accentMap[accent].split(" ").pop())}>{icon}</div>}
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    delivered: "bg-success/15 text-success border-success/30",
    sent: "bg-secondary/15 text-secondary-glow border-secondary/30",
    failed: "bg-destructive/15 text-destructive border-destructive/30",
    pending: "bg-warning/15 text-warning border-warning/30",
    active: "bg-success/15 text-success border-success/30",
    suspended: "bg-destructive/15 text-destructive border-destructive/30",
    partial: "bg-warning/15 text-warning border-warning/30",
    tested: "bg-secondary/15 text-secondary-glow border-secondary/30",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium capitalize", map[status] || "bg-muted text-foreground border-border")}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-border/60 bg-card/40">
      <div className="font-display text-lg">{title}</div>
      {description && <div className="text-sm text-muted-foreground mt-1">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
