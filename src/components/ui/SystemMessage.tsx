import { useEffect, useState } from "react";

interface SystemMessageProps {
  title: string;
  subtitle?: string;
  rarity?: "common" | "rare" | "epic" | "legendary";
  onDismiss?: () => void;
}

const rarityStyles: Record<string, { border: string; glow: string; label: string }> = {
  common: {
    border: "border-muted-foreground/40",
    glow: "shadow-[0_0_20px_hsl(var(--muted-foreground)/0.2)]",
    label: "text-muted-foreground",
  },
  rare: {
    border: "border-blue-400/60",
    glow: "shadow-[0_0_30px_hsl(210_80%_55%/0.3)]",
    label: "text-blue-400",
  },
  epic: {
    border: "border-purple-400/60",
    glow: "shadow-[0_0_30px_hsl(270_70%_55%/0.3)]",
    label: "text-purple-400",
  },
  legendary: {
    border: "border-yellow-400/60",
    glow: "shadow-[0_0_40px_hsl(52_100%_48%/0.4)]",
    label: "text-primary",
  },
};

export const SystemMessage = ({ title, subtitle, rarity = "common", onDismiss }: SystemMessageProps) => {
  const [phase, setPhase] = useState<"enter" | "visible" | "exit">("enter");
  const style = rarityStyles[rarity] ?? rarityStyles.common;

  useEffect(() => {
    const enterTimer = setTimeout(() => setPhase("visible"), 50);
    const exitTimer = setTimeout(() => setPhase("exit"), 4000);
    const removeTimer = setTimeout(() => onDismiss?.(), 4600);
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [onDismiss]);

  return (
    <div className="fixed top-6 right-6 z-[100] pointer-events-none">
      <div
        className={`
          pointer-events-auto cursor-pointer
          min-w-[280px] max-w-[380px]
          border-2 ${style.border} ${style.glow}
          bg-card/95 backdrop-blur-md rounded-sm
          transition-all duration-500 ease-out
          ${phase === "enter" ? "translate-x-[120%] opacity-0" : ""}
          ${phase === "visible" ? "translate-x-0 opacity-100" : ""}
          ${phase === "exit" ? "translate-x-[120%] opacity-0" : ""}
        `}
        onClick={onDismiss}
      >
        {/* Top accent line */}
        <div className={`h-[2px] w-full ${rarity === "legendary" ? "bg-primary" : rarity === "epic" ? "bg-purple-400" : rarity === "rare" ? "bg-blue-400" : "bg-muted-foreground/40"}`} />

        <div className="p-4 space-y-2">
          {/* System header */}
          <div className="flex items-center justify-between">
            <span className="font-mono-stat text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
              ◈ System Notification
            </span>
            <span className={`font-mono-stat text-[9px] uppercase tracking-wider ${style.label}`}>
              [{rarity}]
            </span>
          </div>

          {/* Divider */}
          <div className="h-px bg-border" />

          {/* Title */}
          <div className="text-center py-1">
            <p className="font-cinzel text-sm font-bold tracking-[0.15em] text-foreground">
              Title Acquired
            </p>
            <p className={`font-cinzel text-lg font-black tracking-wider mt-1 ${style.label} animate-glow-pulse`}>
              「{title}」
            </p>
            {subtitle && (
              <p className="font-body text-xs text-muted-foreground mt-2 italic">
                {subtitle}
              </p>
            )}
          </div>

          {/* Bottom decoration */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <div className="h-px flex-1 bg-border" />
            <span className="font-mono-stat text-[8px] text-muted-foreground">◆ ◆ ◆</span>
            <div className="h-px flex-1 bg-border" />
          </div>
        </div>

        {/* Bottom accent line */}
        <div className={`h-[2px] w-full ${rarity === "legendary" ? "bg-primary" : rarity === "epic" ? "bg-purple-400" : rarity === "rare" ? "bg-blue-400" : "bg-muted-foreground/40"}`} />
      </div>
    </div>
  );
};
