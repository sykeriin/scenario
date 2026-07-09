import { db, ensureSeeded } from '@/integrations/local/db';
import { LOCAL_USER_ID, type ShadowArmyRow } from '@/integrations/local/schema-extensions';
import { dataClient } from '@/lib/data-client';
import { callAI, extractJson } from '@/lib/ai';
import { wrapPrompt, getProfileUniverse } from '@/lib/solo-leveling/sl-prompts';

const RANK_BY_DIFFICULTY: Record<string, ShadowArmyRow['shadow_rank']> = {
  E: 'soldier', D: 'soldier', C: 'knight', B: 'knight', A: 'general', S: 'marshal',
};

export function calcArmyPower(shadows: ShadowArmyRow[]): number {
  return shadows.reduce((sum, s) => {
    const bonus = s.stat_bonus ?? {};
    return sum + Object.values(bonus).reduce((a, b) => a + b, 0);
  }, 0);
}

export function mpBoostFromArmyPower(power: number): number {
  return 1 + Math.floor(power / 100) * 0.01;
}

export async function extractShadow(gateId: string, gateTitle: string, category: string, gateRank = 'E', isBoss = false) {
  await ensureSeeded();
  const universe = await getProfileUniverse();
  let shadow: Partial<ShadowArmyRow> = {
    shadow_name: `Shadow of ${gateTitle}`,
    shadow_rank: isBoss ? 'marshal' : (RANK_BY_DIFFICULTY[gateRank] ?? 'soldier'),
    ability: 'Passive stat boost from conquered gate.',
    stat_bonus: { str: 1, int: 1 },
  };

  try {
    const raw = await callAI([
      {
        role: 'system',
        content: wrapPrompt(
          `Extract a shadow soldier from a cleared gate. Return JSON:
{ "name": "...", "rank": "soldier|knight|general|marshal|sovereign", "ability": "...", "stat_bonus": { "str": N, "int": N, "per": N, "agi": N, "end": N, "sense": N } }`,
          universe
        ),
      },
      { role: 'user', content: JSON.stringify({ gate_title: gateTitle, category, gate_rank: gateRank, is_boss: isBoss }) },
    ]);
    const parsed = extractJson(raw) as Record<string, unknown>;
    shadow = {
      shadow_name: String(parsed.name ?? shadow.shadow_name),
      shadow_rank: (parsed.rank as ShadowArmyRow['shadow_rank']) ?? shadow.shadow_rank,
      ability: String(parsed.ability ?? shadow.ability),
      stat_bonus: (parsed.stat_bonus as Record<string, number>) ?? shadow.stat_bonus,
    };
  } catch { /* use defaults */ }

  const row: ShadowArmyRow = {
    id: crypto.randomUUID(),
    user_id: LOCAL_USER_ID,
    shadow_name: shadow.shadow_name!,
    shadow_rank: shadow.shadow_rank!,
    source_gate_id: gateId,
    source_gate_title: gateTitle,
    source_category: category,
    stat_bonus: shadow.stat_bonus,
    ability: shadow.ability,
    is_boss_shadow: isBoss,
    extracted_at: new Date().toISOString(),
    is_active: true,
  };
  await db.table('shadow_army').put(row);

  const shadows = (await db.table('shadow_army').toArray()).filter((s) => s.user_id === LOCAL_USER_ID) as ShadowArmyRow[];
  const power = calcArmyPower(shadows);
  await dataClient.from('profiles').update({
    shadow_army_count: shadows.length,
    shadow_army_power: power,
  }).eq('id', LOCAL_USER_ID);
  return row;
}

export async function getShadowArmy(): Promise<ShadowArmyRow[]> {
  await ensureSeeded();
  const shadows = await db.table('shadow_army').toArray();
  return shadows.filter((s) => s.user_id === LOCAL_USER_ID && s.is_active !== false) as ShadowArmyRow[];
}
