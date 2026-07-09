import { useEffect, useState } from "react";
import { getGradeInfo } from "@/lib/constellationGrades";

interface GradeUpOverlayProps {
  name: string;
  newGrade: string;
  onDismiss: () => void;
}

export function GradeUpOverlay({ name, newGrade, onDismiss }: GradeUpOverlayProps) {
  const [visible, setVisible] = useState(false);
  const gradeInfo = getGradeInfo(newGrade);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 600);
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-700"
      style={{
        opacity: visible ? 1 : 0,
        background: "radial-gradient(circle at center, hsl(0 0% 0% / 0.95), hsl(0 0% 0% / 0.85))",
        backdropFilter: "blur(8px)",
      }}
      onClick={() => {
        setVisible(false);
        setTimeout(onDismiss, 600);
      }}
    >
      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, ${gradeInfo.color.replace(")", " / 0.15)")}, transparent 70%)`,
        }}
      />

      <div
        className="text-center space-y-6 transition-all duration-1000"
        style={{
          transform: visible ? "scale(1) translateY(0)" : "scale(0.8) translateY(20px)",
        }}
      >
        <div
          className="font-mono-stat text-[11px] uppercase tracking-[0.4em]"
          style={{ color: gradeInfo.color, opacity: 0.7 }}
        >
          ◆ A Constellation Has Ascended ◆
        </div>

        <div
          className="font-cinzel text-3xl md:text-5xl font-bold"
          style={{
            color: gradeInfo.color,
            textShadow: `0 0 30px ${gradeInfo.color}, 0 0 60px ${gradeInfo.color}`,
          }}
        >
          {name}
        </div>

        <div
          className="font-cinzel text-lg md:text-2xl"
          style={{
            color: gradeInfo.color,
            textShadow: `0 0 20px ${gradeInfo.color}`,
          }}
        >
          has reached {newGrade} status.
        </div>

        <div className="font-body text-sm text-muted-foreground italic mt-4">
          Their stars grow brighter.
        </div>

        <div className="font-mono-stat text-[9px] text-muted-foreground mt-8 animate-pulse">
          Click anywhere to dismiss
        </div>
      </div>
    </div>
  );
}
