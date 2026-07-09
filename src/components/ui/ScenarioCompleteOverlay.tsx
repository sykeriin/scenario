import { useEffect, useState } from "react";

interface ScenarioCompleteOverlayProps {
  title: string;
  xpReward?: number;
  onDismiss: () => void;
}

export const ScenarioCompleteOverlay = ({ title, xpReward, onDismiss }: ScenarioCompleteOverlayProps) => {
  const [phase, setPhase] = useState<"bg" | "text" | "details" | "exit">("bg");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("text"), 300);
    const t2 = setTimeout(() => setPhase("details"), 1200);
    const t3 = setTimeout(() => setPhase("exit"), 5000);
    const t4 = setTimeout(() => onDismiss(), 5800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onDismiss]);

  const phaseIndex = ["bg", "text", "details", "exit"].indexOf(phase);

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center cursor-pointer transition-opacity duration-700 ${phaseIndex >= 3 ? "opacity-0" : "opacity-100"}`}
      onClick={onDismiss}
    >
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-background/95 backdrop-blur-sm transition-opacity duration-500 ${phaseIndex >= 0 ? "opacity-100" : "opacity-0"}`} />

      {/* Radial glow */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${phaseIndex >= 1 ? "opacity-100" : "opacity-0"}`}
        style={{
          background: "radial-gradient(circle at center, hsl(var(--primary) / 0.15) 0%, transparent 60%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center space-y-6 px-8 max-w-lg">
        {/* Top decoration */}
        <div className={`flex items-center justify-center gap-3 transition-all duration-700 ${phaseIndex >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <div className="h-px w-16 bg-primary/40" />
          <span className="font-mono-stat text-[9px] uppercase tracking-[0.4em] text-primary/60">
            ◈ Scenario Cleared ◈
          </span>
          <div className="h-px w-16 bg-primary/40" />
        </div>

        {/* Main title */}
        <h1
          className={`font-cinzel text-3xl md:text-4xl font-black tracking-[0.2em] text-primary transition-all duration-700 ${phaseIndex >= 1 ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}
          style={{
            textShadow: "0 0 40px hsl(var(--primary) / 0.5), 0 0 80px hsl(var(--primary) / 0.2)",
          }}
        >
          SCENARIO COMPLETE
        </h1>

        {/* Scenario name */}
        <p className={`font-cinzel text-lg text-foreground/80 tracking-wider transition-all duration-700 delay-200 ${phaseIndex >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          「{title}」
        </p>

        {/* Divider */}
        <div className={`flex items-center justify-center gap-2 transition-all duration-500 ${phaseIndex >= 2 ? "opacity-100" : "opacity-0"}`}>
          <div className="h-px w-20 bg-border" />
          <span className="font-mono-stat text-[8px] text-muted-foreground">◆ ◆ ◆</span>
          <div className="h-px w-20 bg-border" />
        </div>

        {/* XP Reward */}
        {xpReward && (
          <div className={`transition-all duration-700 ${phaseIndex >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <span
              className="font-cinzel text-2xl font-bold text-primary animate-glow-pulse"
              style={{ textShadow: "0 0 20px hsl(var(--primary) / 0.4)" }}
            >
              +{xpReward} XP
            </span>
          </div>
        )}

        {/* Click to dismiss */}
        <p className={`font-mono-stat text-[9px] text-muted-foreground/50 tracking-wider transition-all duration-500 ${phaseIndex >= 2 ? "opacity-100" : "opacity-0"}`}>
          [ click anywhere to continue ]
        </p>
      </div>

      {/* Corner decorations */}
      {[
        "top-8 left-8",
        "top-8 right-8 rotate-90",
        "bottom-8 right-8 rotate-180",
        "bottom-8 left-8 -rotate-90",
      ].map((pos, i) => (
        <div
          key={i}
          className={`absolute ${pos} transition-opacity duration-1000 ${phaseIndex >= 2 ? "opacity-30" : "opacity-0"}`}
        >
          <div className="w-8 h-8 border-t-2 border-l-2 border-primary/40" />
        </div>
      ))}
    </div>
  );
};
