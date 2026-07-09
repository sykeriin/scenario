import { getHunterRank, type HunterRank, RANKS } from '@/lib/solo-leveling/hunter-rank';

interface RankBadgeProps {
  rank?: HunterRank | string;
  totalXp?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function RankBadge({ rank, totalXp = 0, size = 'md' }: RankBadgeProps) {
  const info = rank
    ? RANKS.find((r) => r.rank === rank) ?? getHunterRank(totalXp)
    : getHunterRank(totalXp);

  const sizes = { sm: 'text-[10px] px-1.5 py-0.5', md: 'text-xs px-2 py-1', lg: 'text-sm px-3 py-1.5' };

  return (
    <span
      className={`font-mono-stat font-bold rounded border ${sizes[size]}`}
      style={{ color: info.color, borderColor: `${info.color}80`, background: `${info.color}15` }}
    >
      {info.badge}
    </span>
  );
}
