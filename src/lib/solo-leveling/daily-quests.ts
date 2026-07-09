import { db, ensureSeeded } from '@/integrations/local/db';
import { LOCAL_USER_ID, type DailyQuestItem, type DailyQuestSetRow } from '@/integrations/local/schema-extensions';
import { dataClient } from '@/lib/data-client';
import { callAI, extractJson } from '@/lib/ai';
import { addXp } from '@/lib/xp';
import { dropRank } from '@/lib/solo-leveling/hunter-rank';
import { wrapPrompt, getProfileUniverse } from '@/lib/solo-leveling/sl-prompts';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export async function getTodayQuestSet(): Promise<DailyQuestSetRow | null> {
  await ensureSeeded();
  const date = todayStr();
  const sets = await db.table('daily_quest_sets').toArray();
  return (sets.find((s) => s.user_id === LOCAL_USER_ID && s.quest_date === date) as DailyQuestSetRow) ?? null;
}

export async function ensureTodayQuestSet(): Promise<DailyQuestSetRow> {
  const existing = await getTodayQuestSet();
  if (existing) return existing;

  const profile = await db.table('profiles').get(LOCAL_USER_ID);
  const scenarios = await db.table('scenarios').toArray();
  const activeGates = scenarios.filter((s) => s.user_id === LOCAL_USER_ID && s.status === 'active').map((s) => s.title);
  const stats = {
    STR: profile?.stat_physical ?? 0,
    INT: profile?.stat_psyche ?? 0,
    PER: profile?.stat_intel ?? 0,
    AGI: profile?.stat_craft ?? 0,
    END: profile?.stat_core ?? 0,
    Sense: profile?.stat_spiritual ?? 0,
  };
  const weak = Object.entries(stats).sort((a, b) => a[1] - b[1]).slice(0, 2).map(([k]) => k);

  let quests: DailyQuestItem[] = [];
  try {
    const universe = await getProfileUniverse();
    const raw = await callAI([
      {
        role: 'system',
        content: wrapPrompt(
          `Generate 5 Daily Quests for this Hunter. Return ONLY JSON array:
[{ "title": "...", "stat_target": "STR|INT|PER|AGI|END|Sense", "difficulty": "E|D|C|B|A", "mp_reward": 50-500, "description": "..." }]`,
          universe
        ),
      },
      {
        role: 'user',
        content: JSON.stringify({ weak_stats: weak, active_gates: activeGates }),
      },
    ]);
    const parsed = extractJson(raw) as DailyQuestItem[];
    quests = (Array.isArray(parsed) ? parsed : []).map((q, i) => ({
      ...q,
      id: crypto.randomUUID(),
      mp_reward: q.mp_reward ?? 50 + i * 20,
      completed: false,
    }));
  } catch {
    quests = Array.from({ length: 5 }, (_, i) => ({
      id: crypto.randomUUID(),
      title: `Daily Quest ${i + 1}`,
      description: 'Complete a meaningful task today.',
      stat_target: weak[i % 2] ?? 'STR',
      difficulty: 'E',
      mp_reward: 50 + i * 10,
      completed: false,
    }));
  }

  const row: DailyQuestSetRow = {
    id: crypto.randomUUID(),
    user_id: LOCAL_USER_ID,
    quest_date: todayStr(),
    quests,
    completed_count: 0,
    total_count: 5,
    penalty_triggered: false,
    penalty_cleared: false,
    generated_at: new Date().toISOString(),
  };
  await db.table('daily_quest_sets').put(row);
  return row;
}

export async function completeDailyQuest(questSetId: string, questId: string) {
  const set = (await db.table('daily_quest_sets').get(questSetId)) as DailyQuestSetRow;
  if (!set) return;
  const quests = set.quests.map((q) => (q.id === questId ? { ...q, completed: true } : q));
  const completed_count = quests.filter((q) => q.completed).length;
  await db.table('daily_quest_sets').put({ ...set, quests, completed_count });

  const quest = quests.find((q) => q.id === questId);
  if (quest?.mp_reward) await addXp(LOCAL_USER_ID, quest.mp_reward, 'daily_quest');

  if (completed_count === 5) {
    const profile = await db.table('profiles').get(LOCAL_USER_ID);
    const streak = Number(profile?.daily_quest_streak ?? 0) + 1;
    await dataClient.from('profiles').update({ daily_quest_streak: streak }).eq('id', LOCAL_USER_ID);
    await addXp(LOCAL_USER_ID, 100 + streak * 10, 'daily_quest_bonus');
  }
}

export async function checkPenaltyZone(): Promise<boolean> {
  await ensureSeeded();
  const profile = await db.table('profiles').get(LOCAL_USER_ID);
  if (profile?.penalty_zone_active) return true;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split('T')[0];
  const sets = await db.table('daily_quest_sets').toArray();
  const ySet = sets.find((s) => s.user_id === LOCAL_USER_ID && s.quest_date === yStr) as DailyQuestSetRow | undefined;

  if (ySet && ySet.completed_count < ySet.total_count && !ySet.penalty_cleared) {
    const consecutive = Number(profile?.consecutive_penalty_days ?? 0) + 1;
    const penaltyQuest: DailyQuestItem = {
      id: crypto.randomUUID(),
      title: consecutive >= 2 ? 'Severe Penalty Quest' : 'Penalty Quest',
      description: 'Complete this task to restore access. No MP reward.',
      difficulty: consecutive >= 2 ? 'B' : 'D',
      mp_reward: 0,
      completed: false,
    };
    await dataClient.from('profiles').update({
      penalty_zone_active: true,
      penalty_zone_triggered_at: new Date().toISOString(),
      consecutive_penalty_days: consecutive,
    }).eq('id', LOCAL_USER_ID);
    await db.table('daily_quest_sets').put({
      ...ySet,
      penalty_triggered: true,
      penalty_quest: penaltyQuest,
    });

    if (consecutive >= 5) {
      const rank = profile?.hunter_rank ?? 'E';
      await dataClient.from('profiles').update({ hunter_rank: dropRank(rank as any) }).eq('id', LOCAL_USER_ID);
    }
    return true;
  }
  return false;
}

export async function completePenaltyQuest() {
  const profile = await db.table('profiles').get(LOCAL_USER_ID);
  const sets = await db.table('daily_quest_sets').toArray();
  const activeSet = sets.find((s) => s.penalty_triggered && !s.penalty_cleared);
  if (activeSet) {
    await db.table('daily_quest_sets').put({ ...activeSet, penalty_cleared: true });
  }
  await dataClient.from('profiles').update({
    penalty_zone_active: false,
    penalty_zone_triggered_at: null,
  }).eq('id', LOCAL_USER_ID);
}

export function msUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}
