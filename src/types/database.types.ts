export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          weight_unit: 'kg' | 'lbs';
          progression_pct: number;
          load_step: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          weight_unit?: 'kg' | 'lbs';
          progression_pct?: number;
          load_step?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          weight_unit?: 'kg' | 'lbs';
          progression_pct?: number;
          load_step?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      plans: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          notes: string | null;
          archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          notes?: string | null;
          archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          notes?: string | null;
          archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'plans_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      plan_days: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          name: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_id: string;
          name: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_id?: string;
          name?: string;
          position?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'plan_days_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          }
        ];
      };
      exercises: {
        Row: {
          id: string;
          user_id: string;
          plan_day_id: string;
          name: string;
          position: number;
          sets: number;
          reps_min: number;
          reps_max: number;
          rest_seconds: number;
          technique_notes: string | null;
          video_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_day_id: string;
          name: string;
          position?: number;
          sets?: number;
          reps_min?: number;
          reps_max?: number;
          rest_seconds?: number;
          technique_notes?: string | null;
          video_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_day_id?: string;
          name?: string;
          position?: number;
          sets?: number;
          reps_min?: number;
          reps_max?: number;
          rest_seconds?: number;
          technique_notes?: string | null;
          video_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'exercises_plan_day_id_fkey';
            columns: ['plan_day_id'];
            isOneToOne: false;
            referencedRelation: 'plan_days';
            referencedColumns: ['id'];
          }
        ];
      };
      workout_sessions: {
        Row: {
          id: string;
          user_id: string;
          plan_day_id: string | null;
          started_at: string;
          finished_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_day_id?: string | null;
          started_at?: string;
          finished_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_day_id?: string | null;
          started_at?: string;
          finished_at?: string | null;
        };
        Relationships: [];
      };
      set_logs: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          exercise_id: string | null;
          exercise_name: string;
          set_number: number;
          weight: number;
          reps: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id: string;
          exercise_id?: string | null;
          exercise_name: string;
          set_number: number;
          weight?: number;
          reps?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_id?: string;
          exercise_id?: string | null;
          exercise_name?: string;
          set_number?: number;
          weight?: number;
          reps?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      import_logs: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type Plan = Database['public']['Tables']['plans']['Row'];
export type PlanInsert = Database['public']['Tables']['plans']['Insert'];
export type PlanUpdate = Database['public']['Tables']['plans']['Update'];

export type PlanDay = Database['public']['Tables']['plan_days']['Row'];
export type PlanDayInsert = Database['public']['Tables']['plan_days']['Insert'];
export type PlanDayUpdate = Database['public']['Tables']['plan_days']['Update'];

export type Exercise = Database['public']['Tables']['exercises']['Row'];
export type ExerciseInsert = Database['public']['Tables']['exercises']['Insert'];
export type ExerciseUpdate = Database['public']['Tables']['exercises']['Update'];

export type WorkoutSession = Database['public']['Tables']['workout_sessions']['Row'];
export type SetLog = Database['public']['Tables']['set_logs']['Row'];

export interface PlanDayWithExercises extends PlanDay {
  exercises: Exercise[];
}

export interface PlanWithDetails extends Plan {
  days: PlanDayWithExercises[];
}
