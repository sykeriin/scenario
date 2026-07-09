import { from } from '@/integrations/local/query-builder';
import { LOCAL_USER_ID } from '@/integrations/local/schema-extensions';

export async function insertScenarioFromAi(result: Record<string, unknown>, category = 'Career') {
  const sid = crypto.randomUUID();
  await from('scenarios').insert({
    id: sid,
    user_id: LOCAL_USER_ID,
    title: result.title,
    dramatic_intro: result.dramatic_intro,
    category,
    status: 'active',
    xp_reward: result.xp_reward ?? 500,
    bonus_xp: result.bonus_xp ?? 200,
    created_at: new Date().toISOString(),
  });

  const stages = (result.stages as { title: string; quests: { title: string; type?: string; xp_reward?: number; description?: string }[] }[]) ?? [];
  for (let i = 0; i < stages.length; i++) {
    const stageId = crypto.randomUUID();
    await from('stages').insert({
      id: stageId,
      scenario_id: sid,
      title: stages[i].title,
      order_index: i,
      status: i === 0 ? 'active' : 'locked',
    });
    for (const q of stages[i].quests ?? []) {
      await from('quests').insert({
        id: crypto.randomUUID(),
        stage_id: stageId,
        title: q.title,
        description: q.description,
        quest_type: q.type ?? 'Study',
        xp_reward: q.xp_reward ?? 50,
        status: i === 0 ? 'pending' : 'locked',
      });
    }
  }
  return sid;
}

export async function insertQuestIntoScenario(scenarioId: string, quest: { title: string; description?: string; xp_reward?: number; quest_type?: string }) {
  const stages = await from('stages').select('*').eq('scenario_id', scenarioId).order('order_index').then((r) => r.data as Record<string, unknown>[] | null);
  const active = stages?.find((s) => s.status === 'active') ?? stages?.[0];
  if (!active) throw new Error('No stage found for scenario');
  const qid = crypto.randomUUID();
  await from('quests').insert({
    id: qid,
    stage_id: active.id,
    title: quest.title,
    description: quest.description ?? '',
    quest_type: quest.quest_type ?? 'Study',
    xp_reward: quest.xp_reward ?? 50,
    status: 'pending',
  });
  return qid;
}
