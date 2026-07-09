import Dexie, { type Table } from 'dexie';
import { DEFAULT_PROFILE, LOCAL_USER_ID, type AppMetaRow, type FounderRow, type PrestigeLogRow, type RoadmapRow, type SwotAnalysisRow, type SyncRunRow } from './schema-extensions';

export const TABLE_NAMES = [
  'channel_announcements', 'channel_members', 'channel_scenario_progress', 'channel_scenarios',
  'channel_tournaments', 'channels', 'character_visits', 'college_lobbies', 'constellation_scenarios',
  'constellations', 'demon_constellations', 'demon_encounters', 'disaster_attacks', 'disaster_quests',
  'disasters', 'dream_board_items', 'dream_boards', 'duel_progress', 'duels', 'emotion_logs',
  'habit_logs', 'habits', 'life_path_arcs', 'life_path_scenarios', 'life_paths', 'mood_insights',
  'morning_musts', 'must_completions', 'nebula_declarations', 'nebula_invites', 'nebula_members',
  'nebulae', 'novel_chapters', 'npc_encounters', 'oldest_dream_history', 'oldest_dream_seats',
  'parties', 'party_members', 'party_messages', 'party_scenarios', 'party_stage_assignments',
  'path_signals', 'pomodoro_sessions', 'profiles', 'quests', 'raid_participants', 'resources',
  'scenarios', 'shadow_selves', 'skill_nodes', 'stages', 'stigma_boosts', 'stigma_marks',
  'story_fragments', 'template_ratings', 'titles', 'tournament_matches', 'tournament_participants',
  'tournament_wins', 'user_skill_nodes', 'vault_connections', 'vault_entries', 'weekly_reviews', 'xp_log',
  'founders', 'roadmaps', 'swot_analyses', 'sync_runs', 'prestige_log', 'app_meta',
  'shadow_army', 'daily_quest_sets',
] as const;

export type TableName = (typeof TABLE_NAMES)[number];

function buildStoreSchemas(): Record<string, string> {
  const schemas: Record<string, string> = {};
  for (const name of TABLE_NAMES) {
    if (name === 'app_meta') {
      schemas[name] = 'key';
    } else if (name === 'profiles') {
      schemas[name] = 'id, username, universe, onboarding_completed';
    } else if (name === 'scenarios') {
      schemas[name] = 'id, user_id, status, founder_id, created_at';
    } else if (name === 'stages') {
      schemas[name] = 'id, scenario_id, status, order_index';
    } else if (name === 'quests') {
      schemas[name] = 'id, stage_id, status, completed_at';
    } else if (name === 'xp_log') {
      schemas[name] = 'id, user_id, created_at, source_type';
    } else if (name === 'morning_musts') {
      schemas[name] = 'id, user_id, order_index';
    } else if (name === 'must_completions') {
      schemas[name] = 'id, must_id, completed_date';
    } else if (name === 'habits') {
      schemas[name] = 'id, user_id';
    } else if (name === 'pomodoro_sessions') {
      schemas[name] = 'id, user_id, created_at, completed';
    } else if (name === 'vault_entries') {
      schemas[name] = 'id, user_id, founder_id, created_at';
    } else if (name === 'life_paths') {
      schemas[name] = 'id, user_id, status';
    } else if (name === 'founders') {
      schemas[name] = 'id, name, created_at';
    } else if (name === 'shadow_army') {
      schemas[name] = 'id, user_id, source_gate_id, shadow_rank, extracted_at';
    } else if (name === 'daily_quest_sets') {
      schemas[name] = 'id, user_id, quest_date';
    } else {
      schemas[name] = 'id, user_id, created_at, status';
    }
  }
  return schemas;
}

export class FounderOSDatabase extends Dexie {
  [key: string]: Table<Record<string, unknown>, string> | unknown;

  constructor() {
    super('founder_os');
    this.version(1).stores(buildStoreSchemas());
    this.version(2).stores({
      ...buildStoreSchemas(),
      shadow_army: 'id, user_id, source_gate_id, shadow_rank, extracted_at',
      daily_quest_sets: 'id, user_id, quest_date',
    });
  }
}

export const db = new FounderOSDatabase();

export async function getTable(name: string): Promise<Table<Record<string, unknown>, string>> {
  return (db as unknown as Record<string, Table<Record<string, unknown>, string>>)[name];
}

let seeded = false;

async function migrateLegacyProfiles() {
  const profiles = await db.table('profiles').toArray();
  for (const p of profiles) {
    const row = p as Record<string, unknown>;
    if (row.universe === 'founder') {
      await db.table('profiles').put({
        ...row,
        universe: 'orv',
        founder_mode: row.founder_mode ?? true,
        updated_at: new Date().toISOString(),
      });
    } else if (row.founder_mode === undefined) {
      await db.table('profiles').put({
        ...row,
        founder_mode: false,
        updated_at: new Date().toISOString(),
      });
    }
  }
}

export async function ensureSeeded() {
  if (seeded) return;
  await db.open();

  const profileCount = await db.table('profiles').count();
  if (profileCount === 0) {
    const now = new Date().toISOString();
    const founderId = crypto.randomUUID();
    await db.table('profiles').put({ ...DEFAULT_PROFILE, created_at: now, updated_at: now });
    await db.table('founders').put({
      id: founderId,
      name: 'Founder',
      role: 'CEO',
      focus_area: 'Product',
      avatar_color: '#eab308',
      created_at: now,
      research_notes_count: 0,
      initiatives_count: 0,
    } satisfies FounderRow);
    await db.table('app_meta').put({ key: 'current_user_id', value: LOCAL_USER_ID } satisfies AppMetaRow);
    await db.table('app_meta').put({ key: 'schema_version', value: 1 } satisfies AppMetaRow);
    await db.table('app_meta').put({ key: 'ai_configured', value: false } satisfies AppMetaRow);
    await db.table('app_meta').put({ key: 'active_founder_id', value: founderId } satisfies AppMetaRow);
  } else {
    await migrateLegacyProfiles();
  }
  seeded = true;
}

export type { PrestigeLogRow, FounderRow, RoadmapRow, SwotAnalysisRow, SyncRunRow, AppMetaRow };
