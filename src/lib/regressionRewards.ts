import { dataClient } from "@/lib/data-client";

interface RegressionTitle {
  title_name: string;
  rarity: string;
  description: string;
  threshold: number;
}

const REGRESSION_TITLES: RegressionTitle[] = [
  { title_name: "I Have Returned", rarity: "common", description: "Completed your first regression. The story continues.", threshold: 1 },
  { title_name: "Regression Veteran", rarity: "rare", description: "5 regressions. You refuse to stay down.", threshold: 5 },
  { title_name: "The Eternal Reader", rarity: "epic", description: "15 regressions. Death is merely a checkpoint.", threshold: 15 },
  { title_name: "Lives: Infinite", rarity: "legendary", description: "50 regressions. The most prestigious title. You are unkillable.", threshold: 50 },
];

export async function checkRegressionTitles(userId: string, regressionCount: number) {
  const { data: existingTitles } = await dataClient
    .from("titles")
    .select("title_name")
    .eq("user_id", userId);

  const owned = new Set((existingTitles ?? []).map((t) => t.title_name));

  for (const rt of REGRESSION_TITLES) {
    if (regressionCount >= rt.threshold && !owned.has(rt.title_name)) {
      await dataClient.from("titles").insert({
        user_id: userId,
        title_name: rt.title_name,
        rarity: rt.rarity,
        description: rt.description,
      });
    }
  }
}

export function getRegressionBadge(count: number): string | null {
  if (count >= 3) return "↺";
  return null;
}
