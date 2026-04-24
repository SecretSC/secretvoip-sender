import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui-kit";
import { Input } from "@/components/ui/input";
import { ROUTE_CATALOG, EPSILON_SUBROUTES, GAMMA_COUNTRIES } from "@/lib/routes";
import { Search, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

const num = (v: unknown, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

type GammaChannelLive = { option_id: string; name: string; price: number; provider_price?: number };
type GammaCountryLive = { country: string; iso: string; dial: string; channels: GammaChannelLive[] };

export default function RoutesAndRates({ kind = "customer" }: { kind?: "customer" | "admin" }) {
  const [q, setQ] = useState("");
  const isAdmin = kind === "admin";
  const [loading, setLoading] = useState(true);
  const [multiplier, setMultiplier] = useState(1.5);
  const [flat, setFlat] = useState<Record<string, { customer_price: number; provider_price?: number }>>({});
  const [countries, setCountries] = useState<GammaCountryLive[]>([]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const data: any = isAdmin ? await api.routesAdmin(true) : await api.routes(true);
        if (cancel) return;
        setMultiplier(num(data?.markup_multiplier, 1.5));
        setFlat(data?.flat_routes || {});
        // Backend returns gamma_by_country as { [country]: channel[] }; the local
        // catalog has the dial/iso metadata. Merge the two so prices stay live.
        const live = data?.gamma_by_country;
        const merged: GammaCountryLive[] = GAMMA_COUNTRIES.map((c) => {
          const liveCh = Array.isArray(live?.[c.country]) ? live[c.country] : null;
          return {
            country: c.country,
            iso: c.iso,
            dial: c.dial,
            channels: (liveCh || c.channels).map((ch: any) => ({
              option_id: ch.option_id,
              name: ch.name,
              price: num(ch.price),
              provider_price: ch.provider_price != null ? num(ch.provider_price) : undefined,
            })),
          };
        });
        setCountries(merged);
      } catch {
        // Fallback to seed data with client-side markup so the page never breaks.
        setCountries(GAMMA_COUNTRIES.map((c) => ({
          ...c,
          channels: c.channels.map((ch) => ({
            option_id: ch.option_id, name: ch.name,
            price: +(num(ch.price) * 1.5).toFixed(4),
            provider_price: num(ch.price),
          })),
        })));
      } finally { if (!cancel) setLoading(false); }
    })();
    return () => { cancel = true; };
  }, [isAdmin]);

  const filtered = countries.filter((c) =>
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
            ? `Live pricing — provider cost, customer price (×${multiplier}) and your margin.`
            : "Browse the route families and per-country channel pricing."
        }
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {ROUTE_CATALOG.map((r) => {
          const f = flat[r.family];
          const customer = f ? num(f.customer_price) : 0;
          const provider = f && f.provider_price != null ? num(f.provider_price) : null;
          return (
            <div key={r.option_id} className="ring-gradient glass rounded-2xl p-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Route</div>
              <div className="font-display text-lg mt-1">{r.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{r.subtitle}</div>

              {r.family !== "gamma" && (
                <div className="mt-3 space-y-1 text-xs">
                  <div>
                    <span className="text-muted-foreground">Customer </span>
                    <span className="text-secondary-glow font-medium">{customer.toFixed(3)} €</span>
                    <span className="text-muted-foreground"> / SMS</span>
                  </div>
                  {isAdmin && provider != null && (
                    <div className="text-muted-foreground">
                      Provider <span className="text-foreground">{provider.toFixed(3)} €</span>
                      <span className="text-success ml-2">+{(customer - provider).toFixed(3)} €</span>
                    </div>
                  )}
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
                Provider price · Customer price (×{multiplier}) · Margin per SMS
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
              {loading ? (
                <tr><td colSpan={isAdmin ? 6 : 4} className="py-8 text-center text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading live pricing…
                </td></tr>
              ) : filtered.flatMap((c) =>
                c.channels.map((ch, i) => {
                  const customer = num(ch.price);
                  // Customer view never has provider_price; derive it from multiplier for admin only.
                  const provider = isAdmin
                    ? (ch.provider_price != null ? num(ch.provider_price) : +(customer / multiplier).toFixed(4))
                    : 0;
                  const margin = isAdmin ? +(customer - provider).toFixed(4) : 0;
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
