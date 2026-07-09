import { dataClient } from "@/lib/data-client";

export interface DuelStats {
  wins: number;
  losses: number;
  totalXpWon: number;
  totalXpLost: number;
  currentStreak: number;
  recent: Array<{
    id: string;
    created_at: string;
    scenario_title: string;
    result: "win" | "loss";
    xp_stake: number;
  }>;
}

export async function getDuelStats(userId: string): Promise<DuelStats> {
  const [{ data: duels }, { data: xpLogs }] = await Promise.all([
    dataClient
      .from("duels")
      .select("id, created_at, scenario_title, challenger_id, opponent_id, winner_id, xp_stake, status")
      .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
      .eq("status", "completed")
      .not("winner_id", "is", null)
      .order("created_at", { ascending: false }),
    dataClient
      .from("xp_log")
      .select("amount, source_type")
      .eq("user_id", userId)
      .in("source_type", ["duel_win", "duel_loss"]),
  ]);

  const completed = duels ?? [];
  const wins = completed.filter((d) => d.winner_id === userId).length;
  const losses = completed.length - wins;

  let currentStreak = 0;
  for (const duel of completed) {
    if (duel.winner_id === userId) currentStreak += 1;
    else break;
  }

  const totalXpWon = (xpLogs ?? [])
    .filter((x) => x.source_type === "duel_win")
    .reduce((sum, x) => sum + x.amount, 0);

  const totalXpLost = Math.abs((xpLogs ?? [])
    .filter((x) => x.source_type === "duel_loss")
    .reduce((sum, x) => sum + x.amount, 0));

  const recent = completed.slice(0, 10).map((d) => ({
    id: d.id,
    created_at: d.created_at,
    scenario_title: d.scenario_title,
    result: d.winner_id === userId ? "win" as const : "loss" as const,
    xp_stake: d.xp_stake,
  }));

  return { wins, losses, totalXpWon, totalXpLost, currentStreak, recent };
}
