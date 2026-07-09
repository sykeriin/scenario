import { cn } from "@/lib/utils";

interface GlowingProgressProps {
  value: number;
  max: number;
  color?: string;
  className?: string;
  height?: string;
}

export function GlowingProgress({ value, max, color, className, height = "h-2" }: GlowingProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  
  return (
    <div className={cn("relative w-full overflow-hidden rounded-full bg-[hsl(var(--dim))]", height, className)}>
      <div
        className="h-full rounded-full transition-all duration-1000 ease-out"
        style={{
          width: `${pct}%`,
          background: color || "hsl(var(--primary))",
          boxShadow: `0 0 8px ${color || "hsl(var(--glow) / 0.5)"}`,
        }}
      />
    </div>
  );
}
