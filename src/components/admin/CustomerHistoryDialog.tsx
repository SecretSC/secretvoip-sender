import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatusBadge, EmptyState } from "@/components/ui-kit";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Download, RefreshCw } from "lucide-react";

const num = (v: any) => Number.isFinite(Number(v)) ? Number(v) : 0;

export default function CustomerHistoryDialog({
  customer, open, onOpenChange,
}: {
  customer: { id: string; name?: string; email?: string } | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    from: "", to: "", status: "all", recipient: "", sender_id: "",
  });
  const [detail, setDetail] = useState<any | null>(null);

  const load = async () => {
    if (!customer) return;
    setLoading(true);
    try {
      const params: any = {};
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.status !== "all") params.status = filters.status;
      if (filters.recipient) params.recipient = filters.recipient;
      if (filters.sender_id) params.sender_id = filters.sender_id;
      const r: any = await api.customerHistory(customer.id, params);
      setRows(r.data || []);
      setSummary(r.summary || null);
    } catch (e: any) {
      toast.error(e.message || "Failed to load");
    } finally { setLoading(false); }
  };

  useEffect(() => { if (open && customer) load(); /* eslint-disable-next-line */ }, [open, customer?.id]);

  const exportCsv = async () => {
    if (!customer) return;
    try {
      const blob: any = await api.exportCustomerHistory(customer.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `customer-${customer.id}-history.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-border max-w-5xl">
        <DialogHeader>
          <DialogTitle>SMS history — {customer?.name || customer?.email}</DialogTitle>
          <DialogDescription>Read-only view of all SMS, route tests and bulk sends for this customer.</DialogDescription>
        </DialogHeader>

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-2 text-center text-xs">
            <Stat label="Total" v={summary.total} />
            <Stat label="Sent" v={summary.sent} />
            <Stat label="Delivered" v={summary.delivered} />
            <Stat label="Failed" v={summary.failed} danger />
            <Stat label="Charged" v={`${num(summary.charged_total).toFixed(2)} €`} />
            <Stat label="Provider" v={`${num(summary.provider_total).toFixed(2)} €`} />
            <Stat label="Margin" v={`${num(summary.margin_total).toFixed(2)} €`} good />
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-2">
          <div><Label className="text-xs">From</Label><Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} /></div>
          <div><Label className="text-xs">To</Label><Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} /></div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Recipient</Label><Input value={filters.recipient} onChange={(e) => setFilters({ ...filters, recipient: e.target.value })} /></div>
          <div><Label className="text-xs">Sender ID</Label><Input value={filters.sender_id} onChange={(e) => setFilters({ ...filters, sender_id: e.target.value })} /></div>
          <div className="flex items-end gap-2">
            <Button variant="hero" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Apply
            </Button>
            <Button variant="soft" size="sm" onClick={exportCsv}><Download className="w-4 h-4" /> CSV</Button>
          </div>
        </div>

        <div className="max-h-[55vh] overflow-auto rounded-xl border border-border">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase tracking-widest text-muted-foreground bg-card/60 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2">When</th>
                <th className="text-left px-3 py-2">Recipient</th>
                <th className="text-left px-3 py-2">Sender</th>
                <th className="text-left px-3 py-2">Route</th>
                <th className="text-right px-3 py-2">Seg</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Provider €</th>
                <th className="text-right px-3 py-2">Charged €</th>
                <th className="text-right px-3 py-2">Margin €</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border/50 hover:bg-card/40 cursor-pointer" onClick={() => setDetail(r)}>
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono">{r.recipient}</td>
                  <td className="px-3 py-2">{r.sender_id || "—"}</td>
                  <td className="px-3 py-2">{r.direction || "—"}</td>
                  <td className="px-3 py-2 text-right">{r.segments}</td>
                  <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                  <td className="px-3 py-2 text-right font-mono">{num(r.provider_cost).toFixed(4)}</td>
                  <td className="px-3 py-2 text-right font-mono text-secondary-glow">{num(r.customer_cost ?? r.cost).toFixed(4)}</td>
                  <td className="px-3 py-2 text-right font-mono">{num(r.margin).toFixed(4)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={9}><EmptyState title="No messages found" description="Try adjusting filters." /></td></tr>
              )}
            </tbody>
          </table>
        </div>

        <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
          <DialogContent className="glass-strong border-border max-w-lg">
            <DialogHeader><DialogTitle>Message detail</DialogTitle></DialogHeader>
            {detail && (
              <div className="space-y-2 text-sm">
                <div className="text-xs text-muted-foreground">{new Date(detail.created_at).toLocaleString()}</div>
                <div><b>To:</b> <span className="font-mono">{detail.recipient}</span></div>
                <div><b>From:</b> {detail.sender_id || "—"}</div>
                <div><b>Route:</b> {detail.direction || "—"}</div>
                <div><b>Status:</b> <StatusBadge status={detail.status} /></div>
                <div><b>Segments:</b> {detail.segments}</div>
                <div className="rounded-lg border border-border bg-card/40 p-3 whitespace-pre-wrap">{detail.message || "—"}</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>Provider: <b className="font-mono">{num(detail.provider_cost).toFixed(4)} €</b></div>
                  <div>Charged: <b className="font-mono">{num(detail.customer_cost ?? detail.cost).toFixed(4)} €</b></div>
                  <div>Margin: <b className="font-mono">{num(detail.margin).toFixed(4)} €</b></div>
                </div>
                {detail.upstream_id && <div className="text-[11px] text-muted-foreground">upstream id: <span className="font-mono">{detail.upstream_id}</span></div>}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, v, danger, good }: { label: string; v: any; danger?: boolean; good?: boolean }) {
  return (
    <div className="ring-gradient glass rounded-lg p-2">
      <div className="text-[10px] uppercase text-muted-foreground tracking-widest">{label}</div>
      <div className={`font-display text-base ${danger && Number(v) > 0 ? "text-destructive" : good ? "text-secondary-glow" : ""}`}>{v}</div>
    </div>
  );
}
