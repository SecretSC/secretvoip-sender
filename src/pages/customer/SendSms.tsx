import { useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader, StatusBadge } from "@/components/ui-kit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RoutePicker, { defaultSelection, RouteSelection } from "@/components/sms/RoutePicker";
import { api } from "@/lib/api";
import { estimateSegments, parseRecipients } from "@/lib/sms";
import { toast } from "sonner";
import { Send, Loader2, Calendar, Wallet, CheckCircle2, XCircle, Save, Trash2 } from "lucide-react";

const num = (v: unknown, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

type PerResult = {
  recipient: string;
  status: "pending" | "sent" | "delivered" | "failed";
  cost: number;
  error?: string;
};

export default function SendSms() {
  const [sender, setSender] = useState("SecretVoIP");
  const [recipients, setRecipients] = useState("");
  const [message, setMessage] = useState("");
  const [route, setRoute] = useState<RouteSelection>(defaultSelection());
  const [scheduleAt, setScheduleAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [templateDialog, setTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);

  // Pricing pulled from backend — single source of truth
  const [flatPrices, setFlatPrices] = useState<Record<string, number>>({
    alpha: 0.09, beta: 0.09, epsilon: 0.09,
  });

  // Live progress state
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [perResults, setPerResults] = useState<PerResult[]>([]);
  const [summary, setSummary] = useState<null | {
    sent: number; failed: number; charged: number; new_balance: number;
  }>(null);
  const cancelRef = useRef(false);

  const refreshBalance = async () => {
    try {
      const r: any = await api.myWallet();
      setBalance(num(r.balance_eur));
    } catch {}
  };
  const refreshTemplates = async () => {
    try { setTemplates((await api.templates()) as any[]); } catch {}
  };
  useEffect(() => {
    refreshBalance();
    refreshTemplates();
    (async () => {
      try {
        const m: any = await api.markup();
        if (m?.flat_routes) setFlatPrices({
          alpha: num(m.flat_routes.alpha, 0.09),
          beta: num(m.flat_routes.beta, 0.09),
          epsilon: num(m.flat_routes.epsilon, 0.09),
        });
      } catch {}
    })();
  }, []);

  const list = useMemo(() => parseRecipients(recipients), [recipients]);
  const segments = useMemo(() => estimateSegments(message), [message]);

  const perMsgPrice = useMemo(() => {
    if (route.kind === "gamma" && route.gamma?.price) return num(route.gamma.price);
    if (route.kind === "epsilon") return flatPrices.epsilon;
    if (route.kind === "alpha") return flatPrices.alpha;
    if (route.kind === "beta") return flatPrices.beta;
    return flatPrices.alpha;
  }, [route, flatPrices]);

  const estCost = useMemo(
    () => +(list.length * Math.max(1, segments) * perMsgPrice).toFixed(3),
    [list, segments, perMsgPrice]
  );

  const buildOptionId = () => {
    if (route.kind === "gamma") return route.gamma.option_id;
    if (route.kind === "epsilon" && route.subroute) return route.subroute.option_id;
    return route.option_id;
  };

  const loadTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setSender(t.sender_id || "");
    setMessage(t.message || "");
    toast.success("Template loaded");
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) return toast.error("Template name is required");
    if (!sender.trim() || !message.trim()) return toast.error("Sender ID and message are required");
    try {
      if (editingTemplate) await api.updateTemplate(editingTemplate.id, { name: templateName.trim(), sender_id: sender, message });
      else await api.createTemplate({ name: templateName.trim(), sender_id: sender, message });
      setTemplateDialog(false); setEditingTemplate(null); setTemplateName(""); refreshTemplates();
      toast.success("Template saved");
    } catch (e: any) { toast.error(e.message || "Could not save template"); }
  };

  const deleteTemplate = async (id: string) => {
    try { await api.deleteTemplate(id); refreshTemplates(); toast.success("Template deleted"); }
    catch (e: any) { toast.error(e.message || "Could not delete template"); }
  };

  const CONCURRENCY = 5;

  const submit = async () => {
    if (list.length === 0) return toast.error("Add at least one recipient");
    if (!message.trim()) return toast.error("Message can't be empty");
    if (balance <= 0) return toast.error("Insufficient balance. Top up your wallet to send SMS.");

    // Pre-flight: warn if estimated cost exceeds balance
    if (estCost > balance) {
      toast.warning(
        `Estimated cost ${estCost.toFixed(3)} € exceeds balance ${balance.toFixed(2)} €. Sending will stop when balance runs out.`
      );
    }

    setLoading(true);
    setSummary(null);
    cancelRef.current = false;

    const total = list.length;
    const initial: PerResult[] = list.map((r) => ({ recipient: r, status: "pending", cost: 0 }));
    setPerResults(initial);
    setProgress({ done: 0, total });

    let sent = 0, failed = 0, charged = 0, runningBalance = balance;
    let doneCount = 0;
    const optionId = buildOptionId();

    const sendOne = async (recipient: string, idx: number) => {
      if (cancelRef.current) {
        setPerResults((prev) => {
          const next = [...prev];
          if (next[idx]?.status === "pending") {
            next[idx] = { recipient, status: "failed", cost: 0, error: "Cancelled" };
          }
          return next;
        });
        return;
      }
      try {
        const res: any = await api.sendSms({
          to: recipient,
          message,
          sender_id: sender,
          route_option_id: optionId,
        });
        const cost = num(res.total_cost);
        const ok = (res.status || "sent") !== "failed" && num(res.failed) === 0;
        if (typeof res.wallet_balance !== "undefined") {
          runningBalance = num(res.wallet_balance, runningBalance);
        } else if (ok) {
          runningBalance = runningBalance - cost;
        }
        if (ok) sent++; else failed++;
        if (ok) charged += cost;
        setPerResults((prev) => {
          const next = [...prev];
          next[idx] = {
            recipient,
            status: ok ? (res.messages?.[0]?.status || "sent") : "failed",
            cost: ok ? cost : 0,
          };
          return next;
        });
      } catch (e: any) {
        failed++;
        setPerResults((prev) => {
          const next = [...prev];
          next[idx] = { recipient, status: "failed", cost: 0, error: e?.message };
          return next;
        });
        if (/insufficient/i.test(e?.message || "")) {
          // Stop further dispatch — wallet exhausted
          cancelRef.current = true;
        }
      } finally {
        doneCount++;
        setProgress({ done: doneCount, total });
        setBalance(runningBalance);
      }
    };

    // Process in batches of CONCURRENCY
    for (let i = 0; i < list.length; i += CONCURRENCY) {
      if (cancelRef.current) {
        // Mark remaining as failed/cancelled
        const remaining = list.slice(i);
        setPerResults((prev) => {
          const next = [...prev];
          remaining.forEach((r, k) => {
            const idx = i + k;
            if (next[idx]?.status === "pending") {
              next[idx] = { recipient: r, status: "failed", cost: 0, error: "Stopped (insufficient balance)" };
            }
          });
          return next;
        });
        break;
      }
      const batch = list.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map((recipient, k) => sendOne(recipient, i + k)));
    }

    setLoading(false);
    setSummary({
      sent, failed,
      charged: +charged.toFixed(3),
      new_balance: +runningBalance.toFixed(3),
    });
    refreshBalance();
    toast.success(`Done · ${sent} sent · ${failed} failed · ${charged.toFixed(3)} € charged`);
  };

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <DashboardLayout kind="customer">
      <PageHeader title="Send SMS" subtitle="Compose and dispatch a message via your selected route." />

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="ring-gradient glass rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-end sm:justify-between mb-4">
              <div className="sm:min-w-[260px]">
                <Label>Load template</Label>
                <Select onValueChange={loadTemplate} disabled={loading || templates.length === 0}>
                  <SelectTrigger><SelectValue placeholder={templates.length ? "Choose saved template" : "No saved templates"} /></SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="soft" onClick={() => { setEditingTemplate(null); setTemplateName(""); setTemplateDialog(true); }} disabled={loading || templates.length >= 10}>
                <Save className="w-4 h-4" /> Save template
              </Button>
            </div>
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
                disabled={loading}
              />
              <div className="text-xs text-muted-foreground mt-1.5">
                {list.length} recipient{list.length !== 1 ? "s" : ""} detected
              </div>
            </div>
            <div className="mt-4">
              <Label>Message</Label>
              <Textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your message…" disabled={loading} />
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
              <div className="text-xs text-muted-foreground">
                Per SMS: <span className="text-secondary-glow font-medium">{perMsgPrice.toFixed(3)} €</span>
              </div>
            </div>
            <RoutePicker value={route} onChange={setRoute} />
          </div>

          {templates.length > 0 && (
            <div className="ring-gradient glass rounded-2xl p-5">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Saved templates ({templates.length}/10)</div>
              <div className="grid sm:grid-cols-2 gap-2">
                {templates.map((t) => (
                  <div key={t.id} className="rounded-xl border border-border bg-card/40 p-3 flex items-center justify-between gap-2">
                    <button className="min-w-0 text-left" onClick={() => loadTemplate(t.id)}>
                      <div className="text-sm font-medium truncate">{t.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{t.sender_id}</div>
                    </button>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingTemplate(t); setTemplateName(t.name); setSender(t.sender_id); setMessage(t.message); setTemplateDialog(true); }}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteTemplate(t.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="hero" size="lg" onClick={submit} disabled={loading || balance <= 0} className="flex-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {loading ? `Sending… ${progress.done}/${progress.total}` : balance <= 0 ? "Top up to send" : "Send SMS"}
            </Button>
            {loading && (
              <Button variant="soft" size="lg" disabled aria-disabled="true">
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending…
              </Button>
            )}
          </div>

          {/* Live progress */}
          {(loading || perResults.length > 0) && (
            <div className="ring-gradient glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  {loading ? "Sending in progress…" : "Send results"}
                </div>
                <div className="text-sm font-mono">
                  {progress.done} / {progress.total} · {pct}%
                </div>
              </div>
              <Progress value={pct} className="h-2" />
              <div className="mt-4 max-h-72 overflow-y-auto divide-y divide-border/60">
                {perResults.map((r, i) => (
                  <div key={`${r.recipient}-${i}`} className="flex items-center justify-between py-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      {r.status === "pending" && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" />}
                      {(r.status === "sent" || r.status === "delivered") && <CheckCircle2 className="w-4 h-4 text-success shrink-0" />}
                      {r.status === "failed" && <XCircle className="w-4 h-4 text-destructive shrink-0" />}
                      <span className="font-mono truncate">{r.recipient}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {r.error && <span className="text-xs text-destructive truncate max-w-[180px]">{r.error}</span>}
                      <StatusBadge status={r.status === "pending" ? "queued" : r.status} />
                      <span className="text-xs text-muted-foreground w-16 text-right">{num(r.cost).toFixed(3)} €</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Side summary */}
        <div className="space-y-5">
          <div className="ring-gradient glass rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/15 ring-1 ring-secondary/30 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-secondary-glow" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Wallet balance</div>
                <div className="font-display text-2xl mt-0.5">
                  {num(balance).toFixed(2)} <span className="text-secondary-glow text-base">€</span>
                </div>
              </div>
            </div>
          </div>

          <div className="ring-gradient glass rounded-2xl p-5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Summary</div>
            <div className="mt-3 space-y-2 text-sm">
              <Row k="Recipients" v={list.length.toString()} />
              <Row k="Segments / msg" v={segments.toString()} />
              <Row k="Per SMS" v={`${perMsgPrice.toFixed(3)} €`} />
              <Row k="Selected route" v={route.label} />
              <Row k="Estimated cost" v={`${estCost.toFixed(3)} €`} accent />
            </div>
          </div>

          {summary && (
            <div className="ring-gradient glass rounded-2xl p-5 animate-fade-in">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Final result</div>
              <div className="mt-2 space-y-2 text-sm">
                <Row k="Sent" v={summary.sent.toString()} />
                <Row k="Failed" v={summary.failed.toString()} />
                <Row k="Total charged" v={`${summary.charged.toFixed(3)} €`} accent />
                <Row k="New balance" v={`${summary.new_balance.toFixed(3)} €`} />
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={templateDialog} onOpenChange={setTemplateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTemplate ? "Edit template" : "Save SMS template"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Template name</Label><Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. Payment reminder" /></div>
            <div><Label>Sender ID</Label><Input value={sender} onChange={(e) => setSender(e.target.value)} /></div>
            <div><Label>Message</Label><Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} /></div>
            <Button variant="hero" className="w-full" onClick={saveTemplate}>Save template</Button>
          </div>
        </DialogContent>
      </Dialog>
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
