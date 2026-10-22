export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      budgets: {
        Row: {
          amount_minor: number | null
          category_id: string | null
          created_at: string
          currency: string
          id: string
          starts_on: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_minor?: number | null
          category_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          starts_on: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount_minor?: number | null
          category_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          starts_on?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_fkey"
            columns: ["category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      days: {
        Row: {
          closed_at: string | null
          created_at: string
          energy: number | null
          id: string
          local_date: string
          mood: number | null
          reflection: string | null
          reviewed_at: string | null
          status: string
          summary: Json | null
          updated_at: string
          user_id: string
          wins: string | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          energy?: number | null
          id?: string
          local_date: string
          mood?: number | null
          reflection?: string | null
          reviewed_at?: string | null
          status?: string
          summary?: Json | null
          updated_at?: string
          user_id?: string
          wins?: string | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          energy?: number | null
          id?: string
          local_date?: string
          mood?: number | null
          reflection?: string | null
          reviewed_at?: string | null
          status?: string
          summary?: Json | null
          updated_at?: string
          user_id?: string
          wins?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          all_day: boolean
          created_at: string
          deleted_at: string | null
          end_date: string | null
          ends_at: string | null
          id: string
          notes: string | null
          start_date: string | null
          starts_at: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          deleted_at?: string | null
          end_date?: string | null
          ends_at?: string | null
          id?: string
          notes?: string | null
          start_date?: string | null
          starts_at?: string | null
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          all_day?: boolean
          created_at?: string
          deleted_at?: string | null
          end_date?: string | null
          ends_at?: string | null
          id?: string
          notes?: string | null
          start_date?: string | null
          starts_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_categories: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          kind: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          kind: string
          name: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          kind?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          label: string | null
          planned_minutes: number
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          label?: string | null
          planned_minutes: number
          started_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          label?: string | null
          planned_minutes?: number
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goal_milestones: {
        Row: {
          created_at: string
          done: boolean
          done_at: string | null
          goal_id: string
          id: string
          position: number
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          done_at?: string | null
          goal_id: string
          id?: string
          position?: number
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          done?: boolean
          done_at?: string | null
          goal_id?: string
          id?: string
          position?: number
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_milestones_goal_fkey"
            columns: ["goal_id", "user_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      goals: {
        Row: {
          achieved_at: string | null
          created_at: string
          id: string
          status: string
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
          why: string | null
        }
        Insert: {
          achieved_at?: string | null
          created_at?: string
          id?: string
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
          user_id?: string
          why?: string | null
        }
        Update: {
          achieved_at?: string | null
          created_at?: string
          id?: string
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          why?: string | null
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          created_at: string
          habit_id: string
          id: string
          local_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          habit_id: string
          id?: string
          local_date: string
          user_id?: string
        }
        Update: {
          created_at?: string
          habit_id?: string
          id?: string
          local_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_fkey"
            columns: ["habit_id", "user_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      habits: {
        Row: {
          archived_at: string | null
          created_at: string
          days_mask: number
          id: string
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          days_mask?: number
          id?: string
          name: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          days_mask?: number
          id?: string
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          body: string
          created_at: string
          id: string
          local_date: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          local_date: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          local_date?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          currency: string | null
          display_name: string | null
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          display_name?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          display_name?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          due_date: string | null
          id: string
          notes: string | null
          position: number
          priority: string
          status: string
          times_moved: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          position?: number
          priority?: string
          status?: string
          times_moved?: number
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          position?: number
          priority?: string
          status?: string
          times_moved?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_minor: number
          category_id: string | null
          created_at: string
          currency: string
          deleted_at: string | null
          id: string
          kind: string
          note: string | null
          occurred_on: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_minor: number
          category_id?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          kind: string
          note?: string | null
          occurred_on: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount_minor?: number
          category_id?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          kind?: string
          note?: string | null
          occurred_on?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_fkey"
            columns: ["category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      workouts: {
        Row: {
          created_at: string
          duration_minutes: number
          effort: number | null
          id: string
          kind: string
          local_date: string
          notes: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes: number
          effort?: number | null
          id?: string
          kind: string
          local_date: string
          notes?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          effort?: number | null
          id?: string
          kind?: string
          local_date?: string
          notes?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      close_past_days: { Args: never; Returns: number }
      current_local_date: { Args: never; Returns: string }
      delete_my_account: { Args: never; Returns: undefined }
      ensure_default_finance_categories: { Args: never; Returns: undefined }
      reorder_tasks: { Args: { task_ids: string[] }; Returns: undefined }
      save_day_review: {
        Args: {
          p_date: string
          p_energy: number
          p_mood: number
          p_reflection: string
          p_wins: string
        }
        Returns: undefined
      }
      set_budget: {
        Args: {
          p_amount_minor: number
          p_category_id: string
          p_starts_on: string
        }
        Returns: undefined
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
