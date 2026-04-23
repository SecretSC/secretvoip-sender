import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Wallet, MessageCircle } from "lucide-react";

const TELEGRAM_HANDLE = "Hamfranord";

export default function CustomerProfile() {
  const { user, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState<{ balance_eur: number; transactions: any[] }>({ balance_eur: 0, transactions: [] });

  useEffect(() => { api.myWallet().then((r: any) => setWallet({ balance_eur: Number(r.balance_eur || 0), transactions: r.transactions || [] })); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) return toast.error("Password must be at least 8 characters.");
    if (next !== confirm) return toast.error("Passwords don't match");
    setLoading(true);
    try { await changePassword(current, next); toast.success("Password updated."); setCurrent(""); setNext(""); setConfirm(""); }
    catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  return (
    <DashboardLayout kind="customer">
      <PageHeader title="Profile" subtitle="Manage your account, balance and credentials." />

      {/* Wallet card */}
      <div className="ring-gradient glass rounded-2xl p-5 mb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-secondary/15 ring-1 ring-secondary/30 flex items-center justify-center">
            <Wallet className="w-7 h-7 text-secondary-glow" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Wallet balance</div>
            <div className="font-display text-3xl md:text-4xl mt-1">
              {wallet.balance_eur.toFixed(2)} <span className="text-secondary-glow text-2xl">€</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">Top-ups are processed manually by the admin.</div>
          </div>
        </div>
        <div className="flex flex-col items-start md:items-end gap-2">
          <a href={`https://t.me/${TELEGRAM_HANDLE}`} target="_blank" rel="noopener noreferrer">
            <Button variant="hero"><MessageCircle className="w-4 h-4" /> Top up via Telegram</Button>
          </a>
          <div className="text-xs text-muted-foreground">
            Message <span className="text-foreground font-mono">@{TELEGRAM_HANDLE}</span> on Telegram with the amount in EUR.
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="ring-gradient glass rounded-2xl p-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Account</div>
          <div className="mt-3 space-y-2 text-sm">
            <Row k="Name" v={user?.name} />
            <Row k="Username" v={user?.username} />
            <Row k="Email" v={user?.email} />
            <Row k="Role" v="Customer" />
            <Row k="Status" v={user?.status} />
          </div>
          <Button variant="soft" className="mt-5" onClick={() => { logout(); navigate("/login"); }}>Sign out</Button>
        </div>

        <form onSubmit={submit} className="ring-gradient glass rounded-2xl p-5 space-y-3">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Change password</div>
          <div>
            <Label>Current password</Label>
            <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </div>
          <div>
            <Label>New password</Label>
            <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} required />
          </div>
          <div>
            <Label>Confirm new password</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          <Button type="submit" variant="hero" disabled={loading}>{loading ? "Updating…" : "Update password"}</Button>
        </form>
      </div>

      {/* Transactions */}
      <div className="ring-gradient glass rounded-2xl p-5 mt-5">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Wallet history</div>
        {wallet.transactions.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">No transactions yet. Contact @{TELEGRAM_HANDLE} on Telegram to top up.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="text-left py-2 px-2">Date</th>
                  <th className="text-left py-2 px-2">Type</th>
                  <th className="text-left py-2 px-2">Note</th>
                  <th className="text-right py-2 px-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {wallet.transactions.map((t: any) => {
                  const positive = Number(t.amount_eur) >= 0;
                  const date = t.created_at || t.at;
                  return (
                    <tr key={t.id} className="border-t border-border/60">
                      <td className="py-2 px-2 text-xs text-muted-foreground">{date ? new Date(date).toLocaleString() : ""}</td>
                      <td className="py-2 px-2 text-xs uppercase">{t.type}</td>
                      <td className="py-2 px-2 text-muted-foreground">{t.note || "—"}</td>
                      <td className={`py-2 px-2 text-right font-mono ${positive ? "text-success" : "text-destructive"}`}>
                        {positive ? "+" : ""}{Number(t.amount_eur).toFixed(2)} €
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function Row({ k, v }: { k: string; v: any }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-foreground">{v || "—"}</span>
    </div>
  );
}
