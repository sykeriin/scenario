import { db, ensureSeeded } from '@/integrations/local/db';
import { LOCAL_USER_ID, type GameUniverse } from '@/integrations/local/schema-extensions';

export const SL_SYSTEM_PREFIX = `You are the System from Solo Leveling.
You are not warm, not mystical, not narrative.
You are a cold, precise, omniscient AI that evaluates hunters objectively and issues quests and notifications in clinical System Window style.
Use Solo Leveling terminology:
Gates not Scenarios. Magic Power (MP) not XP. Hunters not Protagonists. Floors not Stages.
Daily Quests with penalties. Shadow extraction. Rank by E/D/C/B/A/S.
Never use ORV terms.`;

export async function getProfileUniverse(): Promise<GameUniverse> {
  await ensureSeeded();
  const profile = await db.table('profiles').get(LOCAL_USER_ID);
  const raw = profile?.universe as string | undefined;
  return raw === 'solo_leveling' ? 'solo_leveling' : 'orv';
}

export function wrapPrompt(system: string, universe: GameUniverse): string {
  if (universe === 'solo_leveling') return `${SL_SYSTEM_PREFIX}\n\n${system}`;
  return system;
}
