import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { completePenaltyQuest } from '@/lib/solo-leveling/daily-quests';
import { db } from '@/integrations/local/db';
import { LOCAL_USER_ID, type DailyQuestItem } from '@/integrations/local/schema-extensions';

interface PenaltyZoneOverlayProps {
  onClear: () => void;
}

export function PenaltyZoneOverlay({ onClear }: PenaltyZoneOverlayProps) {
  const [penaltyQuest, setPenaltyQuest] = useState<DailyQuestItem | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    db.table('daily_quest_sets').toArray().then((sets) => {
      const active = sets.find((s) => s.user_id === LOCAL_USER_ID && s.penalty_triggered && !s.penalty_cleared);
      if (active?.penalty_quest) setPenaltyQuest(active.penalty_quest as DailyQuestItem);
    });
  }, []);

  const handleComplete = async () => {
    await completePenaltyQuest();
    setDone(true);
    setTimeout(onClear, 1500);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 px-4">
      <div
        className="max-w-md w-full rounded border-2 p-6 text-center space-y-4"
        style={{ borderColor: '#ff4444', boxShadow: '0 0 40px rgba(255,68,68,0.3)' }}
      >
        <h2 className="font-mono text-lg font-bold text-red-500 tracking-widest uppercase">Penalty Zone</h2>
        {done ? (
          <p className="text-sm text-[#00b4ff]">Penalty cleared. Access restored. Do not fail again.</p>
        ) : (
          <>
            <p className="text-sm text-white/80">
              You have failed to complete your Daily Quests. The System does not forgive incompletion.
            </p>
            {penaltyQuest && (
              <div className="rounded border border-red-500/30 p-4 text-left">
                <p className="font-cinzel text-sm font-bold">{penaltyQuest.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{penaltyQuest.description}</p>
              </div>
            )}
            <Button onClick={handleComplete} className="w-full font-mono tracking-wider">
              Complete Penalty Quest
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
