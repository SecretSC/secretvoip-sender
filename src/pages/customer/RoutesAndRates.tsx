import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui-kit";
import { Input } from "@/components/ui/input";
import { GAMMA_COUNTRIES, ROUTE_CATALOG, EPSILON_SUBROUTES } from "@/lib/routes";
import { Search } from "lucide-react";

export default function RoutesAndRates({ kind = "customer" }: { kind?: "customer" | "admin" }) {
  const [q, setQ] = useState("");
  const filtered = GAMMA_COUNTRIES.filter((c) =>
    !q || c.country.toLowerCase().includes(q.toLowerCase()) || c.dial.includes(q) || c.iso.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <DashboardLayout kind={kind}>
      <PageHeader title="Routes & Rates" subtitle="Browse the route families and per-country Gamma channel pricing." />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {ROUTE_CATALOG.map((r) => (
          <div key={r.option_id} className="ring-gradient glass rounded-2xl p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Route</div>
            <div className="font-display text-lg mt-1">{r.label}</div>
            <div className="text-xs text-muted-foreground mt-1">{r.subtitle}</div>
            {r.family === "epsilon" && (
              <div className="mt-3 flex flex-wrap gap-1">
                {EPSILON_SUBROUTES.slice(0, 6).map((s) => (
                  <span key={s.option_id} className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-card/60 text-muted-foreground">{s.label}</span>
                ))}
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-card/60 text-muted-foreground">+{EPSILON_SUBROUTES.length - 6}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="ring-gradient glass rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Route Gamma</div>
            <div className="font-display text-lg">Country / channel pricing</div>
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
                <th className="text-left py-2 px-2">Channels</th>
                <th className="text-right py-2 px-2">Price (€)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.flatMap((c) =>
                c.channels.map((ch, i) => (
                  <tr key={ch.option_id} className="border-t border-border/60">
                    <td className="py-2 px-2 whitespace-nowrap">
                      {i === 0 ? <span className="font-medium">{c.country}</span> : <span className="text-muted-foreground/60">↳</span>}
                    </td>
                    <td className="py-2 px-2 text-muted-foreground">{i === 0 ? c.dial : ""}</td>
                    <td className="py-2 px-2 font-mono text-xs">{ch.name}</td>
                    <td className="py-2 px-2 text-right text-secondary-glow font-medium">{ch.price.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
