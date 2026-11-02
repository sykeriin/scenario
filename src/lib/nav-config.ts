import type { TermKey } from '@/lib/universe';
import { isFlagEnabled, type FlagName } from '@/lib/flags';

export interface NavItem {
  path: string;
  termKey?: TermKey;
  label?: string;
  icon?: string;
  primary?: boolean;
  founderOnly?: boolean;
  /** Hidden unless this flag is enabled (see lib/flags.ts). */
  flag?: FlagName;
}

/** The four core tabs: bottom bar on phones, rail on desktop. */
export interface TabItem {
  path: string;
  label: string;
  /** lucide-react icon name, resolved in the tab components. */
  icon: 'home' | 'quests' | 'hero' | 'world';
}

export const TAB_NAV: TabItem[] = [
  { path: '/dashboard', label: 'Today', icon: 'home' },
  { path: '/scenarios', label: 'Quests', icon: 'quests' },
  { path: '/stats', label: 'Hero', icon: 'hero' },
  { path: '/novel', label: 'World', icon: 'world' },
];

/** Paths that belong to a tab, for highlighting (e.g. /scenarios/:id -> Quests). */
export function tabForPath(pathname: string): string | null {
  const extra: Record<string, string> = {
    '/shadow-army': '/stats',
    '/skill-tree': '/stats',
    '/review': '/novel',
  };
  for (const [prefix, tab] of Object.entries(extra)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return tab;
  }
  const hit = TAB_NAV.find((t) => pathname === t.path || pathname.startsWith(`${t.path}/`));
  return hit?.path ?? null;
}

export const MORE_NAV: NavItem[] = [
  { path: '/review', termKey: 'weekly_review' },
  { path: '/shadow-army', termKey: 'shadow_army' },
  { path: '/skill-tree', label: 'Skill Tree' },
  { path: '/life-path', termKey: 'life_path', flag: 'insights' },
  { path: '/mood', label: 'Mood Map', flag: 'insights' },
  { path: '/vault', termKey: 'vault', flag: 'insights' },
  { path: '/channels', termKey: 'channel', flag: 'social' },
  { path: '/templates', label: 'Templates', flag: 'social' },
  { path: '/lobby', label: 'Lobby', flag: 'social' },
  { path: '/training', termKey: 'training', flag: 'training' },
  { path: '/constellation-dashboard', termKey: 'constellation', flag: 'lore' },
  { path: '/nebulae', termKey: 'nebula', flag: 'lore' },
  { path: '/dream-board', termKey: 'dream_board', flag: 'lore' },
  { path: '/demons', termKey: 'monarch', flag: 'lore' },
  { path: '/oldest-dream', termKey: 'oldest_dream', flag: 'lore' },
  { path: '/roadmap', label: 'Roadmap', founderOnly: true, flag: 'founder' },
  { path: '/swot', label: 'SWOT', founderOnly: true, flag: 'founder' },
  { path: '/research', label: 'R&D', founderOnly: true, flag: 'founder' },
  { path: '/settings', label: 'Settings' },
];

/** More-menu entries that are currently visible. */
export function visibleMoreNav(founderMode: boolean): NavItem[] {
  return MORE_NAV.filter(
    (item) => (!item.flag || isFlagEnabled(item.flag)) && (!item.founderOnly || founderMode)
  );
}
