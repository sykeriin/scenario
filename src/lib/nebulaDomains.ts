export const NEBULA_DOMAINS = {
  "Papyrus": { label: "Papyrus Domain", stat: "Intel", bonusType: "Study", color: "210 80% 55%", icon: "📜" },
  "Valhalla": { label: "Valhalla Domain", stat: "Physical", bonusType: "Fitness", color: "0 70% 50%", icon: "⚔️" },
  "Olympus": { label: "Olympus Domain", stat: "Craft", bonusType: "Create", color: "45 90% 55%", icon: "🏛️" },
  "Tartarus": { label: "Tartarus Domain", stat: "Core", bonusType: "Disaster", color: "270 60% 45%", icon: "🌑" },
  "Ariadne": { label: "Ariadne Domain", stat: "Social", bonusType: "Party", color: "320 70% 55%", icon: "🧵" },
  "Sage": { label: "Sage Domain", stat: "Psyche", bonusType: "Self-improvement", color: "160 60% 45%", icon: "🧘" },
} as const;

export type NebulaDomainKey = keyof typeof NEBULA_DOMAINS;

export const DOMAIN_OPTIONS: NebulaDomainKey[] = ["Papyrus", "Valhalla", "Olympus", "Tartarus", "Ariadne", "Sage"];
