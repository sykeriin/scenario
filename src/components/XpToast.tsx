import { useState, useEffect } from 'react';

interface XpToastProps {
  amount: number;
  type?: 'quest' | 'scenario_clear' | 'level_up' | 'pomodoro';
  newLevel?: number;
  onDone: () => void;
}

export const XpToast = ({ amount, type = 'quest', newLevel, onDone }: XpToastProps) => {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const fadeTimer = setTimeout(() => setFading(true), type === 'scenario_clear' ? 3000 : 2000);
    const removeTimer = setTimeout(onDone, type === 'scenario_clear' ? 3500 : 2500);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  const isLevelUp = type === 'level_up';
  const isScenarioClear = type === 'scenario_clear';

  return (
    <div
      className={`fixed bottom-24 md:bottom-8 right-6 z-[100] flex flex-col items-end gap-2 transition-all duration-500 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      } ${fading ? 'opacity-0 translate-y-[-20px]' : ''}`}
    >
      {/* Level-up toast (appears above XP toast) */}
      {isLevelUp && newLevel && (
        <div
          className="rounded-lg px-5 py-3 animate-scale-in"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--card)))',
            border: '1px solid hsl(var(--primary) / 0.5)',
            boxShadow: '0 0 30px hsl(var(--glow) / 0.5), 0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <p className="font-cinzel text-sm font-bold tracking-widest" style={{ color: 'hsl(var(--primary))' }}>
            LEVEL UP
          </p>
          <p className="font-cinzel text-xl font-bold" style={{ color: 'hsl(var(--primary))' }}>
            Level {newLevel}
          </p>
        </div>
      )}

      {/* Scenario Clear bonus */}
      {isScenarioClear && (
        <div
          className="rounded-lg px-5 py-3 animate-scale-in"
          style={{
            background: 'linear-gradient(135deg, hsl(45 100% 50% / 0.15), hsl(var(--card)))',
            border: '1px solid hsl(45 100% 50% / 0.4)',
            boxShadow: '0 0 30px hsl(45 100% 50% / 0.3), 0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <p className="font-cinzel text-xs font-bold tracking-widest" style={{ color: 'hsl(45 100% 50%)' }}>
            SCENARIO CLEARED
          </p>
          <p className="font-mono-stat text-lg font-bold" style={{ color: 'hsl(45 100% 50%)' }}>
            +{amount} XP BONUS
          </p>
        </div>
      )}

      {/* Standard XP toast */}
      {!isLevelUp && !isScenarioClear && (
        <div
          className="rounded-lg px-4 py-2"
          style={{
            background: 'hsl(var(--primary) / 0.15)',
            border: '1px solid hsl(var(--primary) / 0.3)',
            boxShadow: '0 0 15px hsl(var(--glow) / 0.3)',
          }}
        >
          <p className="font-mono-stat text-sm font-bold" style={{ color: 'hsl(var(--primary))' }}>
            +{amount} XP
          </p>
        </div>
      )}
    </div>
  );
};
