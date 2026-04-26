import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui-kit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROUTE_CATALOG } from "@/lib/routes";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Radar, CheckCircle2, XCircle, Activity } from "lucide-react";

const num = (v: unknown, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

type RouteResult = {
  route: string;
  status: string;
  latency_ms: number;
  cost: number;
  error?: string;
};

export default function RouteTester() {
  const [number, setNumber] = useState("");
  const [message, setMessage] = useState("Test delivery from SecretVoIP");
  const [sender, setSender] = useState("SecretVoIP");
  const [selected, setSelected] = useState<string[]>(["alpha", "beta", "epsilon"]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RouteResult[] | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => { api.templates().then((r: any) => setTemplates(r)).catch(() => {}); }, []);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const selectAll = () => setSelected(ROUTE_CATALOG.map((r) => r.option_id));
  const clearAll = () => setSelected([]);
  const loadTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setSender(t.sender_id || "");
    setMessage(t.message || "");
    toast.success("Template loaded");
  };

  const summary = useMemo(() => {
    if (!results) return null;
    const ok = results.filter((r) => /^(sent|delivered)$/i.test(r.status)).length;
    const fail = results.filter((r) => /^failed$/i.test(r.status)).length;
    const total = results.reduce((s, r) => s + num(r.cost), 0);
    const avgLat = results.length ? Math.round(results.reduce((s, r) => s + num(r.latency_ms), 0) / results.length) : 0;
    return { ok, fail, total, avgLat };
  }, [results]);

  const run = async () => {
    if (!number.trim()) return toast.error("Add a destination number");
    if (selected.length === 0) return toast.error("Pick at least one route");
    setLoading(true); setResults(null);
    setProgress({ done: 0, total: selected.length });
    try {
      const res: any = await api.testRoutes({
        to: number.trim().replace(/^\+/, ""),
        message,
        sender_id: sender,
        routes: selected,
      });
      const list: RouteResult[] = (res?.results || []).map((r: any) => ({
        route: String(r.route),
        status: String(r.status || "unknown"),
        latency_ms: num(r.latency_ms),
        cost: num(r.cost),
        error: r.error,
      }));
      setResults(list);
      setProgress({ done: list.length, total: list.length });
      toast.success(`Tested ${list.length} route${list.length === 1 ? "" : "s"}`);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const labelFor = (id: string) => {
    if (id.startsWith("epsilon-")) return `Epsilon · ${id.replace("epsilon-ttsky-", "TTSKY ")}`;
    if (id.startsWith("gamma-")) return `Gamma · ${id.replace("gamma-", "")}`;
    const r = ROUTE_CATALOG.find((x) => x.option_id === id);
    return r?.label || id;
  };

  return (
    <DashboardLayout kind="customer">
      <PageHeader
        title="Route Tester"
        subtitle="Send one real SMS per selected route to compare delivery and latency before launching a campaign."
      />

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Form */}
        <div className="lg:col-span-1 ring-gradient glass rounded-2xl p-5 space-y-4">
          <div>
            <Label>Load template</Label>
            <Select onValueChange={loadTemplate} disabled={templates.length === 0 || loading}>
              <SelectTrigger><SelectValue placeholder={templates.length ? "Choose template" : "No saved templates"} /></SelectTrigger>
              <SelectContent>{templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Destination number</Label>
            <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="e.g. 12025550123" />
          </div>
          <div>
            <Label>Sender ID</Label>
            <Input value={sender} onChange={(e) => setSender(e.target.value)} />
          </div>
          <div>
            <Label>Test message</Label>
            <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>

          <div className="rounded-xl border border-border bg-card/40 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Routes to test</span>
              <div className="flex gap-2 text-[11px]">
                <button onClick={selectAll} className="text-secondary-glow hover:underline">All</button>
                <span className="text-muted-foreground">·</span>
                <button onClick={clearAll} className="text-muted-foreground hover:underline">None</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ROUTE_CATALOG.map((r) => (
                <label key={r.option_id} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox checked={selected.includes(r.option_id)} onCheckedChange={() => toggle(r.option_id)} />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <Button variant="hero" className="w-full" onClick={run} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}
            {loading ? `Testing… ${progress.done}/${progress.total}` : "Run route test"}
          </Button>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Each test sends a real SMS through the upstream and is metered like a normal send. Pick a real
            number you control to verify delivery.
          </p>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-5">
          {/* Progress card */}
          {(loading || results) && (
            <div className="ring-gradient glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  {loading ? "Running route tests…" : "Test summary"}
                </div>
                {summary && (
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-success">✓ {summary.ok}</span>
                    <span className="text-destructive">✗ {summary.fail}</span>
                    <span className="text-muted-foreground">
                      avg <span className="text-foreground font-mono">{summary.avgLat}ms</span>
                    </span>
                    <span className="text-secondary-glow font-medium">
                      total {summary.total.toFixed(3)} €
                    </span>
                  </div>
                )}
              </div>
              <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} className="h-2" />
            </div>
          )}

          <div className="ring-gradient glass rounded-2xl p-5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Results per route</div>
            {!results ? (
              <EmptyState
                title="No tests yet"
                description="Pick the routes you want to compare and run a test. Each route sends one real SMS to your destination."
              />
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {results.map((r) => {
                  const ok = /^(sent|delivered)$/i.test(r.status);
                  const fail = /^failed$/i.test(r.status);
                  return (
                    <div
                      key={r.route}
                      className="ring-gradient relative rounded-xl border border-border bg-card/50 p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-display text-sm truncate">{labelFor(r.route)}</div>
                          <div className="text-[10px] font-mono text-muted-foreground truncate">{r.route}</div>
                        </div>
                        {ok && <CheckCircle2 className="w-4 h-4 text-success shrink-0" />}
                        {fail && <XCircle className="w-4 h-4 text-destructive shrink-0" />}
                        {!ok && !fail && <Activity className="w-4 h-4 text-muted-foreground shrink-0" />}
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <StatusBadge status={r.status} />
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <span>{num(r.latency_ms)} ms</span>
                          <span className="text-secondary-glow font-medium">{num(r.cost).toFixed(3)} €</span>
                        </div>
                      </div>
                      {r.error && (
                        <div className="mt-2 text-[11px] text-destructive break-words">{r.error}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
