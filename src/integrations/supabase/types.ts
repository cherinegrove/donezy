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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      account_subscriptions: {
        Row: {
          additional_guests: number
          billing_period_end: string | null
          billing_period_start: string | null
          created_at: string
          id: string
          max_guests: number
          max_users: number
          monthly_cost: number
          plan_id: string | null
          plan_type: string
          seats: number | null
          status: string
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_guests?: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string
          id?: string
          max_guests?: number
          max_users?: number
          monthly_cost?: number
          plan_id?: string | null
          plan_type?: string
          seats?: number | null
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_guests?: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string
          id?: string
          max_guests?: number
          max_users?: number
          monthly_cost?: number
          plan_id?: string | null
          plan_type?: string
          seats?: number | null
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
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
        ]
      }
      channels: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_private: boolean
          name: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_private?: boolean
          name: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_private?: boolean
          name?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          auth_user_id: string
          created_at: string
          email: string
          id: string
          name: string
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          auth_user_id: string
          content: string
          created_at: string
          id: string
          mentioned_user_ids: string[] | null
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_user_id?: string
          content: string
          created_at?: string
          id?: string
          mentioned_user_ids?: string[] | null
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_user_id?: string
          content?: string
          created_at?: string
          id?: string
          mentioned_user_ids?: string[] | null
          task_id?: string
          updated_at?: string
          user_id?: string
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
          reportable?: boolean
          required?: boolean
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_fields_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          auth_user_id: string
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string | null
          permissions: Json | null
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id?: string | null
          permissions?: Json | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          permissions?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          token: string
          used: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          token: string
          used?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          token?: string
          used?: boolean | null
        }
        Relationships: []
      }
      mentions: {
        Row: {
          created_at: string
          id: string
          mentioned_user_id: string
          message_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mentioned_user_id: string
          message_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mentioned_user_id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          auth_user_id: string
          channel_id: string | null
          content: string
          created_at: string
          from_user_id: string
          id: string
          mentioned_users: string[] | null
          parent_message_id: string | null
          priority: string | null
          project_id: string | null
          read: boolean | null
          subject: string
          task_id: string | null
          timestamp: string
          to_user_id: string
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          channel_id?: string | null
          content: string
          created_at?: string
          from_user_id: string
          id?: string
          mentioned_users?: string[] | null
          parent_message_id?: string | null
          priority?: string | null
          project_id?: string | null
          read?: boolean | null
          subject: string
          task_id?: string | null
          timestamp?: string
          to_user_id: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          channel_id?: string | null
          content?: string
          created_at?: string
          from_user_id?: string
          id?: string
          mentioned_users?: string[] | null
          parent_message_id?: string | null
          priority?: string | null
          project_id?: string | null
          read?: boolean | null
          subject?: string
          task_id?: string | null
          timestamp?: string
          to_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      native_field_configs: {
        Row: {
          auth_user_id: string
          created_at: string
          default_value: Json | null
          entity_type: string
          field_name: string
          hidden: boolean
          id: string
          required: boolean
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          default_value?: Json | null
          entity_type: string
          field_name: string
          hidden?: boolean
          id?: string
          required?: boolean
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          default_value?: Json | null
          entity_type?: string
          field_name?: string
          hidden?: boolean
          id?: string
          required?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          archived: boolean | null
          auth_user_id: string
          client_id: string | null
          content: string | null
          created_at: string
          id: string
          organization_id: string | null
          project_id: string | null
          task_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean | null
          auth_user_id: string
          client_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          organization_id?: string | null
          project_id?: string | null
          task_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean | null
          auth_user_id?: string
          client_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          organization_id?: string | null
          project_id?: string | null
          task_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          domain: string | null
          id: string
          logo_url: string | null
          max_guests: number | null
          max_users: number | null
          name: string
          settings: Json | null
          slug: string
          subscription_plan: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          domain?: string | null
          id?: string
          logo_url?: string | null
          max_guests?: number | null
          max_users?: number | null
          name: string
          settings?: Json | null
          slug: string
          subscription_plan?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          domain?: string | null
          id?: string
          logo_url?: string | null
          max_guests?: number | null
          max_users?: number | null
          name?: string
          settings?: Json | null
          slug?: string
          subscription_plan?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          invited_by: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          invited_by?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          invited_by?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      project_files: {
        Row: {
          auth_user_id: string
          external_provider: string | null
          external_url: string | null
          file_path: string | null
          file_size: number | null
          folder_id: string | null
          id: string
          is_external_link: boolean | null
          mime_type: string
          name: string
          project_id: string
          uploaded_at: string
        }
        Insert: {
          auth_user_id?: string
          external_provider?: string | null
          external_url?: string | null
          file_path?: string | null
          file_size?: number | null
          folder_id?: string | null
          id?: string
          is_external_link?: boolean | null
          mime_type: string
          name: string
          project_id: string
          uploaded_at?: string
        }
        Update: {
          auth_user_id?: string
          external_provider?: string | null
          external_url?: string | null
          file_path?: string | null
          file_size?: number | null
          folder_id?: string | null
          id?: string
          is_external_link?: boolean | null
          mime_type?: string
          name?: string
          project_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "project_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      project_folders: {
        Row: {
          auth_user_id: string
          created_at: string
          id: string
          name: string
          parent_folder_id: string | null
          project_id: string
        }
        Insert: {
          auth_user_id?: string
          created_at?: string
          id?: string
          name: string
          parent_folder_id?: string | null
          project_id: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          id?: string
          name?: string
          parent_folder_id?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "project_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      project_notes: {
        Row: {
          auth_user_id: string
          content: string | null
          created_at: string
          id: string
          project_id: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string
          content?: string | null
          created_at?: string
          id?: string
          project_id: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          content?: string | null
          created_at?: string
          id?: string
          project_id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_reminders: {
        Row: {
          created_at: string
          email_sent_to: string
          id: string
          project_id: string
          reminder_type: string
          sent_at: string
        }
        Insert: {
          created_at?: string
          email_sent_to: string
          id?: string
          project_id: string
          reminder_type: string
          sent_at?: string
        }
        Update: {
          created_at?: string
          email_sent_to?: string
          id?: string
          project_id?: string
          reminder_type?: string
          sent_at?: string
        }
        Relationships: []
      }
      project_status_definitions: {
        Row: {
          auth_user_id: string
          color: string
          created_at: string
          id: string
          is_final: boolean | null
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          color: string
          created_at?: string
          id?: string
          is_final?: boolean | null
          name: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          color?: string
          created_at?: string
          id?: string
          is_final?: boolean | null
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      project_template_subtasks: {
        Row: {
          auth_user_id: string
          created_at: string
          description: string | null
          estimated_hours: number | null
          id: string
          name: string
          order_index: number
          template_task_id: string
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          name: string
          order_index?: number
          template_task_id: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          name?: string
          order_index?: number
          template_task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_template_subtasks_template_task_id_fkey"
            columns: ["template_task_id"]
            isOneToOne: false
            referencedRelation: "project_template_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      project_template_tasks: {
        Row: {
          auth_user_id: string
          created_at: string
          description: string | null
          estimated_hours: number | null
          id: string
          name: string
          order_index: number
          priority: string
          template_id: string
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          name: string
          order_index?: number
          priority?: string
          template_id: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          name?: string
          order_index?: number
          priority?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_template_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
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
          collaborator_ids: string[] | null
          created_at: string
          description: string
          due_date: string | null
          google_chat_settings: Json | null
          id: string
          name: string
          organization_id: string | null
          owner_id: string | null
          reminder_date: string | null
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
          collaborator_ids?: string[] | null
          created_at?: string
          description: string
          due_date?: string | null
          google_chat_settings?: Json | null
          id?: string
          name: string
          organization_id?: string | null
          owner_id?: string | null
          reminder_date?: string | null
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
          collaborator_ids?: string[] | null
          created_at?: string
          description?: string
          due_date?: string | null
          google_chat_settings?: Json | null
          id?: string
          name?: string
          organization_id?: string | null
          owner_id?: string | null
          reminder_date?: string | null
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
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      purchases: {
        Row: {
          amount: number
          approved: boolean | null
          approved_by: string | null
          auth_user_id: string
          category: string | null
          created_at: string
          description: string | null
          id: string
          item_name: string
          project_id: string | null
          purchase_date: string
          receipt_url: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          approved?: boolean | null
          approved_by?: string | null
          auth_user_id: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          item_name: string
          project_id?: string | null
          purchase_date: string
          receipt_url?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          approved?: boolean | null
          approved_by?: string | null
          auth_user_id?: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          item_name?: string
          project_id?: string | null
          purchase_date?: string
          receipt_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recurring_tasks: {
        Row: {
          assignee_id: string | null
          auth_user_id: string
          collaborator_ids: string[] | null
          created_at: string
          day_of_month: number | null
          days_of_week: number[] | null
          description: string | null
          end_date: string | null
          estimated_hours: number | null
          id: string
          is_active: boolean
          last_generated_date: string | null
          next_generation_date: string
          priority: string
          project_id: string
          recurrence_interval: number
          recurrence_pattern: string
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          auth_user_id: string
          collaborator_ids?: string[] | null
          created_at?: string
          day_of_month?: number | null
          days_of_week?: number[] | null
          description?: string | null
          end_date?: string | null
          estimated_hours?: number | null
          id?: string
          is_active?: boolean
          last_generated_date?: string | null
          next_generation_date: string
          priority?: string
          project_id: string
          recurrence_interval?: number
          recurrence_pattern: string
          start_date?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          auth_user_id?: string
          collaborator_ids?: string[] | null
          created_at?: string
          day_of_month?: number | null
          days_of_week?: number[] | null
          description?: string | null
          end_date?: string | null
          estimated_hours?: number | null
          id?: string
          is_active?: boolean
          last_generated_date?: string | null
          next_generation_date?: string
          priority?: string
          project_id?: string
          recurrence_interval?: number
          recurrence_pattern?: string
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_tasks_project_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_videos: {
        Row: {
          created_at: string
          duration: number
          expires_at: string
          file_size: number
          folder_id: string | null
          id: string
          storage_path: string
          thumbnail_data: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration: number
          expires_at?: string
          file_size: number
          folder_id?: string | null
          id: string
          storage_path: string
          thumbnail_data?: string | null
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          duration?: number
          expires_at?: string
          file_size?: number
          folder_id?: string | null
          id?: string
          storage_path?: string
          thumbnail_data?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_videos_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "video_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          features: Json
          id: string
          is_active: boolean | null
          min_seats: number | null
          name: string
          per_seat: boolean | null
          price_monthly: number
        }
        Insert: {
          created_at?: string | null
          features: Json
          id?: string
          is_active?: boolean | null
          min_seats?: number | null
          name: string
          per_seat?: boolean | null
          price_monthly: number
        }
        Update: {
          created_at?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          min_seats?: number | null
          name?: string
          per_seat?: boolean | null
          price_monthly?: number
        }
        Relationships: []
      }
      support_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown
          support_user_id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          support_user_id: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          support_user_id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      system_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: Database["public"]["Enums"]["system_role_type"]
          permissions: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: Database["public"]["Enums"]["system_role_type"]
          permissions?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: Database["public"]["Enums"]["system_role_type"]
          permissions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      task_files: {
        Row: {
          auth_user_id: string
          external_provider: string | null
          external_url: string | null
          file_path: string | null
          file_size: number | null
          id: string
          is_external_link: boolean | null
          mime_type: string | null
          name: string
          task_id: string
          uploaded_at: string | null
        }
        Insert: {
          auth_user_id?: string
          external_provider?: string | null
          external_url?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_external_link?: boolean | null
          mime_type?: string | null
          name: string
          task_id: string
          uploaded_at?: string | null
        }
        Update: {
          auth_user_id?: string
          external_provider?: string | null
          external_url?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_external_link?: boolean | null
          mime_type?: string | null
          name?: string
          task_id?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_files_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_logs: {
        Row: {
          action: string
          auth_user_id: string
          created_at: string
          details: Json | null
          id: string
          task_id: string
          timestamp: string
          user_id: string
        }
        Insert: {
          action: string
          auth_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          task_id: string
          timestamp?: string
          user_id: string
        }
        Update: {
          action?: string
          auth_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          task_id?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      task_reminders: {
        Row: {
          created_at: string
          email_sent_to: string
          id: string
          reminder_type: string
          sent_at: string
          task_id: string
        }
        Insert: {
          created_at?: string
          email_sent_to: string
          id?: string
          reminder_type: string
          sent_at?: string
          task_id: string
        }
        Update: {
          created_at?: string
          email_sent_to?: string
          id?: string
          reminder_type?: string
          sent_at?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_reminders_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_status_definitions: {
        Row: {
          auth_user_id: string
          color: string
          created_at: string
          id: string
          is_final: boolean | null
          name: string
          order_index: number
          updated_at: string
          value: string | null
        }
        Insert: {
          auth_user_id: string
          color: string
          created_at?: string
          id?: string
          is_final?: boolean | null
          name: string
          order_index?: number
          updated_at?: string
          value?: string | null
        }
        Update: {
          auth_user_id?: string
          color?: string
          created_at?: string
          id?: string
          is_final?: boolean | null
          name?: string
          order_index?: number
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      task_templates: {
        Row: {
          auth_user_id: string
          created_at: string
          default_priority: string
          default_status: string
          description: string
          field_order: string[] | null
          form_fields: Json | null
          id: string
          include_custom_fields: string[] | null
          name: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          default_priority?: string
          default_status?: string
          description: string
          field_order?: string[] | null
          form_fields?: Json | null
          id?: string
          include_custom_fields?: string[] | null
          name: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          default_priority?: string
          default_status?: string
          description?: string
          field_order?: string[] | null
          form_fields?: Json | null
          id?: string
          include_custom_fields?: string[] | null
          name?: string
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
          checklist: Json | null
          collaborator_ids: string[] | null
          created_at: string
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          order_index: number | null
          organization_id: string | null
          priority: string
          project_id: string
          related_task_ids: string[] | null
          reminder_date: string | null
          status: string
          title: string
          updated_at: string
          watcher_ids: string[] | null
        }
        Insert: {
          actual_hours?: number | null
          assignee_id?: string | null
          auth_user_id: string
          checklist?: Json | null
          collaborator_ids?: string[] | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          order_index?: number | null
          organization_id?: string | null
          priority?: string
          project_id: string
          related_task_ids?: string[] | null
          reminder_date?: string | null
          status?: string
          title: string
          updated_at?: string
          watcher_ids?: string[] | null
        }
        Update: {
          actual_hours?: number | null
          assignee_id?: string | null
          auth_user_id?: string
          checklist?: Json | null
          collaborator_ids?: string[] | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          order_index?: number | null
          organization_id?: string | null
          priority?: string
          project_id?: string
          related_task_ids?: string[] | null
          reminder_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          watcher_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          auth_user_id: string
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      test: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          auth_user_id: string
          client_id: string | null
          created_at: string
          duration: number | null
          end_time: string | null
          id: string
          notes: string | null
          organization_id: string | null
          project_id: string | null
          rejection_reason: string | null
          start_time: string
          status: string | null
          task_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_user_id: string
          client_id?: string | null
          created_at?: string
          duration?: number | null
          end_time?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          project_id?: string | null
          rejection_reason?: string | null
          start_time: string
          status?: string | null
          task_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_user_id?: string
          client_id?: string | null
          created_at?: string
          duration?: number | null
          end_time?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          project_id?: string | null
          rejection_reason?: string | null
          start_time?: string
          status?: string | null
          task_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_tracking: {
        Row: {
          amount: number | null
          billing_period_start: string
          created_at: string | null
          id: string
          resource_id: string | null
          resource_type: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          billing_period_start: string
          created_at?: string | null
          id?: string
          resource_id?: string | null
          resource_type: string
          user_id: string
        }
        Update: {
          amount?: number | null
          billing_period_start?: string
          created_at?: string | null
          id?: string
          resource_id?: string | null
          resource_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_organizations: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string
          organization_id: string
          permissions: Json | null
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          organization_id: string
          permissions?: Json | null
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          organization_id?: string
          permissions?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_system_roles: {
        Row: {
          assigned_at: string
          assigned_by: string
          id: string
          system_role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          id?: string
          system_role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          id?: string
          system_role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_system_roles_system_role_id_fkey"
            columns: ["system_role_id"]
            isOneToOne: false
            referencedRelation: "system_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string
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
          is_guest: boolean | null
          job_title: string | null
          manager_id: string | null
          monthly_rate: number | null
          name: string
          notification_preferences: Json | null
          organization_id: string | null
          permissions: Json | null
          phone: string | null
          role: string
          status: string
          team_ids: string[] | null
          updated_at: string
        }
        Insert: {
          auth_user_id: string
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
          is_guest?: boolean | null
          job_title?: string | null
          manager_id?: string | null
          monthly_rate?: number | null
          name: string
          notification_preferences?: Json | null
          organization_id?: string | null
          permissions?: Json | null
          phone?: string | null
          role?: string
          status?: string
          team_ids?: string[] | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
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
          is_guest?: boolean | null
          job_title?: string | null
          manager_id?: string | null
          monthly_rate?: number | null
          name?: string
          notification_preferences?: Json | null
          organization_id?: string | null
          permissions?: Json | null
          phone?: string | null
          role?: string
          status?: string
          team_ids?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      users_email_duplicates: {
        Row: {
          auth_user_id: string | null
          avatar: string | null
          billing_rate: number | null
          billing_type: string | null
          client_id: string | null
          client_role: string | null
          created_at: string | null
          currency: string | null
          email: string | null
          employment_type: string | null
          guest_of_user_id: string | null
          guest_permissions: Json | null
          hourly_rate: number | null
          id: string | null
          is_guest: boolean | null
          job_title: string | null
          manager_id: string | null
          monthly_rate: number | null
          name: string | null
          notification_preferences: Json | null
          organization_id: string | null
          permissions: Json | null
          phone: string | null
          role: string | null
          team_ids: string[] | null
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          avatar?: string | null
          billing_rate?: number | null
          billing_type?: string | null
          client_id?: string | null
          client_role?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          employment_type?: string | null
          guest_of_user_id?: string | null
          guest_permissions?: Json | null
          hourly_rate?: number | null
          id?: string | null
          is_guest?: boolean | null
          job_title?: string | null
          manager_id?: string | null
          monthly_rate?: number | null
          name?: string | null
          notification_preferences?: Json | null
          organization_id?: string | null
          permissions?: Json | null
          phone?: string | null
          role?: string | null
          team_ids?: string[] | null
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          avatar?: string | null
          billing_rate?: number | null
          billing_type?: string | null
          client_id?: string | null
          client_role?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          employment_type?: string | null
          guest_of_user_id?: string | null
          guest_permissions?: Json | null
          hourly_rate?: number | null
          id?: string | null
          is_guest?: boolean | null
          job_title?: string | null
          manager_id?: string | null
          monthly_rate?: number | null
          name?: string | null
          notification_preferences?: Json | null
          organization_id?: string | null
          permissions?: Json | null
          phone?: string | null
          role?: string | null
          team_ids?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      video_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
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
      can_assign_system_roles: { Args: { _user_id: string }; Returns: boolean }
      can_user_perform_action: {
        Args: { action_type: string; user_uuid?: string }
        Returns: boolean
      }
      cleanup_expired_videos: { Args: never; Returns: undefined }
      get_account_limits: {
        Args: { account_user_id: string }
        Returns: {
          can_add_guest: boolean
          can_add_user: boolean
          current_guests: number
          current_users: number
          max_guests: number
          max_users: number
        }[]
      }
      get_current_user_organization: { Args: never; Returns: string }
      has_system_role: {
        Args: {
          _role: Database["public"]["Enums"]["system_role_type"]
          _user_id: string
        }
        Returns: boolean
      }
      is_channel_member: { Args: { cid: string }; Returns: boolean }
      log_support_action: {
        Args: {
          _action: string
          _details?: Json
          _ip_address?: unknown
          _target_user_id?: string
        }
        Returns: undefined
      }
      track_usage: {
        Args: {
          amount_param?: number
          resource_id_param?: string
          resource_type_param: string
          user_uuid?: string
        }
        Returns: undefined
      }
      user_belongs_to_organization: {
        Args: { org_id: string }
        Returns: boolean
      }
    }
    Enums: {
      system_role_type: "support_admin" | "platform_admin"
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
    Enums: {
      system_role_type: ["support_admin", "platform_admin"],
    },
  },
} as const
