import { dataClient } from "@/lib/data-client";

/**
 * NPC title milestones — checked after every NPC quest completion.
 */
const NPC_TITLE_MILESTONES = [
  { count: 1, title_name: "Chance Meeting", rarity: "common", description: "Completed your first NPC quest." },
  { count: 30, title_name: "The Sociable Protagonist", rarity: "rare", description: "Completed 30 NPC quests." },
  { count: 100, title_name: "NPC Whisperer", rarity: "epic", description: "Completed 100 NPC quests." },
  { count: 365, title_name: "They All Come to Me", rarity: "legendary", description: "Completed 365 NPC quests — a full year of daily encounters." },
];

/**
 * Check NPC quest completion count and unlock milestone titles.
 */
export async function checkNpcTitleMilestones(userId: string): Promise<string | null> {
  const { count } = await dataClient
    .from("npc_encounters")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "completed");

  const completedCount = count ?? 0;

  // Find the highest milestone reached
  const earned = NPC_TITLE_MILESTONES.filter((m) => completedCount >= m.count);
  if (earned.length === 0) return null;

  // Check which titles the user already has
  const { data: existingTitles } = await dataClient
    .from("titles")
    .select("title_name")
    .eq("user_id", userId)
    .in("title_name", earned.map((m) => m.title_name));

  const existingNames = new Set((existingTitles ?? []).map((t) => t.title_name));
  const newTitles = earned.filter((m) => !existingNames.has(m.title_name));

  if (newTitles.length === 0) return null;

  // Insert all new titles
  await dataClient.from("titles").insert(
    newTitles.map((t) => ({
      user_id: userId,
      title_name: t.title_name,
      rarity: t.rarity,
      description: t.description,
    }))
  );

  // Return the highest rarity title just unlocked for UI notification
  const rarityOrder = ["legendary", "epic", "rare", "common"];
  const best = newTitles.sort(
    (a, b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity)
  )[0];
  return best.title_name;
}

/**
 * Parse and apply an NPC special_reward string.
 * Formats:
 *   - A title name string → unlock title
 *   - "Vault Entry" → (placeholder, log it)
 *   - "+1 to physical" / "+1 to psyche" etc → increment stat
 */
export async function applySpecialReward(
  userId: string,
  specialReward: string
): Promise<{ type: "title" | "stat" | "vault"; detail: string } | null> {
  if (!specialReward) return null;

  // Check for stat boost pattern: "+1 to <stat>"
  const statMatch = specialReward.match(/^\+1 to (\w+)$/i);
  if (statMatch) {
    const statName = statMatch[1].toLowerCase();
    const validStats = ["physical", "psyche", "intel", "spiritual", "core", "craft"];
    if (validStats.includes(statName)) {
      const column = `stat_${statName}` as any;
      const { data: profile } = await dataClient
        .from("profiles")
        .select(column)
        .eq("id", userId)
        .single();

      if (profile) {
        const currentVal = (profile as any)[column] ?? 0;
        await dataClient
          .from("profiles")
          .update({ [column]: currentVal + 1 } as any)
          .eq("id", userId);
      }
      return { type: "stat", detail: `+1 ${statName.charAt(0).toUpperCase() + statName.slice(1)}` };
    }
  }

  // Check for Vault Entry
  if (specialReward.toLowerCase() === "vault entry") {
    // Log as XP event for now (vault table doesn't exist yet)
    await dataClient.from("xp_log").insert({
      user_id: userId,
      amount: 0,
      source_type: "vault_entry",
      reason: "NPC Vault Entry reward — a unique insight awaits.",
    });
    return { type: "vault", detail: "Vault Entry unlocked" };
  }

  // Otherwise treat as a title name
  const { data: existing } = await dataClient
    .from("titles")
    .select("id")
    .eq("user_id", userId)
    .eq("title_name", specialReward)
    .limit(1);

  if (!existing || existing.length === 0) {
    await dataClient.from("titles").insert({
      user_id: userId,
      title_name: specialReward,
      rarity: "rare",
      description: "Bestowed by an NPC encounter.",
    });
  }
  return { type: "title", detail: specialReward };
}
