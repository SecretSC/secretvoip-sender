import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { AlertTriangle, RefreshCw, Search, CheckCircle2, Clipboard } from "lucide-react";

type ErrRow = {
  id: string;
  customer_id?: string;
  customer_email?: string;
  source?: string;
  action?: string;
  recipient?: string;
  sender_id?: string;
  message?: string;
  route?: string;
  route_option_id?: string;
  status_code?: number;
  error_message?: string;
  safe_details?: any;
  likely_cause?: string;
  suggested_solution?: string;
  resolved?: boolean;
  admin_notes?: string;
  created_at?: string;
};

const SOURCES = ["all", "send-sms", "route-tester", "diagnostics", "frontend", "backend"];

export default function AdminErrors() {
  const [rows, setRows] = useState<ErrRow[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, unresolved: 0, last24h: 0 });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    source: "all",
    resolved: "all",
    search: "",
    from: "",
    to: "",
  });
  const [open, setOpen] = useState<ErrRow | null>(null);
  const [note, setNote] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filters.source !== "all") params.source = filters.source;
      if (filters.resolved !== "all") params.resolved = filters.resolved;
      if (filters.search) params.search = filters.search;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      const r: any = await api.errors(params);
      setRows(r.data || []);
      setStats(r.stats || { total: 0, unresolved: 0, last24h: 0 });
    } catch (e: any) {
      toast.error(e.message || "Failed to load errors");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const markResolved = async (row: ErrRow, resolved: boolean) => {
    try {
      await api.updateError(row.id, { resolved });
      toast.success(resolved ? "Marked resolved" : "Reopened");
      load();
      if (open?.id === row.id) setOpen({ ...open, resolved });
    } catch (e: any) { toast.error(e.message); }
  };

  const saveNote = async () => {
    if (!open) return;
    try {
      await api.updateError(open.id, { admin_notes: note });
      toast.success("Note saved");
      setOpen({ ...open, admin_notes: note });
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const copyDetails = (row: ErrRow) => {
    navigator.clipboard.writeText(JSON.stringify(row, null, 2));
    toast.success("Copied");
  };

  const cards = useMemo(() => ([
    { label: "Total errors", value: stats.total ?? 0 },
    { label: "Unresolved", value: stats.unresolved ?? 0, danger: true },
    { label: "Last 24h", value: stats.last24h ?? 0 },
  ]), [stats]);

  return (
    <DashboardLayout kind="admin">
      <PageHeader
        title="Errors"
        subtitle="Every customer-facing failure across the SMS system, with safe details."
        actions={
          <Button variant="soft" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {cards.map((c) => (
          <div key={c.label} className="ring-gradient glass rounded-2xl p-4">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{c.label}</div>
            <div className={`mt-1 text-2xl font-display ${c.danger && c.value > 0 ? "text-destructive" : ""}`}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="ring-gradient glass rounded-2xl p-3 mb-4 grid md:grid-cols-5 gap-2">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by message, action, recipient, customer…"
            className="pl-8"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
        </div>
        <Select value={filters.source} onValueChange={(v) => setFilters({ ...filters, source: v })}>
          <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.resolved} onValueChange={(v) => setFilters({ ...filters, resolved: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="false">Unresolved</SelectItem>
            <SelectItem value="true">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          <Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        </div>
        <div className="md:col-span-5 flex justify-end">
          <Button variant="hero" size="sm" onClick={load}>Apply filters</Button>
        </div>
      </div>

      <div className="ring-gradient glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground uppercase tracking-wider bg-card/50">
              <tr>
                <th className="text-left py-3 px-4">When</th>
                <th className="text-left py-3 px-4">Customer</th>
                <th className="text-left py-3 px-4">Source</th>
                <th className="text-left py-3 px-4">Error</th>
                <th className="text-left py-3 px-4">Route</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-t border-border/50 hover:bg-card/40 cursor-pointer" onClick={() => { setOpen(e); setNote(e.admin_notes || ""); }}>
                  <td className="py-2.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                    {e.created_at ? new Date(e.created_at).toLocaleString() : "—"}
                  </td>
                  <td className="py-2.5 px-4 text-xs">{e.customer_email || "—"}</td>
                  <td className="py-2.5 px-4 text-xs"><span className="font-mono">{e.source || "—"}</span></td>
                  <td className="py-2.5 px-4 max-w-xs truncate">{e.error_message || "—"}</td>
                  <td className="py-2.5 px-4 text-xs font-mono">{e.route_option_id || e.route || "—"}</td>
                  <td className="py-2.5 px-4">
                    {e.resolved
                      ? <StatusBadge status="resolved" />
                      : <span className="inline-flex items-center gap-1 text-destructive text-xs"><AlertTriangle className="w-3 h-3" /> open</span>}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <Button size="sm" variant="soft" onClick={(ev) => { ev.stopPropagation(); markResolved(e, !e.resolved); }}>
                      {e.resolved ? "Reopen" : "Resolve"}
                    </Button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7}><EmptyState title="No errors logged" description="When customers hit failures, they'll appear here automatically." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!open} onOpenChange={(v) => { if (!v) setOpen(null); }}>
        <DialogContent className="glass-strong border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" /> Error detail
            </DialogTitle>
          </DialogHeader>
          {open && (
            <div className="space-y-3 text-sm max-h-[60vh] overflow-auto">
              <KV k="When" v={open.created_at ? new Date(open.created_at).toLocaleString() : "—"} />
              <KV k="Customer" v={open.customer_email || open.customer_id || "—"} />
              <KV k="Source" v={open.source || "—"} />
              <KV k="Action" v={open.action || "—"} />
              <KV k="Recipient" v={open.recipient || "—"} />
              <KV k="Sender ID" v={open.sender_id || "—"} />
              <KV k="Route" v={open.route || open.route_option_id || "—"} />
              <KV k="HTTP status" v={open.status_code ?? "—"} />
              {open.message && (
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Message body</div>
                  <div className="rounded-lg border border-border bg-card/40 p-3 text-xs whitespace-pre-wrap">{open.message}</div>
                </div>
              )}
              <div>
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Error message</div>
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs whitespace-pre-wrap">{open.error_message}</div>
              </div>
              {(open.likely_cause || open.suggested_solution) && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs space-y-1">
                  {open.likely_cause && <div><b>Likely cause:</b> {open.likely_cause}</div>}
                  {open.suggested_solution && <div><b>Suggested fix:</b> {open.suggested_solution}</div>}
                </div>
              )}
              {open.safe_details && (
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Safe details (redacted)</div>
                  <pre className="rounded-lg bg-background/70 p-2 text-[11px] whitespace-pre-wrap break-words max-h-48 overflow-auto">
                    {JSON.stringify(open.safe_details, null, 2)}
                  </pre>
                </div>
              )}
              <div>
                <Label>Admin notes</Label>
                <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            {open && (
              <>
                <Button variant="soft" size="sm" onClick={() => copyDetails(open)}>
                  <Clipboard className="w-4 h-4" /> Copy details
                </Button>
                <Button variant="soft" size="sm" onClick={saveNote}>Save note</Button>
                <Button variant="hero" size="sm" onClick={() => markResolved(open, !open.resolved)}>
                  <CheckCircle2 className="w-4 h-4" /> {open.resolved ? "Reopen" : "Mark resolved"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function KV({ k, v }: { k: string; v: any }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-muted-foreground text-xs">{k}</div>
      <div className="text-sm text-right break-all">{String(v ?? "—")}</div>
    </div>
  );
}
