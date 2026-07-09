// Disaster type definitions and spawning logic

export interface DisasterTemplate {
  name: string;
  flavorText: string;
  triggerDescription: string;
  baseHp: number;
  baseClass: number;
  rewardXp: number;
  rewardTitle?: string;
  attackPatterns: string[];
  defeatMessage: string;
  questTemplates: Array<{ title: string; description: string; damage: number }>;
}

export const PERSONAL_DISASTERS: Record<string, DisasterTemplate> = {
  procrastination_hydra: {
    name: "The Procrastination Hydra",
    flavorText: "A creature born of idle hands and wasted hours. For every day you do nothing, it grows another head. Each head demands tribute before it will fall.",
    triggerDescription: "3 days of zero quest activity",
    baseHp: 400,
    baseClass: 2,
    rewardXp: 300,
    attackPatterns: ["drain", "taunt", "curse"],
    defeatMessage: "The Procrastination Hydra has been slain. Its heads will not grow back today.",
    questTemplates: [
      { title: "Sever the First Head", description: "Complete any pending quest within 2 hours", damage: 100 },
      { title: "Cauterize the Wound", description: "Complete 3 quests in a single day", damage: 150 },
      { title: "Destroy the Heart", description: "Clear an entire stage", damage: 200 },
    ],
  },
  burnout_wraith: {
    name: "The Burnout Wraith",
    flavorText: "It feeds on exhaustion and despair. Where motivation dies, this creature is born. It drains not your experience — but your very essence.",
    triggerDescription: "Mood average below 4 for 5 consecutive days",
    baseHp: 350,
    baseClass: 3,
    rewardXp: 400,
    rewardTitle: "Wraith Slayer",
    attackPatterns: ["drain", "weaken", "obscure"],
    defeatMessage: "The Burnout Wraith dissolves into mist. You remember why you started.",
    questTemplates: [
      { title: "Rest and Recover", description: "Log a mood of 6 or above", damage: 80 },
      { title: "Reclaim Your Light", description: "Complete a self-care activity", damage: 120 },
      { title: "Break the Cycle", description: "Log mood ≥6 for 3 consecutive days", damage: 200 },
    ],
  },
  fog_of_complacency: {
    name: "The Fog of Complacency",
    flavorText: "It doesn't attack. It simply... settles. And in its embrace, ambition suffocates. Your XP multiplier withers to 0.5x until the fog lifts.",
    triggerDescription: "No new scenario created in 14+ days",
    baseHp: 200,
    baseClass: 1,
    rewardXp: 200,
    attackPatterns: ["weaken", "taunt"],
    defeatMessage: "The Fog lifts. The path ahead is clear once more.",
    questTemplates: [
      { title: "Forge a New Path", description: "Create and start a new scenario", damage: 200 },
    ],
  },
  exam_colossus: {
    name: "The Exam Colossus",
    flavorText: "A towering monolith of deadlines and desperation. It grows stronger with each passing hour. Face it now — or be crushed beneath its weight.",
    triggerDescription: "Exam/finals scenario deadline within 14 days",
    baseHp: 800,
    baseClass: 4,
    rewardXp: 600,
    rewardTitle: "Colossus Slayer",
    attackPatterns: ["drain", "curse", "taunt", "weaken"],
    defeatMessage: "The Exam Colossus crumbles. You stand victorious where lesser readers would have fallen.",
    questTemplates: [
      { title: "Study Session I", description: "Complete a 2-hour focused study session", damage: 100 },
      { title: "Practice Run", description: "Complete a practice exam or problem set", damage: 150 },
      { title: "Master the Material", description: "Clear all study-related quests", damage: 200 },
      { title: "Final Strike", description: "Complete the exam scenario stage", damage: 300 },
    ],
  },
  isolation_specter: {
    name: "The Isolation Specter",
    flavorText: "You chose solitude. The Specter chose you. It whispers that no one notices your absence — and perhaps it's right.",
    triggerDescription: "No channel or party interaction for 21 days",
    baseHp: 300,
    baseClass: 2,
    rewardXp: 250,
    attackPatterns: ["obscure", "taunt"],
    defeatMessage: "The Isolation Specter fades as connection returns. You are not alone.",
    questTemplates: [
      { title: "Break the Silence", description: "Send a message in any channel or party", damage: 100 },
      { title: "Rejoin the World", description: "Join or participate in a channel scenario", damage: 150 },
      { title: "Form a Bond", description: "Join a party or duel another reader", damage: 200 },
    ],
  },
};

export const ATTACK_EFFECTS: Record<string, { label: string; icon: string; description: string }> = {
  drain: { label: "XP Drain", icon: "💀", description: "The disaster drains your XP." },
  weaken: { label: "Weaken", icon: "⚡", description: "XP multiplier reduced for 24 hours." },
  curse: { label: "Curse", icon: "🔮", description: "A random quest costs +50% more effort." },
  obscure: { label: "Obscure", icon: "🌫️", description: "Your stat bars are hidden for 24 hours." },
  taunt: { label: "Taunt", icon: "👁️", description: "The disaster mocks you with a System Message." },
};

export function getDisasterColor(status: string): string {
  switch (status) {
    case "approaching": return "hsl(30 90% 50%)";
    case "active": return "hsl(0 80% 55%)";
    case "defeated": return "hsl(45 90% 55%)";
    case "escaped": return "hsl(0 40% 35%)";
    default: return "hsl(0 80% 55%)";
  }
}
