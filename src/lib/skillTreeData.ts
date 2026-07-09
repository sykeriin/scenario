// Stat color mapping for skill trees
export const STAT_COLORS: Record<string, { primary: string; glow: string; bg: string }> = {
  Physical: {
    primary: "hsl(var(--theme-red))",
    glow: "hsl(var(--theme-red) / 0.5)",
    bg: "hsl(var(--theme-red) / 0.1)",
  },
  Psyche: {
    primary: "hsl(var(--theme-blue))",
    glow: "hsl(var(--theme-blue) / 0.5)",
    bg: "hsl(var(--theme-blue) / 0.1)",
  },
  Intel: {
    primary: "hsl(var(--theme-green))",
    glow: "hsl(var(--theme-green) / 0.5)",
    bg: "hsl(var(--theme-green) / 0.1)",
  },
  Spiritual: {
    primary: "hsl(270 80% 55%)",
    glow: "hsl(270 80% 55% / 0.5)",
    bg: "hsl(270 80% 55% / 0.1)",
  },
  Core: {
    primary: "hsl(var(--primary))",
    glow: "hsl(var(--glow) / 0.5)",
    bg: "hsl(var(--primary) / 0.1)",
  },
  Craft: {
    primary: "hsl(30 80% 55%)",
    glow: "hsl(30 80% 55% / 0.5)",
    bg: "hsl(30 80% 55% / 0.1)",
  },
};

export const STAT_ICONS: Record<string, string> = {
  Physical: "💪",
  Psyche: "🧠",
  Intel: "📚",
  Spiritual: "✦",
  Core: "⚡",
  Craft: "🔧",
};

export const STAT_KEYS: Record<string, string> = {
  Physical: "stat_physical",
  Psyche: "stat_psyche",
  Intel: "stat_intel",
  Spiritual: "stat_spiritual",
  Core: "stat_core",
  Craft: "stat_craft",
};

export type SkillNode = {
  id: string;
  stat_name: string;
  node_name: string;
  description: string;
  node_type: string;
  xp_required: number;
  prerequisite_node_id: string | null;
  position_x: number;
  position_y: number;
  bonus_description: string;
  tier: number;
};

export type UserSkillNode = {
  id: string;
  user_id: string;
  node_id: string;
  unlocked_at: string;
  is_active: boolean;
};

export type NodeState = "unlocked" | "available" | "locked";

export function getNodeState(
  node: SkillNode,
  unlockedIds: Set<string>,
  statXp: number
): NodeState {
  if (unlockedIds.has(node.id)) return "unlocked";
  const prereqMet = !node.prerequisite_node_id || unlockedIds.has(node.prerequisite_node_id);
  if (prereqMet && statXp >= node.xp_required) return "available";
  return "locked";
}

export function getTierRarity(tier: number): string {
  if (tier >= 4) return "legendary";
  if (tier >= 3) return "epic";
  if (tier >= 2) return "rare";
  return "common";
}
