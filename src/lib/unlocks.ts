/** Progressive disclosure — feature unlock by profile level */

export type UnlockLayer = 1 | 2 | 3;

export function getUnlockLayer(level: number): UnlockLayer {
  if (level >= 15) return 3;
  if (level >= 5) return 2;
  return 1;
}

export function minLevelForPath(path: string): number {
  const map: Record<string, number> = {
    '/dashboard': 1,
    '/scenarios': 1,
    '/stats': 1,
    '/life-path': 5,
    '/lobby': 5,
    '/constellation-dashboard': 5,
    '/mood': 1,
    '/review': 1,
    '/channels': 5,
    '/templates': 5,
    '/training': 1,
    '/novel': 15,
    '/nebulae': 15,
    '/dream-board': 15,
    '/demons': 15,
    '/oldest-dream': 15,
    '/vault': 5,
    '/skill-tree': 15,
    '/roadmap': 1,
    '/swot': 1,
    '/research': 1,
    '/settings': 1,
  };
  return map[path] ?? 15;
}

export function isFeatureUnlocked(path: string, level: number): boolean {
  return level >= minLevelForPath(path);
}

export function unlockLabel(level: number): string {
  return `Unlock at Level ${level}`;
}
