import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui-kit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ROUTE_CATALOG } from "@/lib/routes";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Radar } from "lucide-react";

export default function RouteTester() {
  const [number, setNumber] = useState("");
  const [message, setMessage] = useState("Test delivery from SecretVoIP");
  const [all, setAll] = useState(true);
  const [selected, setSelected] = useState<string[]>(["alpha", "epsilon"]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const run = async () => {
    if (!number.trim()) return toast.error("Add a destination number");
    setLoading(true); setResults(null);
    try {
      const payload: any = { to: number.trim().replace(/^\+/, ""), message };
      if (all) payload.test_all_routes = true;
      else payload.test_routes = selected;
      const res: any = await api.testRoutes(payload);
      setResults(res.results || []);
      toast.success("Test complete");
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <DashboardLayout kind="customer">
      <PageHeader title="Route Tester" subtitle="Validate delivery before launching a campaign — across one, several, or all routes." />

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 ring-gradient glass rounded-2xl p-5 space-y-4">
          <div>
            <Label>Destination number</Label>
            <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="e.g. 12025550123" />
          </div>
          <div>
            <Label>Test message</Label>
            <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <div className="rounded-xl border border-border bg-card/40 p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={all} onCheckedChange={(v) => setAll(!!v)} />
              <span className="text-sm">Test all routes</span>
            </label>
            {!all && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {ROUTE_CATALOG.map((r) => (
                  <label key={r.option_id} className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox checked={selected.includes(r.option_id)} onCheckedChange={() => toggle(r.option_id)} />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <Button variant="hero" className="w-full" onClick={run} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}
            {loading ? "Testing routes…" : "Run route test"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Selecting Epsilon tests the main Epsilon route. Per-sub-route testing is enabled only when supported by the upstream backend.
          </p>
        </div>

        <div className="lg:col-span-2 ring-gradient glass rounded-2xl p-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Results</div>
          {!results ? (
            <EmptyState title="No tests yet" description="Run a test to see route-tagged delivery results here." />
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {results.map((r) => (
                <div key={r.route} className="ring-gradient relative rounded-xl border border-border bg-card/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-display text-sm">{r.route}</div>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>Latency: <span className="text-foreground">{r.latency_ms} ms</span></div>
                    <div>Cost: <span className="text-foreground">{r.cost?.toFixed(3)} €</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
