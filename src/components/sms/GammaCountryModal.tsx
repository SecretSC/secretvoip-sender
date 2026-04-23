import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GAMMA_COUNTRIES, GammaChannel } from "@/lib/routes";
import { Search, Globe2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type GammaSelection = { option_id: string; label: string; price: number };

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

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return GAMMA_COUNTRIES;
    return GAMMA_COUNTRIES.filter(
      (c) => c.country.toLowerCase().includes(needle) || c.dial.includes(needle) || c.iso.toLowerCase().includes(needle)
    );
  }, [q]);

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
        </div>

        <div className="px-6 pb-6 mt-3 overflow-y-auto" style={{ maxHeight: "60vh" }}>
          <div className="space-y-2">
            {filtered.map((c) => {
              const isOpen = openCountry === c.country;
              const min = Math.min(...c.channels.map((ch) => ch.price));
              const max = Math.max(...c.channels.map((ch) => ch.price));
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
                        {min === max ? `${min.toFixed(2)} €` : `${min.toFixed(2)} – ${max.toFixed(2)} €`}
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
                            onSelect({ option_id: ch.option_id, label: `${c.country} · ${ch.name}`, price: ch.price });
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
        <div className="text-xs text-secondary-glow font-medium">{ch.price.toFixed(2)} €</div>
      </div>
    </button>
  );
}
