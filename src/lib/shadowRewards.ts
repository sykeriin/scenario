import { dataClient } from "@/lib/data-client";

/**
 * Check shadow-related title milestones.
 * Called after XP gains to see if the user has closed the gap.
 */
export async function checkShadowTitles(userId: string): Promise<string | null> {
  const [{ data: shadow }, { data: profile }, { data: existingTitles }] = await Promise.all([
    dataClient.from("shadow_selves").select("shadow_xp").eq("user_id", userId).maybeSingle(),
    dataClient.from("profiles").select("total_xp").eq("id", userId).single(),
    dataClient.from("titles").select("title_name").eq("user_id", userId),
  ]);

  if (!shadow || !profile) return null;

  const userXp = profile.total_xp ?? 0;
  const shadowXp = (shadow as any).shadow_xp ?? 0;
  const titles = (existingTitles ?? []).map((t) => t.title_name);
  const gap = shadowXp - userXp;
  const gapPct = shadowXp > 0 ? ((shadowXp - userXp) / shadowXp) * 100 : 100;

  // "The Gap Closes" — within 10% of shadow XP
  if (gapPct <= 10 && !titles.includes("The Gap Closes")) {
    await dataClient.from("titles").insert({
      user_id: userId,
      title_name: "The Gap Closes",
      rarity: "legendary",
      description: "Total XP within 10% of your Shadow Self",
    });
    return "The Gap Closes";
  }

  return null;
}
