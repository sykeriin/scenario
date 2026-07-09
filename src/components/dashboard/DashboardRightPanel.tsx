import { useState } from "react";
import { Link } from "react-router-dom";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { GlowingProgress } from "@/components/ui/GlowingProgress";
import { StatRadar } from "@/components/dashboard/StatRadar";
import { useUniverse } from "@/hooks/useUniverse";
import type { Tables } from "@/integrations/supabase/types";

type MorningMust = Tables<"morning_musts">;
type MustCompletion = Tables<"must_completions">;

interface StatItem {
  label: string;
  value: number;
  color: string;
}

interface VitalItem {
  label: string;
  value: number;
  color: string;
}

interface DashboardRightPanelProps {
  musts: MorningMust[];
  completions: MustCompletion[];
  onToggleMust: (mustId: string) => void;
  stats: StatItem[];
  statLabels: string[];
  vitals: VitalItem[];
  pathTitle?: string;
  arcTitle?: string;
  pathProgress?: number;
  pathAlignment?: number;
  characterName?: string;
  characterQuote?: string;
}

type PanelId = "musts" | "stats" | "visitor" | "path";

export function DashboardRightPanel({
  musts,
  completions,
  onToggleMust,
  stats,
  statLabels,
  vitals,
  pathTitle,
  arcTitle,
  pathProgress = 0,
  pathAlignment = 0,
  characterName,
  characterQuote,
}: DashboardRightPanelProps) {
  const [activePanel, setActivePanel] = useState<PanelId>("musts");
  const { t, isSoloLeveling } = useUniverse();

  const panels: { id: PanelId; icon: string; label: string }[] = [
    { id: "musts", icon: "☀", label: "Musts" },
    { id: "stats", icon: "◈", label: "Stats" },
    { id: "visitor", icon: "✦", label: "Visitor" },
    { id: "path", icon: "◎", label: "Path" },
  ];

  const mustDone = completions.length;
  const mustTotal = musts.length || 6;

  return (
    <aside className="hidden lg:flex w-[300px] shrink-0 flex-col border-l border-border bg-[hsl(var(--surface)/0.82)]">
      <div className="flex border-b border-border">
        {panels.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActivePanel(p.id)}
            title={p.label}
            className={`flex-1 border-b-2 py-3 text-base transition-all ${
              activePanel === p.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.icon}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-5">
        {activePanel === "musts" && (
          <div>
            <h3 className="font-cinzel text-sm font-bold text-primary">
              {isSoloLeveling ? "Mandatory Protocol" : "Morning Musts"}
            </h3>
            <p className="mb-4 font-body text-[11px] text-muted-foreground">
              {mustDone}/{mustTotal} complete
            </p>
            <GlowingProgress value={mustDone} max={mustTotal || 1} height="h-1" />
            <div className="mt-4 space-y-0">
              {musts.length === 0 ? (
                <p className="font-body text-xs text-muted-foreground">No morning musts set.</p>
              ) : (
                musts.map((m) => {
                  const done = completions.some((c) => c.must_id === m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onToggleMust(m.id)}
                      className="flex w-full items-center gap-2.5 border-b border-border py-3 text-left"
                    >
                      <div
                        className={`flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded border-[1.5px] ${
                          done
                            ? "border-[hsl(var(--theme-green))] bg-[hsl(var(--theme-green))]"
                            : "border-muted-foreground/40"
                        }`}
                      >
                        {done && (
                          <span className="text-[8px] font-black text-background">✓</span>
                        )}
                      </div>
                      <span
                        className={`font-body text-xs ${
                          done ? "text-muted-foreground line-through" : "text-foreground"
                        }`}
                      >
                        {m.text}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activePanel === "stats" && (
          <div>
            <h3 className="mb-4 font-cinzel text-sm font-bold text-primary">Your Stats</h3>
            {stats.map((s) => (
              <div key={s.label} className="mb-4">
                <div className="mb-1.5 flex justify-between">
                  <span className="font-body text-xs text-foreground">{s.label}</span>
                  <span className="font-mono-stat text-[11px]" style={{ color: s.color }}>
                    {s.value}
                  </span>
                </div>
                <GlowingProgress value={s.value} max={500} color={s.color} height="h-[5px]" />
              </div>
            ))}
            <div className="mt-5 rounded-xl border border-border bg-[hsl(var(--card)/0.75)] p-3.5">
              <div className="mb-2.5 font-mono-stat text-[9px] text-muted-foreground">DAILY VITALS</div>
              {vitals.map((v) => (
                <div key={v.label} className="mb-2.5 flex items-center gap-2">
                  <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: v.color }} />
                  <span className="w-10 font-body text-[11px] text-muted-foreground">{v.label}</span>
                  <div className="flex-1">
                    <GlowingProgress value={v.value} max={10} color={v.color} height="h-1" />
                  </div>
                  <span className="w-6 text-right font-mono-stat text-[10px]" style={{ color: v.color }}>
                    {v.value}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 h-[140px]">
              <StatRadar
                labels={statLabels}
                values={stats.map((s) => s.value)}
              />
            </div>
          </div>
        )}

        {activePanel === "visitor" && (
          <div>
            <div className="mb-3.5 font-mono-stat text-[9px] tracking-[0.2em] text-[#c9a84c]">
              ◆ {isSoloLeveling ? "HUNTER VISITOR" : "CONSTELLATION VISITOR"}
            </div>
            <h3 className="font-cinzel text-base font-bold text-[#c9a84c]">
              {characterName ?? (isSoloLeveling ? "Sung Jinwoo" : "Kim Dokja")}
            </h3>
            <p className="mb-4 font-mono-stat text-[10px] text-muted-foreground">
              {isSoloLeveling ? "The Shadow Monarch" : "The One Who Reads Alone"}
            </p>
            <div className="mb-4 rounded-xl border border-[#c9a84c33] bg-[#0a0800] p-4">
              <p className="font-body text-xs italic leading-relaxed text-foreground">
                "{characterQuote ?? (isSoloLeveling
                  ? "The penalty zone exists for a reason. Get up. Clear the quest."
                  : "You know, I once thought the story would end without me. I was wrong. So are you.")}"
              </p>
            </div>
            <p className="font-mono-stat text-[9px] text-muted-foreground">
              Character visits appear automatically during your journey.
            </p>
          </div>
        )}

        {activePanel === "path" && (
          <div>
            <h3 className="font-cinzel text-sm font-bold text-primary">{t("life_path")}</h3>
            {pathTitle ? (
              <>
                <p className="mt-1 font-body text-xs text-primary">{pathTitle}</p>
                <p className="mb-4 font-body text-[11px] italic text-muted-foreground">{arcTitle}</p>
                <GlowingProgress value={pathProgress} max={100} height="h-[5px]" />
                <div className="mt-1.5 mb-5 flex justify-between">
                  <span className="font-mono-stat text-[9px] text-muted-foreground">
                    {pathProgress}% complete
                  </span>
                  <span className="font-mono-stat text-[9px] text-[hsl(var(--theme-green))]">
                    Aligned · {pathAlignment}%
                  </span>
                </div>
              </>
            ) : (
              <p className="mt-2 font-body text-xs text-muted-foreground">No active life path yet.</p>
            )}
            <Link
              to="/life-path"
              className="inline-block font-mono-stat text-[10px] text-primary hover:underline"
            >
              View full {t("life_path").toLowerCase()} →
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
