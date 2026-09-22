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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      anamnesis_fields: {
        Row: {
          archived_at: string | null
          created_at: string
          field_type: string
          form_id: string
          id: string
          label: string
          options: Json | null
          required: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          field_type: string
          form_id: string
          id?: string
          label: string
          options?: Json | null
          required?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          field_type?: string
          form_id?: string
          id?: string
          label?: string
          options?: Json | null
          required?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      anamnesis_forms: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          id: string
          segment_id: string | null
          template_id: string | null
          template_version: number | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          id?: string
          segment_id?: string | null
          template_id?: string | null
          template_version?: number | null
          title?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          id?: string
          segment_id?: string | null
          template_id?: string | null
          template_version?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_forms_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_forms_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_forms_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      anamnesis_response_answers: {
        Row: {
          created_at: string
          field_id: string
          field_label_snapshot: string | null
          field_type_snapshot: string | null
          id: string
          response_id: string
          value: Json
        }
        Insert: {
          created_at?: string
          field_id: string
          field_label_snapshot?: string | null
          field_type_snapshot?: string | null
          id?: string
          response_id: string
          value: Json
        }
        Update: {
          created_at?: string
          field_id?: string
          field_label_snapshot?: string | null
          field_type_snapshot?: string | null
          id?: string
          response_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_response_answers_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_response_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      anamnesis_responses: {
        Row: {
          appointment_id: string | null
          client_id: string
          company_id: string
          created_at: string
          created_by: string | null
          form_id: string
          id: string
          professional_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          client_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          form_id: string
          id?: string
          professional_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          client_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          form_id?: string
          id?: string
          professional_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_responses_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_responses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_responses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_responses_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      anamnesis_template_fields: {
        Row: {
          created_at: string
          field_type: string
          id: string
          label: string
          options: Json | null
          required: boolean
          sort_order: number
          template_id: string
        }
        Insert: {
          created_at?: string
          field_type: string
          id?: string
          label: string
          options?: Json | null
          required?: boolean
          sort_order?: number
          template_id: string
        }
        Update: {
          created_at?: string
          field_type?: string
          id?: string
          label?: string
          options?: Json | null
          required?: boolean
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_template_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      anamnesis_templates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_current: boolean
          segment_id: string
          title: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_current?: boolean
          segment_id: string
          title?: string
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_current?: boolean
          segment_id?: string
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_templates_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_notifications: {
        Row: {
          appointment_id: string
          channel: string
          company_id: string
          created_at: string
          event: string
          id: string
          sent_at: string | null
        }
        Insert: {
          appointment_id: string
          channel?: string
          company_id: string
          created_at?: string
          event: string
          id?: string
          sent_at?: string | null
        }
        Update: {
          appointment_id?: string
          channel?: string
          company_id?: string
          created_at?: string
          event?: string
          id?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          client_id: string
          company_id: string
          created_at: string
          created_by: string | null
          duration_min: number
          id: string
          origin: string
          payment_method: string | null
          price: number
          professional_id: string
          scheduled_at: string
          service_id: string
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          duration_min: number
          id?: string
          origin?: string
          payment_method?: string | null
          price: number
          professional_id: string
          scheduled_at: string
          service_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          duration_min?: number
          id?: string
          origin?: string
          payment_method?: string | null
          price?: number
          professional_id?: string
          scheduled_at?: string
          service_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          company_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          payload: Json | null
          target_id: string | null
          target_table: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          payload?: Json | null
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          payload?: Json | null
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_rules: {
        Row: {
          company_id: string
          created_at: string
          days_threshold: number | null
          enabled: boolean
          id: string
          message_template: string | null
          type: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          days_threshold?: number | null
          enabled?: boolean
          id?: string
          message_template?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          days_threshold?: number | null
          enabled?: boolean
          id?: string
          message_template?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_sends: {
        Row: {
          campaign_rule_id: string
          channel: string
          client_id: string
          company_id: string
          created_at: string
          error: string | null
          id: string
          scheduled_for: string
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_rule_id: string
          channel?: string
          client_id: string
          company_id: string
          created_at?: string
          error?: string | null
          id?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_rule_id?: string
          channel?: string
          client_id?: string
          company_id?: string
          created_at?: string
          error?: string | null
          id?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_sends_campaign_rule_id_fkey"
            columns: ["campaign_rule_id"]
            isOneToOne: false
            referencedRelation: "campaign_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_sends_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_sends_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          company_id: string
          created_at: string
          enabled: boolean
          ends_on: string | null
          id: string
          message_template: string | null
          name: string
          occasion: string
          starts_on: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          enabled?: boolean
          ends_on?: string | null
          id?: string
          message_template?: string | null
          name: string
          occasion: string
          starts_on?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          enabled?: boolean
          ends_on?: string | null
          id?: string
          message_template?: string | null
          name?: string
          occasion?: string
          starts_on?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_packages: {
        Row: {
          client_id: string
          company_id: string
          created_at: string
          expires_at: string | null
          id: string
          price_paid: number
          purchased_at: string
          service_id: string
          total_sessions: number
          used_sessions: number
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          price_paid: number
          purchased_at?: string
          service_id: string
          total_sessions: number
          used_sessions?: number
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          price_paid?: number
          purchased_at?: string
          service_id?: string
          total_sessions?: number
          used_sessions?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_packages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_packages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_packages_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          active: boolean
          asaas_customer_id: string | null
          birth_date: string | null
          company_id: string
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          asaas_customer_id?: string | null
          birth_date?: string | null
          company_id: string
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          asaas_customer_id?: string | null
          birth_date?: string | null
          company_id?: string
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          address_number: string | null
          anamnesis_enabled: boolean
          asaas_customer_id: string | null
          business_hours: string | null
          business_size: string | null
          city: string | null
          color_accent: string | null
          color_primary: string | null
          color_secondary: string | null
          complement: string | null
          cover_url: string | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          loyalty_program_enabled: boolean
          name: string
          neighborhood: string | null
          other_segment: string | null
          phone: string | null
          segment_id: string
          slug: string
          staff_size_range: string | null
          state: string | null
          status: string
          street: string | null
          timezone: string
          trade_name: string | null
          updated_at: string
          whatsapp: string | null
          whatsapp_reminder_enabled: boolean
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          address_number?: string | null
          anamnesis_enabled?: boolean
          asaas_customer_id?: string | null
          business_hours?: string | null
          business_size?: string | null
          city?: string | null
          color_accent?: string | null
          color_primary?: string | null
          color_secondary?: string | null
          complement?: string | null
          cover_url?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          loyalty_program_enabled?: boolean
          name: string
          neighborhood?: string | null
          other_segment?: string | null
          phone?: string | null
          segment_id: string
          slug: string
          staff_size_range?: string | null
          state?: string | null
          status?: string
          street?: string | null
          timezone?: string
          trade_name?: string | null
          updated_at?: string
          whatsapp?: string | null
          whatsapp_reminder_enabled?: boolean
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          address_number?: string | null
          anamnesis_enabled?: boolean
          asaas_customer_id?: string | null
          business_hours?: string | null
          business_size?: string | null
          city?: string | null
          color_accent?: string | null
          color_primary?: string | null
          color_secondary?: string | null
          complement?: string | null
          cover_url?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          loyalty_program_enabled?: boolean
          name?: string
          neighborhood?: string | null
          other_segment?: string | null
          phone?: string | null
          segment_id?: string
          slug?: string
          staff_size_range?: string | null
          state?: string | null
          status?: string
          street?: string | null
          timezone?: string
          trade_name?: string | null
          updated_at?: string
          whatsapp?: string | null
          whatsapp_reminder_enabled?: boolean
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      company_goals: {
        Row: {
          company_id: string
          created_at: string
          goal_key: string
        }
        Insert: {
          company_id: string
          created_at?: string
          goal_key: string
        }
        Update: {
          company_id?: string
          created_at?: string
          goal_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_goals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          id: string
          role_empresa: string
          user_id: string
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          id?: string
          role_empresa?: string
          user_id: string
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          id?: string
          role_empresa?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_role_empresa_fkey"
            columns: ["role_empresa"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["key"]
          },
        ]
      }
      coupon_professionals: {
        Row: {
          coupon_id: string
          professional_id: string
        }
        Insert: {
          coupon_id: string
          professional_id: string
        }
        Update: {
          coupon_id?: string
          professional_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_professionals_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_professionals_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          appointment_id: string
          client_id: string
          company_id: string
          coupon_id: string
          created_at: string
          discount_amount: number
          id: string
        }
        Insert: {
          appointment_id: string
          client_id: string
          company_id: string
          coupon_id: string
          created_at?: string
          discount_amount: number
          id?: string
        }
        Update: {
          appointment_id?: string
          client_id?: string
          company_id?: string
          coupon_id?: string
          created_at?: string
          discount_amount?: number
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_services: {
        Row: {
          coupon_id: string
          service_id: string
        }
        Insert: {
          coupon_id: string
          service_id: string
        }
        Update: {
          coupon_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_services_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          company_id: string
          created_at: string
          description: string | null
          discount_amount: number | null
          discount_percent: number | null
          ends_at: string | null
          id: string
          max_discount_amount: number | null
          min_value: number | null
          name: string
          per_client_limit: number | null
          starts_at: string | null
          updated_at: string
          usage_limit: number | null
        }
        Insert: {
          active?: boolean
          code: string
          company_id: string
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          ends_at?: string | null
          id?: string
          max_discount_amount?: number | null
          min_value?: number | null
          name: string
          per_client_limit?: number | null
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
        }
        Update: {
          active?: boolean
          code?: string
          company_id?: string
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          ends_at?: string | null
          id?: string
          max_discount_amount?: number | null
          min_value?: number | null
          name?: string
          per_client_limit?: number | null
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_reports: {
        Row: {
          company_id: string
          config: Json
          created_at: string
          created_by: string
          id: string
          name: string
          source: string
          updated_at: string
        }
        Insert: {
          company_id: string
          config?: Json
          created_at?: string
          created_by: string
          id?: string
          name: string
          source: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          config?: Json
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          company_id: string | null
          created_at: string
          fcm_token: string
          id: string
          platform: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          fcm_token: string
          id?: string
          platform: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          fcm_token?: string
          id?: string
          platform?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          company_id: string
          created_at: string
          description: string
          expense_date: string
          id: string
          notes: string | null
          recurring: boolean
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string | null
          company_id: string
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          recurring?: boolean
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          company_id?: string
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          recurring?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          company_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          metric: string
          period_end: string
          period_start: string
          professional_id: string | null
          target_value: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          metric: string
          period_end: string
          period_start: string
          professional_id?: string | null
          target_value: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          metric?: string
          period_end?: string
          period_start?: string
          professional_id?: string | null
          target_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_sessions: {
        Row: {
          admin_id: string
          company_id: string
          created_at: string
          ended_at: string | null
          id: string
          reason: string | null
          started_at: string
          target_user_id: string
        }
        Insert: {
          admin_id: string
          company_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          reason?: string | null
          started_at?: string
          target_user_id: string
        }
        Update: {
          admin_id?: string
          company_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          reason?: string | null
          started_at?: string
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "impersonation_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_webhook_events: {
        Row: {
          company_id: string | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json | null
          processed_at: string | null
          provider: string
          provider_event_id: string
          received_at: string
          status: string
        }
        Insert: {
          company_id?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          provider?: string
          provider_event_id: string
          received_at?: string
          status?: string
        }
        Update: {
          company_id?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          provider?: string
          provider_event_id?: string
          received_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_webhook_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          appointment_id: string | null
          asaas_billing_type: string | null
          asaas_invoice_url: string | null
          asaas_payment_id: string | null
          client_id: string | null
          company_id: string
          created_at: string
          id: string
          method: string | null
          status: string
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          asaas_billing_type?: string | null
          asaas_invoice_url?: string | null
          asaas_payment_id?: string | null
          client_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          method?: string | null
          status?: string
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          asaas_billing_type?: string | null
          asaas_invoice_url?: string | null
          asaas_payment_id?: string | null
          client_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          method?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          company_id: string
          created_at: string
          id: string
          notes: string | null
          paid_amount: number | null
          paid_at: string | null
          payment_method: string | null
          period_end: string
          period_start: string
          professional_id: string
          status: string
          total_appointments: number
          total_commission: number
          total_revenue: number
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          period_end: string
          period_start: string
          professional_id: string
          status?: string
          total_appointments?: number
          total_commission?: number
          total_revenue?: number
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          period_end?: string
          period_start?: string
          professional_id?: string
          status?: string
          total_appointments?: number
          total_commission?: number
          total_revenue?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_periods_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_onboarding: {
        Row: {
          created_at: string
          email: string
          payload: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          payload: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
      plan_features: {
        Row: {
          created_at: string
          enabled: boolean
          feature_key: string
          id: string
          limit_value: number | null
          plan_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_key: string
          id?: string
          limit_value?: number | null
          plan_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_key?: string
          id?: string
          limit_value?: number | null
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          billing_interval: string
          created_at: string
          id: string
          max_appointments: number | null
          max_clients: number | null
          max_professionals: number | null
          max_users: number | null
          name: string
          price_cents: number
          promo_active: boolean
          promo_price_cents: number | null
        }
        Insert: {
          active?: boolean
          billing_interval?: string
          created_at?: string
          id?: string
          max_appointments?: number | null
          max_clients?: number | null
          max_professionals?: number | null
          max_users?: number | null
          name: string
          price_cents: number
          promo_active?: boolean
          promo_price_cents?: number | null
        }
        Update: {
          active?: boolean
          billing_interval?: string
          created_at?: string
          id?: string
          max_appointments?: number | null
          max_clients?: number | null
          max_professionals?: number | null
          max_users?: number | null
          name?: string
          price_cents?: number
          promo_active?: boolean
          promo_price_cents?: number | null
        }
        Relationships: []
      }
      platform_announcements: {
        Row: {
          audience_company_id: string | null
          audience_plan_id: string | null
          audience_segment_id: string | null
          audience_status: string | null
          audience_type: string
          created_at: string
          created_by: string | null
          id: string
          message: string
          sent_at: string | null
          status: string
          title: string
        }
        Insert: {
          audience_company_id?: string | null
          audience_plan_id?: string | null
          audience_segment_id?: string | null
          audience_status?: string | null
          audience_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          sent_at?: string | null
          status?: string
          title: string
        }
        Update: {
          audience_company_id?: string | null
          audience_plan_id?: string | null
          audience_segment_id?: string | null
          audience_status?: string | null
          audience_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          sent_at?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_announcements_audience_company_id_fkey"
            columns: ["audience_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_announcements_audience_plan_id_fkey"
            columns: ["audience_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_announcements_audience_segment_id_fkey"
            columns: ["audience_segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          company_id: string
          cost_price: number | null
          created_at: string
          description: string | null
          id: string
          min_stock_qty: number
          name: string
          price: number
          stock_qty: number
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          company_id: string
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          min_stock_qty?: number
          name: string
          price: number
          stock_qty?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          company_id?: string
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          min_stock_qty?: number
          name?: string
          price?: number
          stock_qty?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_blocks: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          professional_id: string
          reason: string | null
          starts_at: string
          type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          professional_id: string
          reason?: string | null
          starts_at: string
          type?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          professional_id?: string
          reason?: string | null
          starts_at?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_blocks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_blocks_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_commissions: {
        Row: {
          commission_type: string
          commission_value: number
          company_id: string
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          id: string
          professional_id: string
        }
        Insert: {
          commission_type: string
          commission_value: number
          company_id: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          professional_id: string
        }
        Update: {
          commission_type?: string
          commission_value?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          professional_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_commissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_commissions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_segments: {
        Row: {
          created_at: string
          professional_id: string
          segment_id: string
        }
        Insert: {
          created_at?: string
          professional_id: string
          segment_id: string
        }
        Update: {
          created_at?: string
          professional_id?: string
          segment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_segments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_segments_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_weekly_hours: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          created_by: string | null
          end_time: string | null
          id: string
          professional_id: string
          start_time: string | null
          updated_at: string
          weekday: number
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          id?: string
          professional_id: string
          start_time?: string | null
          updated_at?: string
          weekday: number
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          id?: string
          professional_id?: string
          start_time?: string | null
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "professional_weekly_hours_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_weekly_hours_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          end_time: string | null
          id: string
          name: string
          photo_url: string | null
          role_title: string | null
          start_time: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          end_time?: string | null
          id?: string
          name: string
          photo_url?: string | null
          role_title?: string | null
          start_time?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          end_time?: string | null
          id?: string
          name?: string
          photo_url?: string | null
          role_title?: string | null
          start_time?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professionals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          role_platform: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          role_platform?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role_platform?: string
          updated_at?: string
        }
        Relationships: []
      }
      report_favorites: {
        Row: {
          company_id: string
          created_at: string
          id: string
          profile_id: string
          report_key: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          profile_id: string
          report_key: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          profile_id?: string
          report_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_favorites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_favorites_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      report_view_history: {
        Row: {
          company_id: string
          id: string
          profile_id: string
          report_key: string
          report_title: string
          viewed_at: string
        }
        Insert: {
          company_id: string
          id?: string
          profile_id: string
          report_key: string
          report_title: string
          viewed_at?: string
        }
        Update: {
          company_id?: string
          id?: string
          profile_id?: string
          report_key?: string
          report_title?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_view_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_view_history_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          appointment_id: string
          client_id: string
          comment: string | null
          company_id: string
          created_at: string
          id: string
          professional_id: string
          rating: number
          responded_at: string | null
          response: string | null
          service_id: string
          status: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          client_id: string
          comment?: string | null
          company_id: string
          created_at?: string
          id?: string
          professional_id: string
          rating: number
          responded_at?: string | null
          response?: string | null
          service_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          client_id?: string
          comment?: string | null
          company_id?: string
          created_at?: string
          id?: string
          professional_id?: string
          rating?: number
          responded_at?: string | null
          response?: string | null
          service_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          key: string
          label: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key: string
          label: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key?: string
          label?: string
        }
        Relationships: []
      }
      segments: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          slug: string
          theme_key: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          slug: string
          theme_key?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          slug?: string
          theme_key?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean
          anamnesis_form_id: string | null
          category: string | null
          company_id: string
          created_at: string
          description: string | null
          duration_min: number
          id: string
          name: string
          photo_url: string | null
          price: number
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          anamnesis_form_id?: string | null
          category?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          duration_min: number
          id?: string
          name: string
          photo_url?: string | null
          price: number
          type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          anamnesis_form_id?: string | null
          category?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          duration_min?: number
          id?: string
          name?: string
          photo_url?: string | null
          price?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_anamnesis_form_same_company_fk"
            columns: ["anamnesis_form_id", "company_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_forms"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "services_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          asaas_customer_id: string | null
          asaas_payment_id: string
          billing_type: string | null
          company_id: string
          created_at: string
          due_date: string | null
          id: string
          last_event: string
          payment_date: string | null
          raw_payload: Json
          status: string
          subscription_id: string | null
          updated_at: string
          value: number
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_payment_id: string
          billing_type?: string | null
          company_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          last_event: string
          payment_date?: string | null
          raw_payload?: Json
          status: string
          subscription_id?: string | null
          updated_at?: string
          value: number
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_payment_id?: string
          billing_type?: string | null
          company_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          last_event?: string
          payment_date?: string | null
          raw_payload?: Json
          status?: string
          subscription_id?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          asaas_checkout_id: string | null
          asaas_subscription_id: string | null
          canceled_at: string | null
          company_id: string
          created_at: string
          current_period_end: string | null
          id: string
          plan_id: string
          promo_ends_at: string | null
          promo_price_cents: number | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
        }
        Insert: {
          asaas_checkout_id?: string | null
          asaas_subscription_id?: string | null
          canceled_at?: string | null
          company_id: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id: string
          promo_ends_at?: string | null
          promo_price_cents?: number | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Update: {
          asaas_checkout_id?: string | null
          asaas_subscription_id?: string | null
          canceled_at?: string | null
          company_id?: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id?: string
          promo_ends_at?: string | null
          promo_price_cents?: number | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          closed_at: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          opened_by: string | null
          priority: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          closed_at?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          opened_by?: string | null
          priority?: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          closed_at?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          opened_by?: string | null
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      terms_acceptances: {
        Row: {
          accepted_at: string
          company_id: string | null
          created_at: string
          document_type: string
          document_version: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          company_id?: string | null
          created_at?: string
          document_type: string
          document_version: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          company_id?: string | null
          created_at?: string
          document_type?: string
          document_version?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "terms_acceptances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_entries: {
        Row: {
          client_id: string
          company_id: string
          created_at: string
          id: string
          notes: string | null
          preferred_date: string | null
          preferred_period: string | null
          professional_id: string | null
          service_id: string
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          preferred_date?: string | null
          preferred_period?: string | null
          professional_id?: string | null
          service_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          preferred_date?: string | null
          preferred_period?: string | null
          professional_id?: string | null
          service_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_change_plan: {
        Args: { company_id: string; new_plan_id: string }
        Returns: {
          asaas_checkout_id: string | null
          asaas_subscription_id: string | null
          canceled_at: string | null
          company_id: string
          created_at: string
          current_period_end: string | null
          id: string
          plan_id: string
          promo_ends_at: string | null
          promo_price_cents: number | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "subscriptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_companies_by_plan: {
        Args: never
        Returns: {
          company_count: number
          plan_id: string
          plan_name: string
        }[]
      }
      admin_dashboard_summary: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          active_companies: number
          active_subscriptions: number
          canceled_subscriptions: number
          deleted_companies: number
          expired_subscriptions: number
          mrr: number
          new_companies_period: number
          past_due_subscriptions: number
          payments_confirmed: number
          payments_overdue: number
          payments_pending: number
          revenue_period: number
          suspended_companies: number
          total_companies: number
          trial_companies: number
          trial_expired_companies: number
          trial_subscriptions: number
        }[]
      }
      admin_end_impersonation: {
        Args: { session_id: string }
        Returns: {
          admin_id: string
          company_id: string
          created_at: string
          ended_at: string | null
          id: string
          reason: string | null
          started_at: string
          target_user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "impersonation_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_list_companies_owners: {
        Args: { p_company_ids: string[] }
        Returns: {
          company_id: string
          email: string
          full_name: string
        }[]
      }
      admin_list_company_users: {
        Args: { target_company_id: string }
        Returns: {
          active: boolean
          avatar_url: string
          email: string
          full_name: string
          member_created_at: string
          member_id: string
          phone: string
          role_empresa: string
          user_id: string
        }[]
      }
      admin_list_users: {
        Args: {
          p_company_id?: string
          p_page?: number
          p_page_size?: number
          p_search?: string
        }
        Returns: {
          banned: boolean
          created_at: string
          email: string
          full_name: string
          last_sign_in_at: string
          memberships: Json
          role_platform: string
          total_count: number
          user_id: string
        }[]
      }
      admin_save_anamnesis_template: {
        Args: { p_fields: Json; p_segment_id: string; p_title: string }
        Returns: {
          created_at: string
          created_by: string | null
          id: string
          is_current: boolean
          segment_id: string
          title: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "anamnesis_templates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_member_active: {
        Args: { member_id: string; new_active: boolean }
        Returns: {
          active: boolean
          company_id: string
          created_at: string
          id: string
          role_empresa: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "company_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_update_company: {
        Args: {
          company_id: string
          new_address?: string
          new_address_number?: string
          new_anamnesis_enabled?: boolean
          new_city?: string
          new_complement?: string
          new_document?: string
          new_email?: string
          new_name?: string
          new_neighborhood?: string
          new_other_segment?: string
          new_phone?: string
          new_segment_id?: string
          new_state?: string
          new_status?: string
          new_street?: string
          new_trade_name?: string
          new_whatsapp?: string
          new_zip_code?: string
        }
        Returns: {
          address: string | null
          address_number: string | null
          anamnesis_enabled: boolean
          asaas_customer_id: string | null
          business_hours: string | null
          business_size: string | null
          city: string | null
          color_accent: string | null
          color_primary: string | null
          color_secondary: string | null
          complement: string | null
          cover_url: string | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          loyalty_program_enabled: boolean
          name: string
          neighborhood: string | null
          other_segment: string | null
          phone: string | null
          segment_id: string
          slug: string
          staff_size_range: string | null
          state: string | null
          status: string
          street: string | null
          trade_name: string | null
          updated_at: string
          whatsapp: string | null
          whatsapp_reminder_enabled: boolean
          zip_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "companies"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      book_appointment: {
        Args: {
          p_client_id: string
          p_client_package_id?: string
          p_company_id: string
          p_coupon_code?: string
          p_payment_method?: string
          p_professional_id: string
          p_scheduled_at: string
          p_service_id: string
        }
        Returns: {
          appointment_id: string
          discount_amount: number
          duration_min: number
          final_amount: number
          payment_id: string
          price: number
        }[]
      }
      calculate_professional_payout: {
        Args: {
          p_company_id: string
          p_period_end: string
          p_period_start: string
          p_professional_id: string
        }
        Returns: {
          total_appointments: number
          total_commission: number
          total_revenue: number
        }[]
      }
      close_payout_period: {
        Args: {
          p_company_id: string
          p_period_end: string
          p_period_start: string
          p_professional_id: string
        }
        Returns: {
          closed_at: string | null
          closed_by: string | null
          company_id: string
          created_at: string
          id: string
          notes: string | null
          paid_amount: number | null
          paid_at: string | null
          payment_method: string | null
          period_end: string
          period_start: string
          professional_id: string
          status: string
          total_appointments: number
          total_commission: number
          total_revenue: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payout_periods"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      company_has_feature: {
        Args: { p_company_id: string; p_feature_key: string }
        Returns: boolean
      }
      complete_company_onboarding: {
        Args: {
          p_address_number?: string
          p_business_size?: string
          p_city?: string
          p_complement?: string
          p_document?: string
          p_goals?: string[]
          p_name: string
          p_neighborhood?: string
          p_other_segment?: string
          p_phone?: string
          p_segment_id: string
          p_slug: string
          p_staff_size_range?: string
          p_state?: string
          p_street?: string
          p_zip_code?: string
        }
        Returns: {
          address: string | null
          address_number: string | null
          anamnesis_enabled: boolean
          asaas_customer_id: string | null
          business_hours: string | null
          business_size: string | null
          city: string | null
          color_accent: string | null
          color_primary: string | null
          color_secondary: string | null
          complement: string | null
          cover_url: string | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          loyalty_program_enabled: boolean
          name: string
          neighborhood: string | null
          other_segment: string | null
          phone: string | null
          segment_id: string
          slug: string
          staff_size_range: string | null
          state: string | null
          status: string
          street: string | null
          trade_name: string | null
          updated_at: string
          whatsapp: string | null
          whatsapp_reminder_enabled: boolean
          zip_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "companies"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_unique_slug: { Args: { base_name: string }; Returns: string }
      get_availability_day: {
        Args: {
          p_company_id: string
          p_day: string
          p_professional_id: string
          p_service_id: string
        }
        Returns: {
          slot_time: string
        }[]
      }
      get_availability_month: {
        Args: {
          p_company_id: string
          p_month: string
          p_professional_id: string
          p_service_id: string
        }
        Returns: {
          available_count: number
          day: string
        }[]
      }
      get_birthday_candidates: {
        Args: { p_company_id: string; p_date?: string }
        Returns: {
          birth_date: string
          client_id: string
          name: string
          phone: string
        }[]
      }
      get_birthday_candidates_range: {
        Args: { p_company_id: string; p_days?: number; p_start_date?: string }
        Returns: {
          birth_date: string
          client_id: string
          days_until: number
          name: string
          next_birthday: string
          phone: string
        }[]
      }
      get_block_conflicts: {
        Args: {
          p_company_id: string
          p_ends_at: string
          p_professional_id: string
          p_starts_at: string
        }
        Returns: {
          appointment_id: string
          client_name: string
          duration_min: number
          scheduled_at: string
          service_id: string
          service_name: string
          status: string
        }[]
      }
      get_company_access_status: {
        Args: { p_company_id: string }
        Returns: {
          allowed: boolean
          company_status: string
          current_period_end: string
          reason: string
          subscription_status: string
          trial_ends_at: string
        }[]
      }
      get_company_plan_limits: {
        Args: { p_company_id: string }
        Returns: {
          max_appointments: number
          max_clients: number
          max_professionals: number
          max_users: number
        }[]
      }
      get_company_rating_summary: {
        Args: { p_company_id: string }
        Returns: {
          average: number
          total: number
        }[]
      }
      get_inactive_client_candidates: {
        Args: { p_company_id: string; p_days_inactive?: number }
        Returns: {
          client_id: string
          last_appointment_at: string
          name: string
          phone: string
        }[]
      }
      get_my_inactive_membership: {
        Args: never
        Returns: {
          company_name: string
          role_empresa: string
        }[]
      }
      get_new_client_candidates: {
        Args: { p_company_id: string; p_days?: number }
        Returns: {
          client_id: string
          first_appointment_at: string
          name: string
          phone: string
        }[]
      }
      get_pending_onboarding: { Args: never; Returns: Json }
      get_professional_occupancy_month: {
        Args: {
          p_company_id: string
          p_month: string
          p_professional_id: string
        }
        Returns: {
          appointment_count: number
          capacity_min: number
          day: string
          occupancy_pct: number
          occupied_min: number
        }[]
      }
      get_recovery_candidates: {
        Args: { p_company_id: string; p_days_since_last?: number }
        Returns: {
          client_id: string
          last_appointment_at: string
          name: string
          phone: string
        }[]
      }
      get_recurring_client_candidates: {
        Args: {
          p_company_id: string
          p_min_appointments?: number
          p_period_days?: number
        }
        Returns: {
          appointments_count: number
          client_id: string
          last_appointment_at: string
          name: string
          phone: string
        }[]
      }
      list_company_clients: {
        Args: {
          p_company_id: string
          p_filter?: string
          p_page?: number
          p_page_size?: number
          p_search?: string
        }
        Returns: {
          active: boolean
          birth_date: string
          created_at: string
          email: string
          has_anamnesis: boolean
          id: string
          last_appointment_at: string
          name: string
          next_appointment_at: string
          notes: string
          phone: string
          total_count: number
          user_id: string
        }[]
      }
      list_company_payments: {
        Args: {
          p_company_id: string
          p_method?: string
          p_page?: number
          p_page_size?: number
          p_period_end?: string
          p_period_start?: string
          p_professional_id?: string
          p_search?: string
          p_service_id?: string
          p_status?: string
        }
        Returns: {
          amount: number
          appointment_id: string
          appointment_scheduled_at: string
          appointment_status: string
          asaas_invoice_url: string
          client_id: string
          client_name: string
          created_at: string
          id: string
          method: string
          professional_id: string
          professional_name: string
          service_id: string
          service_name: string
          status: string
          total_count: number
        }[]
      }
      mark_payout_paid: {
        Args: {
          p_notes?: string
          p_paid_at: string
          p_payment_method: string
          p_payout_period_id: string
        }
        Returns: {
          closed_at: string | null
          closed_by: string | null
          company_id: string
          created_at: string
          id: string
          notes: string | null
          paid_amount: number | null
          paid_at: string | null
          payment_method: string | null
          period_end: string
          period_start: string
          professional_id: string
          status: string
          total_appointments: number
          total_commission: number
          total_revenue: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payout_periods"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      preview_coupon: {
        Args: {
          p_client_id?: string
          p_code: string
          p_company_id: string
          p_professional_id?: string
          p_service_id?: string
        }
        Returns: {
          discount_amount: number
          final_amount: number
          price: number
          reason: string
          valid: boolean
        }[]
      }
      process_asaas_webhook_event: {
        Args: { p_event: string; p_event_hash: string; p_payment: Json }
        Returns: Json
      }
      public_company_is_bookable: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      public_directory_companies: {
        Args: never
        Returns: {
          address: string | null
          address_number: string | null
          anamnesis_enabled: boolean
          asaas_customer_id: string | null
          business_hours: string | null
          business_size: string | null
          city: string | null
          color_accent: string | null
          color_primary: string | null
          color_secondary: string | null
          complement: string | null
          cover_url: string | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          loyalty_program_enabled: boolean
          name: string
          neighborhood: string | null
          other_segment: string | null
          phone: string | null
          segment_id: string
          slug: string
          staff_size_range: string | null
          state: string | null
          status: string
          street: string | null
          trade_name: string | null
          updated_at: string
          whatsapp: string | null
          whatsapp_reminder_enabled: boolean
          zip_code: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "companies"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      reschedule_appointment: {
        Args: { p_appointment_id: string; p_new_scheduled_at: string }
        Returns: {
          client_id: string
          company_id: string
          created_at: string
          created_by: string | null
          duration_min: number
          id: string
          origin: string
          payment_method: string | null
          price: number
          professional_id: string
          scheduled_at: string
          service_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "appointments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_professional_commission: {
        Args: {
          p_commission_type: string
          p_commission_value: number
          p_professional_id: string
        }
        Returns: {
          commission_type: string
          commission_value: number
          company_id: string
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          id: string
          professional_id: string
        }
        SetofOptions: {
          from: "*"
          to: "professional_commissions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_professional_segments: {
        Args: { p_professional_id: string; p_segment_ids: string[] }
        Returns: {
          active: boolean
          created_at: string
          id: string
          name: string
          slug: string
          theme_key: string
        }[]
        SetofOptions: {
          from: "*"
          to: "segments"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      stage_pending_onboarding: {
        Args: { p_email: string; p_payload: Json }
        Returns: undefined
      }
      stage_terms_acceptance: {
        Args: {
          p_document_type: string
          p_document_version: string
          p_email: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      submit_anamnesis_response: {
        Args: {
          p_answers?: Json
          p_appointment_id?: string
          p_client_id: string
          p_form_id?: string
          p_professional_id?: string
          p_service_id?: string
        }
        Returns: string
      }
      submit_anamnesis_response_as_client: {
        Args: {
          p_answers?: Json
          p_appointment_id?: string
          p_company_id: string
          p_form_id?: string
        }
        Returns: string
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
