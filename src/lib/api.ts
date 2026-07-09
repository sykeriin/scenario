import { dataClient } from '@/lib/data-client';
import { LOCAL_USER_ID } from '@/integrations/local/schema-extensions';
import { addXp } from '@/lib/xp';
import { chatWithSystem, executeChatAction, invokeFunction } from '@/lib/ai';
import { db } from '@/integrations/local/db';

export const api = {
  profiles: {
    me: async () => {
      const { data, error } = await dataClient.from('profiles').select('*').eq('id', LOCAL_USER_ID).single();
      if (error) throw new Error(error.message);
      return data;
    },
    update: async (patch: Record<string, unknown>) => {
      const { data, error } = await dataClient.from('profiles').update(patch).eq('id', LOCAL_USER_ID).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    addXp: async (amount: number, sourceType?: string, sourceId?: string) =>
      addXp(LOCAL_USER_ID, amount, sourceType, sourceId),
    prestige: async () => {
      const profile = await db.table('profiles').get(LOCAL_USER_ID);
      if (!profile) throw new Error('Profile not found');
      const scenarios = await db.table('scenarios').toArray();
      const cleared = scenarios.filter((s) => s.user_id === LOCAL_USER_ID && s.status === 'completed').length;
      await db.table('prestige_log').put({
        id: crypto.randomUUID(),
        user_id: LOCAL_USER_ID,
        prestige_level: Number(profile.prestige_level ?? 0) + 1,
        xp_at_prestige: Number(profile.total_xp ?? 0),
        level_at_prestige: Number(profile.level ?? 1),
        scenarios_cleared_at_prestige: cleared,
        title_at_prestige: (profile.current_title as string) ?? null,
        prestiged_at: new Date().toISOString(),
      });
      await dataClient.from('profiles').update({
        prestige_level: Number(profile.prestige_level ?? 0) + 1,
        job_change_level: Number(profile.job_change_level ?? profile.prestige_level ?? 0) + 1,
        total_xp: 0,
        level: 1,
        hunter_rank: 'E',
        daily_xp_today: 0,
        stat_physical: 0,
        stat_psyche: 0,
        stat_intel: 0,
        stat_spiritual: 0,
        stat_core: 0,
        stat_craft: 0,
      }).eq('id', LOCAL_USER_ID);
      return { prestige_level: Number(profile.prestige_level ?? 0) + 1 };
    },
    prestigeHistory: async () => {
      const logs = await db.table('prestige_log').toArray();
      return logs.filter((l) => l.user_id === LOCAL_USER_ID).sort(
        (a, b) => String(b.prestiged_at).localeCompare(String(a.prestiged_at))
      );
    },
  },

  scenarios: {
    list: async (filters?: { status?: string; limit?: number }) => {
      let q = dataClient.from('scenarios').select('*').eq('user_id', LOCAL_USER_ID).order('created_at', { ascending: false });
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.limit) q = q.limit(filters.limit);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data;
    },
    get: async (id: string) => {
      const { data, error } = await dataClient.from('scenarios').select('*').eq('id', id).single();
      if (error) throw new Error(error.message);
      return data;
    },
    create: async (row: Record<string, unknown>) => {
      const { data, error } = await dataClient.from('scenarios').insert({ ...row, user_id: LOCAL_USER_ID }).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    update: async (id: string, patch: Record<string, unknown>) => {
      const { data, error } = await dataClient.from('scenarios').update(patch).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    completeQuest: async (_scenarioId: string, questId: string) => {
      await dataClient.from('quests').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', questId);
      const quest = await db.table('quests').get(questId);
      const xp = Number(quest?.xp_reward ?? 50);
      return addXp(LOCAL_USER_ID, xp, `quest:${questId}`);
    },
  },

  chat: {
    send: async (messages: { role: string; text?: string; content?: string }[], _sessionId: string) =>
      chatWithSystem(messages),
    executeAction: async (action: string, params: Record<string, unknown>) =>
      executeChatAction(action, params),
  },

  generate: async (data: Record<string, unknown>) => invokeFunction('generate-scenario', data),

  pomodoro: {
    start: async (questId?: string, durationMinutes?: number, mode?: string) => {
      const id = crypto.randomUUID();
      const row = {
        id,
        user_id: LOCAL_USER_ID,
        quest_id: questId ?? null,
        duration_minutes: durationMinutes ?? 25,
        mode: mode ?? 'free',
        completed: false,
        interrupted: false,
        created_at: new Date().toISOString(),
      };
      await dataClient.from('pomodoro_sessions').insert(row);
      return { _id: id, ...row };
    },
    complete: async (sessionId: string) => {
      const session = await db.table('pomodoro_sessions').get(sessionId);
      if (!session) throw new Error('Session not found');
      await dataClient.from('pomodoro_sessions').update({ completed: true, completed_at: new Date().toISOString() }).eq('id', sessionId);
      const isLinked = !!session.quest_id;
      const xp = isLinked ? 50 : 75;
      const result = await addXp(LOCAL_USER_ID, xp, 'pomodoro');
      return { xp_awarded: xp, did_level_up: result.did_level_up, new_level: result.new_level };
    },
    interrupt: async (sessionId: string) => {
      await dataClient.from('pomodoro_sessions').update({ interrupted: true }).eq('id', sessionId);
      return { ok: true };
    },
    today: async () => {
      const today = new Date().toISOString().split('T')[0];
      const sessions = await db.table('pomodoro_sessions').toArray();
      return sessions.filter(
        (s) => s.user_id === LOCAL_USER_ID && s.completed && String(s.created_at).startsWith(today)
      ).length;
    },
    consecutive: async (_questId: string) => 0,
    setPreferredDuration: async (duration: number) => {
      await dataClient.from('profiles').update({ preferred_pomodoro_duration: duration }).eq('id', LOCAL_USER_ID);
    },
  },

  data: {
    getMusts: async () => {
      const { data } = await dataClient.from('morning_musts').select('*').eq('user_id', LOCAL_USER_ID).order('order_index');
      return data ?? [];
    },
    createMusts: async (items: { text: string; order_index: number }[]) => {
      const rows = items.map((item) => ({ ...item, id: crypto.randomUUID(), user_id: LOCAL_USER_ID }));
      await dataClient.from('morning_musts').insert(rows);
      return rows;
    },
    getMustCompletions: async (mustIds: string[], date: string) => {
      const { data } = await dataClient.from('must_completions').select('*').in('must_id', mustIds).eq('completed_date', date);
      return data ?? [];
    },
    completeMust: async (mustId: string, date: string) => {
      const { data } = await dataClient.from('must_completions').insert({ id: crypto.randomUUID(), must_id: mustId, completed_date: date }).select().single();
      return data;
    },
    uncompleteMust: async (completionId: string) => {
      await dataClient.from('must_completions').delete().eq('id', completionId);
    },
    getHabits: async () => {
      const { data } = await dataClient.from('habits').select('*').eq('user_id', LOCAL_USER_ID);
      return data ?? [];
    },
    getXpLog: async (days = 30) => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data } = await dataClient.from('xp_log').select('*').eq('user_id', LOCAL_USER_ID).gte('created_at', since.toISOString());
      return data ?? [];
    },
    getEmotions: async (date?: string) => {
      let q = dataClient.from('emotion_logs').select('*').eq('user_id', LOCAL_USER_ID);
      if (date) q = q.eq('logged_at', date);
      const { data } = await q;
      return data ?? [];
    },
    logEmotion: async (row: Record<string, unknown>) => {
      await dataClient.from('emotion_logs').insert({ ...row, id: crypto.randomUUID(), user_id: LOCAL_USER_ID });
    },
    getVault: async () => {
      const { data } = await dataClient.from('vault_entries').select('*').eq('user_id', LOCAL_USER_ID);
      return data ?? [];
    },
    addVaultEntry: async (row: Record<string, unknown>) => {
      await dataClient.from('vault_entries').insert({ ...row, id: crypto.randomUUID(), user_id: LOCAL_USER_ID });
    },
    getWeeklyReviews: async (weekStart?: string) => {
      let q = dataClient.from('weekly_reviews').select('*').eq('user_id', LOCAL_USER_ID);
      if (weekStart) q = q.eq('week_start', weekStart);
      const { data } = await q;
      return data ?? [];
    },
    getLifePaths: async () => {
      const { data } = await dataClient.from('life_paths').select('*').eq('user_id', LOCAL_USER_ID);
      return data ?? [];
    },
    createLifePath: async (row: Record<string, unknown>) => {
      const { data } = await dataClient.from('life_paths').insert({ ...row, id: crypto.randomUUID(), user_id: LOCAL_USER_ID }).select().single();
      return data;
    },
    getLifePathArcs: async (pathId: string) => {
      const { data } = await dataClient.from('life_path_arcs').select('*').eq('path_id', pathId);
      return data ?? [];
    },
    createLifePathArc: async (row: Record<string, unknown>) => {
      await dataClient.from('life_path_arcs').insert({ ...row, id: crypto.randomUUID() });
    },
    createLifePathScenario: async (row: Record<string, unknown>) => {
      await dataClient.from('life_path_scenarios').insert({ ...row, id: crypto.randomUUID() });
    },
    createResource: async (row: Record<string, unknown>) => {
      await dataClient.from('resources').insert({ ...row, id: crypto.randomUUID(), user_id: LOCAL_USER_ID });
    },
    getTitles: async () => {
      const { data } = await dataClient.from('titles').select('*').eq('user_id', LOCAL_USER_ID);
      return data ?? [];
    },
    addTitle: async (row: Record<string, unknown>) => {
      await dataClient.from('titles').insert({ ...row, id: crypto.randomUUID(), user_id: LOCAL_USER_ID });
    },
    pomodoroToday: async () => api.pomodoro.today(),
  },
};

export default api;
