import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader, StatCard, StatusBadge } from "@/components/ui-kit";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Send, CheckCircle2, XCircle, Map, ArrowRight, Radar, Wallet, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TELEGRAM_HANDLE = "Hamfranord";

export default function CustomerOverview() {
  const { user } = useAuth();
  const [s, setS] = useState<any>(null);
  useEffect(() => { api.customerStats().then(setS); }, []);

  const balance = Number(s?.balance_eur ?? 0);

  return (
    <DashboardLayout kind="customer">
      <PageHeader
        title={`Welcome, ${user?.name?.split(" ")[0] || "there"}`}
        subtitle="Here's a quick view of your messaging activity."
        actions={
          <>
            <Link to="/app/tester"><Button variant="soft"><Radar className="w-4 h-4" /> Test routes</Button></Link>
            <Link to="/app/send"><Button variant="hero"><Send className="w-4 h-4" /> Send SMS</Button></Link>
          </>
        }
      />

      {/* Balance hero card */}
      <div className="ring-gradient glass rounded-2xl p-5 mb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-secondary/15 ring-1 ring-secondary/30 flex items-center justify-center">
            <Wallet className="w-7 h-7 text-secondary-glow" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Wallet balance</div>
            <div className="font-display text-3xl md:text-4xl mt-1">
              {balance.toFixed(2)} <span className="text-secondary-glow text-2xl">€</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">Used to pay for every SMS you send.</div>
          </div>
        </div>
        <div className="flex flex-col items-start md:items-end gap-2">
          <a
            href={`https://t.me/${TELEGRAM_HANDLE}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="hero">
              <MessageCircle className="w-4 h-4" /> Top up via Telegram
            </Button>
          </a>
          <div className="text-xs text-muted-foreground">
            Contact <span className="text-foreground font-mono">@{TELEGRAM_HANDLE}</span> on Telegram to add credit.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Sent" value={s?.sent ?? "—"} icon={<Send className="w-5 h-5" />} accent="primary" />
        <StatCard label="Delivered" value={s?.delivered ?? "—"} icon={<CheckCircle2 className="w-5 h-5" />} accent="success" />
        <StatCard label="Failed" value={s?.failed ?? "—"} icon={<XCircle className="w-5 h-5" />} accent="destructive" />
        <StatCard label="Routes available" value={s?.routes ?? "—"} icon={<Map className="w-5 h-5" />} accent="accent" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mt-6">
        <div className="lg:col-span-2 ring-gradient glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Recent activity</div>
              <div className="font-display text-lg">Latest messages</div>
            </div>
            <Link to="/app/logs" className="text-xs text-secondary-glow hover:underline inline-flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="text-left py-2 px-2">Recipient</th>
                  <th className="text-left py-2 px-2">Message</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-right py-2 px-2">Cost</th>
                </tr>
              </thead>
              <tbody>
                {(s?.recent || []).map((r: any) => (
                  <tr key={r.id} className="border-t border-border/60">
                    <td className="py-2 px-2 font-mono text-xs">{r.recipient}</td>
                    <td className="py-2 px-2 max-w-[260px] truncate">{r.message}</td>
                    <td className="py-2 px-2"><StatusBadge status={r.status} /></td>
                    <td className="py-2 px-2 text-right">{r.cost?.toFixed(3)} €</td>
                  </tr>
                ))}
                {(!s?.recent || s.recent.length === 0) && (
                  <tr><td colSpan={4} className="text-center py-10 text-muted-foreground">No messages yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="ring-gradient glass rounded-2xl p-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Quick actions</div>
          <div className="font-display text-lg mb-3">Get started</div>
          <div className="flex flex-col gap-2">
            <Link to="/app/send"><Button variant="hero" className="w-full justify-between"><span className="flex items-center gap-2"><Send className="w-4 h-4" /> Send a campaign</span><ArrowRight className="w-4 h-4" /></Button></Link>
            <Link to="/app/tester"><Button variant="soft" className="w-full justify-between"><span className="flex items-center gap-2"><Radar className="w-4 h-4" /> Test a route</span><ArrowRight className="w-4 h-4" /></Button></Link>
            <Link to="/app/routes"><Button variant="soft" className="w-full justify-between"><span className="flex items-center gap-2"><Map className="w-4 h-4" /> Browse routes & rates</span><ArrowRight className="w-4 h-4" /></Button></Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
