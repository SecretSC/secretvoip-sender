import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { KeyRound, Plus, Trash2, UserCog, Wallet } from "lucide-react";
import TopUpDialog from "@/components/admin/TopUpDialog";

export default function Customers() {
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ name: "", email: "", username: "", password: "", mustChangePassword: true });
  const [topUpFor, setTopUpFor] = useState<any | null>(null);

  const load = () => api.customers().then((r: any) => setList(r));
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name || !form.email || !form.username || !form.password) return toast.error("Fill all fields");
    try { await api.createCustomer(form); toast.success("Customer created"); setOpen(false); setForm({ name: "", email: "", username: "", password: "", mustChangePassword: true }); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const toggleSuspend = async (u: any) => { await api.updateCustomer(u.id, { status: u.status === "active" ? "suspended" : "active" }); toast.success("Updated"); load(); };
  const reset = async (u: any) => { const r: any = await api.resetCustomerPassword(u.id); toast.success(`Temp password: ${r.tempPassword}`); };
  const remove = async (u: any) => { if (confirm(`Delete ${u.email}?`)) { await api.deleteCustomer(u.id); toast.success("Deleted"); load(); } };

  return (
    <DashboardLayout kind="admin">
      <PageHeader title="Customers" subtitle="Manually provision and manage customer accounts." actions={
        <Button variant="hero" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> New customer</Button>
      } />

      <div className="ring-gradient glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground uppercase tracking-wider bg-card/50">
              <tr>
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Username</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-right py-3 px-4">Balance</th>
                <th className="text-left py-3 px-4">Created</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id} className="border-t border-border/50 hover:bg-card/40">
                  <td className="py-2.5 px-4">{u.name}</td>
                  <td className="py-2.5 px-4 text-muted-foreground">{u.email}</td>
                  <td className="py-2.5 px-4 font-mono text-xs">{u.username}</td>
                  <td className="py-2.5 px-4"><StatusBadge status={u.status} /></td>
                  <td className="py-2.5 px-4 text-right font-mono text-secondary-glow">
                    {Number(u.balance_eur ?? 0).toFixed(2)} €
                  </td>
                  <td className="py-2.5 px-4 text-xs text-muted-foreground">{new Date(u.createdAt || u.created_at).toLocaleDateString()}</td>
                  <td className="py-2.5 px-4 text-right">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="hero" onClick={() => setTopUpFor(u)} title="Top up balance">
                        <Wallet className="w-3.5 h-3.5" /> Top up
                      </Button>
                      <Button size="sm" variant="soft" onClick={() => reset(u)} title="Reset password"><KeyRound className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="soft" onClick={() => toggleSuspend(u)} title={u.status === "active" ? "Suspend" : "Activate"}><UserCog className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="soft" onClick={() => remove(u)} title="Delete"><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={7}><EmptyState title="No customers yet" description="Create your first customer to get started." /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <TopUpDialog
        customer={topUpFor}
        open={!!topUpFor}
        onOpenChange={(v) => !v && setTopUpFor(null)}
        onUpdated={load}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-strong border-border">
          <DialogHeader>
            <DialogTitle>Create customer</DialogTitle>
            <DialogDescription>Provision a new customer account. The password will be shared with them out of band.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Full name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Username</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
            </div>
            <div><Label>Initial password</Label><Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.mustChangePassword} onCheckedChange={(v) => setForm({ ...form, mustChangePassword: !!v })} />
              Force password change on first login
            </label>
          </div>
          <DialogFooter>
            <Button variant="soft" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={create}>Create customer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
