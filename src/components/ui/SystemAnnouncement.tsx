import { useEffect, useState } from "react";

interface SystemAnnouncementProps {
  message: string;
  onDismiss: () => void;
}

export const SystemAnnouncement = ({ message, onDismiss }: SystemAnnouncementProps) => {
  const [phase, setPhase] = useState<"enter" | "visible" | "exit">("enter");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("visible"), 50);
    return () => clearTimeout(t1);
  }, []);

  const dismiss = () => {
    setPhase("exit");
    setTimeout(onDismiss, 500);
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-background/80 backdrop-blur-sm cursor-pointer"
      onClick={dismiss}
    >
      <div
        className={`
          max-w-md w-[90vw] border-2 border-primary/60 rounded-sm
          bg-card/95 backdrop-blur-md
          shadow-[0_0_40px_hsl(var(--primary)/0.3)]
          transition-all duration-500 ease-out
          ${phase === "enter" ? "scale-90 opacity-0" : ""}
          ${phase === "visible" ? "scale-100 opacity-100" : ""}
          ${phase === "exit" ? "scale-95 opacity-0" : ""}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent */}
        <div className="h-[2px] w-full bg-primary" />

        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-center gap-3">
            <div className="h-px flex-1 bg-primary/30" />
            <span className="font-mono-stat text-[10px] uppercase tracking-[0.3em] text-primary animate-glow-pulse">
              ◆ System Announcement ◆
            </span>
            <div className="h-px flex-1 bg-primary/30" />
          </div>

          {/* Message */}
          <p className="font-mono-stat text-xs leading-relaxed text-foreground text-center">
            {message}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <div className="h-px flex-1 bg-border" />
            <span className="font-mono-stat text-[8px] text-muted-foreground">◆ ◆ ◆</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            onClick={dismiss}
            className="w-full font-mono-stat text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors py-1"
          >
            [ Dismiss ]
          </button>
        </div>

        {/* Bottom accent */}
        <div className="h-[2px] w-full bg-primary" />
      </div>
    </div>
  );
};
