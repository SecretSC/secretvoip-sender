import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Wallet, Plus, Minus } from "lucide-react";

type Tx = {
  id: string | number;
  amount_eur: number;
  type: "topup" | "adjustment" | "charge" | "refund";
  note?: string | null;
  created_by?: string | null;
  created_at?: string;
  at?: string;
};

export default function TopUpDialog({
  customer,
  open,
  onOpenChange,
  onUpdated,
}: {
  customer: { id: string; name: string; email: string } | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdated?: () => void;
}) {
  const [balance, setBalance] = useState<number>(0);
  const [tx, setTx] = useState<Tx[]>([]);
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [direction, setDirection] = useState<"add" | "remove">("add");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!customer) return;
    const r: any = await api.customerWallet(customer.id);
    setBalance(Number(r.balance_eur || 0));
    setTx(r.transactions || []);
  };

  useEffect(() => {
    if (open && customer) {
      setAmount("");
      setNote("");
      setDirection("add");
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customer?.id]);

  const submit = async () => {
    if (!customer) return;
    const n = parseFloat(amount.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return toast.error("Enter a positive amount");
    setBusy(true);
    try {
      const signed = direction === "add" ? n : -n;
      const type = direction === "add" ? "topup" : "adjustment";
      const r: any = await api.topUpCustomer(customer.id, signed, note || undefined, type);
      toast.success(`New balance: ${Number(r.balance_eur).toFixed(2)} €`);
      setAmount("");
      setNote("");
      await load();
      onUpdated?.();
    } catch (e: any) {
      toast.error(e.message || "Top-up failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-border max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-secondary-glow" /> Wallet — {customer?.name}
          </DialogTitle>
          <DialogDescription>{customer?.email}</DialogDescription>
        </DialogHeader>

        <div className="ring-gradient glass rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Current balance</div>
            <div className="font-display text-3xl mt-1">
              {balance.toFixed(2)} <span className="text-secondary-glow text-xl">€</span>
            </div>
          </div>
          <Wallet className="w-10 h-10 text-secondary-glow/40" />
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={direction === "add" ? "hero" : "soft"}
              size="sm"
              onClick={() => setDirection("add")}
            >
              <Plus className="w-4 h-4" /> Add credit
            </Button>
            <Button
              type="button"
              variant={direction === "remove" ? "hero" : "soft"}
              size="sm"
              onClick={() => setDirection("remove")}
            >
              <Minus className="w-4 h-4" /> Remove
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <Label>Amount (EUR)</Label>
              <Input
                inputMode="decimal"
                placeholder="10.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Label>Note (optional)</Label>
              <Input
                placeholder="Telegram top-up from @customer"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[5, 10, 25, 50, 100, 250].map((v) => (
              <Button key={v} type="button" size="sm" variant="soft" onClick={() => setAmount(String(v))}>
                {v} €
              </Button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Recent transactions</div>
          <div className="ring-gradient glass rounded-xl max-h-56 overflow-y-auto">
            {tx.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-6">No transactions yet.</div>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {tx.map((t) => {
                    const date = t.created_at || t.at;
                    const positive = Number(t.amount_eur) >= 0;
                    return (
                      <tr key={t.id} className="border-t border-border/50">
                        <td className="py-2 px-3 text-xs text-muted-foreground">
                          {date ? new Date(date).toLocaleString() : ""}
                        </td>
                        <td className="py-2 px-3 text-xs uppercase">{t.type}</td>
                        <td className="py-2 px-3 text-xs text-muted-foreground truncate max-w-[200px]">
                          {t.note || "—"}
                        </td>
                        <td className={`py-2 px-3 text-right font-mono ${positive ? "text-success" : "text-destructive"}`}>
                          {positive ? "+" : ""}
                          {Number(t.amount_eur).toFixed(2)} €
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="soft" onClick={() => onOpenChange(false)}>Close</Button>
          <Button variant="hero" onClick={submit} disabled={busy}>
            {busy ? "Saving…" : direction === "add" ? "Add credit" : "Remove credit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
