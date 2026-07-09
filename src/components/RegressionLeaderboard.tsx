import { useEffect, useState } from "react";
import { dataClient } from "@/lib/data-client";
import { useAuth } from "@/contexts/AuthContext";
import { getRegressionBadge } from "@/lib/regressionRewards";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Tables } from "@/types/database";

type Profile = Tables<"profiles">;

interface RegressionRow extends Profile {
  most_regressed_scenario?: string | null;
}

export const RegressionLeaderboard = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<RegressionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Fetch profiles ordered by regression_count desc
      const { data: profiles } = await dataClient
        .from("profiles")
        .select("*")
        .gt("regression_count", 0)
        .order("regression_count", { ascending: false });

      const list = profiles ?? [];
      const userIds = list.map((p) => p.id);

      let scenarioMap: Record<string, string> = {};

      if (userIds.length > 0) {
        // Get the most regressed scenario per user
        const { data: scenarios } = await dataClient
          .from("scenarios")
          .select("user_id, title, regression_count")
          .in("user_id", userIds)
          .gt("regression_count", 0)
          .order("regression_count", { ascending: false });

        const seen = new Set<string>();
        (scenarios ?? []).forEach((s) => {
          if (s.user_id && !seen.has(s.user_id)) {
            scenarioMap[s.user_id] = s.title;
            seen.add(s.user_id);
          }
        });
      }

      setRows(list.map((p) => ({ ...p, most_regressed_scenario: scenarioMap[p.id] ?? null })));
      setLoading(false);
    };

    load();
  }, []);

  if (loading) {
    return (
      <p className="text-center font-mono-stat text-sm text-muted-foreground animate-pulse mt-12">
        ◈ LOADING HALL OF REGRESSION...
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="font-cinzel text-lg text-muted-foreground">No regressions yet</p>
        <p className="font-body text-sm text-muted-foreground mt-2">
          No protagonist has fallen... yet.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <h2 className="font-cinzel text-xl font-bold tracking-wider" style={{ color: "hsl(0 70% 50%)" }}>
            ◆ THE HALL OF REGRESSION
          </h2>
          <p className="font-body text-xs text-muted-foreground max-w-md mx-auto italic">
            These protagonists have died and returned more than any other. In regression lies true strength.
          </p>
        </div>

        <div className="rounded-lg border bg-card overflow-hidden" style={{ borderColor: "hsl(0 40% 30% / 0.3)" }}>
          <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b bg-secondary/30">
            <span className="col-span-1 font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground">#</span>
            <span className="col-span-3 font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground">Reader</span>
            <span className="col-span-2 font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground">Title</span>
            <span className="col-span-2 font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground text-right" style={{ color: "hsl(0 60% 55%)" }}>
              Regressions
            </span>
            <span className="col-span-4 font-mono-stat text-[9px] uppercase tracking-wider text-muted-foreground">Most Regressed</span>
          </div>

          {rows.map((p, i) => {
            const isMe = p.id === user?.id;
            const badge = getRegressionBadge(p.regression_count ?? 0);
            const isLivesInfinite = (p.regression_count ?? 0) >= 50;

            return (
              <div
                key={p.id}
                className={`grid grid-cols-12 gap-2 px-4 py-3 border-b last:border-b-0 transition-colors ${
                  isMe ? "border-l-2 bg-primary/5" : "hover:bg-secondary/20"
                }`}
                style={isMe ? { borderLeftColor: "hsl(0 70% 50%)" } : undefined}
              >
                <span
                  className="col-span-1 font-mono-stat text-xs font-bold"
                  style={{ color: i < 3 ? "hsl(0 70% 50%)" : undefined }}
                >
                  {i === 0 ? "💀" : i + 1}
                </span>
                <div className="col-span-3 flex items-center gap-1">
                  <span className={`font-body text-sm ${isMe ? "font-semibold" : ""}`} style={isMe ? { color: "hsl(0 70% 50%)" } : undefined}>
                    {p.display_name || p.username}
                  </span>
                  {isMe && <span className="font-mono-stat text-[8px]" style={{ color: "hsl(0 70% 50%)" }}>(YOU)</span>}
                  {badge && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-sm cursor-help transition-transform hover:animate-spin" style={{ color: "hsl(0 70% 50%)" }}>
                          {badge}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-mono-stat text-xs">Has regressed {p.regression_count} times. Still here.</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <div className="col-span-2">
                  <span
                    className={`font-mono-stat text-[10px] truncate block ${isLivesInfinite ? "font-bold" : "text-muted-foreground"}`}
                    style={isLivesInfinite ? { color: "hsl(0 70% 50%)" } : undefined}
                  >
                    {p.current_title ?? "Nameless Reader"}
                  </span>
                </div>
                <span className="col-span-2 font-mono-stat text-xs text-right font-bold" style={{ color: "hsl(0 70% 55%)" }}>
                  {p.regression_count ?? 0}
                </span>
                <div className="col-span-4">
                  <span className="font-body text-xs text-muted-foreground truncate block italic">
                    {p.most_regressed_scenario ?? "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
};
