import { useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader, StatusBadge } from "@/components/ui-kit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import RoutePicker, { defaultSelection, RouteSelection } from "@/components/sms/RoutePicker";
import { api } from "@/lib/api";
import { estimateSegments, parseRecipients } from "@/lib/sms";
import { toast } from "sonner";
import { Send, Radar, Loader2, Calendar } from "lucide-react";

export default function SendSms() {
  const [sender, setSender] = useState("SecretVoIP");
  const [recipients, setRecipients] = useState("");
  const [message, setMessage] = useState("");
  const [route, setRoute] = useState<RouteSelection>(defaultSelection());
  const [scheduleAt, setScheduleAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const list = useMemo(() => parseRecipients(recipients), [recipients]);
  const segments = useMemo(() => estimateSegments(message), [message]);
  const estCost = useMemo(() => +(list.length * Math.max(1, segments) * 0.014).toFixed(3), [list, segments]);

  const buildOptionId = () => {
    if (route.kind === "gamma") return route.gamma.option_id;
    if (route.kind === "epsilon" && route.subroute) return route.subroute.option_id;
    return route.option_id;
  };

  const submit = async () => {
    if (list.length === 0) return toast.error("Add at least one recipient");
    if (!message.trim()) return toast.error("Message can't be empty");
    setLoading(true); setResult(null);
    try {
      const res: any = await api.sendSms({
        to: list.length === 1 ? list[0] : list,
        message,
        sender_id: sender,
        route_option_id: buildOptionId(),
      });
      setResult(res);
      toast.success(`Sent ${res.sent}/${list.length} · ${res.total_cost?.toFixed(3)} €`);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const test = async () => {
    if (list.length === 0) return toast.error("Add at least one recipient to test against");
    setTesting(true); setResult(null);
    try {
      const res: any = await api.testRoutes({ to: list[0], message: message || "Route test", test_routes: [route.option_id] });
      setResult({ test: true, ...res });
      toast.success("Route test complete");
    } catch (e: any) { toast.error(e.message); }
    finally { setTesting(false); }
  };

  return (
    <DashboardLayout kind="customer">
      <PageHeader title="Send SMS" subtitle="Compose and dispatch a message via your selected route." />

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="ring-gradient glass rounded-2xl p-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Sender ID</Label>
                <Input value={sender} onChange={(e) => setSender(e.target.value)} placeholder="e.g. SecretVoIP" />
              </div>
              <div>
                <Label className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Schedule (optional)</Label>
                <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
              </div>
            </div>
            <div className="mt-4">
              <Label>Recipients</Label>
              <Textarea
                rows={4}
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder="Enter numbers separated by commas or new lines, e.g. 12025550123, 447700900111"
              />
              <div className="text-xs text-muted-foreground mt-1.5">
                {list.length} recipient{list.length !== 1 ? "s" : ""} detected
              </div>
            </div>
            <div className="mt-4">
              <Label>Message</Label>
              <Textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your message…" />
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1.5">
                <span>{message.length} chars · ~{segments} segment{segments !== 1 ? "s" : ""}</span>
                <span>Estimated cost: <span className="text-secondary-glow font-medium">{estCost.toFixed(3)} €</span></span>
              </div>
            </div>
          </div>

          <div className="ring-gradient glass rounded-2xl p-5">
            <div className="flex items-end justify-between mb-3">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Route</div>
                <div className="font-display text-lg">{route.label}</div>
              </div>
            </div>
            <RoutePicker value={route} onChange={setRoute} />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="hero" size="lg" onClick={submit} disabled={loading} className="flex-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {loading ? "Sending…" : "Send SMS"}
            </Button>
            <Button variant="soft" size="lg" onClick={test} disabled={testing}>
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}
              Test route
            </Button>
          </div>
        </div>

        {/* Side summary */}
        <div className="space-y-5">
          <div className="ring-gradient glass rounded-2xl p-5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Summary</div>
            <div className="mt-3 space-y-2 text-sm">
              <Row k="Recipients" v={list.length.toString()} />
              <Row k="Segments / msg" v={segments.toString()} />
              <Row k="Selected route" v={route.label} />
              <Row k="Estimated cost" v={`${estCost.toFixed(3)} €`} accent />
            </div>
          </div>

          {result && (
            <div className="ring-gradient glass rounded-2xl p-5 animate-fade-in">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{result.test ? "Route test result" : "Send result"}</div>
              {!result.test ? (
                <div className="mt-2 space-y-2 text-sm">
                  <Row k="Status" v={<StatusBadge status={result.status} />} />
                  <Row k="Sent" v={`${result.sent}`} />
                  <Row k="Failed" v={`${result.failed}`} />
                  <Row k="Total cost" v={`${result.total_cost?.toFixed(3)} €`} accent />
                  <Row k="Wallet balance" v={`${result.wallet_balance?.toFixed(3)} €`} />
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {result.results?.map((r: any) => (
                    <div key={r.route} className="rounded-lg border border-border bg-card/50 p-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={r.status} />
                        <span className="text-sm font-mono">{r.route}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{r.latency_ms}ms · {r.cost.toFixed(3)} €</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function Row({ k, v, accent }: { k: string; v: any; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-muted-foreground">{k}</div>
      <div className={accent ? "text-secondary-glow font-medium" : "text-foreground"}>{v}</div>
    </div>
  );
}
