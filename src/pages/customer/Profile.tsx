import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function CustomerProfile() {
  const { user, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

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
      <PageHeader title="Profile" subtitle="Manage your account credentials and session." />
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
