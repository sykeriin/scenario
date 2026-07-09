interface StatRadarProps {
  labels: string[];
  values: number[];
  max?: number;
}

export function StatRadar({ labels, values, max = 500 }: StatRadarProps) {
  const n = labels.length;
  const cx = 100;
  const cy = 100;
  const R = 72;

  const ang = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, r: number) => ({
    x: cx + r * Math.cos(ang(i)),
    y: cy + r * Math.sin(ang(i)),
  });

  const ring = (s: number) =>
    labels.map((_, i) => {
      const p = pt(i, s * R);
      return `${p.x},${p.y}`;
    }).join(" ");

  const data = values
    .map((v, i) => {
      const p = pt(i, Math.min(1, v / max) * R);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 200 200" className="h-full w-full">
      {[0.33, 0.66, 1].map((s) => (
        <polygon
          key={s}
          points={ring(s)}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="1"
        />
      ))}
      {labels.map((_, i) => {
        const p = pt(i, R);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="hsl(var(--border))"
            strokeWidth="1"
          />
        );
      })}
      <polygon
        points={data}
        fill="hsl(var(--primary) / 0.15)"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
      />
      {labels.map((l, i) => {
        const p = pt(i, R + 16);
        return (
          <text
            key={l}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="hsl(var(--muted-foreground))"
            fontSize="7"
            fontFamily="DM Sans, sans-serif"
          >
            {l}
          </text>
        );
      })}
    </svg>
  );
}
