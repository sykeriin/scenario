import { cn } from "@/lib/utils";

interface SectionLabelProps {
  children: React.ReactNode;
  prefix?: string;
  className?: string;
}

export function SectionLabel({ children, prefix = "◆", className }: SectionLabelProps) {
  return (
    <span className={cn("font-mono-stat text-xs uppercase tracking-[0.2em] text-muted-foreground", className)}>
      {prefix} {children}
    </span>
  );
}
