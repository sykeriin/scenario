/** Fields used locally beyond base database row types */
export const LOCAL_USER_ID = 'local-user-0001';

/** Active gameplay universe — ORV or Solo Leveling only */
export type GameUniverse = 'orv' | 'solo_leveling';
/** Includes legacy `founder` for term maps and migration */
export type Universe = GameUniverse | 'founder';

export interface ProfileExtensions {
  onboarding_completed?: boolean;
  onboarding_step?: number;
  prestige_level?: number;
  preferred_pomodoro_duration?: number;
  universe?: GameUniverse | 'founder';
  founder_mode?: boolean;
  founder_id?: string | null;
  hunter_rank?: string;
  shadow_army_count?: number;
  shadow_army_power?: number;
  penalty_zone_active?: boolean;
  penalty_zone_triggered_at?: string | null;
  consecutive_penalty_days?: number;
  job_change_level?: number;
  total_mp_ever?: number;
  daily_quest_streak?: number;
  gate_rank?: string;
}

export interface ShadowArmyRow {
  id: string;
  user_id: string;
  shadow_name: string;
  shadow_rank: 'soldier' | 'knight' | 'general' | 'marshal' | 'sovereign';
  source_gate_id?: string;
  source_gate_title?: string;
  source_category?: string;
  stat_bonus?: Record<string, number>;
  ability?: string;
  is_boss_shadow?: boolean;
  extracted_at: string;
  is_active?: boolean;
}

export interface DailyQuestSetRow {
  id: string;
  user_id: string;
  quest_date: string;
  quests: DailyQuestItem[];
  completed_count: number;
  total_count: number;
  penalty_triggered: boolean;
  penalty_quest?: DailyQuestItem | null;
  penalty_cleared: boolean;
  generated_at: string;
}

export interface DailyQuestItem {
  id: string;
  title: string;
  description?: string;
  stat_target?: string;
  difficulty?: string;
  mp_reward: number;
  completed?: boolean;
}

export interface ScenarioExtensions {
  cleared_at?: string | null;
  bonus_xp?: number | null;
  founder_id?: string | null;
}

export interface PrestigeLogRow {
  id: string;
  user_id: string;
  prestige_level: number;
  xp_at_prestige: number;
  level_at_prestige: number;
  scenarios_cleared_at_prestige: number;
  title_at_prestige: string | null;
  prestiged_at: string;
}

export interface FounderRow {
  id: string;
  name: string;
  role: string;
  focus_area: string;
  avatar_color?: string;
  created_at: string;
  research_notes_count?: number;
  initiatives_count?: number;
}

export interface RoadmapRow {
  id: string;
  version: number;
  title: string;
  phases: unknown;
  created_at: string;
  sync_run_id?: string;
}

export interface SwotAnalysisRow {
  id: string;
  roadmap_id: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  strategic_recommendations: string[];
  created_at: string;
}

export interface SyncRunRow {
  id: string;
  created_at: string;
  founder_ids: string[];
  input_summary?: string;
  ai_model?: string;
}

export interface AppMetaRow {
  key: string;
  value: unknown;
}

export const DEFAULT_PROFILE = {
  id: LOCAL_USER_ID,
  username: 'Founder',
  display_name: 'Founder',
  college: null,
  avatar_url: null,
  level: 1,
  total_xp: 0,
  daily_xp_today: 0,
  daily_xp_target: 10,
  current_title: 'Nameless Reader',
  hp: 5,
  mood: 5,
  concentration: 5,
  motivation: 5,
  stat_physical: 0,
  stat_psyche: 0,
  stat_intel: 0,
  stat_spiritual: 0,
  stat_core: 0,
  stat_craft: 0,
  prestige_level: 0,
  regression_count: 0,
  ui_theme: 'Black & Yellow',
  today_intention: null,
  onboarding_completed: false,
  daily_focus_goal: 4,
  preferred_pomodoro_duration: 25,
  universe: 'orv' as GameUniverse,
  founder_mode: false,
  hunter_rank: 'E',
  shadow_army_count: 0,
  shadow_army_power: 0,
  penalty_zone_active: false,
  penalty_zone_triggered_at: null,
  consecutive_penalty_days: 0,
  job_change_level: 0,
  total_mp_ever: 0,
  daily_quest_streak: 0,
  constellation_grade: 'F',
  constellation_scenario_count: 0,
  constellation_scenarios_cleared: 0,
  constellation_sponsee_count: 0,
  constellation_stories: 0,
  demon_encounters_resisted: 0,
  demon_encounters_submitted: 0,
  focus_duration: 25,
  break_duration: 5,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
