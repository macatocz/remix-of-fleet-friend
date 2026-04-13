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
      drivers: {
        Row: {
          created_at: string
          department: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          department?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          created_at: string
          date_from: string
          date_to: string
          driver_name: string
          id: string
          purpose: string | null
          status: string
          time_from: string | null
          time_to: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          date_from: string
          date_to: string
          driver_name: string
          id?: string
          purpose?: string | null
          status?: string
          time_from?: string | null
          time_to?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          date_from?: string
          date_to?: string
          driver_name?: string
          id?: string
          purpose?: string | null
          status?: string
          time_from?: string | null
          time_to?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_documents: {
        Row: {
          category: string | null
          created_at: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          name: string
          vehicle_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name: string
          vehicle_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          cena_pronajmu: string | null
          cislo_smlouvy_leasing: string | null
          created_at: string
          dalnicni_znamka: string | null
          datum_ukonceni_leasingu: string | null
          datum_zahajeni_leasingu: string | null
          doba_leasingu: string | null
          id: string
          leasingova_spolecnost: string | null
          lekarnicka: string | null
          lokalita: string | null
          maly_tp: string | null
          mesicni_splatka: string | null
          misto_uskladneni_pneu: string | null
          nahradni_klic: string | null
          najezd_za_rok: string | null
          parkovaci_stani: string | null
          poznamky: string | null
          rz: string | null
          spravce: string | null
          srazka_soukrome: string | null
          status: string
          stk: string | null
          tankovaci_karty: string | null
          typ_vlastnictvi: string | null
          updated_at: string
          v_uzivani_do: string | null
          v_uzivani_od: string | null
          velky_tp: string | null
          vin: string | null
          vlastnik: string | null
          zelena_karta: string | null
          znacka: string | null
        }
        Insert: {
          cena_pronajmu?: string | null
          cislo_smlouvy_leasing?: string | null
          created_at?: string
          dalnicni_znamka?: string | null
          datum_ukonceni_leasingu?: string | null
          datum_zahajeni_leasingu?: string | null
          doba_leasingu?: string | null
          id?: string
          leasingova_spolecnost?: string | null
          lekarnicka?: string | null
          lokalita?: string | null
          maly_tp?: string | null
          mesicni_splatka?: string | null
          misto_uskladneni_pneu?: string | null
          nahradni_klic?: string | null
          najezd_za_rok?: string | null
          parkovaci_stani?: string | null
          poznamky?: string | null
          rz?: string | null
          spravce?: string | null
          srazka_soukrome?: string | null
          status?: string
          stk?: string | null
          tankovaci_karty?: string | null
          typ_vlastnictvi?: string | null
          updated_at?: string
          v_uzivani_do?: string | null
          v_uzivani_od?: string | null
          velky_tp?: string | null
          vin?: string | null
          vlastnik?: string | null
          zelena_karta?: string | null
          znacka?: string | null
        }
        Update: {
          cena_pronajmu?: string | null
          cislo_smlouvy_leasing?: string | null
          created_at?: string
          dalnicni_znamka?: string | null
          datum_ukonceni_leasingu?: string | null
          datum_zahajeni_leasingu?: string | null
          doba_leasingu?: string | null
          id?: string
          leasingova_spolecnost?: string | null
          lekarnicka?: string | null
          lokalita?: string | null
          maly_tp?: string | null
          mesicni_splatka?: string | null
          misto_uskladneni_pneu?: string | null
          nahradni_klic?: string | null
          najezd_za_rok?: string | null
          parkovaci_stani?: string | null
          poznamky?: string | null
          rz?: string | null
          spravce?: string | null
          srazka_soukrome?: string | null
          status?: string
          stk?: string | null
          tankovaci_karty?: string | null
          typ_vlastnictvi?: string | null
          updated_at?: string
          v_uzivani_do?: string | null
          v_uzivani_od?: string | null
          velky_tp?: string | null
          vin?: string | null
          vlastnik?: string | null
          zelena_karta?: string | null
          znacka?: string | null
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
