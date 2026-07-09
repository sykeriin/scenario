import { Link } from 'react-router-dom';
import { useUniverse } from '@/hooks/useUniverse';
import { GlowingProgress } from '@/components/ui/GlowingProgress';

interface GateCardProps {
  id: string;
  title: string;
  category: string;
  status: string;
  xpReward: number;
  progress?: { current: number; total: number };
  gateRank?: string;
}

export function GateCard({ id, title, category, status, xpReward, progress, gateRank = 'E' }: GateCardProps) {
  const { t } = useUniverse();
  const isActive = status === 'active';
  const isCleared = status === 'completed';

  const rankColors: Record<string, string> = {
    E: '#888', D: '#22aa44', C: '#00b4ff', B: '#8b22ff', A: '#ffd700', S: '#ffcc00',
  };

  return (
    <Link
      to={`/scenarios/${id}`}
      className={`block rounded-lg border-2 p-4 transition-all hover:scale-[1.01] ${
        isActive ? 'animate-pulse-slow' : ''
      }`}
      style={{
        borderColor: isActive ? '#00b4ff' : isCleared ? '#22aa4480' : 'hsl(var(--border))',
        boxShadow: isActive ? '0 0 15px rgba(0,180,255,0.2)' : undefined,
        background: 'hsl(var(--card))',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span
            className="font-mono-stat text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ color: rankColors[gateRank] ?? '#888', border: `1px solid ${rankColors[gateRank] ?? '#888'}50` }}
          >
            [{gateRank}]
          </span>
          <h3 className="font-cinzel text-sm font-bold mt-2">{title}</h3>
          <p className="font-mono-stat text-[9px] text-muted-foreground uppercase">{category}</p>
        </div>
        <span className="font-mono-stat text-[9px] uppercase" style={{ color: isActive ? '#00b4ff' : undefined }}>
          {isCleared ? t('gate_cleared') : isActive ? t('gate_open') : status}
        </span>
      </div>
      {progress && (
        <div className="mt-3">
          <p className="font-mono-stat text-[9px] text-muted-foreground mb-1">
            {t('stage')} {progress.current} of {progress.total}
          </p>
          <GlowingProgress value={progress.current} max={progress.total} height="h-1" />
        </div>
      )}
      <p className="font-mono-stat text-[10px] text-[#00b4ff] mt-2">+{xpReward} {t('xp')}</p>
    </Link>
  );
}
