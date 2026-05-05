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
      app_config: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value?: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      demands: {
        Row: {
          artist_name: string | null
          client_name: string | null
          created_at: string
          created_by: string
          description: string | null
          due_at: string | null
          id: string
          name: string
          notes_finance: string | null
          payment_date: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          phase_gravacao: boolean
          phase_gravacao_label: string
          phase_mix_master: boolean
          phase_mix_master_label: string
          phase_producao: boolean
          phase_producao_label: string
          phase_step_4: boolean
          phase_step_4_label: string
          phase_step_5: boolean
          phase_step_5_label: string
          price: number | null
          producer_name: string
          service_type: Database["public"]["Enums"]["service_type"] | null
          solicitante_name: string | null
          start_at: string | null
          status: Database["public"]["Enums"]["demand_status"]
          updated_at: string
        }
        Insert: {
          artist_name?: string | null
          client_name?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_at?: string | null
          id?: string
          name: string
          notes_finance?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          phase_gravacao?: boolean
          phase_gravacao_label?: string
          phase_mix_master?: boolean
          phase_mix_master_label?: string
          phase_producao?: boolean
          phase_producao_label?: string
          phase_step_4?: boolean
          phase_step_4_label?: string
          phase_step_5?: boolean
          phase_step_5_label?: string
          price?: number | null
          producer_name: string
          service_type?: Database["public"]["Enums"]["service_type"] | null
          solicitante_name?: string | null
          start_at?: string | null
          status?: Database["public"]["Enums"]["demand_status"]
          updated_at?: string
        }
        Update: {
          artist_name?: string | null
          client_name?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_at?: string | null
          id?: string
          name?: string
          notes_finance?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          phase_gravacao?: boolean
          phase_gravacao_label?: string
          phase_mix_master?: boolean
          phase_mix_master_label?: string
          phase_producao?: boolean
          phase_producao_label?: string
          phase_step_4?: boolean
          phase_step_4_label?: string
          phase_step_5?: boolean
          phase_step_5_label?: string
          price?: number | null
          producer_name?: string
          service_type?: Database["public"]["Enums"]["service_type"] | null
          solicitante_name?: string | null
          start_at?: string | null
          status?: Database["public"]["Enums"]["demand_status"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      demand_deliverables: {
        Row: {
          id: string
          demand_id: string
          storage_path: string | null
          file_name: string | null
          comments: string | null
          uploaded_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          demand_id: string
          storage_path?: string | null
          file_name?: string | null
          comments?: string | null
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          demand_id?: string
          storage_path?: string | null
          file_name?: string | null
          comments?: string | null
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      producer_availability: {
        Row: {
          id: string
          user_id: string
          date: string
          slot_start: string
          slot_end: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          slot_start: string
          slot_end: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          slot_start?: string
          slot_end?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_producer_name: { Args: { _user_id: string }; Returns: string }
      get_producers: { Args: Record<string, never>; Returns: { display_name: string }[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      demands_uploadable_by_user: { Args: { _user_id: string }; Returns: string[] }
      demands_downloadable_by_user: { Args: { _user_id: string }; Returns: string[] }
      upsert_demand_deliverable: {
        Args: {
          p_demand_id: string
          p_storage_path?: string | null
          p_file_name?: string | null
          p_comments?: string | null
          p_uploaded_by?: string | null
        }
        Returns: undefined
      }
      get_producer_availability_for_view: {
        Args: Record<string, never>
        Returns: { producer_name: string; date: string; slot_start: string; slot_end: string }[]
      }
    }
    Enums: {
      app_role: "atendente" | "produtor" | "ceo" | "admin" | "financeiro"
      demand_status: "aguardando" | "em_producao" | "concluido"
      payment_status: "pending" | "paid" | "overdue" | "cancelled"
      service_type: "beatmaking" | "gravacao" | "mixagem" | "mastering" | "mix_master" | "aluguel" | "outro"
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
      app_role: ["atendente", "produtor", "ceo", "admin"],
      demand_status: ["aguardando", "em_producao", "concluido"],
    },
  },
} as const
