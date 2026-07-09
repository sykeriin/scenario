import { useEffect, useState } from "react";
import { dataClient } from "@/lib/data-client";
import { SectionLabel } from "@/components/ui/SectionLabel";

interface TournamentLeaderboardProps {
  channelId: string;
}

type LeaderRow = {
  user_id: string;
  wins: number;
  xp_won: number;
  username: string;
};

export function TournamentLeaderboard({ channelId }: TournamentLeaderboardProps) {
  const [rows, setRows] = useState<LeaderRow[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: wins } = await dataClient
        .from("tournament_wins")
        .select("user_id, xp_won, channel_id")
        .eq("channel_id", channelId);

      const grouped = new Map<string, { wins: number; xp_won: number }>();
      (wins ?? []).forEach((w) => {
        const current = grouped.get(w.user_id) ?? { wins: 0, xp_won: 0 };
        current.wins += 1;
        current.xp_won += w.xp_won ?? 0;
        grouped.set(w.user_id, current);
      });

      const userIds = Array.from(grouped.keys());
      const { data: profiles } = userIds.length
        ? await dataClient.from("profiles").select("id, username, display_name").in("id", userIds)
        : { data: [] as any[] };

      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p.display_name || p.username]));

      const mapped: LeaderRow[] = userIds
        .map((userId) => ({
          user_id: userId,
          wins: grouped.get(userId)?.wins ?? 0,
          xp_won: grouped.get(userId)?.xp_won ?? 0,
          username: profileMap.get(userId) ?? "Reader",
        }))
        .sort((a, b) => (b.wins - a.wins) || (b.xp_won - a.xp_won));

      setRows(mapped);
    };

    load();
  }, [channelId]);

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <SectionLabel prefix="🏆">Tournament Champions</SectionLabel>
      {rows.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground">No tournament wins yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={r.user_id} className="flex items-center justify-between rounded border bg-background px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-cinzel text-sm w-5 text-muted-foreground">{i + 1}</span>
                <span className="font-body text-sm truncate">{r.username}</span>
              </div>
              <div className="font-mono-stat text-[10px] text-primary uppercase">
                {r.wins} wins · {r.xp_won} XP
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
