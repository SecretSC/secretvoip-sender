import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui-kit";
import { Input } from "@/components/ui/input";
import { GAMMA_COUNTRIES, ROUTE_CATALOG, EPSILON_SUBROUTES } from "@/lib/routes";
import { Search } from "lucide-react";

const num = (v: unknown, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

// Reseller markup applied on top of provider prices for customer-facing display.
const MARKUP = 1.5; // 50%

// Headline customer prices for the flat routes (provider 0.06 € * 1.5 = 0.09 €)
const ROUTE_HEADLINE_PRICE_EUR: Record<string, number> = {
  alpha: 0.09,
  beta: 0.09,
  epsilon: 0.09, // varies by sub-route, this is the indicative headline
  gamma: 0, // varies by country, shown in table below
};

export default function RoutesAndRates({ kind = "customer" }: { kind?: "customer" | "admin" }) {
  const [q, setQ] = useState("");
  const isAdmin = kind === "admin";

  const filtered = GAMMA_COUNTRIES.filter((c) =>
    !q ||
    c.country.toLowerCase().includes(q.toLowerCase()) ||
    c.dial.includes(q) ||
    c.iso.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <DashboardLayout kind={kind}>
      <PageHeader
        title="Routes & Rates"
        subtitle={
          isAdmin
            ? "Provider cost, customer price (50% markup) and your profit margin per route."
            : "Browse the route families and per-country channel pricing."
        }
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {ROUTE_CATALOG.map((r) => {
          const head = ROUTE_HEADLINE_PRICE_EUR[r.family] || 0;
          return (
            <div key={r.option_id} className="ring-gradient glass rounded-2xl p-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Route</div>
              <div className="font-display text-lg mt-1">{r.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{r.subtitle}</div>

              {r.family !== "gamma" && (
                <div className="mt-3 text-xs">
                  <span className="text-muted-foreground">From </span>
                  <span className="text-secondary-glow font-medium">{head.toFixed(2)} €</span>
                  <span className="text-muted-foreground"> / SMS</span>
                </div>
              )}

              {r.family === "epsilon" && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {EPSILON_SUBROUTES.slice(0, 6).map((s) => (
                    <span key={s.option_id} className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-card/60 text-muted-foreground">{s.label}</span>
                  ))}
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-card/60 text-muted-foreground">+{EPSILON_SUBROUTES.length - 6}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="ring-gradient glass rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Route Gamma</div>
            <div className="font-display text-lg">Country / channel pricing</div>
            {isAdmin && (
              <div className="text-xs text-muted-foreground mt-1">
                Provider price · Your customer price (×{MARKUP}) · Margin per SMS
              </div>
            )}
          </div>
          <div className="relative w-64 max-w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search country…" className="pl-9 h-9" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="text-left py-2 px-2">Country</th>
                <th className="text-left py-2 px-2">Dial</th>
                <th className="text-left py-2 px-2">Channel</th>
                {isAdmin && <th className="text-right py-2 px-2">Provider (€)</th>}
                <th className="text-right py-2 px-2">{isAdmin ? "Customer (€)" : "Price (€)"}</th>
                {isAdmin && <th className="text-right py-2 px-2">Margin (€)</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.flatMap((c) =>
                c.channels.map((ch, i) => {
                  const provider = num(ch.price);
                  const customer = +(provider * MARKUP).toFixed(4);
                  const margin = +(customer - provider).toFixed(4);
                  return (
                    <tr key={ch.option_id} className="border-t border-border/60">
                      <td className="py-2 px-2 whitespace-nowrap">
                        {i === 0 ? <span className="font-medium">{c.country}</span> : <span className="text-muted-foreground/60">↳</span>}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">{i === 0 ? c.dial : ""}</td>
                      <td className="py-2 px-2 font-mono text-xs">{ch.name}</td>
                      {isAdmin && <td className="py-2 px-2 text-right text-muted-foreground">{provider.toFixed(3)}</td>}
                      <td className="py-2 px-2 text-right text-secondary-glow font-medium">{customer.toFixed(3)}</td>
                      {isAdmin && <td className="py-2 px-2 text-right text-success">{margin.toFixed(3)}</td>}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
