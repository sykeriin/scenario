export const MONARCH_MAP: Record<string, { name: string; domain: string; slFlavor: string }> = {
  sloth: { name: 'The Monarch of Destruction', domain: 'Sloth', slFlavor: 'Inaction feeds its power.' },
  envy: { name: 'The Monarch of White Flames', domain: 'Envy', slFlavor: 'It burns with comparison.' },
  distraction: { name: 'The Plague Monarch', domain: 'Distraction', slFlavor: 'Scattered focus is its domain.' },
  despair: { name: 'The Monarch of Iron Body', domain: 'Despair', slFlavor: 'It hardens against hope.' },
  procrastination: { name: 'The Beast Monarch', domain: 'Procrastination', slFlavor: 'Tomorrow is its weapon.' },
  demon_king: { name: 'The Absolute Being', domain: 'Demon King', slFlavor: 'The final test of will.' },
};

export function getMonarchName(demonType: string): string {
  return MONARCH_MAP[demonType]?.name ?? 'Unknown Monarch';
}

export function getMonarchFlavor(demonType: string): string {
  return MONARCH_MAP[demonType]?.slFlavor ?? '';
}
