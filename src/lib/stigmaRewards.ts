import { dataClient } from "@/lib/data-client";
import { GLOBAL_STIGMA_TYPES } from "./stigmaTypes";

/**
 * Check stigma milestone titles and unlock them.
 * - 10 total: "Marked by Many" (common)
 * - 50 total: "The Stigmatized" (rare)
 * - Any single ×25: "[type] Incarnate" (epic)
 * - All 5 global: "The Complete One" (legendary)
 */
export async function checkStigmaTitleMilestones(userId: string): Promise<string | null> {
  const { data: marks } = await dataClient
    .from("stigma_marks")
    .select("stigma_type")
    .eq("receiver_id", userId);

  if (!marks || marks.length === 0) return null;

  const total = marks.length;
  const countByType: Record<string, number> = {};
  marks.forEach((m: any) => {
    countByType[m.stigma_type] = (countByType[m.stigma_type] ?? 0) + 1;
  });

  const titlesToGrant: { title_name: string; rarity: string; description: string }[] = [];

  if (total >= 10) titlesToGrant.push({ title_name: "Marked by Many", rarity: "common", description: "Received 10 stigma marks." });
  if (total >= 50) titlesToGrant.push({ title_name: "The Stigmatized", rarity: "rare", description: "Received 50 stigma marks." });

  // Any single type ×25
  for (const [type, count] of Object.entries(countByType)) {
    if (count >= 25) {
      titlesToGrant.push({ title_name: `${type} Incarnate`, rarity: "epic", description: `Received 25 ${type} stigma marks.` });
    }
  }

  // All 5 global stigmas received
  const globalNames = GLOBAL_STIGMA_TYPES.map((s) => s.type);
  const hasAll = globalNames.every((name) => (countByType[name] ?? 0) > 0);
  if (hasAll) titlesToGrant.push({ title_name: "The Complete One", rarity: "legendary", description: "Received all 5 global stigma types." });

  if (titlesToGrant.length === 0) return null;

  // Check which are already unlocked
  const { data: existing } = await dataClient
    .from("titles")
    .select("title_name")
    .eq("user_id", userId)
    .in("title_name", titlesToGrant.map((t) => t.title_name));

  const existingSet = new Set((existing ?? []).map((t) => t.title_name));
  const newTitles = titlesToGrant.filter((t) => !existingSet.has(t.title_name));

  if (newTitles.length === 0) return null;

  await dataClient.from("titles").insert(
    newTitles.map((t) => ({ user_id: userId, ...t }))
  );

  const rarityOrder = ["legendary", "epic", "rare", "common"];
  return newTitles.sort((a, b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity))[0].title_name;
}
