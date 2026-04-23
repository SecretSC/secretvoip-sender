import { useState } from "react";
import { ROUTE_CATALOG } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { Globe2, Radar, Send, Zap } from "lucide-react";
import GammaCountryModal, { GammaSelection } from "./GammaCountryModal";
import EpsilonSubrouteModal, { EpsilonSelection } from "./EpsilonSubrouteModal";

export type RouteSelection =
  | { kind: "alpha" | "beta"; option_id: string; label: string }
  | { kind: "epsilon"; option_id: string; label: string; subroute?: EpsilonSelection }
  | { kind: "gamma"; option_id: string; label: string; gamma: GammaSelection };

export function defaultSelection(): RouteSelection {
  return { kind: "alpha", option_id: "alpha", label: "Route Alpha" };
}

const iconFor: Record<string, any> = { alpha: Send, beta: Zap, epsilon: Radar, gamma: Globe2 };

export default function RoutePicker({
  value, onChange,
}: { value: RouteSelection; onChange: (v: RouteSelection) => void }) {
  const [gammaOpen, setGammaOpen] = useState(false);
  const [epsOpen, setEpsOpen] = useState(false);

  const handleCardClick = (familyId: string) => {
    if (familyId === "gamma") return setGammaOpen(true);
    if (familyId === "epsilon") {
      onChange({ kind: "epsilon", option_id: "epsilon", label: "Route Epsilon" });
      setEpsOpen(true);
      return;
    }
    onChange({
      kind: familyId as "alpha" | "beta",
      option_id: familyId,
      label: ROUTE_CATALOG.find((r) => r.option_id === familyId)!.label,
    });
  };

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ROUTE_CATALOG.map((r) => {
          const active = value.kind === r.family;
          const Icon = iconFor[r.family];
          return (
            <button
              key={r.option_id}
              type="button"
              onClick={() => handleCardClick(r.option_id)}
              className={cn(
                "ring-gradient relative text-left rounded-2xl p-4 border transition-smooth glass",
                active ? "border-primary/60 shadow-glow-primary" : "border-border hover:border-secondary/40"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn("w-10 h-10 rounded-xl grid place-items-center",
                  active ? "bg-gradient-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground")}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display font-semibold">{r.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{r.subtitle}</div>

                  {active && r.family === "epsilon" && (
                    <div className="text-xs mt-2 text-secondary-glow">
                      {value.kind === "epsilon" && value.subroute ? `Sub-route: ${value.subroute.label}` : "Pick a TTSKY sub-route →"}
                    </div>
                  )}
                  {active && r.family === "gamma" && (
                    <div className="text-xs mt-2 text-secondary-glow">
                      {value.kind === "gamma" ? value.gamma.label : "Pick a country & channel →"}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <GammaCountryModal
        open={gammaOpen}
        onOpenChange={setGammaOpen}
        value={value.kind === "gamma" ? value.gamma : null}
        onSelect={(sel) =>
          onChange({ kind: "gamma", option_id: sel.option_id, label: `Route Gamma · ${sel.label}`, gamma: sel })
        }
      />
      <EpsilonSubrouteModal
        open={epsOpen}
        onOpenChange={setEpsOpen}
        value={value.kind === "epsilon" ? value.subroute || null : null}
        onSelect={(sel) =>
          onChange({ kind: "epsilon", option_id: sel.option_id, label: `Route Epsilon · ${sel.label}`, subroute: sel })
        }
      />
    </div>
  );
}
