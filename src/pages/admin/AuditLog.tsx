import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader, EmptyState } from "@/components/ui-kit";
import { api } from "@/lib/api";
import { ScrollText } from "lucide-react";

export default function AuditLog() {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => { api.auditLog().then((r: any) => setList(r)); }, []);
  return (
    <DashboardLayout kind="admin">
      <PageHeader title="Audit log" subtitle="Immutable record of sensitive platform actions." />
      <div className="ring-gradient glass rounded-2xl p-2">
        {list.length === 0 ? <EmptyState title="No audit entries yet" /> : (
          <ul className="divide-y divide-border/60">
            {list.map((e) => (
              <li key={e.id} className="flex items-start gap-3 p-3">
                <div className="w-8 h-8 rounded-lg bg-muted/40 grid place-items-center"><ScrollText className="w-4 h-4 text-muted-foreground" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{e.action}</span>
                    <span className="text-xs text-muted-foreground">by {e.actor}</span>
                    <span className="text-xs text-muted-foreground">· target: {e.target}</span>
                  </div>
                  {e.meta && <div className="text-xs text-muted-foreground mt-0.5">{e.meta}</div>}
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">{new Date(e.at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
}
