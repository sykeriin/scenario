import { getAIConfig, isAIReady } from './ai-config';
import { db, ensureSeeded } from '@/integrations/local/db';
import { LOCAL_USER_ID } from '@/integrations/local/schema-extensions';
import { from } from '@/integrations/local/query-builder';
import { addXp } from './xp';
import { insertScenarioFromAi, insertQuestIntoScenario } from './scenario-insert';
import { wrapPrompt, getProfileUniverse } from '@/lib/solo-leveling/sl-prompts';

export function extractJson(raw: string): unknown {
  let jsonStr = raw.trim();
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) jsonStr = match[1].trim();
  const braceStart = jsonStr.indexOf('{');
  const bracketStart = jsonStr.indexOf('[');
  if (braceStart >= 0 && (bracketStart < 0 || braceStart < bracketStart)) {
    jsonStr = jsonStr.slice(braceStart);
  } else if (bracketStart >= 0) {
    jsonStr = jsonStr.slice(bracketStart);
  }
  return JSON.parse(jsonStr);
}

/** OpenAI-compatible APIs only accept system, user, assistant, and tool roles. */
export function sanitizeChatMessages(messages: { role: string; text?: string; content?: string }[]) {
  return messages
    .filter((m) => m.role !== 'action')
    .map((m) => {
      const content = m.text || m.content || '';
      if (m.role === 'user') return { role: 'user' as const, content };
      return { role: 'assistant' as const, content };
    });
}

export async function callAI(
  messages: { role: string; content: string }[],
  opts?: { temperature?: number; max_tokens?: number; universe?: import('@/integrations/local/schema-extensions').Universe }
): Promise<string> {
  if (!isAIReady()) throw new Error('AI not configured. Add your API key in Settings.');
  const config = getAIConfig();
  const universe = opts?.universe ?? (await getProfileUniverse());
  const wrapped = messages.map((m, i) =>
    i === 0 && m.role === 'system' ? { ...m, content: wrapPrompt(m.content, universe) } : m
  );
  const res = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: wrapped,
      temperature: opts?.temperature ?? 0.7,
      max_tokens: opts?.max_tokens ?? 2000,
    }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error('Rate limit exceeded. Try again later.');
    const text = await res.text();
    throw new Error(`AI request failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

const SCENARIO_SYSTEM = `You are the System. Generate a structured Scenario. Return ONLY valid JSON:
{
  "title": "Clear Scenario: [dramatic title]",
  "dramatic_intro": "[2-3 sentences]",
  "xp_reward": 500,
  "bonus_xp": 200,
  "stages": [
    {
      "title": "Stage 1: [title]",
      "xp_reward": 100,
      "quests": [
        { "title": "[quest]", "type": "Study", "xp_reward": 75, "description": "[1 sentence]" }
      ]
    }
  ]
}
Rules:
- 3-7 stages, each with exactly 3-5 quests
- Never return empty quests arrays
- xp_reward per quest: 50-200`;

async function generateScenario(body: Record<string, unknown>) {
  const type = body.type ?? 'scenario';
  let systemPrompt = SCENARIO_SYSTEM;
  let userPrompt = '';

  if (type === 'life_path') {
    const arcCount = body.timeHorizon === '1yr' ? 2 : body.timeHorizon === '3yr' ? 4 : body.timeHorizon === '5yr' ? 6 : 10;
    systemPrompt = `Generate a Life Path JSON with path_title, vision_statement, arcs (${arcCount} arcs, each with suggested_scenarios). Return ONLY JSON.`;
    userPrompt = String(body.content ?? '');
  } else if (type === 'announcement') {
    systemPrompt = `Return ONLY JSON: { "message": "dramatic 3-sentence announcement" }`;
    userPrompt = String(body.content ?? '');
  } else if (type === 'flashcards') {
    systemPrompt = `Return ONLY JSON array of 15 flashcards: [{ "front", "back", "difficulty" }]`;
    userPrompt = String(body.scenarioContent ?? '');
  } else if (type === 'gameplan') {
    systemPrompt = `Return ONLY JSON: { "mission_name", "briefing", "days": [{ "day", "focus", "tasks" }] }`;
    userPrompt = String(body.scenarioContent ?? '');
  } else {
    userPrompt = `Category: ${body.category}\nDeadline: ${body.deadline}\nGoal: ${body.content}`;
  }

  let raw = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  let parsed = extractJson(raw) as Record<string, unknown>;

  if (type === 'scenario' || !type) {
    const stages = (parsed.stages as unknown[]) ?? [];
    parsed.stages = stages.filter(
      (s: unknown) => {
        const st = s as { quests?: unknown[] };
        return st.quests && Array.isArray(st.quests) && st.quests.length > 0;
      }
    );
    if ((parsed.stages as unknown[]).length === 0) {
      raw = await callAI([
        { role: 'system', content: systemPrompt + '\nCRITICAL: Every stage MUST have 3-5 quests.' },
        { role: 'user', content: userPrompt },
      ], { temperature: 0.5 });
      parsed = extractJson(raw) as Record<string, unknown>;
      parsed.stages = ((parsed.stages as unknown[]) ?? []).filter(
        (s: unknown) => {
          const st = s as { quests?: unknown[] };
          return st.quests?.length;
        }
      );
    }
  }

  return { result: parsed };
}

async function genericJsonPrompt(system: string, user: string) {
  const raw = await callAI([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);
  try {
    return extractJson(raw);
  } catch {
    return { message: raw, text: raw };
  }
}

export async function chatWithSystem(messages: { role: string; text?: string; content?: string }[]) {
  await ensureSeeded();
  const profile = await db.table('profiles').get(LOCAL_USER_ID);
  const scenarios = await db.table('scenarios').toArray();
  const active = scenarios.filter((s) => s.user_id === LOCAL_USER_ID && s.status === 'active');
  const quests = await db.table('quests').toArray();
  const pending = quests.filter((q) => q.status === 'pending').slice(0, 15);

  const systemPrompt = `You are the System — an AI co-pilot for a founder productivity app.
When user wants an app action, end your response with:
ACTION_BLOCK::{ "action": "create_scenario|complete_quest|log_mood|check_stats|get_plan|set_deadline|create_quest|show_disasters|start_pomodoro", "params": {}, "confirm_required": true, "confirm_message": "..." }

Protagonist: ${profile?.username}, Level ${profile?.level}, XP ${profile?.total_xp}
Active scenarios: ${active.map((s) => s.title).join(', ') || 'None'}
Pending quests: ${pending.map((q) => q.title).join(', ') || 'None'}
Keep responses under 3 sentences unless giving a plan.`;

  const groqMessages = [
    { role: 'system', content: systemPrompt },
    ...sanitizeChatMessages(messages),
  ];

  const content = await callAI(groqMessages, { max_tokens: 1000 });
  let conversational = content;
  let action: Record<string, unknown> | null = null;
  if (content.includes('ACTION_BLOCK::')) {
    const parts = content.split('ACTION_BLOCK::');
    conversational = parts[0].trim();
    try {
      action = JSON.parse(parts[1].trim()) as Record<string, unknown>;
    } catch { /* ignore */ }
  }
  return { message: conversational, action };
}

export async function executeChatAction(action: string, params: Record<string, unknown>) {
  await ensureSeeded();
  switch (action) {
    case 'create_scenario': {
      const content = String(params.content || params.goal || params.description || '');
      if (!content) return { success: false, message: 'No scenario description provided.' };
      const { result } = await generateScenario({
        type: 'scenario',
        category: params.category || 'Career',
        deadline: params.deadline || '30 days',
        content,
      }) as { result: Record<string, unknown> };
      const sid = await insertScenarioFromAi(result, String(params.category || 'Career'));
      return { success: true, message: `Scenario "${result.title}" created.`, scenario_id: sid };
    }
    case 'create_quest': {
      const scenarioName = String(params.scenario_name || '').toLowerCase();
      const scenarios = await db.table('scenarios').toArray();
      const scenario = scenarios.find(
        (s) => s.user_id === LOCAL_USER_ID && String(s.title).toLowerCase().includes(scenarioName)
      );
      if (!scenario) return { success: false, message: 'Scenario not found.' };
      const title = String(params.title || params.quest_name || 'New quest');
      const qid = await insertQuestIntoScenario(String(scenario.id), {
        title,
        description: String(params.description || ''),
        xp_reward: Number(params.xp_reward ?? 50),
        quest_type: String(params.quest_type || 'Study'),
      });
      return { success: true, message: `Quest "${title}" added.`, quest_id: qid };
    }
    case 'get_plan': {
      const profile = await db.table('profiles').get(LOCAL_USER_ID);
      const musts = await db.table('morning_musts').toArray();
      const scenarios = await db.table('scenarios').toArray();
      const quests = await db.table('quests').toArray();
      const active = scenarios.filter((s) => s.user_id === LOCAL_USER_ID && s.status === 'active');
      const pending = quests.filter((q) => q.status === 'pending');
      const userMusts = musts.filter((m) => m.user_id === LOCAL_USER_ID);
      const planRaw = await callAI([
        { role: 'system', content: 'Return a numbered TODAY\'S MISSION BRIEF — max 5 priorities, concise, actionable.' },
        {
          role: 'user',
          content: JSON.stringify({
            level: profile?.level,
            musts: userMusts.map((m) => m.text),
            scenarios: active.map((s) => s.title),
            quests: pending.slice(0, 10).map((q) => q.title),
          }),
        },
      ], { max_tokens: 600 });
      return { success: true, message: planRaw };
    }
    case 'show_disasters': {
      const disasters = await db.table('disasters').toArray();
      const active = disasters.filter((d) => d.user_id === LOCAL_USER_ID && d.status === 'active');
      if (!active.length) return { success: true, message: 'No active disasters. The path is clear.' };
      const lines = active.map((d) => `⚠ ${d.title}: ${d.hp ?? '?'} HP remaining`);
      return { success: true, message: lines.join('\n') };
    }
    case 'start_pomodoro': {
      return { success: true, message: 'Opening focus timer.', open_pomodoro: true, duration: Number(params.duration ?? 25) };
    }
    case 'complete_quest': {
      const name = String(params.quest_name || params.title || '').toLowerCase();
      const quests = await db.table('quests').toArray();
      const quest = quests.find(
        (q) => q.status === 'pending' && String(q.title).toLowerCase().includes(name)
      );
      if (!quest) return { success: false, message: 'Quest not found' };
      await from('quests').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', quest.id);
      const xp = Number(quest.xp_reward ?? 50);
      await addXp(LOCAL_USER_ID, xp, `quest:${quest.id}`);
      return { success: true, message: `Quest "${quest.title}" completed. +${xp} XP.` };
    }
    case 'log_mood': {
      const patch: Record<string, unknown> = {};
      if (params.mood !== undefined) patch.mood = Math.max(0, Math.min(10, Number(params.mood)));
      if (params.energy !== undefined) patch.motivation = Math.max(0, Math.min(10, Number(params.energy)));
      if (params.focus !== undefined) patch.concentration = Math.max(0, Math.min(10, Number(params.focus)));
      await from('profiles').update(patch).eq('id', LOCAL_USER_ID);
      return { success: true, message: 'Vitals updated.' };
    }
    case 'check_stats': {
      const profile = await db.table('profiles').get(LOCAL_USER_ID);
      const activeCount = (await db.table('scenarios').toArray()).filter(
        (s) => s.user_id === LOCAL_USER_ID && s.status === 'active'
      ).length;
      const today = new Date().toISOString().split('T')[0];
      const completedToday = (await db.table('quests').toArray()).filter(
        (q) => q.status === 'completed' && String(q.completed_at).startsWith(today)
      ).length;
      return {
        success: true,
        message: `Level ${profile?.level} · ${profile?.total_xp} XP · ${activeCount} active scenarios · ${completedToday} quests done today`,
        data: {
          level: profile?.level,
          total_xp: profile?.total_xp,
          active_scenarios: activeCount,
          quests_completed_today: completedToday,
        },
      };
    }
    case 'set_deadline': {
      const scenarios = await db.table('scenarios').toArray();
      const name = String(params.scenario_name || '').toLowerCase();
      const scenario = scenarios.find(
        (s) => s.user_id === LOCAL_USER_ID && String(s.title).toLowerCase().includes(name)
      );
      if (!scenario) return { success: false, message: 'Scenario not found' };
      await from('scenarios')
        .update({ doom_deadline: params.deadline })
        .eq('id', scenario.id);
      return { success: true, message: `Deadline set for "${scenario.title}".` };
    }
    default:
      return { success: false, message: `Unknown action: ${action}` };
  }
}

export async function invokeFunction(name: string, body: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'generate-scenario':
      return generateScenario(body);
    case 'system-chat':
      return chatWithSystem((body.messages as { role: string; text: string }[]) ?? []);
    case 'system-chat-execute':
      return executeChatAction(String(body.action), (body.params as Record<string, unknown>) ?? {});
    case 'weekly-review':
      return genericJsonPrompt(
        'Generate a weekly review narrative. Return JSON: { "narrative_text": "...", "highlights": [], "improvements": [] }',
        JSON.stringify(body)
      );
    case 'mood-insights':
      return genericJsonPrompt(
        'Analyze mood patterns. Return JSON: { "insights": [{ "title", "body" }] }',
        JSON.stringify(body)
      );
    case 'record-story':
      return genericJsonPrompt(
        'Record a story fragment. Return JSON: { "fragment": "...", "mood": "..." }',
        JSON.stringify(body)
      );
    case 'generate-novel-chapter':
      return genericJsonPrompt(
        'Write a novel chapter summary. Return JSON: { "title", "content", "chapter_number" }',
        JSON.stringify(body)
      );
    case 'generate-npc':
      return genericJsonPrompt(
        'Generate NPC encounter. Return JSON: { "npc_name", "dialogue", "quest_offer" }',
        JSON.stringify(body)
      );
    case 'generate-duel':
      return genericJsonPrompt(
        'Generate duel challenge. Return JSON: { "challenge_text", "stakes" }',
        JSON.stringify(body)
      );
    case 'extract-vault-insight':
      return genericJsonPrompt(
        'Extract insight. Return JSON: { "title", "content", "tags": [], "category": "Insight" }',
        `Quest: ${body.quest_title}\n${body.quest_description}`
      );
    case 'generate-demon-encounter':
      return genericJsonPrompt(
        'Generate demon encounter. Return JSON: { "demon_name", "temptation", "resist_reward" }',
        JSON.stringify(body)
      );
    case 'analyze-dream-board':
      return genericJsonPrompt(
        'Analyze dream board. Return JSON: { "themes": [], "recommendations": [] }',
        JSON.stringify(body)
      );
    case 'generate-character-visit':
      return genericJsonPrompt(
        'Generate character visit. Return JSON: { "character", "message", "reward" }',
        JSON.stringify(body)
      );
    case 'generate-shadow':
      return genericJsonPrompt(
        'Generate shadow self. Return JSON: { "shadow_name", "shadow_title", "shadow_note", "shadow_stats": {} }',
        JSON.stringify(body)
      );
    case 'recalibrate-path':
      return genericJsonPrompt(
        'Recalibrate life path. Return JSON: { "updated_arcs": [], "message": "..." }',
        JSON.stringify(body)
      );
    case 'disaster-system':
      return genericJsonPrompt(
        'Disaster system event. Return JSON: { "action", "disaster", "message" }',
        JSON.stringify(body)
      );
    case 'founder-sync':
      return genericJsonPrompt(
        `Merge multiple founders' research into a roadmap and SWOT. Return JSON:
{ "roadmap": { "title", "phases": [{ "name", "duration_weeks", "milestones": [] }] },
  "swot": { "strengths": [], "weaknesses": [], "opportunities": [], "threats": [], "strategic_recommendations": [] } }`,
        JSON.stringify(body)
      );
    default:
      throw new Error(`Unknown function: ${name}`);
  }
}
