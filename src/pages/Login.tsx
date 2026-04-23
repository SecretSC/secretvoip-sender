import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Zap, ArrowRight, Mail, KeyRound } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(identifier.trim(), password);
      toast.success(`Welcome back, ${u.name}`);
      if (u.mustChangePassword) navigate("/change-password");
      else navigate(u.role === "admin" ? "/admin" : "/app");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden grid lg:grid-cols-2">
      {/* Background */}
      <div aria-hidden className="absolute inset-0 bg-gradient-hero" />

      {/* Left — branding */}
      <div className="hidden lg:flex relative z-10 flex-col justify-between p-10">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-primary grid place-items-center shadow-glow-primary">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display font-semibold text-lg">SecretVoIP</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">SMS Platform</div>
          </div>
        </Link>

        <div className="max-w-md">
          <div className="text-xs uppercase tracking-widest text-secondary-glow">Welcome</div>
          <h1 className="font-display text-4xl font-semibold mt-2 leading-tight">
            Sign in to your <span className="gradient-text">SMS workspace</span>
          </h1>
          <p className="text-muted-foreground mt-3">
            Send, route, monitor and audit messaging at scale — from one premium operations console.
          </p>
        </div>

        <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} SecretVoIP — All rights reserved.</div>
      </div>

      {/* Right — form */}
      <div className="relative z-10 flex items-center justify-center p-6">
        <div className="ring-gradient glass-strong rounded-3xl p-8 w-full max-w-md shadow-elevated">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-lg bg-gradient-primary grid place-items-center"><Zap className="w-5 h-5 text-primary-foreground" /></div>
            <span className="font-display font-semibold">SecretVoIP SMS</span>
          </div>

          {!showForgot ? (
            <>
              <h2 className="font-display text-2xl font-semibold">Sign in</h2>
              <p className="text-muted-foreground text-sm mt-1">Use the credentials provided by your administrator.</p>

              <form onSubmit={submit} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="id">Email or username</Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input id="id" value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="pl-9" autoComplete="username" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pw">Password</Label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" autoComplete="current-password" />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-secondary-glow hover:underline">Forgot password?</button>
                </div>

                <Button type="submit" disabled={loading} variant="hero" className="w-full">
                  {loading ? "Signing in…" : <>Sign in <ArrowRight className="w-4 h-4 ml-1" /></>}
                </Button>
              </form>

              <p className="text-xs text-muted-foreground mt-6 text-center">
                Need an account? <span className="text-foreground">Contact your administrator</span> — public sign-up is disabled.
              </p>
            </>
          ) : (
            <ForgotForm onBack={() => setShowForgot(false)} />
          )}
        </div>
      </div>
    </div>
  );
}

function ForgotForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { api } = await import("@/lib/api");
      await api.forgot(email);
      toast.success("If that account exists, a reset email has been sent.");
      onBack();
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold">Reset password</h2>
      <p className="text-muted-foreground text-sm mt-1">Enter your email and we'll send you reset instructions.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="re">Email</Label>
          <Input id="re" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <Button type="submit" disabled={loading} variant="hero" className="w-full">
          {loading ? "Sending…" : "Send reset email"}
        </Button>
        <button type="button" onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground w-full text-center">← Back to sign in</button>
      </form>
    </div>
  );
}
