import type { TermKey } from '@/lib/universe';

export interface NavItem {
  path: string;
  termKey?: TermKey;
  label?: string;
  icon?: string;
  primary?: boolean;
  founderOnly?: boolean;
}

export const PRIMARY_NAV: NavItem[] = [
  { path: '/dashboard', label: 'Home', icon: '🏠', primary: true },
  { path: '/scenarios', termKey: 'scenario', icon: '⚔️', primary: true },
  { path: '/stats', label: 'Profile', icon: '📊', primary: true },
];

export const MORE_NAV: NavItem[] = [
  { path: '/life-path', termKey: 'life_path' },
  { path: '/mood', label: 'Mood Map' },
  { path: '/review', termKey: 'weekly_review' },
  { path: '/channels', termKey: 'channel' },
  { path: '/templates', label: 'Templates' },
  { path: '/training', termKey: 'training' },
  { path: '/lobby', label: 'Lobby' },
  { path: '/novel', termKey: 'novel' },
  { path: '/constellation-dashboard', termKey: 'constellation' },
  { path: '/nebulae', termKey: 'nebula' },
  { path: '/dream-board', termKey: 'dream_board' },
  { path: '/demons', termKey: 'monarch' },
  { path: '/oldest-dream', termKey: 'oldest_dream' },
  { path: '/shadow-army', termKey: 'shadow_army' },
  { path: '/vault', termKey: 'vault' },
  { path: '/skill-tree', label: 'Skill Tree' },
  { path: '/roadmap', label: 'Roadmap', founderOnly: true },
  { path: '/swot', label: 'SWOT', founderOnly: true },
  { path: '/research', label: 'R&D', founderOnly: true },
  { path: '/settings', label: 'Settings' },
];
