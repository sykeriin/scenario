import { useEffect, useState } from 'react';
import { useUniverse } from '@/hooks/useUniverse';
import {
  ensureTodayQuestSet,
  checkPenaltyZone,
} from '@/lib/solo-leveling/daily-quests';
import type { DailyQuestSetRow } from '@/integrations/local/schema-extensions';

export function useSoloLeveling() {
  const { isSoloLeveling } = useUniverse();
  const [penaltyActive, setPenaltyActive] = useState(false);
  const [questSet, setQuestSet] = useState<DailyQuestSetRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSoloLeveling) {
      setLoading(false);
      return;
    }
    (async () => {
      const penalty = await checkPenaltyZone();
      setPenaltyActive(penalty);
      if (!penalty) {
        const set = await ensureTodayQuestSet();
        setQuestSet(set);
      }
      setLoading(false);
    })();
  }, [isSoloLeveling]);

  const refresh = async () => {
    const set = await ensureTodayQuestSet();
    setQuestSet(set);
  };

  return { penaltyActive, setPenaltyActive, questSet, loading, refresh };
}
