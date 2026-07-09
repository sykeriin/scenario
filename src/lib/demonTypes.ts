export interface DemonConstellation {
  id: string;
  name: string;
  domain: string;
  flavor_text: string;
  grade: string;
  appearance_count: number;
}

export interface DemonEncounter {
  id: string;
  user_id: string;
  demon_id: string;
  scenario_title: string;
  scenario_content: string;
  intended_effect: string;
  correct_action: string;
  status: string;
  resistance_xp_reward: number;
  submission_penalty: number;
  encountered_at: string;
  resolved_at: string | null;
  demon_constellations?: DemonConstellation;
}

export const DEMON_DOMAIN_META: Record<string, { icon: string; color: string }> = {
  Sloth: { icon: "😴", color: "220 15% 40%" },
  Envy: { icon: "👁", color: "145 50% 35%" },
  Distraction: { icon: "🌀", color: "280 50% 50%" },
  Gluttony: { icon: "🍽", color: "25 70% 45%" },
  Wrath: { icon: "😤", color: "0 70% 50%" },
  Pride: { icon: "👑", color: "45 80% 50%" },
  Despair: { icon: "🕳", color: "260 30% 25%" },
};

export const DEMON_GRADE_ORDER = ["Minor", "Greater", "Arch", "Demon King"] as const;

export function getGradeWeight(grade: string): number {
  switch (grade) {
    case "Minor": return 1;
    case "Greater": return 2;
    case "Arch": return 3;
    case "Demon King": return 4;
    default: return 1;
  }
}
