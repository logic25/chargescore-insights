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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      analyses: {
        Row: {
          address: string
          annual_insurance: number | null
          charge_score: number
          coc: number | null
          created_at: string
          electricity_cost: number | null
          estimated_incentives: number | null
          factors: Json | null
          id: string
          kwh_per_stall_per_day: number | null
          lat: number
          lng: number
          location_type: string | null
          margin_kwh: number | null
          monthly_rent: number | null
          ms_monthly: number | null
          net_investment: number | null
          noi: number | null
          npv: number | null
          num_stalls: number | null
          owner_monthly: number | null
          owner_split_pct: number | null
          predicted_utilization: number | null
          price_per_kwh: number | null
          state: string
          total_parking_spaces: number | null
          total_project_cost: number | null
          user_id: string
        }
        Insert: {
          address: string
          annual_insurance?: number | null
          charge_score: number
          coc?: number | null
          created_at?: string
          electricity_cost?: number | null
          estimated_incentives?: number | null
          factors?: Json | null
          id?: string
          kwh_per_stall_per_day?: number | null
          lat: number
          lng: number
          location_type?: string | null
          margin_kwh?: number | null
          monthly_rent?: number | null
          ms_monthly?: number | null
          net_investment?: number | null
          noi?: number | null
          npv?: number | null
          num_stalls?: number | null
          owner_monthly?: number | null
          owner_split_pct?: number | null
          predicted_utilization?: number | null
          price_per_kwh?: number | null
          state: string
          total_parking_spaces?: number | null
          total_project_cost?: number | null
          user_id: string
        }
        Update: {
          address?: string
          annual_insurance?: number | null
          charge_score?: number
          coc?: number | null
          created_at?: string
          electricity_cost?: number | null
          estimated_incentives?: number | null
          factors?: Json | null
          id?: string
          kwh_per_stall_per_day?: number | null
          lat?: number
          lng?: number
          location_type?: string | null
          margin_kwh?: number | null
          monthly_rent?: number | null
          ms_monthly?: number | null
          net_investment?: number | null
          noi?: number | null
          npv?: number | null
          num_stalls?: number | null
          owner_monthly?: number | null
          owner_split_pct?: number | null
          predicted_utilization?: number | null
          price_per_kwh?: number | null
          state?: string
          total_parking_spaces?: number | null
          total_project_cost?: number | null
          user_id?: string
        }
        Relationships: []
      }
      incentive_programs: {
        Row: {
          administrator: string | null
          amount_cap: number | null
          amount_flat: number | null
          amount_per_port: number | null
          application_url: string | null
          confidence: string
          expiration_date: string | null
          id: string
          notes: string | null
          program_name: string
          program_status: string | null
          stacking_allowed: boolean | null
          state: string | null
          updated_at: string | null
          utility_territory: string | null
        }
        Insert: {
          administrator?: string | null
          amount_cap?: number | null
          amount_flat?: number | null
          amount_per_port?: number | null
          application_url?: string | null
          confidence: string
          expiration_date?: string | null
          id?: string
          notes?: string | null
          program_name: string
          program_status?: string | null
          stacking_allowed?: boolean | null
          state?: string | null
          updated_at?: string | null
          utility_territory?: string | null
        }
        Update: {
          administrator?: string | null
          amount_cap?: number | null
          amount_flat?: number | null
          amount_per_port?: number | null
          application_url?: string | null
          confidence?: string
          expiration_date?: string | null
          id?: string
          notes?: string | null
          program_name?: string
          program_status?: string | null
          stacking_allowed?: boolean | null
          state?: string | null
          updated_at?: string | null
          utility_territory?: string | null
        }
        Relationships: []
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number
          use_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          use_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          use_count?: number
        }
        Relationships: []
      }
      leads: {
        Row: {
          address: string
          chargescore: number | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          message: string | null
          organization_id: string | null
          property_role: string | null
          scout_id: string | null
          source: string
          status: string
        }
        Insert: {
          address: string
          chargescore?: number | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          message?: string | null
          organization_id?: string | null
          property_role?: string | null
          scout_id?: string | null
          source?: string
          status?: string
        }
        Update: {
          address?: string
          chargescore?: number | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          message?: string | null
          organization_id?: string | null
          property_role?: string | null
          scout_id?: string | null
          source?: string
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          lookups_limit: number
          lookups_used: number
          organization_id: string | null
          role: string
          subscription_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          lookups_limit?: number
          lookups_used?: number
          organization_id?: string | null
          role?: string
          subscription_status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          lookups_limit?: number
          lookups_used?: number
          organization_id?: string | null
          role?: string
          subscription_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_documents: {
        Row: {
          address: string
          created_at: string
          doc_type: Database["public"]["Enums"]["doc_type"]
          extracted_data: Json | null
          file_name: string
          file_path: string
          id: string
          site_name: string
          user_id: string
        }
        Insert: {
          address?: string
          created_at?: string
          doc_type?: Database["public"]["Enums"]["doc_type"]
          extracted_data?: Json | null
          file_name: string
          file_path: string
          id?: string
          site_name?: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          doc_type?: Database["public"]["Enums"]["doc_type"]
          extracted_data?: Json | null
          file_name?: string
          file_path?: string
          id?: string
          site_name?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      doc_type: "evpin_report" | "lease" | "permit" | "utility_bill" | "other"
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
      doc_type: ["evpin_report", "lease", "permit", "utility_bill", "other"],
    },
  },
} as const
