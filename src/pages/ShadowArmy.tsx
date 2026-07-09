import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getShadowArmy, calcArmyPower } from '@/lib/solo-leveling/shadow-army';
import type { ShadowArmyRow } from '@/integrations/local/schema-extensions';
import { useUniverse } from '@/hooks/useUniverse';

const RANK_COLORS: Record<string, string> = {
  soldier: '#888', knight: '#00b4ff', general: '#8b22ff', marshal: '#ffd700', sovereign: '#000',
};

const ShadowArmy = () => {
  const { t } = useUniverse();
  const [shadows, setShadows] = useState<ShadowArmyRow[]>([]);

  useEffect(() => {
    getShadowArmy().then(setShadows);
  }, []);

  const power = calcArmyPower(shadows);

  return (
    <div className="min-h-screen bg-background p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-cinzel text-2xl font-bold text-[#00b4ff] tracking-wider">{t('shadow_army')}</h1>
          <p className="font-mono-stat text-[10px] text-muted-foreground mt-1">ARMY POWER: {power}</p>
        </div>
        <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-primary">← Home</Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {shadows.map((s) => (
          <div
            key={s.id}
            className="rounded-lg border p-4 opacity-90"
            style={{ borderColor: `${RANK_COLORS[s.shadow_rank] ?? '#888'}40`, background: 'rgba(10,10,20,0.8)' }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-cinzel text-sm font-bold">{s.shadow_name}</h3>
              <span className="font-mono text-[10px] uppercase" style={{ color: RANK_COLORS[s.shadow_rank] }}>
                {s.shadow_rank}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">From: {s.source_gate_title}</p>
            <p className="text-xs mt-2">{s.ability}</p>
            {s.stat_bonus && (
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(s.stat_bonus).map(([k, v]) => (
                  <span key={k} className="font-mono-stat text-[8px] px-1.5 py-0.5 rounded bg-secondary">
                    {k.toUpperCase()} +{v}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {shadows.length === 0 && (
        <p className="text-center text-muted-foreground font-mono text-sm py-12">
          No shadows extracted yet. Clear gates to build your army.
        </p>
      )}
    </div>
  );
};

export default ShadowArmy;
