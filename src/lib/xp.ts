import { db, ensureSeeded } from '@/integrations/local/db';
import { emitRealtime } from '@/integrations/local/realtime';
import { syncHunterRank, getHunterRank } from '@/lib/solo-leveling/hunter-rank';
import { mpBoostFromArmyPower } from '@/lib/solo-leveling/shadow-army';

const LEVEL_XP = 500;

export interface AddXpResult {
  did_level_up: boolean;
  new_level: number;
  total_xp: number;
  old_level: number;
  did_rank_up?: boolean;
  new_rank?: string;
  old_rank?: string;
}

export async function addXp(
  userId: string,
  amount: number,
  source?: string,
  sourceId?: string
): Promise<AddXpResult> {
  await ensureSeeded();
  const table = db.table('profiles');
  const profile = await table.get(userId);
  if (!profile) throw new Error('Profile not found');

  const oldLevel = Number(profile.level ?? 1);
  const oldRank = String(profile.hunter_rank ?? 'E');
  const armyPower = Number(profile.shadow_army_power ?? 0);
  const isSl = profile.universe === 'solo_leveling';
  const boostedAmount = isSl ? Math.round(amount * mpBoostFromArmyPower(armyPower)) : amount;

  const totalXp = Number(profile.total_xp ?? 0) + boostedAmount;
  const newLevel = Math.floor(totalXp / LEVEL_XP) + 1;
  const newRank = syncHunterRank(totalXp);

  const updated = {
    ...profile,
    total_xp: totalXp,
    total_mp_ever: Number(profile.total_mp_ever ?? 0) + boostedAmount,
    level: newLevel,
    hunter_rank: newRank,
    daily_xp_today: Number(profile.daily_xp_today ?? 0) + boostedAmount,
    updated_at: new Date().toISOString(),
  };
  await table.put(updated);
  emitRealtime('profiles', 'UPDATE', updated, profile);

  await db.table('xp_log').put({
    id: crypto.randomUUID(),
    user_id: userId,
    amount: boostedAmount,
    source_type: source?.split(':')[0] ?? 'quest',
    source_id: sourceId ?? source ?? null,
    created_at: new Date().toISOString(),
    earned_at: new Date().toISOString(),
  });

  return {
    did_level_up: newLevel > oldLevel,
    new_level: newLevel,
    total_xp: totalXp,
    old_level: oldLevel,
    did_rank_up: isSl && newRank !== oldRank,
    new_rank: newRank,
    old_rank: oldRank,
  };
}

export function levelFromXp(totalXp: number) {
  return Math.floor(totalXp / LEVEL_XP) + 1;
}

export { getHunterRank };
