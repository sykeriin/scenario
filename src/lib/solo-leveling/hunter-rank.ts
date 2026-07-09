export type HunterRank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'NL' | 'Monarch';

export interface RankInfo {
  rank: HunterRank;
  label: string;
  color: string;
  badge: string;
  minMp: number;
  maxMp: number;
}

const RANKS: RankInfo[] = [
  { rank: 'E', label: 'E Rank', color: '#888888', badge: 'E', minMp: 0, maxMp: 999 },
  { rank: 'D', label: 'D Rank', color: '#22aa44', badge: 'D', minMp: 1000, maxMp: 4999 },
  { rank: 'C', label: 'C Rank', color: '#00b4ff', badge: 'C', minMp: 5000, maxMp: 14999 },
  { rank: 'B', label: 'B Rank', color: '#8b22ff', badge: 'B', minMp: 15000, maxMp: 34999 },
  { rank: 'A', label: 'A Rank', color: '#ffd700', badge: 'A', minMp: 35000, maxMp: 74999 },
  { rank: 'S', label: 'S Rank', color: '#ffcc00', badge: 'S', minMp: 75000, maxMp: 149999 },
  { rank: 'NL', label: 'National Level', color: '#ff4444', badge: 'NL', minMp: 150000, maxMp: 299999 },
  { rank: 'Monarch', label: 'Monarch', color: '#000000', badge: '♔', minMp: 300000, maxMp: Infinity },
];

export function getHunterRank(totalXp: number): RankInfo {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (totalXp >= RANKS[i].minMp) return RANKS[i];
  }
  return RANKS[0];
}

export function getNextRank(totalXp: number): RankInfo | null {
  const current = getHunterRank(totalXp);
  const idx = RANKS.findIndex((r) => r.rank === current.rank);
  return idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
}

export function dropRank(currentRank: HunterRank): HunterRank {
  const idx = RANKS.findIndex((r) => r.rank === currentRank);
  return idx > 0 ? RANKS[idx - 1].rank : 'E';
}

export function syncHunterRank(totalXp: number): HunterRank {
  return getHunterRank(totalXp).rank;
}

export { RANKS };
