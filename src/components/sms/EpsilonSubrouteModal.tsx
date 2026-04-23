import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { EPSILON_SUBROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { Radar } from "lucide-react";

export type EpsilonSelection = { option_id: string; label: string };

export default function EpsilonSubrouteModal({
  open, onOpenChange, onSelect, value,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (sel: EpsilonSelection) => void;
  value?: EpsilonSelection | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl glass-strong border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Radar className="w-5 h-5 text-primary-glow" /> Route Epsilon — Select sub-route
          </DialogTitle>
          <DialogDescription>
            Pick a TTSKY sub-route. Per-sub-route route testing is enabled only when supported by the upstream backend —
            otherwise tests fall back to the main Epsilon route.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
          {EPSILON_SUBROUTES.map((s) => {
            const selected = value?.option_id === s.option_id;
            return (
              <button
                key={s.option_id}
                onClick={() => { onSelect(s); onOpenChange(false); }}
                className={cn(
                  "rounded-xl border p-4 text-left transition-smooth",
                  selected ? "border-primary/60 bg-primary/10 shadow-glow-primary" : "border-border bg-card/50 hover:border-secondary/50 hover:bg-card"
                )}
              >
                <div className="text-xs text-muted-foreground">Epsilon</div>
                <div className="font-display text-base mt-0.5">{s.label}</div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
