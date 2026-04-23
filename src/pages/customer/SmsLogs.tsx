import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui-kit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

const num = (v: unknown, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const fmtDate = (d: any) => {
  if (!d) return "";
  try { return new Date(d).toLocaleString(); } catch { return String(d); }
};

export default function SmsLogs({ kind = "customer" }: { kind?: "customer" | "admin" }) {
  const isAdmin = kind === "admin";
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("all");
  const [data, setData] = useState<any>({ data: [], total: 0, has_more: false });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await api.logs({ page, limit, search, from, to, status });
      setData(res);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, limit]);

  return (
    <DashboardLayout kind={kind}>
      <PageHeader
        title="SMS Logs"
        subtitle={isAdmin
          ? "Every send across all customers — with provider cost, customer cost, and margin."
          : "Inspect individual sends with status, cost, and segments."}
      />

      <div className="ring-gradient glass rounded-2xl p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="lg:col-span-2">
            <Label className="text-xs">Search recipient</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. 1202" />
            </div>
          </div>
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <Button variant="hero" onClick={() => { setPage(1); load(); }}>Apply filters</Button>
        </div>
      </div>

      <div className="ring-gradient glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground uppercase tracking-wider bg-card/50">
              <tr>
                <th className="text-left py-3 px-4">ID</th>
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Recipient</th>
                <th className="text-left py-3 px-4">Sender</th>
                <th className="text-left py-3 px-4">Direction</th>
                <th className="text-left py-3 px-4">Message</th>
                <th className="text-center py-3 px-4">Seg</th>
                {isAdmin && <th className="text-right py-3 px-4">Provider</th>}
                <th className="text-right py-3 px-4">{isAdmin ? "Customer" : "Cost"}</th>
                {isAdmin && <th className="text-right py-3 px-4">Margin</th>}
                <th className="text-left py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((r: any) => {
                const customerCost = num(r.customer_cost ?? r.cost);
                const providerCost = num(r.provider_cost);
                const margin = num(r.margin, customerCost - providerCost);
                return (
                  <tr key={r.id} className="border-t border-border/50 hover:bg-card/40 transition-smooth">
                    <td className="py-2.5 px-4 text-xs text-muted-foreground">#{r.id}</td>
                    <td className="py-2.5 px-4 text-xs whitespace-nowrap">{fmtDate(r.date || r.created_at)}</td>
                    <td className="py-2.5 px-4 font-mono text-xs">{r.recipient}</td>
                    <td className="py-2.5 px-4 text-xs">{r.sender_id}</td>
                    <td className="py-2.5 px-4 text-xs text-muted-foreground">{r.direction}</td>
                    <td className="py-2.5 px-4 max-w-[280px] truncate">{r.message}</td>
                    <td className="py-2.5 px-4 text-center text-xs">{num(r.segments)}</td>
                    {isAdmin && <td className="py-2.5 px-4 text-right text-xs text-muted-foreground">{providerCost.toFixed(3)} €</td>}
                    <td className="py-2.5 px-4 text-right text-xs text-secondary-glow">{customerCost.toFixed(3)} €</td>
                    {isAdmin && <td className="py-2.5 px-4 text-right text-xs text-success">{margin.toFixed(3)} €</td>}
                    <td className="py-2.5 px-4"><StatusBadge status={r.status} /></td>
                  </tr>
                );
              })}
              {data.data.length === 0 && !loading && (
                <tr><td colSpan={isAdmin ? 11 : 9}><EmptyState title="No logs found" description="Try adjusting filters or date range." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/60">
          <div className="text-xs text-muted-foreground">Showing page {page} · {data.total ?? data.data.length} total</div>
          <div className="flex items-center gap-2">
            <Select value={String(limit)} onValueChange={(v) => { setLimit(+v); setPage(1); }}>
              <SelectTrigger className="h-8 w-[80px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="soft" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="soft" size="sm" disabled={!data.has_more} onClick={() => setPage((p) => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
