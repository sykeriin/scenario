import { useEffect, useState } from "react";

interface LevelUpOverlayProps {
  newLevel: number;
  onDismiss: () => void;
}

export const LevelUpOverlay = ({ newLevel, onDismiss }: LevelUpOverlayProps) => {
  const [phase, setPhase] = useState<"flash" | "expand" | "title" | "details" | "exit">("flash");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("expand"), 200);
    const t2 = setTimeout(() => setPhase("title"), 700);
    const t3 = setTimeout(() => setPhase("details"), 1800);
    const t4 = setTimeout(() => setPhase("exit"), 5500);
    const t5 = setTimeout(() => onDismiss(), 6300);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, [onDismiss]);

  const phaseIndex = ["flash", "expand", "title", "details", "exit"].indexOf(phase);

  return (
    <div
      className={`fixed inset-0 z-[300] flex items-center justify-center cursor-pointer transition-opacity duration-700 ${phaseIndex >= 4 ? "opacity-0" : "opacity-100"}`}
      onClick={onDismiss}
    >
      {/* White flash */}
      <div
        className={`absolute inset-0 bg-primary transition-opacity duration-300 ${phaseIndex === 0 ? "opacity-40" : "opacity-0"}`}
      />

      {/* Dark backdrop */}
      <div className={`absolute inset-0 bg-background/97 backdrop-blur-md transition-opacity duration-500 ${phaseIndex >= 1 ? "opacity-100" : "opacity-0"}`} />

      {/* Radial burst */}
      <div
        className={`absolute inset-0 transition-all duration-1000 ${phaseIndex >= 2 ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}
        style={{
          background: "radial-gradient(circle at center, hsl(var(--primary) / 0.25) 0%, hsl(var(--primary) / 0.08) 30%, transparent 60%)",
        }}
      />

      {/* Spinning ring decoration */}
      <div
        className={`absolute w-80 h-80 md:w-96 md:h-96 rounded-full border border-primary/20 transition-all duration-1000 ${phaseIndex >= 2 ? "opacity-100 scale-100" : "opacity-0 scale-0"}`}
        style={{
          animation: phaseIndex >= 2 ? "spin 8s linear infinite" : "none",
        }}
      />
      <div
        className={`absolute w-64 h-64 md:w-80 md:h-80 rounded-full border border-primary/10 transition-all duration-1000 delay-200 ${phaseIndex >= 2 ? "opacity-100 scale-100" : "opacity-0 scale-0"}`}
        style={{
          animation: phaseIndex >= 2 ? "spin 12s linear infinite reverse" : "none",
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center space-y-6 px-8 max-w-lg">
        {/* System header */}
        <div className={`transition-all duration-700 ${phaseIndex >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-primary/50" />
            <span className="font-mono-stat text-[9px] uppercase tracking-[0.4em] text-primary/70">
              ◈ System Alert ◈
            </span>
            <div className="h-px w-12 bg-primary/50" />
          </div>
        </div>

        {/* LEVEL UP text */}
        <div className={`transition-all duration-700 ${phaseIndex >= 2 ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}>
          <h1
            className="font-cinzel text-4xl md:text-6xl font-black tracking-[0.3em] text-primary"
            style={{
              textShadow: "0 0 60px hsl(var(--primary) / 0.6), 0 0 120px hsl(var(--primary) / 0.3), 0 0 180px hsl(var(--primary) / 0.1)",
            }}
          >
            LEVEL UP
          </h1>
        </div>

        {/* Divider with diamonds */}
        <div className={`flex items-center justify-center gap-2 transition-all duration-500 delay-300 ${phaseIndex >= 2 ? "opacity-100" : "opacity-0"}`}>
          <div className="h-px w-16 bg-primary/40" />
          <span className="text-primary text-xs">◆</span>
          <div className="h-px w-8 bg-primary/60" />
          <span className="text-primary text-sm">◆</span>
          <div className="h-px w-8 bg-primary/60" />
          <span className="text-primary text-xs">◆</span>
          <div className="h-px w-16 bg-primary/40" />
        </div>

        {/* Level number */}
        <div className={`transition-all duration-700 ${phaseIndex >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <span className="font-mono-stat text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            You have reached
          </span>
          <div
            className="font-cinzel text-6xl md:text-8xl font-black text-primary mt-2 animate-glow-pulse"
            style={{
              textShadow: "0 0 40px hsl(var(--primary) / 0.5), 0 0 80px hsl(var(--primary) / 0.2)",
            }}
          >
            LV. {newLevel}
          </div>
        </div>

        {/* Flavor text */}
        <p className={`font-body text-sm text-muted-foreground italic transition-all duration-700 delay-200 ${phaseIndex >= 3 ? "opacity-100" : "opacity-0"}`}>
          Your constellation grows brighter.
        </p>

        {/* Bottom decoration */}
        <div className={`flex items-center justify-center gap-2 pt-4 transition-all duration-500 ${phaseIndex >= 3 ? "opacity-100" : "opacity-0"}`}>
          <div className="h-px w-20 bg-border" />
          <span className="font-mono-stat text-[8px] text-muted-foreground/50">◆ ◆ ◆</span>
          <div className="h-px w-20 bg-border" />
        </div>

        {/* Click to dismiss */}
        <p className={`font-mono-stat text-[9px] text-muted-foreground/40 tracking-wider transition-all duration-500 ${phaseIndex >= 3 ? "opacity-100" : "opacity-0"}`}>
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
          className={`absolute ${pos} transition-all duration-1000 ${phaseIndex >= 3 ? "opacity-40" : "opacity-0"}`}
        >
          <div className="w-10 h-10 border-t-2 border-l-2 border-primary/50" />
        </div>
      ))}
    </div>
  );
};
