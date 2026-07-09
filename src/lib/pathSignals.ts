import { dataClient } from "@/lib/data-client";

type SignalType = 
  | "quest_complete"
  | "scenario_clear"
  | "stat_gain"
  | "streak_milestone"
  | "title_unlock"
  | "channel_join"
  | "channel_scenario_clear"
  | "arc_clear";

export async function emitPathSignal(
  userId: string,
  signalType: SignalType,
  signalData: Record<string, any>
) {
  try {
    await dataClient.from("path_signals").insert({
      user_id: userId,
      signal_type: signalType,
      signal_data: signalData,
    });

    // Check if we should trigger recalibration (every 5 unprocessed signals)
    const { count } = await dataClient
      .from("path_signals")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("processed", false);

    const shouldRecalibrate = signalType === "arc_clear" || (count && count >= 5);

    if (shouldRecalibrate) {
      // Check if user has an active life path
      const { data: paths } = await dataClient
        .from("life_paths")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(1);

      if (paths && paths.length > 0) {
        const { data, error } = await dataClient.functions.invoke("recalibrate-path", {
          body: {},
        });

        if (!error && data?.result?.drift_detected) {
          // Store drift notification in sessionStorage for the dashboard to pick up
          sessionStorage.setItem(`path_drift_${userId}`, JSON.stringify({
            summary: data.result.drift_summary,
            alignment_score: data.result.alignment_score,
            modifications_count: data.result.modifications_count,
            timestamp: new Date().toISOString(),
          }));
        }
      }
    }
  } catch (e) {
    console.error("Failed to emit path signal:", e);
  }
}

export function checkStatMilestone(statName: string, oldValue: number, newValue: number): boolean {
  const oldBracket = Math.floor(oldValue / 50);
  const newBracket = Math.floor(newValue / 50);
  return newBracket > oldBracket;
}

export function checkStreakMilestone(streakCount: number): boolean {
  return [7, 30, 100, 365].includes(streakCount);
}
