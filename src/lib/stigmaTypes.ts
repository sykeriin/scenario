export const GLOBAL_STIGMA_TYPES = [
  { type: "Relentless", icon: "⚔", description: "Consistency and streaks" },
  { type: "Innovator", icon: "💡", description: "Creative approaches" },
  { type: "Clutch", icon: "🔥", description: "Clearing near-deadline" },
  { type: "Reliable", icon: "🛡", description: "Party/channel contributions" },
  { type: "Visionary", icon: "✦", description: "Life Path alignment >80%" },
] as const;

export const STIGMA_ICONS: Record<string, string> = {
  Relentless: "⚔",
  Innovator: "💡",
  Clutch: "🔥",
  Reliable: "🛡",
  Visionary: "✦",
};

export function getStigmaIcon(stigmaType: string): string {
  return STIGMA_ICONS[stigmaType] ?? "◈";
}
