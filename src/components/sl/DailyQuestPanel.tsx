import { useState, useEffect } from 'react';
import { useUniverse } from '@/hooks/useUniverse';
import { completeDailyQuest, msUntilMidnight } from '@/lib/solo-leveling/daily-quests';
import type { DailyQuestSetRow } from '@/integrations/local/schema-extensions';

interface DailyQuestPanelProps {
  questSet: DailyQuestSetRow;
  onUpdate: () => void;
}

export function DailyQuestPanel({ questSet, onUpdate }: DailyQuestPanelProps) {
  const { t } = useUniverse();
  const [countdown, setCountdown] = useState('');
  const allDone = questSet.completed_count >= questSet.total_count;

  useEffect(() => {
    const tick = () => {
      const ms = msUntilMidnight();
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      setCountdown(`${h}h ${m}m`);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);

  const toggle = async (questId: string, completed: boolean) => {
    if (completed) return;
    await completeDailyQuest(questSet.id, questId);
    onUpdate();
  };

  return (
    <div
      className="rounded-lg border-2 p-4 mb-4"
      style={{ borderColor: 'rgba(0,180,255,0.4)', background: 'rgba(10,10,20,0.8)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-xs uppercase tracking-[0.3em] text-[#00b4ff]">
          ◆ {t('morning_musts').toUpperCase()}
        </h3>
        <span className="font-mono-stat text-[10px] text-muted-foreground">Reset: {countdown}</span>
      </div>
      {allDone ? (
        <p className="font-mono text-sm text-[#00b4ff] font-bold text-center py-2">
          DAILY QUESTS COMPLETE — +100 {t('xp')} BONUS
        </p>
      ) : (
        <p className="font-mono-stat text-[10px] text-muted-foreground mb-2">
          {questSet.completed_count}/{questSet.total_count} COMPLETE
        </p>
      )}
      <div className="space-y-2">
        {questSet.quests.map((q) => (
          <label
            key={q.id}
            className={`flex items-start gap-3 p-2 rounded border cursor-pointer transition-all ${
              q.completed ? 'opacity-50 border-primary/20' : 'border-[#00b4ff]/20 hover:border-[#00b4ff]/40'
            }`}
          >
            <input
              type="checkbox"
              checked={!!q.completed}
              onChange={() => toggle(q.id, !!q.completed)}
              className="mt-1"
            />
            <div className="flex-1">
              <p className={`text-sm ${q.completed ? 'line-through text-muted-foreground' : ''}`}>{q.title}</p>
              {q.description && <p className="text-[10px] text-muted-foreground">{q.description}</p>}
            </div>
            <span className="font-mono-stat text-[10px] text-[#00b4ff]">+{q.mp_reward} MP</span>
          </label>
        ))}
      </div>
    </div>
  );
}
