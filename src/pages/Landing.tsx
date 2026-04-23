import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Globe2, Radar, ShieldCheck, Activity, Users, Zap, Lock, BarChart3 } from "lucide-react";

const Feature = ({ icon: Icon, title, desc }: any) => (
  <div className="ring-gradient relative glass rounded-2xl p-6 shadow-card transition-smooth hover:-translate-y-1">
    <div className="w-11 h-11 rounded-xl bg-gradient-primary grid place-items-center shadow-glow-primary mb-4">
      <Icon className="w-5 h-5 text-primary-foreground" />
    </div>
    <h3 className="font-display text-lg font-semibold">{title}</h3>
    <p className="text-sm text-muted-foreground mt-1.5">{desc}</p>
  </div>
);

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-30 backdrop-blur-md border-b border-border/60 bg-background/60">
        <div className="container flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-primary grid place-items-center shadow-glow-primary">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="font-display font-semibold">SecretVoIP</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">SMS Platform</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-smooth">Features</a>
            <a href="#routes" className="hover:text-foreground transition-smooth">Routes</a>
            <a href="#access" className="hover:text-foreground transition-smooth">Access</a>
          </nav>
          <Link to="/login">
            <Button variant="hero" size="sm">Sign in <ArrowRight className="w-4 h-4 ml-1" /></Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/10 blur-[140px]" aria-hidden />
        <div className="container relative py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/70 glass text-xs text-muted-foreground mb-6 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-glow animate-glow-pulse" />
            Premium private-label SMS infrastructure
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-semibold tracking-tight max-w-4xl mx-auto leading-[1.05] animate-fade-in">
            Premium <span className="gradient-text">Bulk SMS</span> delivery, engineered for serious senders.
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mt-5 animate-fade-in">
            Global routes, real-time delivery monitoring, and a transparent rate book — wrapped in a fast, secure
            dashboard for your team and your customers.
          </p>
          <div className="flex items-center justify-center gap-3 mt-8 animate-fade-in">
            <Link to="/login">
              <Button variant="hero" size="lg">Sign in to your workspace <ArrowRight className="w-4 h-4 ml-1" /></Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="lg">See the platform</Button>
            </a>
          </div>

          {/* Stat strip */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
            {[
              ["32+", "Countries"], ["4", "Route families"], ["99.9%", "Delivery uptime"], ["<1s", "API latency"],
            ].map(([v, l]) => (
              <div key={l as string} className="ring-gradient glass rounded-2xl p-4">
                <div className="font-display text-2xl">{v}</div>
                <div className="text-xs text-muted-foreground mt-1">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs uppercase tracking-widest text-secondary-glow">Built for delivery</div>
          <h2 className="font-display text-3xl md:text-4xl font-semibold mt-2">A complete operations console</h2>
          <p className="text-muted-foreground mt-3">Everything you need to send, route, monitor and audit messaging at scale.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          <Feature icon={Globe2}  title="Global multi-route delivery" desc="Alpha, Beta, Epsilon and country-direct Gamma routes — pick the right path for every destination." />
          <Feature icon={Radar}   title="Live route tester"           desc="Test one route, several, or all of them on a single number to see latency and delivery before you launch a campaign." />
          <Feature icon={BarChart3} title="Transparent rates"         desc="Per-country, per-channel pricing right inside the dashboard. No hidden surprises on the invoice." />
          <Feature icon={Activity} title="Delivery monitoring"        desc="Inspect every send, segment count, status and cost — filtered by recipient, date range or status." />
          <Feature icon={ShieldCheck} title="Admin-managed access"    desc="Closed platform. Customer accounts are provisioned by your team. No public sign-up surface." />
          <Feature icon={Lock}    title="Secure by design"            desc="Role-based auth, encrypted credentials and an immutable audit log of every sensitive action." />
        </div>
      </section>

      {/* Routes highlight */}
      <section id="routes" className="container py-16">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div className="ring-gradient glass rounded-3xl p-8 shadow-elevated">
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: "Alpha", desc: "Premium worldwide" },
                { name: "Beta", desc: "Standard worldwide" },
                { name: "Epsilon", desc: "High deliverability · 13 sub-routes" },
                { name: "Gamma", desc: "Country-direct · 32+ destinations" },
              ].map((r) => (
                <div key={r.name} className="rounded-xl p-4 border border-border bg-card/60">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Route</div>
                  <div className="font-display text-xl mt-1">{r.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{r.desc}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-primary-glow">Route catalog</div>
            <h2 className="font-display text-3xl md:text-4xl font-semibold mt-2">Choose the route, control the cost.</h2>
            <p className="text-muted-foreground mt-3 max-w-lg">
              Send via the route family that fits your traffic profile, or pick a specific country channel for
              maximum deliverability. Pricing is published per channel — what you see is what you pay.
            </p>
            <div className="mt-6 flex gap-3">
              <Link to="/login"><Button variant="hero">Open the dashboard <ArrowRight className="w-4 h-4 ml-1" /></Button></Link>
            </div>
          </div>
        </div>
      </section>

      {/* Admin-managed access */}
      <section id="access" className="container py-20">
        <div className="ring-gradient glass rounded-3xl p-10 text-center max-w-3xl mx-auto">
          <Users className="w-7 h-7 mx-auto text-secondary-glow" />
          <h3 className="font-display text-2xl md:text-3xl font-semibold mt-3">A closed, admin-managed platform</h3>
          <p className="text-muted-foreground mt-3">
            There's no public sign-up. Accounts are issued by our team — talk to your account manager to get access for
            your organisation.
          </p>
          <div className="mt-6">
            <Link to="/login"><Button variant="hero" size="lg">Sign in <ArrowRight className="w-4 h-4 ml-1" /></Button></Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-10 mt-10">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-primary grid place-items-center"><Zap className="w-3 h-3 text-primary-foreground" /></div>
            <span>© {new Date().getFullYear()} SecretVoIP — All rights reserved.</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#routes" className="hover:text-foreground">Routes</a>
            <Link to="/login" className="hover:text-foreground">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
