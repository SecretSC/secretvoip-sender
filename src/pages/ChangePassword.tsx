import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Zap } from "lucide-react";

export default function ChangePassword() {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) return toast.error("Password must be at least 8 characters.");
    if (next !== confirm) return toast.error("Passwords don't match.");
    setLoading(true);
    try {
      await changePassword(current, next);
      toast.success("Password updated.");
      navigate(user?.role === "admin" ? "/admin" : "/app");
    } catch (e: any) {
      toast.error(e.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative grid place-items-center p-6">
      <div aria-hidden className="absolute inset-0 bg-gradient-hero" />
      <div className="ring-gradient glass-strong relative rounded-3xl p-8 w-full max-w-md shadow-elevated">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-lg bg-gradient-primary grid place-items-center"><Zap className="w-5 h-5 text-primary-foreground" /></div>
          <span className="font-display font-semibold">SecretVoIP SMS</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-secondary-glow mb-2">
          <ShieldCheck className="w-4 h-4" />
          {user?.mustChangePassword ? "Password change required" : "Change your password"}
        </div>
        <h1 className="font-display text-2xl font-semibold">Set a new password</h1>
        <p className="text-muted-foreground text-sm mt-1">Choose a strong password you don't use elsewhere.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cur">Current password</Label>
            <Input id="cur" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="next">New password</Label>
            <Input id="next" type="password" value={next} onChange={(e) => setNext(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="conf">Confirm new password</Label>
            <Input id="conf" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          <Button type="submit" variant="hero" className="w-full" disabled={loading}>
            {loading ? "Updating…" : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
