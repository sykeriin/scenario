import { useEffect, useState } from "react";
import { dataClient } from "@/lib/data-client";
import { useUniverse } from "@/hooks/useUniverse";
import { UniverseNotification } from "@/components/UniverseNotification";
import { getMonarchName } from "@/lib/solo-leveling/monarch-types";
import { DEMON_DOMAIN_META, type DemonEncounter } from "@/lib/demonTypes";

interface DemonEncounterCardProps {
  encounter: DemonEncounter;
  onDismiss: () => void;
}

export function DemonEncounterCard({ encounter, onDismiss }: DemonEncounterCardProps) {
  const { isSoloLeveling, t } = useUniverse();
  const [phase, setPhase] = useState<"disguised" | "revealed" | "resisting" | "submitting" | "done">("disguised");
  const [showHint, setShowHint] = useState(false);
  const [result, setResult] = useState<{ type: "resisted" | "submitted"; xp: number; titles?: string[] } | null>(null);

  const demon = encounter.demon_constellations;
  const domainMeta = DEMON_DOMAIN_META[demon?.domain ?? "Sloth"] ?? DEMON_DOMAIN_META.Sloth;

  // Show ??? hint after 5 seconds
  useEffect(() => {
    if (phase !== "disguised") return;
    const timer = setTimeout(() => setShowHint(true), 5000);
    return () => clearTimeout(timer);
  }, [phase]);

  const handleReveal = () => setPhase("revealed");

  const handleResist = async () => {
    setPhase("resisting");
    try {
      const { data } = await dataClient.functions.invoke("generate-demon-encounter", {
        body: { action: "resist" },
      });
      setResult({ type: "resisted", xp: data?.xp_awarded ?? 0, titles: data?.titles_unlocked });
      setPhase("done");
    } catch {
      setPhase("revealed");
    }
  };

  const handleSubmit = async () => {
    setPhase("submitting");
    try {
      const { data } = await dataClient.functions.invoke("generate-demon-encounter", {
        body: { action: "submit" },
      });
      setResult({ type: "submitted", xp: data?.xp_lost ?? 0 });
      setPhase("done");
    } catch {
      setPhase("revealed");
    }
  };

  // Result overlay
  if (phase === "done" && result) {
    return (
      <SystemMessage
        title={result.type === "resisted" ? "THE DEMON HAS BEEN REPELLED" : "The Demon's influence took hold"}
        subtitle={
          result.type === "resisted"
            ? `${demon?.name ?? "Demon"} retreats. +${result.xp} XP${result.titles?.length ? ` | Title: ${result.titles.join(", ")}` : ""}`
            : `You will do better next time. -${result.xp} XP`
        }
        rarity={result.type === "resisted" ? "epic" : "common"}
        onDismiss={onDismiss}
      />
    );
  }

  // Disguised phase — looks like a normal system message but with demon-pulse
  if (phase === "disguised") {
    return (
      <div className="fixed top-6 right-6 z-[100]">
        <div
          className="pointer-events-auto min-w-[280px] max-w-[380px] border-2 border-destructive/30 bg-card/95 backdrop-blur-md rounded-sm animate-fade-in"
          style={{ animation: "demon-pulse 3s ease-in-out infinite, fade-in 0.5s ease-out" }}
        >
          <div className="h-[2px] w-full bg-destructive/40" />
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono-stat text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
                ◈ System Notification
              </span>
              <span className="font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground">
                [scenario]
              </span>
            </div>
            <div className="h-px bg-border" />
            <div className="text-center py-1">
              <p className="font-cinzel text-sm font-bold tracking-[0.15em] text-foreground">
                Scenario Suggestion
              </p>
              <p className="font-cinzel text-base font-black tracking-wider mt-1 text-foreground">
                「{encounter.scenario_title}」
              </p>
              <p className="font-body text-xs text-muted-foreground mt-2">
                {encounter.scenario_content}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <div className="h-px flex-1 bg-border" />
              <span className="font-mono-stat text-[8px] text-muted-foreground">◆ ◆ ◆</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </div>
          <div className="h-[2px] w-full bg-destructive/40" />

          {/* ??? hint */}
          {showHint && (
            <button
              onClick={handleReveal}
              className="absolute top-2 right-2 font-cinzel text-xs font-bold text-destructive/70 hover:text-destructive animate-fade-in cursor-pointer"
              title="Something feels wrong..."
            >
              ???
            </button>
          )}
        </div>
      </div>
    );
  }

  // Revealed phase
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md mx-4 border-2 rounded-sm bg-card/95 backdrop-blur-md"
        style={{
          borderColor: `hsl(${domainMeta.color})`,
          boxShadow: `0 0 40px hsl(${domainMeta.color} / 0.3)`,
        }}
      >
        {/* Top accent */}
        <div className="h-[3px] w-full" style={{ background: `hsl(${domainMeta.color})` }} />

        <div className="p-6 space-y-4">
          {/* Warning header */}
          <div className="text-center space-y-1">
            <p className="font-mono-stat text-[10px] uppercase tracking-[0.3em] text-destructive animate-pulse">
              ⚠ WARNING — DEMON CONSTELLATION DETECTED
            </p>
          </div>

          <div className="h-px bg-border" />

          {/* Demon identity */}
          <div className="text-center space-y-1">
            <span className="text-3xl">{domainMeta.icon}</span>
            <p className="font-cinzel text-lg font-black tracking-wider" style={{ color: `hsl(${domainMeta.color})` }}>
              {demon?.name ?? "Unknown Demon"}
            </p>
            <p className="font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground">
              {demon?.grade} Grade — Domain of {demon?.domain}
            </p>
          </div>

          <div className="h-px bg-border" />

          {/* What the demon wants */}
          <div className="space-y-3">
            <div className="rounded border border-destructive/30 bg-destructive/5 p-3">
              <div className="flex items-start gap-2">
                <span className="text-destructive font-bold text-sm">✗</span>
                <div>
                  <p className="font-mono-stat text-[9px] uppercase tracking-wider text-destructive mb-1">
                    The demon wants you to:
                  </p>
                  <p className="font-body text-sm text-foreground">{encounter.intended_effect}</p>
                </div>
              </div>
            </div>

            <div className="rounded border border-green-500/30 bg-green-500/5 p-3">
              <div className="flex items-start gap-2">
                <span className="text-green-500 font-bold text-sm">✓</span>
                <div>
                  <p className="font-mono-stat text-[9px] uppercase tracking-wider text-green-500 mb-1">
                    The correct action:
                  </p>
                  <p className="font-body text-sm text-foreground">{encounter.correct_action}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleResist}
              disabled={phase === "resisting"}
              className="flex-1 py-2.5 rounded font-cinzel text-sm font-bold tracking-wider border border-green-500/50 text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-50"
            >
              {phase === "resisting" ? "Resisting..." : "⚔ Resist"}
            </button>
            <button
              onClick={handleSubmit}
              disabled={phase === "submitting"}
              className="flex-1 py-2.5 rounded font-cinzel text-sm font-bold tracking-wider border border-destructive/50 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              {phase === "submitting" ? "..." : "Submit"}
            </button>
          </div>

          {/* XP info */}
          <div className="flex justify-between font-mono-stat text-[9px] text-muted-foreground">
            <span>Resist: +{encounter.resistance_xp_reward} XP</span>
            <span>Submit: -{encounter.submission_penalty} XP</span>
          </div>
        </div>

        <div className="h-[3px] w-full" style={{ background: `hsl(${domainMeta.color})` }} />
      </div>
    </div>
  );
}
