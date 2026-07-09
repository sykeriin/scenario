import { useEffect, useState, useCallback } from "react";

interface RegressionOverlayProps {
  scenarioTitle: string;
  regressionCount: number;
  onRegress: () => void;
  onCancel: () => void;
}

export const RegressionOverlay = ({
  scenarioTitle,
  regressionCount,
  onRegress,
  onCancel,
}: RegressionOverlayProps) => {
  const [phase, setPhase] = useState<"flash" | "death" | "countdown" | "choice" | "regressing" | "exit">("flash");
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("death"), 300);
    const t2 = setTimeout(() => setPhase("countdown"), 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("choice");
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  const handleRegress = useCallback(() => {
    setPhase("regressing");
    setTimeout(() => {
      setPhase("exit");
      setTimeout(() => onRegress(), 700);
    }, 1500);
  }, [onRegress]);

  const handleCancel = useCallback(() => {
    setPhase("exit");
    setTimeout(() => onCancel(), 700);
  }, [onCancel]);

  const phaseIndex = ["flash", "death", "countdown", "choice", "regressing", "exit"].indexOf(phase);
  const nextMultiplier = (1 + (regressionCount + 1) * 0.5).toFixed(1);

  return (
    <div
      className={`fixed inset-0 z-[300] flex items-center justify-center transition-opacity duration-700 ${phaseIndex >= 5 ? "opacity-0 pointer-events-none" : "opacity-100"}`}
    >
      {/* Red flash */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${phaseIndex === 0 ? "opacity-60" : "opacity-0"}`}
        style={{ background: "hsl(var(--theme-red))" }}
      />

      {/* Dark backdrop */}
      <div className={`absolute inset-0 bg-background/98 backdrop-blur-md transition-opacity duration-500 ${phaseIndex >= 1 ? "opacity-100" : "opacity-0"}`} />

      {/* Red radial glow */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${phaseIndex >= 1 ? "opacity-100" : "opacity-0"}`}
        style={{
          background: "radial-gradient(circle at center, hsl(var(--theme-red) / 0.2) 0%, transparent 50%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center space-y-6 px-8 max-w-lg">
        {/* Death message */}
        <div className={`transition-all duration-700 ${phaseIndex >= 1 ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}>
          <h1
            className="font-cinzel text-3xl md:text-5xl font-black tracking-[0.2em]"
            style={{
              color: "hsl(var(--theme-red))",
              textShadow: "0 0 60px hsl(var(--theme-red) / 0.6), 0 0 120px hsl(var(--theme-red) / 0.3)",
            }}
          >
            YOU HAVE DIED
          </h1>
        </div>

        {/* Scenario name */}
        <p className={`font-cinzel text-sm text-muted-foreground tracking-wider transition-all duration-500 ${phaseIndex >= 1 ? "opacity-100" : "opacity-0"}`}>
          「{scenarioTitle}」
        </p>

        {/* Divider */}
        <div className={`flex items-center justify-center gap-2 transition-all duration-500 ${phaseIndex >= 2 ? "opacity-100" : "opacity-0"}`}>
          <div className="h-px w-16 bg-border" />
          <span className="font-mono-stat text-[8px]" style={{ color: "hsl(var(--theme-red) / 0.6)" }}>◆ ◆ ◆</span>
          <div className="h-px w-16 bg-border" />
        </div>

        {/* Countdown */}
        {phase === "countdown" && (
          <div className="space-y-3 animate-fade-in">
            <span className="font-mono-stat text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Initiating Regression
            </span>
            <div
              className="font-cinzel text-7xl md:text-9xl font-black animate-glow-pulse"
              style={{
                color: "hsl(var(--theme-red))",
                textShadow: "0 0 40px hsl(var(--theme-red) / 0.5)",
              }}
            >
              {countdown}
            </div>
          </div>
        )}

        {/* Choice phase */}
        {(phase === "choice") && (
          <div className="space-y-6 animate-fade-in">
            <div className="rounded-lg border-2 p-6 space-y-4" style={{ borderColor: "hsl(var(--theme-red) / 0.4)" }}>
              <p className="font-mono-stat text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
                ◈ System Prompt
              </p>
              <p className="font-cinzel text-lg font-bold text-foreground tracking-wider">
                Do you wish to Regress?
              </p>
              <div className="h-px bg-border" />
              <div className="space-y-2 text-left">
                <p className="font-body text-xs text-muted-foreground">
                  ↺ All stages will reset to the beginning
                </p>
                <p className="font-body text-xs text-primary">
                  ✦ Permanent <span className="font-mono-stat font-bold">{nextMultiplier}x</span> XP multiplier for this scenario
                </p>
                <p className="font-body text-xs text-muted-foreground">
                  ◈ Unlock title: <span className="italic text-foreground">"Regressed Hero"</span>
                </p>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={handleRegress}
                className="font-cinzel text-sm font-bold tracking-wider px-6 py-3 rounded border-2 transition-all hover:scale-105"
                style={{
                  borderColor: "hsl(var(--theme-red) / 0.6)",
                  color: "hsl(var(--theme-red))",
                  boxShadow: "0 0 20px hsl(var(--theme-red) / 0.2)",
                }}
              >
                ↺ REGRESS
              </button>
              <button
                onClick={handleCancel}
                className="font-mono-stat text-[11px] tracking-wider px-6 py-3 rounded border transition-all hover:bg-accent text-muted-foreground"
              >
                ABANDON
              </button>
            </div>
          </div>
        )}

        {/* Regressing animation */}
        {phase === "regressing" && (
          <div className="space-y-4 animate-fade-in">
            <div
              className="font-cinzel text-2xl font-black tracking-[0.3em] animate-glow-pulse"
              style={{
                color: "hsl(var(--primary))",
                textShadow: "0 0 40px hsl(var(--primary) / 0.5), 0 0 80px hsl(var(--primary) / 0.2)",
              }}
            >
              REGRESSION COMPLETE
            </div>
            <p className="font-body text-sm text-muted-foreground italic">
              You return to the beginning, stronger than before.
            </p>
            <p className="font-mono-stat text-xs text-primary animate-glow-pulse">
              XP Multiplier → {nextMultiplier}x
            </p>
          </div>
        )}

        {/* Click to dismiss hint (only when not in choice) */}
        {phase !== "choice" && phase !== "regressing" && phaseIndex >= 2 && (
          <p className="font-mono-stat text-[9px] text-muted-foreground/40 tracking-wider">
            [ awaiting system response... ]
          </p>
        )}
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
          className={`absolute ${pos} transition-all duration-1000 ${phaseIndex >= 2 ? "opacity-30" : "opacity-0"}`}
        >
          <div className="w-8 h-8 border-t-2 border-l-2" style={{ borderColor: "hsl(var(--theme-red) / 0.4)" }} />
        </div>
      ))}
    </div>
  );
};
