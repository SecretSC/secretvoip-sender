import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader, StatCard, StatusBadge } from "@/components/ui-kit";
import { api } from "@/lib/api";
import { Users, Send, CheckCircle2, XCircle, Map, Activity } from "lucide-react";

export default function AdminOverview() {
  const [s, setS] = useState<any>(null);
  useEffect(() => { api.stats().then(setS); }, []);
  return (
    <DashboardLayout kind="admin">
      <PageHeader title="Platform overview" subtitle="Real-time view of customers, traffic and route health." />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Customers" value={s?.customers ?? "—"} icon={<Users className="w-5 h-5" />} accent="accent" />
        <StatCard label="Total SMS" value={s?.total_sms ?? "—"} icon={<Send className="w-5 h-5" />} accent="primary" />
        <StatCard label="Delivered" value={s?.delivered ?? "—"} icon={<CheckCircle2 className="w-5 h-5" />} accent="success" />
        <StatCard label="Failed" value={s?.failed ?? "—"} icon={<XCircle className="w-5 h-5" />} accent="destructive" />
        <StatCard label="Routes" value={s?.routes ?? "—"} icon={<Map className="w-5 h-5" />} accent="accent" />
      </div>

      <div className="ring-gradient glass rounded-2xl p-5 mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-secondary-glow" />
          <div className="font-display">Recent activity</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground uppercase tracking-wider">
              <tr><th className="text-left py-2 px-2">Date</th><th className="text-left py-2 px-2">Recipient</th><th className="text-left py-2 px-2">Direction</th><th className="text-left py-2 px-2">Status</th><th className="text-right py-2 px-2">Cost</th></tr>
            </thead>
            <tbody>
              {(s?.recent || []).map((r: any) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="py-2 px-2 text-xs whitespace-nowrap">{r.date}</td>
                  <td className="py-2 px-2 font-mono text-xs">{r.recipient}</td>
                  <td className="py-2 px-2 text-xs text-muted-foreground">{r.direction}</td>
                  <td className="py-2 px-2"><StatusBadge status={r.status} /></td>
                  <td className="py-2 px-2 text-right">{r.cost?.toFixed(3)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
