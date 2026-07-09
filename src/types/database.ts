export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      channel_announcements: {
        Row: {
          author_id: string
          channel_id: string
          content: string
          created_at: string
          id: string
          pinned: boolean
        }
        Insert: {
          author_id: string
          channel_id: string
          content: string
          created_at?: string
          id?: string
          pinned?: boolean
        }
        Update: {
          author_id?: string
          channel_id?: string
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "channel_announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_announcements_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_members: {
        Row: {
          channel_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_scenario_progress: {
        Row: {
          channel_scenario_id: string
          cleared_at: string | null
          enrolled_at: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          channel_scenario_id: string
          cleared_at?: string | null
          enrolled_at?: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          channel_scenario_id?: string
          cleared_at?: string | null
          enrolled_at?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_scenario_progress_channel_scenario_id_fkey"
            columns: ["channel_scenario_id"]
            isOneToOne: false
            referencedRelation: "channel_scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_scenario_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_scenarios: {
        Row: {
          channel_id: string
          created_at: string
          created_by: string
          deadline: string | null
          description: string | null
          id: string
          is_mandatory: boolean
          scenario_type: string
          status: string
          title: string
          xp_reward: number
        }
        Insert: {
          channel_id: string
          created_at?: string
          created_by: string
          deadline?: string | null
          description?: string | null
          id?: string
          is_mandatory?: boolean
          scenario_type?: string
          status?: string
          title: string
          xp_reward?: number
        }
        Update: {
          channel_id?: string
          created_at?: string
          created_by?: string
          deadline?: string | null
          description?: string | null
          id?: string
          is_mandatory?: boolean
          scenario_type?: string
          status?: string
          title?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "channel_scenarios_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_scenarios_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_tournaments: {
        Row: {
          bracket_structure: Json
          category: string
          channel_id: string
          created_at: string
          created_by: string
          current_participants: number
          current_round: number
          deadline: string
          entry_xp_fee: number
          id: string
          max_participants: number
          scenario_title: string
          tournament_name: string
          tournament_status: string
          winner_takes_all: boolean
        }
        Insert: {
          bracket_structure?: Json
          category?: string
          channel_id: string
          created_at?: string
          created_by: string
          current_participants?: number
          current_round?: number
          deadline: string
          entry_xp_fee?: number
          id?: string
          max_participants?: number
          scenario_title: string
          tournament_name: string
          tournament_status?: string
          winner_takes_all?: boolean
        }
        Update: {
          bracket_structure?: Json
          category?: string
          channel_id?: string
          created_at?: string
          created_by?: string
          current_participants?: number
          current_round?: number
          deadline?: string
          entry_xp_fee?: number
          id?: string
          max_participants?: number
          scenario_title?: string
          tournament_name?: string
          tournament_status?: string
          winner_takes_all?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "fk_tournaments_channel"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tournaments_creator"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          banner_image_url: string | null
          created_at: string
          description: string | null
          id: string
          member_count: number
          name: string
          theme: string
        }
        Insert: {
          banner_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          member_count?: number
          name: string
          theme?: string
        }
        Update: {
          banner_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          member_count?: number
          name?: string
          theme?: string
        }
        Relationships: []
      }
      character_visits: {
        Row: {
          accepted: boolean | null
          character_name: string
          character_title: string
          dismissed_at: string | null
          follow_up_message: string | null
          id: string
          message: string
          scenario_data: Json | null
          triggered_by: string
          user_id: string
          visit_type: string
          visited_at: string
        }
        Insert: {
          accepted?: boolean | null
          character_name: string
          character_title: string
          dismissed_at?: string | null
          follow_up_message?: string | null
          id?: string
          message?: string
          scenario_data?: Json | null
          triggered_by?: string
          user_id: string
          visit_type?: string
          visited_at?: string
        }
        Update: {
          accepted?: boolean | null
          character_name?: string
          character_title?: string
          dismissed_at?: string | null
          follow_up_message?: string | null
          id?: string
          message?: string
          scenario_data?: Json | null
          triggered_by?: string
          user_id?: string
          visit_type?: string
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      college_lobbies: {
        Row: {
          college_name: string
          created_at: string | null
          id: string
        }
        Insert: {
          college_name: string
          created_at?: string | null
          id?: string
        }
        Update: {
          college_name?: string
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      constellation_scenarios: {
        Row: {
          category: string | null
          constellation_id: string
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          mentor_id: string
          personal_note: string | null
          responded_at: string | null
          sponsee_id: string
          stages: Json | null
          status: string
          title: string
          xp_reward: number
        }
        Insert: {
          category?: string | null
          constellation_id: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          mentor_id: string
          personal_note?: string | null
          responded_at?: string | null
          sponsee_id: string
          stages?: Json | null
          status?: string
          title: string
          xp_reward?: number
        }
        Update: {
          category?: string | null
          constellation_id?: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          mentor_id?: string
          personal_note?: string | null
          responded_at?: string | null
          sponsee_id?: string
          stages?: Json | null
          status?: string
          title?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "constellation_scenarios_constellation_id_fkey"
            columns: ["constellation_id"]
            isOneToOne: false
            referencedRelation: "constellations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "constellation_scenarios_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "constellation_scenarios_sponsee_id_fkey"
            columns: ["sponsee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      constellations: {
        Row: {
          active: boolean
          created_at: string | null
          id: string
          mentee_id: string
          mentor_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          id?: string
          mentee_id: string
          mentor_id: string
        }
        Update: {
          active?: boolean
          created_at?: string | null
          id?: string
          mentee_id?: string
          mentor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "constellations_mentee_id_fkey"
            columns: ["mentee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "constellations_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      demon_constellations: {
        Row: {
          appearance_count: number
          domain: string
          flavor_text: string
          grade: string
          id: string
          name: string
        }
        Insert: {
          appearance_count?: number
          domain?: string
          flavor_text?: string
          grade?: string
          id?: string
          name: string
        }
        Update: {
          appearance_count?: number
          domain?: string
          flavor_text?: string
          grade?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      demon_encounters: {
        Row: {
          correct_action: string
          demon_id: string
          encountered_at: string
          id: string
          intended_effect: string
          resistance_xp_reward: number
          resolved_at: string | null
          scenario_content: string
          scenario_title: string
          status: string
          submission_penalty: number
          user_id: string
        }
        Insert: {
          correct_action?: string
          demon_id: string
          encountered_at?: string
          id?: string
          intended_effect?: string
          resistance_xp_reward?: number
          resolved_at?: string | null
          scenario_content?: string
          scenario_title?: string
          status?: string
          submission_penalty?: number
          user_id: string
        }
        Update: {
          correct_action?: string
          demon_id?: string
          encountered_at?: string
          id?: string
          intended_effect?: string
          resistance_xp_reward?: number
          resolved_at?: string | null
          scenario_content?: string
          scenario_title?: string
          status?: string
          submission_penalty?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demon_encounters_demon_id_fkey"
            columns: ["demon_id"]
            isOneToOne: false
            referencedRelation: "demon_constellations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demon_encounters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disaster_attacks: {
        Row: {
          attack_type: string
          attacked_at: string
          damage_description: string
          disaster_id: string
          effect_applied: string | null
          id: string
          user_id: string
        }
        Insert: {
          attack_type?: string
          attacked_at?: string
          damage_description?: string
          disaster_id: string
          effect_applied?: string | null
          id?: string
          user_id: string
        }
        Update: {
          attack_type?: string
          attacked_at?: string
          damage_description?: string
          disaster_id?: string
          effect_applied?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disaster_attacks_disaster_id_fkey"
            columns: ["disaster_id"]
            isOneToOne: false
            referencedRelation: "disasters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disaster_attacks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disaster_quests: {
        Row: {
          completed_at: string | null
          damage_dealt: number
          description: string | null
          disaster_id: string
          id: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          damage_dealt?: number
          description?: string | null
          disaster_id: string
          id?: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          damage_dealt?: number
          description?: string | null
          disaster_id?: string
          id?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disaster_quests_disaster_id_fkey"
            columns: ["disaster_id"]
            isOneToOne: false
            referencedRelation: "disasters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disaster_quests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disasters: {
        Row: {
          attack_pattern: Json | null
          channel_id: string | null
          current_hp: number
          deadline: string
          defeated_at: string | null
          disaster_class: number
          flavor_text: string
          id: string
          max_hp: number
          name: string
          reward_title: string | null
          reward_xp: number
          spawned_at: string
          status: string
          type: string
          user_id: string | null
        }
        Insert: {
          attack_pattern?: Json | null
          channel_id?: string | null
          current_hp?: number
          deadline: string
          defeated_at?: string | null
          disaster_class?: number
          flavor_text?: string
          id?: string
          max_hp?: number
          name: string
          reward_title?: string | null
          reward_xp?: number
          spawned_at?: string
          status?: string
          type?: string
          user_id?: string | null
        }
        Update: {
          attack_pattern?: Json | null
          channel_id?: string | null
          current_hp?: number
          deadline?: string
          defeated_at?: string | null
          disaster_class?: number
          flavor_text?: string
          id?: string
          max_hp?: number
          name?: string
          reward_title?: string | null
          reward_xp?: number
          spawned_at?: string
          status?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disasters_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disasters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dream_board_items: {
        Row: {
          added_at: string
          board_id: string
          color_override: string | null
          content: string
          id: string
          item_type: string
          position_x: number
          position_y: number
          size: string
        }
        Insert: {
          added_at?: string
          board_id: string
          color_override?: string | null
          content?: string
          id?: string
          item_type?: string
          position_x?: number
          position_y?: number
          size?: string
        }
        Update: {
          added_at?: string
          board_id?: string
          color_override?: string | null
          content?: string
          id?: string
          item_type?: string
          position_x?: number
          position_y?: number
          size?: string
        }
        Relationships: [
          {
            foreignKeyName: "dream_board_items_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "dream_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      dream_boards: {
        Row: {
          ai_analysis: Json | null
          created_at: string
          id: string
          last_analyzed_at: string | null
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          created_at?: string
          id?: string
          last_analyzed_at?: string | null
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          created_at?: string
          id?: string
          last_analyzed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dream_boards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_progress: {
        Row: {
          cleared_at: string | null
          duel_id: string
          id: string
          quests_completed: number
          total_quests: number
          user_id: string
        }
        Insert: {
          cleared_at?: string | null
          duel_id: string
          id?: string
          quests_completed?: number
          total_quests?: number
          user_id: string
        }
        Update: {
          cleared_at?: string | null
          duel_id?: string
          id?: string
          quests_completed?: number
          total_quests?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "duel_progress_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      duels: {
        Row: {
          category: string | null
          challenger_id: string
          challenger_scenario_id: string | null
          created_at: string
          deadline: string
          id: string
          opponent_id: string
          opponent_scenario_id: string | null
          scenario_title: string
          status: string
          winner_id: string | null
          xp_stake: number
        }
        Insert: {
          category?: string | null
          challenger_id: string
          challenger_scenario_id?: string | null
          created_at?: string
          deadline: string
          id?: string
          opponent_id: string
          opponent_scenario_id?: string | null
          scenario_title: string
          status?: string
          winner_id?: string | null
          xp_stake?: number
        }
        Update: {
          category?: string | null
          challenger_id?: string
          challenger_scenario_id?: string | null
          created_at?: string
          deadline?: string
          id?: string
          opponent_id?: string
          opponent_scenario_id?: string | null
          scenario_title?: string
          status?: string
          winner_id?: string | null
          xp_stake?: number
        }
        Relationships: [
          {
            foreignKeyName: "duels_challenger_id_fkey"
            columns: ["challenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duels_challenger_scenario_id_fkey"
            columns: ["challenger_scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duels_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duels_opponent_scenario_id_fkey"
            columns: ["opponent_scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duels_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emotion_logs: {
        Row: {
          ai_tags: Json | null
          created_at: string
          energy_score: number
          id: string
          logged_at: string
          mood_score: number
          one_line: string | null
          user_id: string
        }
        Insert: {
          ai_tags?: Json | null
          created_at?: string
          energy_score?: number
          id?: string
          logged_at?: string
          mood_score?: number
          one_line?: string | null
          user_id: string
        }
        Update: {
          ai_tags?: Json | null
          created_at?: string
          energy_score?: number
          id?: string
          logged_at?: string
          mood_score?: number
          one_line?: string | null
          user_id?: string
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          created_at: string | null
          habit_id: string | null
          id: string
          logged_date: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          habit_id?: string | null
          id?: string
          logged_date: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          habit_id?: string | null
          id?: string
          logged_date?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          category: string | null
          created_at: string | null
          current_streak: number | null
          id: string
          label: string
          last_logged: string | null
          longest_streak: number | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          current_streak?: number | null
          id?: string
          label: string
          last_logged?: string | null
          longest_streak?: number | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          current_streak?: number | null
          id?: string
          label?: string
          last_logged?: string | null
          longest_streak?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "habits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      life_path_arcs: {
        Row: {
          description: string | null
          duration_months: number
          focus_areas: Json | null
          id: string
          is_ai_modified: boolean
          life_path_id: string
          modification_reason: string | null
          modified_at: string | null
          order_index: number
          original_data: Json | null
          status: string
          title: string
        }
        Insert: {
          description?: string | null
          duration_months?: number
          focus_areas?: Json | null
          id?: string
          is_ai_modified?: boolean
          life_path_id: string
          modification_reason?: string | null
          modified_at?: string | null
          order_index?: number
          original_data?: Json | null
          status?: string
          title: string
        }
        Update: {
          description?: string | null
          duration_months?: number
          focus_areas?: Json | null
          id?: string
          is_ai_modified?: boolean
          life_path_id?: string
          modification_reason?: string | null
          modified_at?: string | null
          order_index?: number
          original_data?: Json | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "life_path_arcs_life_path_id_fkey"
            columns: ["life_path_id"]
            isOneToOne: false
            referencedRelation: "life_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      life_path_scenarios: {
        Row: {
          arc_id: string
          id: string
          is_completed: boolean
          order_index: number
          scenario_id: string | null
          suggested_category: string | null
          suggested_title: string
          suggested_why: string | null
        }
        Insert: {
          arc_id: string
          id?: string
          is_completed?: boolean
          order_index?: number
          scenario_id?: string | null
          suggested_category?: string | null
          suggested_title: string
          suggested_why?: string | null
        }
        Update: {
          arc_id?: string
          id?: string
          is_completed?: boolean
          order_index?: number
          scenario_id?: string | null
          suggested_category?: string | null
          suggested_title?: string
          suggested_why?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "life_path_scenarios_arc_id_fkey"
            columns: ["arc_id"]
            isOneToOne: false
            referencedRelation: "life_path_arcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "life_path_scenarios_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      life_paths: {
        Row: {
          created_at: string
          drift_log: Json | null
          generated_roadmap: Json | null
          id: string
          last_recalibrated_at: string | null
          raw_input: Json | null
          recalibrated_at: string | null
          recalibration_count: number
          status: string
          time_horizon: string
          title: string
          user_id: string
          vision_statement: string | null
        }
        Insert: {
          created_at?: string
          drift_log?: Json | null
          generated_roadmap?: Json | null
          id?: string
          last_recalibrated_at?: string | null
          raw_input?: Json | null
          recalibrated_at?: string | null
          recalibration_count?: number
          status?: string
          time_horizon?: string
          title?: string
          user_id: string
          vision_statement?: string | null
        }
        Update: {
          created_at?: string
          drift_log?: Json | null
          generated_roadmap?: Json | null
          id?: string
          last_recalibrated_at?: string | null
          raw_input?: Json | null
          recalibrated_at?: string | null
          recalibration_count?: number
          status?: string
          time_horizon?: string
          title?: string
          user_id?: string
          vision_statement?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "life_paths_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mood_insights: {
        Row: {
          dismissed: boolean
          generated_at: string
          id: string
          insight_text: string
          pattern_type: string | null
          user_id: string
        }
        Insert: {
          dismissed?: boolean
          generated_at?: string
          id?: string
          insight_text: string
          pattern_type?: string | null
          user_id: string
        }
        Update: {
          dismissed?: boolean
          generated_at?: string
          id?: string
          insight_text?: string
          pattern_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      morning_musts: {
        Row: {
          created_at: string | null
          id: string
          order_index: number | null
          text: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_index?: number | null
          text: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_index?: number | null
          text?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "morning_musts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      must_completions: {
        Row: {
          completed_date: string
          created_at: string | null
          id: string
          must_id: string | null
        }
        Insert: {
          completed_date: string
          created_at?: string | null
          id?: string
          must_id?: string | null
        }
        Update: {
          completed_date?: string
          created_at?: string | null
          id?: string
          must_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "must_completions_must_id_fkey"
            columns: ["must_id"]
            isOneToOne: false
            referencedRelation: "morning_musts"
            referencedColumns: ["id"]
          },
        ]
      }
      nebula_declarations: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          nebula_id: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          nebula_id: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          nebula_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "nebula_declarations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nebula_declarations_nebula_id_fkey"
            columns: ["nebula_id"]
            isOneToOne: false
            referencedRelation: "nebulae"
            referencedColumns: ["id"]
          },
        ]
      }
      nebula_invites: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          invited_user_id: string
          nebula_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          invited_user_id: string
          nebula_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          invited_user_id?: string
          nebula_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "nebula_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nebula_invites_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nebula_invites_nebula_id_fkey"
            columns: ["nebula_id"]
            isOneToOne: false
            referencedRelation: "nebulae"
            referencedColumns: ["id"]
          },
        ]
      }
      nebula_members: {
        Row: {
          id: string
          joined_at: string
          nebula_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          nebula_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          nebula_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nebula_members_nebula_id_fkey"
            columns: ["nebula_id"]
            isOneToOne: false
            referencedRelation: "nebulae"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nebula_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nebulae: {
        Row: {
          banner_color: string
          created_at: string
          domain: string
          emblem_icon: string
          founder_id: string
          id: string
          member_count: number
          motto: string
          name: string
          nebula_rank: number
          total_stories: number
        }
        Insert: {
          banner_color?: string
          created_at?: string
          domain?: string
          emblem_icon?: string
          founder_id: string
          id?: string
          member_count?: number
          motto?: string
          name: string
          nebula_rank?: number
          total_stories?: number
        }
        Update: {
          banner_color?: string
          created_at?: string
          domain?: string
          emblem_icon?: string
          founder_id?: string
          id?: string
          member_count?: number
          motto?: string
          name?: string
          nebula_rank?: number
          total_stories?: number
        }
        Relationships: [
          {
            foreignKeyName: "nebulae_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      novel_chapters: {
        Row: {
          chapter_content: string
          chapter_number: number
          chapter_title: string
          cover_color: string | null
          generated_at: string
          id: string
          key_events: Json | null
          month_year: string
          stats_snapshot: Json | null
          user_id: string
        }
        Insert: {
          chapter_content?: string
          chapter_number?: number
          chapter_title?: string
          cover_color?: string | null
          generated_at?: string
          id?: string
          key_events?: Json | null
          month_year: string
          stats_snapshot?: Json | null
          user_id: string
        }
        Update: {
          chapter_content?: string
          chapter_number?: number
          chapter_title?: string
          cover_color?: string | null
          generated_at?: string
          id?: string
          key_events?: Json | null
          month_year?: string
          stats_snapshot?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "novel_chapters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      npc_encounters: {
        Row: {
          created_at: string
          dialogue: string
          expires_at: string
          id: string
          npc_description: string
          npc_name: string
          npc_type: string
          quest_description: string
          quest_title: string
          quest_type: string
          special_reward: string | null
          status: string
          user_id: string
          xp_reward: number
        }
        Insert: {
          created_at?: string
          dialogue?: string
          expires_at: string
          id?: string
          npc_description: string
          npc_name: string
          npc_type: string
          quest_description: string
          quest_title: string
          quest_type?: string
          special_reward?: string | null
          status?: string
          user_id: string
          xp_reward?: number
        }
        Update: {
          created_at?: string
          dialogue?: string
          expires_at?: string
          id?: string
          npc_description?: string
          npc_name?: string
          npc_type?: string
          quest_description?: string
          quest_title?: string
          quest_type?: string
          special_reward?: string | null
          status?: string
          user_id?: string
          xp_reward?: number
        }
        Relationships: []
      }
      oldest_dream_history: {
        Row: {
          displaced_by_user_id: string | null
          held_from: string
          held_until: string | null
          id: string
          seat_number: number
          user_id: string
        }
        Insert: {
          displaced_by_user_id?: string | null
          held_from?: string
          held_until?: string | null
          id?: string
          seat_number: number
          user_id: string
        }
        Update: {
          displaced_by_user_id?: string | null
          held_from?: string
          held_until?: string | null
          id?: string
          seat_number?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oldest_dream_history_displaced_by_user_id_fkey"
            columns: ["displaced_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oldest_dream_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      oldest_dream_seats: {
        Row: {
          achievement_summary: string | null
          constellation_grade: string | null
          disasters_defeated: number | null
          earned_at: string
          id: string
          is_active: boolean
          prestige_level: number | null
          record_score: number
          scenarios_cleared: number | null
          seat_number: number
          total_xp_at_entry: number | null
          user_id: string
        }
        Insert: {
          achievement_summary?: string | null
          constellation_grade?: string | null
          disasters_defeated?: number | null
          earned_at?: string
          id?: string
          is_active?: boolean
          prestige_level?: number | null
          record_score?: number
          scenarios_cleared?: number | null
          seat_number: number
          total_xp_at_entry?: number | null
          user_id: string
        }
        Update: {
          achievement_summary?: string | null
          constellation_grade?: string | null
          disasters_defeated?: number | null
          earned_at?: string
          id?: string
          is_active?: boolean
          prestige_level?: number | null
          record_score?: number
          scenarios_cleared?: number | null
          seat_number?: number
          total_xp_at_entry?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oldest_dream_seats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parties: {
        Row: {
          created_at: string
          id: string
          leader_id: string
          max_members: number
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          leader_id: string
          max_members?: number
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          leader_id?: string
          max_members?: number
          name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "parties_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      party_members: {
        Row: {
          id: string
          joined_at: string
          party_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          party_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          party_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_members_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      party_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          party_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          party_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          party_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_messages_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      party_scenarios: {
        Row: {
          created_at: string
          id: string
          party_id: string
          scenario_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          party_id: string
          scenario_id: string
        }
        Update: {
          created_at?: string
          id?: string
          party_id?: string
          scenario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_scenarios_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_scenarios_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      party_stage_assignments: {
        Row: {
          assigned_to_user_id: string
          id: string
          party_scenario_id: string
          stage_id: string
        }
        Insert: {
          assigned_to_user_id: string
          id?: string
          party_scenario_id: string
          stage_id: string
        }
        Update: {
          assigned_to_user_id?: string
          id?: string
          party_scenario_id?: string
          stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_stage_assignments_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_stage_assignments_party_scenario_id_fkey"
            columns: ["party_scenario_id"]
            isOneToOne: false
            referencedRelation: "party_scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_stage_assignments_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      path_signals: {
        Row: {
          created_at: string
          id: string
          processed: boolean
          signal_data: Json
          signal_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          processed?: boolean
          signal_data?: Json
          signal_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          processed?: boolean
          signal_data?: Json
          signal_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "path_signals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pomodoro_sessions: {
        Row: {
          completed: boolean
          created_at: string
          duration_minutes: number
          ended_at: string | null
          focus_multiplier: number
          id: string
          interrupted: boolean
          quest_id: string | null
          started_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          duration_minutes?: number
          ended_at?: string | null
          focus_multiplier?: number
          id?: string
          interrupted?: boolean
          quest_id?: string | null
          started_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          duration_minutes?: number
          ended_at?: string | null
          focus_multiplier?: number
          id?: string
          interrupted?: boolean
          quest_id?: string | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pomodoro_sessions_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pomodoro_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          break_duration: number | null
          college: string | null
          concentration: number | null
          constellation_grade: string
          constellation_scenario_count: number
          constellation_scenarios_cleared: number
          constellation_sponsee_count: number
          constellation_stories: number
          created_at: string | null
          current_title: string | null
          daily_focus_goal: number | null
          daily_xp_target: number | null
          daily_xp_today: number | null
          demon_encounters_resisted: number
          demon_encounters_submitted: number
          display_name: string | null
          focus_duration: number | null
          hp: number | null
          id: string
          level: number | null
          mood: number | null
          motivation: number | null
          regression_count: number
          stat_core: number | null
          stat_craft: number | null
          stat_intel: number | null
          stat_physical: number | null
          stat_psyche: number | null
          stat_spiritual: number | null
          today_intention: string | null
          total_xp: number | null
          ui_theme: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          break_duration?: number | null
          college?: string | null
          concentration?: number | null
          constellation_grade?: string
          constellation_scenario_count?: number
          constellation_scenarios_cleared?: number
          constellation_sponsee_count?: number
          constellation_stories?: number
          created_at?: string | null
          current_title?: string | null
          daily_focus_goal?: number | null
          daily_xp_target?: number | null
          daily_xp_today?: number | null
          demon_encounters_resisted?: number
          demon_encounters_submitted?: number
          display_name?: string | null
          focus_duration?: number | null
          hp?: number | null
          id: string
          level?: number | null
          mood?: number | null
          motivation?: number | null
          regression_count?: number
          stat_core?: number | null
          stat_craft?: number | null
          stat_intel?: number | null
          stat_physical?: number | null
          stat_psyche?: number | null
          stat_spiritual?: number | null
          today_intention?: string | null
          total_xp?: number | null
          ui_theme?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          break_duration?: number | null
          college?: string | null
          concentration?: number | null
          constellation_grade?: string
          constellation_scenario_count?: number
          constellation_scenarios_cleared?: number
          constellation_sponsee_count?: number
          constellation_stories?: number
          created_at?: string | null
          current_title?: string | null
          daily_focus_goal?: number | null
          daily_xp_target?: number | null
          daily_xp_today?: number | null
          demon_encounters_resisted?: number
          demon_encounters_submitted?: number
          display_name?: string | null
          focus_duration?: number | null
          hp?: number | null
          id?: string
          level?: number | null
          mood?: number | null
          motivation?: number | null
          regression_count?: number
          stat_core?: number | null
          stat_craft?: number | null
          stat_intel?: number | null
          stat_physical?: number | null
          stat_psyche?: number | null
          stat_spiritual?: number | null
          today_intention?: string | null
          total_xp?: number | null
          ui_theme?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      quests: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          quest_type: string | null
          stage_id: string | null
          status: string | null
          title: string
          user_id: string | null
          xp_reward: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          quest_type?: string | null
          stage_id?: string | null
          status?: string | null
          title: string
          user_id?: string | null
          xp_reward?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          quest_type?: string | null
          stage_id?: string | null
          status?: string | null
          title?: string
          user_id?: string | null
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quests_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      raid_participants: {
        Row: {
          damage_dealt: number
          disaster_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          damage_dealt?: number
          disaster_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          damage_dealt?: number
          disaster_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raid_participants_disaster_id_fkey"
            columns: ["disaster_id"]
            isOneToOne: false
            referencedRelation: "disasters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raid_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          resource_type: string | null
          scenario_id: string | null
        }
        Insert: {
          content: Json
          created_at?: string | null
          id?: string
          resource_type?: string | null
          scenario_id?: string | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          resource_type?: string | null
          scenario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      scenarios: {
        Row: {
          category: string | null
          created_at: string | null
          doom_deadline: string | null
          dramatic_intro: string | null
          id: string
          is_template: boolean
          regression_count: number | null
          status: string | null
          template_uses: number
          title: string
          urgency: number | null
          user_id: string | null
          xp_multiplier: number | null
          xp_reward: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          doom_deadline?: string | null
          dramatic_intro?: string | null
          id?: string
          is_template?: boolean
          regression_count?: number | null
          status?: string | null
          template_uses?: number
          title: string
          urgency?: number | null
          user_id?: string | null
          xp_multiplier?: number | null
          xp_reward?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          doom_deadline?: string | null
          dramatic_intro?: string | null
          id?: string
          is_template?: boolean
          regression_count?: number | null
          status?: string | null
          template_uses?: number
          title?: string
          urgency?: number | null
          user_id?: string | null
          xp_multiplier?: number | null
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scenarios_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shadow_selves: {
        Row: {
          generated_at: string
          id: string
          last_updated_at: string
          shadow_name: string
          shadow_note: string | null
          shadow_scenarios: Json | null
          shadow_stats: Json
          shadow_title: string
          shadow_xp: number
          user_id: string
        }
        Insert: {
          generated_at?: string
          id?: string
          last_updated_at?: string
          shadow_name: string
          shadow_note?: string | null
          shadow_scenarios?: Json | null
          shadow_stats?: Json
          shadow_title: string
          shadow_xp?: number
          user_id: string
        }
        Update: {
          generated_at?: string
          id?: string
          last_updated_at?: string
          shadow_name?: string
          shadow_note?: string | null
          shadow_scenarios?: Json | null
          shadow_stats?: Json
          shadow_title?: string
          shadow_xp?: number
          user_id?: string
        }
        Relationships: []
      }
      skill_nodes: {
        Row: {
          bonus_description: string
          description: string
          id: string
          node_name: string
          node_type: string
          position_x: number
          position_y: number
          prerequisite_node_id: string | null
          stat_name: string
          tier: number
          xp_required: number
        }
        Insert: {
          bonus_description?: string
          description?: string
          id?: string
          node_name: string
          node_type?: string
          position_x?: number
          position_y?: number
          prerequisite_node_id?: string | null
          stat_name: string
          tier?: number
          xp_required?: number
        }
        Update: {
          bonus_description?: string
          description?: string
          id?: string
          node_name?: string
          node_type?: string
          position_x?: number
          position_y?: number
          prerequisite_node_id?: string | null
          stat_name?: string
          tier?: number
          xp_required?: number
        }
        Relationships: [
          {
            foreignKeyName: "skill_nodes_prerequisite_node_id_fkey"
            columns: ["prerequisite_node_id"]
            isOneToOne: false
            referencedRelation: "skill_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      stages: {
        Row: {
          id: string
          order_index: number
          scenario_id: string | null
          status: string | null
          title: string
          xp_reward: number | null
        }
        Insert: {
          id?: string
          order_index: number
          scenario_id?: string | null
          status?: string | null
          title: string
          xp_reward?: number | null
        }
        Update: {
          id?: string
          order_index?: number
          scenario_id?: string | null
          status?: string | null
          title?: string
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stages_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      stigma_boosts: {
        Row: {
          constellation_id: string
          created_at: string | null
          id: string
          mentee_id: string
          mentor_id: string
          message: string
          xp_granted: number
        }
        Insert: {
          constellation_id: string
          created_at?: string | null
          id?: string
          mentee_id: string
          mentor_id: string
          message: string
          xp_granted?: number
        }
        Update: {
          constellation_id?: string
          created_at?: string | null
          id?: string
          mentee_id?: string
          mentor_id?: string
          message?: string
          xp_granted?: number
        }
        Relationships: [
          {
            foreignKeyName: "stigma_boosts_constellation_id_fkey"
            columns: ["constellation_id"]
            isOneToOne: false
            referencedRelation: "constellations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stigma_boosts_mentee_id_fkey"
            columns: ["mentee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stigma_boosts_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stigma_marks: {
        Row: {
          channel_id: string | null
          created_at: string
          giver_id: string
          id: string
          note: string | null
          receiver_id: string
          stigma_type: string
        }
        Insert: {
          channel_id?: string | null
          created_at?: string
          giver_id: string
          id?: string
          note?: string | null
          receiver_id: string
          stigma_type: string
        }
        Update: {
          channel_id?: string | null
          created_at?: string
          giver_id?: string
          id?: string
          note?: string | null
          receiver_id?: string
          stigma_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stigma_marks_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stigma_marks_giver_id_fkey"
            columns: ["giver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stigma_marks_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      story_fragments: {
        Row: {
          constellation_id: string
          created_at: string
          id: string
          narrative: string
          source_id: string | null
          source_type: string
          sponsee_id: string
          story_value: number
        }
        Insert: {
          constellation_id: string
          created_at?: string
          id?: string
          narrative?: string
          source_id?: string | null
          source_type: string
          sponsee_id: string
          story_value?: number
        }
        Update: {
          constellation_id?: string
          created_at?: string
          id?: string
          narrative?: string
          source_id?: string | null
          source_type?: string
          sponsee_id?: string
          story_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "story_fragments_constellation_id_fkey"
            columns: ["constellation_id"]
            isOneToOne: false
            referencedRelation: "constellations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_fragments_sponsee_id_fkey"
            columns: ["sponsee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      template_ratings: {
        Row: {
          created_at: string | null
          id: string
          rating: number
          scenario_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          rating: number
          scenario_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          rating?: number
          scenario_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_ratings_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      titles: {
        Row: {
          description: string | null
          id: string
          rarity: string | null
          title_name: string
          unlocked_at: string | null
          user_id: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          rarity?: string | null
          title_name: string
          unlocked_at?: string | null
          user_id?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          rarity?: string | null
          title_name?: string
          unlocked_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "titles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_matches: {
        Row: {
          advancement_position: number | null
          created_at: string
          duel_id: string
          id: string
          match_position: number
          round_number: number
          tournament_id: string
        }
        Insert: {
          advancement_position?: number | null
          created_at?: string
          duel_id: string
          id?: string
          match_position: number
          round_number: number
          tournament_id: string
        }
        Update: {
          advancement_position?: number | null
          created_at?: string
          duel_id?: string
          id?: string
          match_position?: number
          round_number?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_matches_duel"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_matches_tournament"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "channel_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_participants: {
        Row: {
          bracket_position: number
          eliminated_at: string | null
          elimination_round: number | null
          id: string
          joined_at: string
          tournament_id: string
          user_id: string
        }
        Insert: {
          bracket_position: number
          eliminated_at?: string | null
          elimination_round?: number | null
          id?: string
          joined_at?: string
          tournament_id: string
          user_id: string
        }
        Update: {
          bracket_position?: number
          eliminated_at?: string | null
          elimination_round?: number | null
          id?: string
          joined_at?: string
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_participants_tournament"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "channel_tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_participants_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_wins: {
        Row: {
          channel_id: string
          id: string
          tournament_id: string
          user_id: string
          won_at: string
          xp_won: number
        }
        Insert: {
          channel_id: string
          id?: string
          tournament_id: string
          user_id: string
          won_at?: string
          xp_won?: number
        }
        Update: {
          channel_id?: string
          id?: string
          tournament_id?: string
          user_id?: string
          won_at?: string
          xp_won?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_wins_channel"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_wins_tournament"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "channel_tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_wins_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_skill_nodes: {
        Row: {
          id: string
          is_active: boolean
          node_id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          node_id: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          id?: string
          is_active?: boolean
          node_id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_skill_nodes_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "skill_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_connections: {
        Row: {
          connection_type: string
          created_at: string
          entry_id_a: string
          entry_id_b: string
          id: string
        }
        Insert: {
          connection_type?: string
          created_at?: string
          entry_id_a: string
          entry_id_b: string
          id?: string
        }
        Update: {
          connection_type?: string
          created_at?: string
          entry_id_a?: string
          entry_id_b?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_connections_entry_id_a_fkey"
            columns: ["entry_id_a"]
            isOneToOne: false
            referencedRelation: "vault_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_connections_entry_id_b_fkey"
            columns: ["entry_id_b"]
            isOneToOne: false
            referencedRelation: "vault_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_entries: {
        Row: {
          ai_summary: string | null
          category: string
          content: string
          created_at: string
          id: string
          is_favorite: boolean
          is_pinned: boolean
          source_quest_id: string | null
          source_scenario_id: string | null
          tags: Json
          title: string
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_favorite?: boolean
          is_pinned?: boolean
          source_quest_id?: string | null
          source_scenario_id?: string | null
          tags?: Json
          title: string
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_favorite?: boolean
          is_pinned?: boolean
          source_quest_id?: string | null
          source_scenario_id?: string | null
          tags?: Json
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_entries_source_quest_id_fkey"
            columns: ["source_quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_entries_source_scenario_id_fkey"
            columns: ["source_scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_reviews: {
        Row: {
          created_at: string
          generated_at: string
          id: string
          narrative_text: string
          quests_completed: number
          scenarios_cleared: number
          share_image_url: string | null
          stats_snapshot: Json | null
          streak_data: Json | null
          user_id: string
          week_end: string
          week_start: string
          xp_gained: number
        }
        Insert: {
          created_at?: string
          generated_at?: string
          id?: string
          narrative_text?: string
          quests_completed?: number
          scenarios_cleared?: number
          share_image_url?: string | null
          stats_snapshot?: Json | null
          streak_data?: Json | null
          user_id: string
          week_end: string
          week_start: string
          xp_gained?: number
        }
        Update: {
          created_at?: string
          generated_at?: string
          id?: string
          narrative_text?: string
          quests_completed?: number
          scenarios_cleared?: number
          share_image_url?: string | null
          stats_snapshot?: Json | null
          streak_data?: Json | null
          user_id?: string
          week_end?: string
          week_start?: string
          xp_gained?: number
        }
        Relationships: []
      }
      xp_log: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          reason: string | null
          source_id: string | null
          source_type: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          reason?: string | null
          source_id?: string | null
          source_type?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          reason?: string | null
          source_id?: string | null
          source_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xp_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_xp: {
        Args: { amount: number; source?: string; user_id_param: string }
        Returns: Json
      }
      calculate_record_score: { Args: { p_user_id: string }; Returns: number }
      deal_disaster_damage: {
        Args: { p_damage: number; p_disaster_id: string; p_user_id?: string }
        Returns: Json
      }
      is_channel_dokkaebi: {
        Args: { _channel_id: string; _user_id: string }
        Returns: boolean
      }
      recalculate_oldest_dream: { Args: never; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
