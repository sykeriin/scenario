interface TagChipProps {
  children: React.ReactNode;
  color?: string;
}

export function TagChip({ children, color = "hsl(var(--primary))" }: TagChipProps) {
  return (
    <span
      className="font-mono-stat text-[9px] font-bold tracking-wide rounded px-2 py-0.5"
      style={{
        color,
        background: `${color}18`,
        border: `1px solid ${color}33`,
      }}
    >
      {children}
    </span>
  );
}
