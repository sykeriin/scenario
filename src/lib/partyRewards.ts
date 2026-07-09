import { dataClient } from "@/lib/data-client";

interface PartyTitle {
  title_name: string;
  rarity: string;
  description: string;
}

export async function checkPartyTitles(userId: string, partyScenariosCleared: number, carriedParty: boolean) {
  const { data: existingTitles } = await dataClient
    .from("titles")
    .select("title_name")
    .eq("user_id", userId);

  const owned = new Set((existingTitles ?? []).map((t) => t.title_name));
  const toGrant: PartyTitle[] = [];

  if (partyScenariosCleared >= 1 && !owned.has("We Move Together")) {
    toGrant.push({ title_name: "We Move Together", rarity: "rare", description: "Cleared your first party scenario. Teamwork unlocked." });
  }
  if (partyScenariosCleared >= 5 && !owned.has("The Vanguard")) {
    toGrant.push({ title_name: "The Vanguard", rarity: "epic", description: "Cleared 5 party scenarios. You lead from the front." });
  }
  if (carriedParty && !owned.has("Solo who?")) {
    toGrant.push({ title_name: "Solo who?", rarity: "legendary", description: "Completed 3 of 4 stages alone. You carried the party." });
  }

  for (const t of toGrant) {
    await dataClient.from("titles").insert({ user_id: userId, ...t });
  }
}
