import { useState, useEffect } from "react";
import { dataClient } from "@/lib/data-client";
import { getStigmaIcon } from "@/lib/stigmaTypes";

interface StigmaMark {
  stigma_type: string;
  note: string | null;
  giver_id: string;
  giver_name?: string;
}

interface StigmaDisplayProps {
  userId: string;
  compact?: boolean;
}

export function StigmaDisplay({ userId, compact = false }: StigmaDisplayProps) {
  const [stigmaCounts, setStigmaCounts] = useState<Record<string, { count: number; marks: StigmaMark[] }>>({});
  const [hoveredType, setHoveredType] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await dataClient
        .from("stigma_marks")
        .select("stigma_type, note, giver_id")
        .eq("receiver_id", userId);

      if (!data) return;

      // Group by type
      const grouped: Record<string, { count: number; marks: StigmaMark[] }> = {};
      data.forEach((m: any) => {
        if (!grouped[m.stigma_type]) grouped[m.stigma_type] = { count: 0, marks: [] };
        grouped[m.stigma_type].count++;
        grouped[m.stigma_type].marks.push(m);
      });

      setStigmaCounts(grouped);
    };
    load();
  }, [userId]);

  const entries = Object.entries(stigmaCounts);
  if (entries.length === 0) return null;

  // Sort by count descending
  entries.sort((a, b) => b[1].count - a[1].count);

  if (compact) {
    const top = entries[0];
    return (
      <span className="font-mono-stat text-[9px] text-primary/80">
        {getStigmaIcon(top[0])} {top[0]} ×{top[1].count}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([type, data]) => (
        <div
          key={type}
          className="relative"
          onMouseEnter={() => setHoveredType(type)}
          onMouseLeave={() => setHoveredType(null)}
        >
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all cursor-default"
            style={{
              borderColor: "hsl(var(--primary) / 0.3)",
              background: "hsl(var(--primary) / 0.05)",
              boxShadow: "0 0 12px hsl(var(--primary) / 0.08)",
            }}
          >
            <span className="text-sm">{getStigmaIcon(type)}</span>
            <span className="font-mono-stat text-[10px] text-foreground">{type}</span>
            <span className="font-mono-stat text-[9px] text-primary">×{data.count}</span>
          </div>

          {/* Tooltip */}
          {hoveredType === type && (
            <div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-card border rounded-lg p-3 shadow-lg min-w-[180px] animate-fade-in"
              style={{ boxShadow: "0 4px 20px hsl(var(--primary) / 0.1)" }}
            >
              <p className="font-cinzel text-xs font-bold text-foreground mb-1">
                {getStigmaIcon(type)} {type} ×{data.count}
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {data.marks.slice(0, 5).map((m, i) => (
                  <p key={i} className="font-body text-[10px] text-muted-foreground">
                    {m.note ? `"${m.note}"` : "—"}
                  </p>
                ))}
                {data.marks.length > 5 && (
                  <p className="font-mono-stat text-[8px] text-muted-foreground">
                    +{data.marks.length - 5} more
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Returns the top stigma type name for a user, or null */
export function useTopStigma(userId: string): string | null {
  const [top, setTop] = useState<string | null>(null);

  useEffect(() => {
    dataClient
      .from("stigma_marks")
      .select("stigma_type")
      .eq("receiver_id", userId)
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        const counts: Record<string, number> = {};
        data.forEach((m: any) => { counts[m.stigma_type] = (counts[m.stigma_type] ?? 0) + 1; });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        setTop(sorted[0]?.[0] ?? null);
      });
  }, [userId]);

  return top;
}
