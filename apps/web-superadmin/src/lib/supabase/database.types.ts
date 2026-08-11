// Gerado a partir do schema real do projeto Supabase via
// `mcp__supabase__generate_typescript_types` (saída oficial). Para regenerar
// depois de uma migration nova, rode a mesma ferramenta e substitua este
// arquivo (e as cópias em apps/web-client e apps/web-superadmin).
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      appointments: {
        Row: {
          client_id: string;
          company_id: string;
          created_at: string;
          created_by: string | null;
          duration_min: number;
          id: string;
          origin: string;
          payment_method: string | null;
          price: number;
          professional_id: string;
          scheduled_at: string;
          service_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          client_id: string;
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          duration_min: number;
          id?: string;
          origin?: string;
          payment_method?: string | null;
          price: number;
          professional_id: string;
          scheduled_at: string;
          service_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          duration_min?: number;
          id?: string;
          origin?: string;
          payment_method?: string | null;
          price?: number;
          professional_id?: string;
          scheduled_at?: string;
          service_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "appointments_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"] },
          { foreignKeyName: "appointments_company_id_fkey"; columns: ["company_id"]; isOneToOne: false; referencedRelation: "companies"; referencedColumns: ["id"] },
          { foreignKeyName: "appointments_professional_id_fkey"; columns: ["professional_id"]; isOneToOne: false; referencedRelation: "professionals"; referencedColumns: ["id"] },
          { foreignKeyName: "appointments_service_id_fkey"; columns: ["service_id"]; isOneToOne: false; referencedRelation: "services"; referencedColumns: ["id"] },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          company_id: string | null;
          created_at: string;
          id: string;
          ip_address: string | null;
          payload: Json | null;
          target_id: string | null;
          target_table: string | null;
          user_agent: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          company_id?: string | null;
          created_at?: string;
          id?: string;
          ip_address?: string | null;
          payload?: Json | null;
          target_id?: string | null;
          target_table?: string | null;
          user_agent?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          company_id?: string | null;
          created_at?: string;
          id?: string;
          ip_address?: string | null;
          payload?: Json | null;
          target_id?: string | null;
          target_table?: string | null;
          user_agent?: string | null;
        };
        Relationships: [
          { foreignKeyName: "audit_logs_company_id_fkey"; columns: ["company_id"]; isOneToOne: false; referencedRelation: "companies"; referencedColumns: ["id"] },
        ];
      };
      clients: {
        Row: {
          company_id: string;
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
          phone: string | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          email?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          { foreignKeyName: "clients_company_id_fkey"; columns: ["company_id"]; isOneToOne: false; referencedRelation: "companies"; referencedColumns: ["id"] },
        ];
      };
      companies: {
        Row: {
          address: string | null;
          anamnesis_enabled: boolean;
          business_hours: string | null;
          city: string | null;
          color_accent: string | null;
          color_primary: string | null;
          color_secondary: string | null;
          cover_url: string | null;
          created_at: string;
          document: string | null;
          email: string | null;
          id: string;
          instagram: string | null;
          logo_url: string | null;
          loyalty_program_enabled: boolean;
          name: string;
          phone: string | null;
          segment_id: string;
          slug: string;
          state: string | null;
          status: string;
          trade_name: string | null;
          updated_at: string;
          whatsapp: string | null;
          whatsapp_reminder_enabled: boolean;
          zip_code: string | null;
        };
        Insert: {
          address?: string | null;
          anamnesis_enabled?: boolean;
          business_hours?: string | null;
          city?: string | null;
          color_accent?: string | null;
          color_primary?: string | null;
          color_secondary?: string | null;
          cover_url?: string | null;
          created_at?: string;
          document?: string | null;
          email?: string | null;
          id?: string;
          instagram?: string | null;
          logo_url?: string | null;
          loyalty_program_enabled?: boolean;
          name: string;
          phone?: string | null;
          segment_id: string;
          slug: string;
          state?: string | null;
          status?: string;
          trade_name?: string | null;
          updated_at?: string;
          whatsapp?: string | null;
          whatsapp_reminder_enabled?: boolean;
          zip_code?: string | null;
        };
        Update: {
          address?: string | null;
          anamnesis_enabled?: boolean;
          business_hours?: string | null;
          city?: string | null;
          color_accent?: string | null;
          color_primary?: string | null;
          color_secondary?: string | null;
          cover_url?: string | null;
          created_at?: string;
          document?: string | null;
          email?: string | null;
          id?: string;
          instagram?: string | null;
          logo_url?: string | null;
          loyalty_program_enabled?: boolean;
          name?: string;
          phone?: string | null;
          segment_id?: string;
          slug?: string;
          state?: string | null;
          status?: string;
          trade_name?: string | null;
          updated_at?: string;
          whatsapp?: string | null;
          whatsapp_reminder_enabled?: boolean;
          zip_code?: string | null;
        };
        Relationships: [
          { foreignKeyName: "companies_segment_id_fkey"; columns: ["segment_id"]; isOneToOne: false; referencedRelation: "segments"; referencedColumns: ["id"] },
        ];
      };
      company_members: {
        Row: {
          active: boolean;
          company_id: string;
          created_at: string;
          id: string;
          role_empresa: string;
          user_id: string;
        };
        Insert: {
          active?: boolean;
          company_id: string;
          created_at?: string;
          id?: string;
          role_empresa?: string;
          user_id: string;
        };
        Update: {
          active?: boolean;
          company_id?: string;
          created_at?: string;
          id?: string;
          role_empresa?: string;
          user_id?: string;
        };
        Relationships: [
          { foreignKeyName: "company_members_company_id_fkey"; columns: ["company_id"]; isOneToOne: false; referencedRelation: "companies"; referencedColumns: ["id"] },
          { foreignKeyName: "company_members_role_empresa_fkey"; columns: ["role_empresa"]; isOneToOne: false; referencedRelation: "roles"; referencedColumns: ["key"] },
        ];
      };
      device_tokens: {
        Row: {
          company_id: string | null;
          created_at: string;
          fcm_token: string;
          id: string;
          platform: string;
          user_id: string;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string;
          fcm_token: string;
          id?: string;
          platform: string;
          user_id: string;
        };
        Update: {
          company_id?: string | null;
          created_at?: string;
          fcm_token?: string;
          id?: string;
          platform?: string;
          user_id?: string;
        };
        Relationships: [
          { foreignKeyName: "device_tokens_company_id_fkey"; columns: ["company_id"]; isOneToOne: false; referencedRelation: "companies"; referencedColumns: ["id"] },
        ];
      };
      expenses: {
        Row: {
          amount: number;
          category: string | null;
          company_id: string;
          created_at: string;
          description: string;
          expense_date: string;
          id: string;
          notes: string | null;
          recurring: boolean;
          updated_at: string;
        };
        Insert: {
          amount: number;
          category?: string | null;
          company_id: string;
          created_at?: string;
          description: string;
          expense_date?: string;
          id?: string;
          notes?: string | null;
          recurring?: boolean;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          category?: string | null;
          company_id?: string;
          created_at?: string;
          description?: string;
          expense_date?: string;
          id?: string;
          notes?: string | null;
          recurring?: boolean;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "expenses_company_id_fkey"; columns: ["company_id"]; isOneToOne: false; referencedRelation: "companies"; referencedColumns: ["id"] },
        ];
      };
      payments: {
        Row: {
          amount: number;
          appointment_id: string | null;
          client_id: string | null;
          company_id: string;
          created_at: string;
          id: string;
          method: string | null;
          status: string;
        };
        Insert: {
          amount: number;
          appointment_id?: string | null;
          client_id?: string | null;
          company_id: string;
          created_at?: string;
          id?: string;
          method?: string | null;
          status?: string;
        };
        Update: {
          amount?: number;
          appointment_id?: string | null;
          client_id?: string | null;
          company_id?: string;
          created_at?: string;
          id?: string;
          method?: string | null;
          status?: string;
        };
        Relationships: [
          { foreignKeyName: "payments_appointment_id_fkey"; columns: ["appointment_id"]; isOneToOne: false; referencedRelation: "appointments"; referencedColumns: ["id"] },
          { foreignKeyName: "payments_client_id_fkey"; columns: ["client_id"]; isOneToOne: false; referencedRelation: "clients"; referencedColumns: ["id"] },
          { foreignKeyName: "payments_company_id_fkey"; columns: ["company_id"]; isOneToOne: false; referencedRelation: "companies"; referencedColumns: ["id"] },
        ];
      };
      plan_features: {
        Row: {
          created_at: string;
          enabled: boolean;
          feature_key: string;
          id: string;
          limit_value: number | null;
          plan_id: string;
        };
        Insert: {
          created_at?: string;
          enabled?: boolean;
          feature_key: string;
          id?: string;
          limit_value?: number | null;
          plan_id: string;
        };
        Update: {
          created_at?: string;
          enabled?: boolean;
          feature_key?: string;
          id?: string;
          limit_value?: number | null;
          plan_id?: string;
        };
        Relationships: [
          { foreignKeyName: "plan_features_plan_id_fkey"; columns: ["plan_id"]; isOneToOne: false; referencedRelation: "plans"; referencedColumns: ["id"] },
        ];
      };
      plans: {
        Row: {
          active: boolean;
          billing_interval: string;
          created_at: string;
          id: string;
          max_appointments: number | null;
          max_clients: number | null;
          max_professionals: number | null;
          max_users: number | null;
          name: string;
          price_cents: number;
        };
        Insert: {
          active?: boolean;
          billing_interval?: string;
          created_at?: string;
          id?: string;
          max_appointments?: number | null;
          max_clients?: number | null;
          max_professionals?: number | null;
          max_users?: number | null;
          name: string;
          price_cents: number;
        };
        Update: {
          active?: boolean;
          billing_interval?: string;
          created_at?: string;
          id?: string;
          max_appointments?: number | null;
          max_clients?: number | null;
          max_professionals?: number | null;
          max_users?: number | null;
          name?: string;
          price_cents?: number;
        };
        Relationships: [];
      };
      products: {
        Row: {
          category: string | null;
          company_id: string;
          cost_price: number | null;
          created_at: string;
          description: string | null;
          id: string;
          min_stock_qty: number;
          name: string;
          price: number;
          stock_qty: number;
          unit: string;
          updated_at: string;
        };
        Insert: {
          category?: string | null;
          company_id: string;
          cost_price?: number | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          min_stock_qty?: number;
          name: string;
          price: number;
          stock_qty?: number;
          unit?: string;
          updated_at?: string;
        };
        Update: {
          category?: string | null;
          company_id?: string;
          cost_price?: number | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          min_stock_qty?: number;
          name?: string;
          price?: number;
          stock_qty?: number;
          unit?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "products_company_id_fkey"; columns: ["company_id"]; isOneToOne: false; referencedRelation: "companies"; referencedColumns: ["id"] },
        ];
      };
      professionals: {
        Row: {
          active: boolean;
          company_id: string;
          created_at: string;
          end_time: string | null;
          id: string;
          name: string;
          photo_url: string | null;
          role_title: string | null;
          start_time: string | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          active?: boolean;
          company_id: string;
          created_at?: string;
          end_time?: string | null;
          id?: string;
          name: string;
          photo_url?: string | null;
          role_title?: string | null;
          start_time?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          active?: boolean;
          company_id?: string;
          created_at?: string;
          end_time?: string | null;
          id?: string;
          name?: string;
          photo_url?: string | null;
          role_title?: string | null;
          start_time?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          { foreignKeyName: "professionals_company_id_fkey"; columns: ["company_id"]; isOneToOne: false; referencedRelation: "companies"; referencedColumns: ["id"] },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          phone: string | null;
          role_platform: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          role_platform?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          role_platform?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      roles: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_system: boolean;
          key: string;
          label: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_system?: boolean;
          key: string;
          label: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_system?: boolean;
          key?: string;
          label?: string;
        };
        Relationships: [];
      };
      segments: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          name: string;
          slug: string;
          theme_key: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          name: string;
          slug: string;
          theme_key?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          name?: string;
          slug?: string;
          theme_key?: string;
        };
        Relationships: [];
      };
      services: {
        Row: {
          active: boolean;
          category: string | null;
          company_id: string;
          created_at: string;
          description: string | null;
          duration_min: number;
          id: string;
          name: string;
          photo_url: string | null;
          price: number;
          type: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          category?: string | null;
          company_id: string;
          created_at?: string;
          description?: string | null;
          duration_min: number;
          id?: string;
          name: string;
          photo_url?: string | null;
          price: number;
          type?: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          category?: string | null;
          company_id?: string;
          created_at?: string;
          description?: string | null;
          duration_min?: number;
          id?: string;
          name?: string;
          photo_url?: string | null;
          price?: number;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "services_company_id_fkey"; columns: ["company_id"]; isOneToOne: false; referencedRelation: "companies"; referencedColumns: ["id"] },
        ];
      };
      subscriptions: {
        Row: {
          canceled_at: string | null;
          company_id: string;
          created_at: string;
          current_period_end: string | null;
          id: string;
          plan_id: string;
          status: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          trial_ends_at: string | null;
          trial_started_at: string | null;
          updated_at: string;
        };
        Insert: {
          canceled_at?: string | null;
          company_id: string;
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          plan_id: string;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          trial_ends_at?: string | null;
          trial_started_at?: string | null;
          updated_at?: string;
        };
        Update: {
          canceled_at?: string | null;
          company_id?: string;
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          plan_id?: string;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          trial_ends_at?: string | null;
          trial_started_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "subscriptions_company_id_fkey"; columns: ["company_id"]; isOneToOne: false; referencedRelation: "companies"; referencedColumns: ["id"] },
          { foreignKeyName: "subscriptions_plan_id_fkey"; columns: ["plan_id"]; isOneToOne: false; referencedRelation: "plans"; referencedColumns: ["id"] },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      admin_change_plan: {
        Args: { company_id: string; new_plan_id: string };
        Returns: Database["public"]["Tables"]["subscriptions"]["Row"];
      };
      admin_list_company_users: {
        Args: { target_company_id: string };
        Returns: {
          member_id: string;
          user_id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          role_empresa: string;
          active: boolean;
          member_created_at: string;
        }[];
      };
      admin_update_company: {
        Args: {
          company_id: string;
          new_address?: string;
          new_anamnesis_enabled?: boolean;
          new_city?: string;
          new_document?: string;
          new_email?: string;
          new_name?: string;
          new_phone?: string;
          new_segment_id?: string;
          new_state?: string;
          new_status?: string;
          new_trade_name?: string;
          new_whatsapp?: string;
          new_zip_code?: string;
        };
        Returns: Database["public"]["Tables"]["companies"]["Row"];
      };
      generate_unique_slug: { Args: { base_name: string }; Returns: string };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type DefaultSchema = Database["public"];

export type Tables<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Update"];
