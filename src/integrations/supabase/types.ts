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
      account_subscriptions: {
        Row: {
          additional_guests: number
          created_at: string
          id: string
          max_guests: number
          max_users: number
          monthly_cost: number
          plan_type: string
          status: string
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_guests?: number
          created_at?: string
          id?: string
          max_guests?: number
          max_users?: number
          monthly_cost?: number
          plan_type?: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_guests?: number
          created_at?: string
          id?: string
          max_guests?: number
          max_users?: number
          monthly_cost?: number
          plan_type?: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          auth_user_id: string
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          auth_user_id: string
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          auth_user_id?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      custom_fields: {
        Row: {
          applicable_to: string[]
          auth_user_id: string
          created_at: string
          default_value: Json | null
          description: string | null
          field_order: number
          id: string
          name: string
          options: string[] | null
          reportable: boolean
          required: boolean
          type: string
          updated_at: string
        }
        Insert: {
          applicable_to?: string[]
          auth_user_id: string
          created_at?: string
          default_value?: Json | null
          description?: string | null
          field_order?: number
          id?: string
          name: string
          options?: string[] | null
          reportable?: boolean
          required?: boolean
          type: string
          updated_at?: string
        }
        Update: {
          applicable_to?: string[]
          auth_user_id?: string
          created_at?: string
          default_value?: Json | null
          description?: string | null
          field_order?: number
          id?: string
          name?: string
          options?: string[] | null
          reportable?: boolean
          required?: boolean
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      project_templates: {
        Row: {
          allocated_hours: number
          auth_user_id: string
          created_at: string
          custom_fields: string[] | null
          default_duration: number
          description: string
          id: string
          name: string
          service_type: string
          tags: string[] | null
          team_ids: string[] | null
          updated_at: string
          usage_count: number
        }
        Insert: {
          allocated_hours?: number
          auth_user_id: string
          created_at?: string
          custom_fields?: string[] | null
          default_duration?: number
          description: string
          id?: string
          name: string
          service_type?: string
          tags?: string[] | null
          team_ids?: string[] | null
          updated_at?: string
          usage_count?: number
        }
        Update: {
          allocated_hours?: number
          auth_user_id?: string
          created_at?: string
          custom_fields?: string[] | null
          default_duration?: number
          description?: string
          id?: string
          name?: string
          service_type?: string
          tags?: string[] | null
          team_ids?: string[] | null
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      projects: {
        Row: {
          allocated_hours: number | null
          auth_user_id: string
          client_id: string
          created_at: string
          description: string
          due_date: string | null
          id: string
          name: string
          service_type: string
          start_date: string | null
          status: string
          team_ids: string[] | null
          updated_at: string
          used_hours: number | null
          watcher_ids: string[] | null
        }
        Insert: {
          allocated_hours?: number | null
          auth_user_id: string
          client_id: string
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          name: string
          service_type?: string
          start_date?: string | null
          status?: string
          team_ids?: string[] | null
          updated_at?: string
          used_hours?: number | null
          watcher_ids?: string[] | null
        }
        Update: {
          allocated_hours?: number | null
          auth_user_id?: string
          client_id?: string
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          name?: string
          service_type?: string
          start_date?: string | null
          status?: string
          team_ids?: string[] | null
          updated_at?: string
          used_hours?: number | null
          watcher_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          auth_user_id: string
          created_at: string
          description: string
          estimated_hours: number | null
          id: string
          name: string
          priority: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          description: string
          estimated_hours?: number | null
          id?: string
          name: string
          priority?: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          description?: string
          estimated_hours?: number | null
          id?: string
          name?: string
          priority?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      tasks: {
        Row: {
          actual_hours: number | null
          assignee_id: string | null
          auth_user_id: string
          created_at: string
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          priority: string
          project_id: string
          status: string
          title: string
          updated_at: string
          watcher_ids: string[] | null
        }
        Insert: {
          actual_hours?: number | null
          assignee_id?: string | null
          auth_user_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: string
          project_id: string
          status?: string
          title: string
          updated_at?: string
          watcher_ids?: string[] | null
        }
        Update: {
          actual_hours?: number | null
          assignee_id?: string | null
          auth_user_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: string
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
          watcher_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          avatar: string | null
          billing_rate: number | null
          billing_type: string | null
          client_id: string | null
          client_role: string | null
          created_at: string
          currency: string | null
          email: string
          employment_type: string | null
          guest_of_user_id: string | null
          guest_permissions: Json | null
          hourly_rate: number | null
          id: string
          is_guest: boolean | null
          job_title: string | null
          manager_id: string | null
          monthly_rate: number | null
          name: string
          notification_preferences: Json | null
          permissions: Json | null
          phone: string | null
          role: string
          team_ids: string[] | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          avatar?: string | null
          billing_rate?: number | null
          billing_type?: string | null
          client_id?: string | null
          client_role?: string | null
          created_at?: string
          currency?: string | null
          email: string
          employment_type?: string | null
          guest_of_user_id?: string | null
          guest_permissions?: Json | null
          hourly_rate?: number | null
          id?: string
          is_guest?: boolean | null
          job_title?: string | null
          manager_id?: string | null
          monthly_rate?: number | null
          name: string
          notification_preferences?: Json | null
          permissions?: Json | null
          phone?: string | null
          role?: string
          team_ids?: string[] | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          avatar?: string | null
          billing_rate?: number | null
          billing_type?: string | null
          client_id?: string | null
          client_role?: string | null
          created_at?: string
          currency?: string | null
          email?: string
          employment_type?: string | null
          guest_of_user_id?: string | null
          guest_permissions?: Json | null
          hourly_rate?: number | null
          id?: string
          is_guest?: boolean | null
          job_title?: string | null
          manager_id?: string | null
          monthly_rate?: number | null
          name?: string
          notification_preferences?: Json | null
          permissions?: Json | null
          phone?: string | null
          role?: string
          team_ids?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_account_limits: {
        Args: { account_user_id: string }
        Returns: {
          max_users: number
          max_guests: number
          current_users: number
          current_guests: number
          can_add_user: boolean
          can_add_guest: boolean
        }[]
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
