import { db, ensureSeeded } from './db';
import { addXp } from '@/lib/xp';

type RpcArgs = Record<string, unknown>;

export async function executeRpc(name: string, args: RpcArgs): Promise<{ data: unknown; error: { message: string } | null }> {
  try {
    await ensureSeeded();
    switch (name) {
      case 'add_xp': {
        const userId = String(args.user_id_param);
        const amount = Number(args.amount);
        const source = args.source ? String(args.source) : undefined;
        const result = await addXp(userId, amount, source);
        return { data: result, error: null };
      }
      case 'calculate_record_score': {
        const userId = String(args.p_user_id);
        const profile = await db.table('profiles').get(userId);
        if (!profile) return { data: 0, error: null };
        const score =
          Number(profile.total_xp ?? 0) +
          Number(profile.level ?? 1) * 100 +
          Number(profile.prestige_level ?? 0) * 500;
        return { data: score, error: null };
      }
      case 'deal_disaster_damage': {
        const disasterId = String(args.p_disaster_id);
        const damage = Number(args.p_damage);
        const table = db.table('disasters');
        const disaster = await table.get(disasterId);
        if (!disaster) return { data: null, error: { message: 'Disaster not found' } };
        const hp = Math.max(0, Number(disaster.hp ?? 100) - damage);
        const updated = { ...disaster, hp, updated_at: new Date().toISOString() };
        await table.put(updated);
        return { data: { hp, defeated: hp <= 0 }, error: null };
      }
      case 'is_channel_dokkaebi': {
        const channelId = String(args._channel_id);
        const userId = String(args._user_id);
        const members = await db.table('channel_members').toArray();
        const match = members.find(
          (m) => m.channel_id === channelId && m.user_id === userId && m.role === 'dokkaebi'
        );
        return { data: !!match, error: null };
      }
      case 'recalculate_oldest_dream': {
        const profiles = await db.table('profiles').toArray();
        const seats = profiles
          .map((p) => ({
            user_id: p.id,
            username: p.username,
            score:
              Number(p.total_xp ?? 0) +
              Number(p.level ?? 1) * 100 +
              Number(p.prestige_level ?? 0) * 500,
            prestige_level: Number(p.prestige_level ?? 0),
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);

        await db.table('oldest_dream_seats').clear();
        for (let i = 0; i < seats.length; i++) {
          await db.table('oldest_dream_seats').put({
            id: crypto.randomUUID(),
            seat_number: i + 1,
            user_id: seats[i].user_id,
            username: seats[i].username,
            record_score: seats[i].score,
            prestige_level: seats[i].prestige_level,
            updated_at: new Date().toISOString(),
          });
        }
        return { data: { seats }, error: null };
      }
      default:
        return { data: null, error: { message: `Unknown RPC: ${name}` } };
    }
  } catch (e: unknown) {
    return { data: null, error: { message: e instanceof Error ? e.message : 'RPC failed' } };
  }
}
