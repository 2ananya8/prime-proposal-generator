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
      profiles: {
        Row: {
          id: string
          email: string
          role: string
          must_change_password: boolean
          created_at: string
        }
        Insert: {
          id: string
          email: string
          role?: string
          must_change_password?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: string
          must_change_password?: boolean
          created_at?: string
        }
        Relationships: []
      }
      proposals: {
        Row: {
          client_name: string
          client_logo: string | null
          client_research: Json | null
          client_website: string | null
          commercials: Json | null
          created_at: string
          created_by: string | null
          executive_summary: string | null
          extra_fields: Json | null
          generated_docx_path: string | null
          generated_pdf_path: string | null
          id: string
          payment_milestones: Json | null
          proposal_type: string
          proposal_date: string
          scope_details: Json | null
          service_id: string | null
          timeline_overrides: Json | null
          updated_at: string
        }
        Insert: {
          client_name: string
          client_logo?: string | null
          client_research?: Json | null
          client_website?: string | null
          commercials?: Json | null
          created_at?: string
          created_by?: string | null
          executive_summary?: string | null
          extra_fields?: Json | null
          generated_docx_path?: string | null
          generated_pdf_path?: string | null
          id?: string
          payment_milestones?: Json | null
          proposal_type?: string
          proposal_date?: string
          scope_details?: Json | null
          service_id?: string | null
          timeline_overrides?: Json | null
          updated_at?: string
        }
        Update: {
          client_name?: string
          client_logo?: string | null
          client_research?: Json | null
          client_website?: string | null
          commercials?: Json | null
          created_at?: string
          created_by?: string | null
          executive_summary?: string | null
          extra_fields?: Json | null
          generated_docx_path?: string | null
          generated_pdf_path?: string | null
          id?: string
          payment_milestones?: Json | null
          proposal_type?: string
          proposal_date?: string
          scope_details?: Json | null
          service_id?: string | null
          timeline_overrides?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          approach_methodology: Json
          coverage_matrix: Json | null
          created_at: string
          created_by: string | null
          deliverables: Json | null
          executive_summary_template: string | null
          expected_benefits: Json | null
          extra_sections: Json | null
          id: string
          name: string
          prerequisites_client: Json | null
          prerequisites_prime: Json | null
          project_objectives: Json | null
          service_type: string
          short_code: string | null
          terms_conditions: string | null
          timeline_phases: Json | null
          updated_at: string
        }
        Insert: {
          approach_methodology?: Json
          coverage_matrix?: Json | null
          created_at?: string
          created_by?: string | null
          deliverables?: Json | null
          executive_summary_template?: string | null
          expected_benefits?: Json | null
          extra_sections?: Json | null
          id?: string
          name: string
          prerequisites_client?: Json | null
          prerequisites_prime?: Json | null
          project_objectives?: Json | null
          service_type: string
          short_code?: string | null
          terms_conditions?: string | null
          timeline_phases?: Json | null
          updated_at?: string
        }
        Update: {
          approach_methodology?: Json
          coverage_matrix?: Json | null
          created_at?: string
          created_by?: string | null
          deliverables?: Json | null
          executive_summary_template?: string | null
          expected_benefits?: Json | null
          extra_sections?: Json | null
          id?: string
          name?: string
          prerequisites_client?: Json | null
          prerequisites_prime?: Json | null
          project_objectives?: Json | null
          service_type?: string
          short_code?: string | null
          terms_conditions?: string | null
          timeline_phases?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clear_must_change_password: { Args: Record<string, never>; Returns: undefined }
      ensure_prime_sso_profile: { Args: Record<string, never>; Returns: Database["public"]["Tables"]["profiles"]["Row"] }
      is_admin: { Args: Record<string, never>; Returns: boolean }
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
