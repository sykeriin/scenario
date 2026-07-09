import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getShadowArmy } from '@/lib/solo-leveling/shadow-army';
import type { ShadowArmyRow } from '@/integrations/local/schema-extensions';
import { useUniverse } from '@/hooks/useUniverse';

export function ShadowArmyWidget() {
  const { t } = useUniverse();
  const [shadows, setShadows] = useState<ShadowArmyRow[]>([]);
  const [power, setPower] = useState(0);

  useEffect(() => {
    getShadowArmy().then((s) => {
      setShadows(s.slice(0, 3));
      setPower(s.reduce((sum, sh) => sum + Object.values(sh.stat_bonus ?? {}).reduce((a, b) => a + b, 0), 0));
    });
  }, []);

  if (shadows.length === 0) return null;

  return (
    <div className="rounded-lg border p-4" style={{ borderColor: 'rgba(0,180,255,0.2)', background: 'rgba(10,10,20,0.6)' }}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-[#00b4ff]">{t('shadow_army')}</h3>
        <span className="font-mono-stat text-[9px] text-muted-foreground">POWER: {power}</span>
      </div>
      <div className="space-y-1">
        {shadows.map((s) => (
          <p key={s.id} className="font-cinzel text-xs text-white/70">{s.shadow_name}</p>
        ))}
      </div>
      <Link to="/shadow-army" className="font-mono-stat text-[9px] text-[#00b4ff] hover:underline mt-2 block">
        View Army →
      </Link>
    </div>
  );
}
