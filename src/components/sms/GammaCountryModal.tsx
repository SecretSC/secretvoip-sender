import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { GAMMA_COUNTRIES, GammaChannel, GammaCountry } from "@/lib/routes";
import { Search, Globe2, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

export type GammaSelection = { option_id: string; label: string; price: number };

const num = (v: unknown, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

export default function GammaCountryModal({
  open, onOpenChange, onSelect, value,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (sel: GammaSelection) => void;
  value?: GammaSelection | null;
}) {
  const [q, setQ] = useState("");
  const [openCountry, setOpenCountry] = useState<string | null>(null);
  const [countries, setCountries] = useState<GammaCountry[]>(GAMMA_COUNTRIES);
  const [loading, setLoading] = useState(false);

  // Pull live customer-marked-up prices from backend the first time the modal opens.
  useEffect(() => {
    if (!open) return;
    let cancel = false;
    setLoading(true);
    (async () => {
      try {
        const data: any = await api.routes(true);
        if (cancel) return;
        const live = data?.gamma_by_country;
        if (live && typeof live === "object") {
          const merged: GammaCountry[] = GAMMA_COUNTRIES.map((c) => {
            const liveCh = Array.isArray(live?.[c.country]) ? live[c.country] : null;
            return {
              ...c,
              channels: (liveCh || c.channels).map((ch: any) => ({
                option_id: ch.option_id,
                name: ch.name,
                price: num(ch.price),
              })),
            };
          });
          setCountries(merged);
        } else {
          // Fallback: apply 1.5x to seed provider prices client-side so customer
          // never sees raw provider rates if backend is unreachable.
          const mult = num(data?.markup_multiplier, 1.5);
          setCountries(GAMMA_COUNTRIES.map((c) => ({
            ...c,
            channels: c.channels.map((ch) => ({
              ...ch,
              price: +(num(ch.price) * mult).toFixed(4),
            })),
          })));
        }
      } catch {
        // Network error → still show 1.5x marked up prices, never raw provider prices.
        setCountries(GAMMA_COUNTRIES.map((c) => ({
          ...c,
          channels: c.channels.map((ch) => ({
            ...ch,
            price: +(num(ch.price) * 1.5).toFixed(4),
          })),
        })));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [open]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return countries;
    return countries.filter(
      (c) => c.country.toLowerCase().includes(needle) || c.dial.includes(needle) || c.iso.toLowerCase().includes(needle)
    );
  }, [q, countries]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden p-0 glass-strong border-border">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-secondary-glow" /> Route Gamma — Select country & channel
          </DialogTitle>
          <DialogDescription>Direct international delivery. Pick a country, then choose a channel.</DialogDescription>
        </DialogHeader>

        <div className="px-6 mt-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search country, ISO or dial code…" className="pl-9" />
          </div>
          {loading && (
            <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading live pricing…
            </div>
          )}
        </div>

        <div className="px-6 pb-6 mt-3 overflow-y-auto" style={{ maxHeight: "60vh" }}>
          <div className="space-y-2">
            {filtered.map((c) => {
              const isOpen = openCountry === c.country;
              const prices = c.channels.map((ch) => num(ch.price));
              const min = prices.length ? Math.min(...prices) : 0;
              const max = prices.length ? Math.max(...prices) : 0;
              return (
                <div key={c.country} className="rounded-xl border border-border bg-card/50 overflow-hidden">
                  <button
                    onClick={() => setOpenCountry(isOpen ? null : c.country)}
                    className="w-full flex items-center justify-between gap-3 p-3 hover:bg-card transition-smooth"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-muted/50 grid place-items-center text-xs font-mono font-semibold border border-border">
                        {c.iso}
                      </div>
                      <div className="text-left min-w-0">
                        <div className="font-medium truncate">{c.country}</div>
                        <div className="text-xs text-muted-foreground">{c.dial} · {c.channels.length} channels</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-muted-foreground hidden sm:block">
                        {min === max ? `${num(min).toFixed(2)} €` : `${num(min).toFixed(2)} – ${num(max).toFixed(2)} €`}
                      </div>
                      <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 grid grid-cols-2 sm:grid-cols-3 gap-2 animate-fade-in">
                      {c.channels.map((ch) => (
                        <ChannelChip
                          key={ch.option_id}
                          ch={ch}
                          country={c.country}
                          selected={value?.option_id === ch.option_id}
                          onClick={() => {
                            onSelect({ option_id: ch.option_id, label: `${c.country} · ${ch.name}`, price: num(ch.price) });
                            onOpenChange(false);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-10">No countries match "{q}".</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChannelChip({ ch, selected, onClick }: { ch: GammaChannel; country: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg border p-3 text-left transition-smooth",
        selected ? "border-primary/60 bg-primary/10 shadow-glow-primary" : "border-border bg-background/40 hover:border-secondary/50 hover:bg-card"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="font-mono text-sm">{ch.name}</div>
        <div className="text-xs text-secondary-glow font-medium">{num(ch.price).toFixed(2)} €</div>
      </div>
    </button>
  );
}
