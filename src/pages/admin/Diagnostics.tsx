import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ROUTE_CATALOG } from "@/lib/routes";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Activity, CheckCircle2, XCircle, RefreshCw, KeyRound, Globe2, Loader2, Send,
} from "lucide-react";

const num = (v: unknown, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

type Diag = {
  upstream_ok: boolean;
  upstream_error: string | null;
  latency_ms: number;
  api_key_present: boolean;
  api_base_present: boolean;
  markup_multiplier: number;
  families: { alpha: boolean; beta: boolean; epsilon: boolean; gamma: boolean };
  gamma_country_count: number;
  epsilon_subroute_count: number;
  checked_at: string;
};

export default function AdminDiagnostics() {
  const [diag, setDiag] = useState<Diag | null>(null);
  const [loading, setLoading] = useState(true);

  // Probe send
  const [probeRoute, setProbeRoute] = useState("beta");
  const [probeNumber, setProbeNumber] = useState("");
  const [probeMsg, setProbeMsg] = useState("Diagnostics ping from SecretVoIP");
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<any>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const r: any = await api.diagnostics();
      setDiag(r);
    } catch (e: any) {
      toast.error(e.message || "Diagnostics failed");
      setDiag(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const probe = async () => {
    if (!probeNumber.trim()) return toast.error("Enter a destination number");
    setProbing(true);
    setProbeResult(null);
    try {
      const r: any = await api.testRoutes({
        to: probeNumber.trim().replace(/^\+/, ""),
        message: probeMsg,
        sender_id: "SecretVoIP",
        routes: [probeRoute],
      });
      setProbeResult(r?.results?.[0] || r);
      toast.success("Probe sent");
    } catch (e: any) {
      toast.error(e.message);
      setProbeResult({ status: "failed", error: e.message });
    } finally {
      setProbing(false);
    }
  };

  return (
    <DashboardLayout kind="admin">
      <PageHeader
        title="Route Diagnostics"
        subtitle="Verify upstream connectivity, detected route families and probe a single live SMS."
        right={
          <Button variant="soft" size="sm" onClick={refresh} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
        }
      />

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Status cards */}
        <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
          <StatusCard
            icon={<Activity className="w-4 h-4" />}
            title="Upstream API"
            ok={!!diag?.upstream_ok}
            okLabel="Connected"
            failLabel={diag?.upstream_error || "Unreachable"}
            sub={diag ? `Latency ${num(diag.latency_ms)} ms` : "—"}
          />
          <StatusCard
            icon={<KeyRound className="w-4 h-4" />}
            title="API key"
            ok={!!diag?.api_key_present}
            okLabel="Configured"
            failLabel="Missing on server"
            sub={diag?.api_base_present ? "Base URL set" : "Base URL missing"}
          />
          <StatusCard
            icon={<Globe2 className="w-4 h-4" />}
            title="Gamma countries"
            ok={(diag?.gamma_country_count || 0) > 0}
            okLabel={`${diag?.gamma_country_count ?? 0} detected`}
            failLabel="None detected"
            sub={`Markup ×${num(diag?.markup_multiplier, 1.5)}`}
          />
          <StatusCard
            icon={<Activity className="w-4 h-4" />}
            title="Epsilon sub-routes"
            ok={(diag?.epsilon_subroute_count ?? 0) >= 0}
            okLabel={`${diag?.epsilon_subroute_count ?? 0} reported`}
            failLabel="N/A"
            sub="From upstream catalog"
          />

          <div className="ring-gradient glass rounded-2xl p-5 sm:col-span-2">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
              Detected route families
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ROUTE_CATALOG.map((r) => {
                const ok = !!diag?.families?.[r.family as keyof Diag["families"]];
                return (
                  <div
                    key={r.option_id}
                    className="rounded-xl border border-border bg-card/50 p-3 flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <div className="font-display text-sm truncate">{r.label}</div>
                      <div className="text-[11px] text-muted-foreground">{r.subtitle}</div>
                    </div>
                    {ok
                      ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                      : <XCircle className="w-4 h-4 text-destructive shrink-0" />}
                  </div>
                );
              })}
            </div>
            {diag?.checked_at && (
              <div className="text-[11px] text-muted-foreground mt-3">
                Checked at {new Date(diag.checked_at).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* Probe send */}
        <div className="ring-gradient glass rounded-2xl p-5 space-y-4 h-fit">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Live probe</div>
            <div className="font-display text-lg mt-1">Send one real SMS</div>
            <div className="text-xs text-muted-foreground mt-1">
              Will charge the admin account using reseller pricing and write a log row.
            </div>
          </div>
          <div>
            <Label>Route</Label>
            <select
              value={probeRoute}
              onChange={(e) => setProbeRoute(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {ROUTE_CATALOG.filter((r) => r.family !== "gamma").map((r) => (
                <option key={r.option_id} value={r.option_id}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Destination number</Label>
            <Input value={probeNumber} onChange={(e) => setProbeNumber(e.target.value)} placeholder="e.g. 4522304047" />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea rows={3} value={probeMsg} onChange={(e) => setProbeMsg(e.target.value)} />
            <div className="text-[11px] text-muted-foreground mt-1">
              The selected route tag will be appended automatically.
            </div>
          </div>
          <Button variant="hero" className="w-full" onClick={probe} disabled={probing}>
            {probing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {probing ? "Probing…" : "Run probe"}
          </Button>

          {probeResult && (
            <div className="rounded-xl border border-border bg-card/40 p-3 text-sm space-y-2 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">Status</span>
                <StatusBadge status={probeResult.status} />
              </div>
              {probeResult.tag && (
                <Row k="Route tag" v={<span className="font-mono text-xs">{probeResult.tag}</span>} />
              )}
              {"latency_ms" in (probeResult || {}) && (
                <Row k="Latency" v={`${num(probeResult.latency_ms)} ms`} />
              )}
              {"cost" in (probeResult || {}) && (
                <Row k="Charged" v={<span className="text-secondary-glow">{num(probeResult.cost).toFixed(3)} €</span>} />
              )}
              {probeResult.provider_cost != null && (
                <Row k="Provider cost" v={`${num(probeResult.provider_cost).toFixed(3)} €`} />
              )}
              {probeResult.error && (
                <div className="text-xs text-destructive break-words">{probeResult.error}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatusCard({
  icon, title, ok, okLabel, failLabel, sub,
}: {
  icon: React.ReactNode; title: string; ok: boolean; okLabel: string; failLabel: string; sub?: string;
}) {
  return (
    <div className="ring-gradient glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        {icon} {title}
      </div>
      <div className="mt-2 flex items-center gap-2">
        {ok
          ? <CheckCircle2 className="w-4 h-4 text-success" />
          : <XCircle className="w-4 h-4 text-destructive" />}
        <span className={ok ? "text-foreground font-medium" : "text-destructive font-medium"}>
          {ok ? okLabel : failLabel}
        </span>
      </div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function Row({ k, v }: { k: string; v: any }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-muted-foreground text-xs">{k}</div>
      <div className="text-sm">{v}</div>
    </div>
  );
}
