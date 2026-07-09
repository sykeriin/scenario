export interface Archetype {
  name: string;
  icon: string;
  description: string;
}

export const ARCHETYPES: Record<string, Archetype> = {
  "The Builder": {
    name: "The Builder",
    icon: "🏗️",
    description: "You create systems, structures, and lasting foundations.",
  },
  "The Explorer": {
    name: "The Explorer",
    icon: "🧭",
    description: "You seek new horizons, knowledge, and experiences.",
  },
  "The Warrior": {
    name: "The Warrior",
    icon: "⚔️",
    description: "You conquer challenges through discipline and resilience.",
  },
  "The Creator": {
    name: "The Creator",
    icon: "🎨",
    description: "You bring ideas to life through art, code, and expression.",
  },
  "The Sage": {
    name: "The Sage",
    icon: "📖",
    description: "You pursue wisdom, understanding, and inner mastery.",
  },
  "The Connector": {
    name: "The Connector",
    icon: "🤝",
    description: "You build relationships, communities, and shared purpose.",
  },
};

export function getArchetype(name: string): Archetype | null {
  return ARCHETYPES[name] ?? null;
}
