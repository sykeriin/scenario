import { useEffect, useState } from "react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { getDuelStats, type DuelStats } from "@/lib/duelLogic";

interface DuelHistoryWidgetProps {
  userId: string;
}

export function DuelHistoryWidget({ userId }: DuelHistoryWidgetProps) {
  const [stats, setStats] = useState<DuelStats | null>(null);

  useEffect(() => {
    getDuelStats(userId).then(setStats);
  }, [userId]);

  if (!stats) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <p className="font-mono-stat text-xs text-muted-foreground animate-pulse">Loading duel history...</p>
      </div>
    );
  }

  const total = stats.wins + stats.losses;
  const winRate = total > 0 ? Math.round((stats.wins / total) * 100) : 0;

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <SectionLabel prefix="⚔">Duel History</SectionLabel>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Stat label="Wins" value={String(stats.wins)} />
        <Stat label="Losses" value={String(stats.losses)} />
        <Stat label="Win Rate" value={`${winRate}%`} />
        <Stat label="XP Won" value={String(stats.totalXpWon)} />
        <Stat label="XP Lost" value={String(stats.totalXpLost)} />
      </div>

      <div className="rounded border bg-background p-3">
        <div className="font-mono-stat text-[10px] uppercase text-muted-foreground">
          Current Win Streak: <span className="text-primary">{stats.currentStreak}</span>
        </div>
        {stats.currentStreak >= 10 && (
          <div className="font-mono-stat text-[10px] text-primary mt-1">Undefeated title unlocked.</div>
        )}
      </div>

      <div className="space-y-2">
        <div className="font-mono-stat text-[10px] uppercase text-muted-foreground">Recent Duels</div>
        {stats.recent.length === 0 ? (
          <p className="font-body text-sm text-muted-foreground">No duel history yet.</p>
        ) : (
          stats.recent.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded border bg-background px-3 py-2">
              <div className="min-w-0">
                <div className="font-body text-sm truncate">{d.scenario_title}</div>
                <div className="font-mono-stat text-[10px] text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</div>
              </div>
              <div className="text-right">
                <div className={`font-mono-stat text-[10px] uppercase ${d.result === "win" ? "text-primary" : "text-muted-foreground"}`}>
                  {d.result}
                </div>
                <div className="font-mono-stat text-[10px] text-muted-foreground">{d.xp_stake} XP</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-background p-3">
      <div className="font-mono-stat text-[9px] uppercase text-muted-foreground">{label}</div>
      <div className="font-cinzel text-lg text-foreground">{value}</div>
    </div>
  );
}
