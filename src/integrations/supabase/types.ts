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
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          dic: string | null
          email: string | null
          foreign_meal_rates_override: Json | null
          fuel_price_override: Json | null
          ico: string | null
          id: string
          km_rate_override: Json | null
          meal_rates_override: Json | null
          name: string | null
          phone: string | null
          updated_at: string
          website: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          dic?: string | null
          email?: string | null
          foreign_meal_rates_override?: Json | null
          fuel_price_override?: Json | null
          ico?: string | null
          id?: string
          km_rate_override?: Json | null
          meal_rates_override?: Json | null
          name?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          dic?: string | null
          email?: string | null
          foreign_meal_rates_override?: Json | null
          fuel_price_override?: Json | null
          ico?: string | null
          id?: string
          km_rate_override?: Json | null
          meal_rates_override?: Json | null
          name?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      currency_rates: {
        Row: {
          created_at: string
          currency: string
          date: string
          id: string
          rate_to_czk: number
          source: string
        }
        Insert: {
          created_at?: string
          currency: string
          date: string
          id?: string
          rate_to_czk: number
          source?: string
        }
        Update: {
          created_at?: string
          currency?: string
          date?: string
          id?: string
          rate_to_czk?: number
          source?: string
        }
        Relationships: []
      }
      document_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_folders_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
      fuel_cards: {
        Row: {
          card_number: string | null
          created_at: string
          id: string
          notes: string | null
          owner_name: string | null
          pin: string | null
          provider: string
          status: string
          updated_at: string
          valid_until: string | null
          vehicle_id: string
        }
        Insert: {
          card_number?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          owner_name?: string | null
          pin?: string | null
          provider: string
          status?: string
          updated_at?: string
          valid_until?: string | null
          vehicle_id: string
        }
        Update: {
          card_number?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          owner_name?: string | null
          pin?: string | null
          provider?: string
          status?: string
          updated_at?: string
          valid_until?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_cards_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      handover_photos: {
        Row: {
          caption: string | null
          created_at: string
          file_path: string
          id: string
          protocol_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          file_path: string
          id?: string
          protocol_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          file_path?: string
          id?: string
          protocol_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "handover_photos_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "handover_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      handover_protocols: {
        Row: {
          checklist: Json
          created_at: string
          date: string
          driver_name: string | null
          fuel_percent: number | null
          handover_by: string | null
          id: string
          km: number | null
          notes: string | null
          reservation_id: string | null
          type: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          checklist?: Json
          created_at?: string
          date?: string
          driver_name?: string | null
          fuel_percent?: number | null
          handover_by?: string | null
          id?: string
          km?: number | null
          notes?: string | null
          reservation_id?: string | null
          type?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          checklist?: Json
          created_at?: string
          date?: string
          driver_name?: string | null
          fuel_percent?: number | null
          handover_by?: string | null
          id?: string
          km?: number | null
          notes?: string | null
          reservation_id?: string | null
          type?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: []
      }
      incident_photos: {
        Row: {
          caption: string | null
          created_at: string
          file_path: string
          id: string
          incident_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          file_path: string
          id?: string
          incident_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          file_path?: string
          id?: string
          incident_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_photos_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          created_at: string
          date: string
          description: string | null
          driver_id: string | null
          estimated_cost: number | null
          id: string
          location: string | null
          reservation_id: string | null
          status: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          description?: string | null
          driver_id?: string | null
          estimated_cost?: number | null
          id?: string
          location?: string | null
          reservation_id?: string | null
          status?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          driver_id?: string | null
          estimated_cost?: number | null
          id?: string
          location?: string | null
          reservation_id?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: []
      }
      inspections: {
        Row: {
          created_at: string
          date: string
          id: string
          notes: string | null
          result: string | null
          type: string
          updated_at: string
          valid_until: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          result?: string | null
          type?: string
          updated_at?: string
          valid_until: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          result?: string | null
          type?: string
          updated_at?: string
          valid_until?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspections_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance: {
        Row: {
          annual_cost: number | null
          created_at: string
          id: string
          insurer: string
          notes: string | null
          policy_number: string | null
          type: string
          updated_at: string
          valid_from: string | null
          valid_until: string
          vehicle_id: string
        }
        Insert: {
          annual_cost?: number | null
          created_at?: string
          id?: string
          insurer: string
          notes?: string | null
          policy_number?: string | null
          type?: string
          updated_at?: string
          valid_from?: string | null
          valid_until: string
          vehicle_id: string
        }
        Update: {
          annual_cost?: number | null
          created_at?: string
          id?: string
          insurer?: string
          notes?: string | null
          policy_number?: string | null
          type?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      key_handovers: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          from_user_id: string | null
          id: string
          note: string | null
          to_name: string | null
          to_user_id: string | null
          vehicle_id: string
        }
        Insert: {
          action?: string
          created_at?: string
          created_by?: string | null
          from_user_id?: string | null
          id?: string
          note?: string | null
          to_name?: string | null
          to_user_id?: string | null
          vehicle_id: string
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string | null
          from_user_id?: string | null
          id?: string
          note?: string | null
          to_name?: string | null
          to_user_id?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "key_handovers_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          email_enabled: boolean
          push_enabled: boolean
          types: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          email_enabled?: boolean
          push_enabled?: boolean
          types?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          email_enabled?: boolean
          push_enabled?: boolean
          types?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          reservation_id: string | null
          title: string
          type: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          reservation_id?: string | null
          title: string
          type: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          reservation_id?: string | null
          title?: string
          type?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
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
      service_plans: {
        Row: {
          created_at: string
          id: string
          interval_km: number | null
          interval_months: number | null
          last_done_date: string | null
          last_done_km: number | null
          next_due_date: string | null
          next_due_km: number | null
          notes: string | null
          type: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interval_km?: number | null
          interval_months?: number | null
          last_done_date?: string | null
          last_done_km?: number | null
          next_due_date?: string | null
          next_due_km?: number | null
          notes?: string | null
          type: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interval_km?: number | null
          interval_months?: number | null
          last_done_date?: string | null
          last_done_km?: number | null
          next_due_date?: string | null
          next_due_km?: number | null
          notes?: string | null
          type?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: []
      }
      service_records: {
        Row: {
          cost: number | null
          created_at: string
          date: string
          description: string | null
          id: string
          status: string
          type: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          status?: string
          type: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          status?: string
          type?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_order_expenses: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          id: string
          receipt_path: string | null
          travel_order_id: string
          type: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          receipt_path?: string | null
          travel_order_id: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          receipt_path?: string | null
          travel_order_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_order_expenses_travel_order_id_fkey"
            columns: ["travel_order_id"]
            isOneToOne: false
            referencedRelation: "travel_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_order_legs: {
        Row: {
          country: string
          created_at: string
          date: string
          id: string
          km: number | null
          note: string | null
          place_from: string | null
          place_to: string | null
          sort_order: number
          time_from: string | null
          time_to: string | null
          timezone: string
          transport: string | null
          travel_order_id: string
        }
        Insert: {
          country?: string
          created_at?: string
          date: string
          id?: string
          km?: number | null
          note?: string | null
          place_from?: string | null
          place_to?: string | null
          sort_order?: number
          time_from?: string | null
          time_to?: string | null
          timezone?: string
          transport?: string | null
          travel_order_id: string
        }
        Update: {
          country?: string
          created_at?: string
          date?: string
          id?: string
          km?: number | null
          note?: string | null
          place_from?: string | null
          place_to?: string | null
          sort_order?: number
          time_from?: string | null
          time_to?: string | null
          timezone?: string
          transport?: string | null
          travel_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_order_legs_travel_order_id_fkey"
            columns: ["travel_order_id"]
            isOneToOne: false
            referencedRelation: "travel_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_order_meals: {
        Row: {
          amount: number
          country: string
          created_at: string
          currency: string
          date: string
          hours: number
          id: string
          pocket_money_amount: number
          pocket_money_pct: number
          rate: number
          travel_order_id: string
        }
        Insert: {
          amount?: number
          country?: string
          created_at?: string
          currency?: string
          date: string
          hours?: number
          id?: string
          pocket_money_amount?: number
          pocket_money_pct?: number
          rate?: number
          travel_order_id: string
        }
        Update: {
          amount?: number
          country?: string
          created_at?: string
          currency?: string
          date?: string
          hours?: number
          id?: string
          pocket_money_amount?: number
          pocket_money_pct?: number
          rate?: number
          travel_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_order_meals_travel_order_id_fkey"
            columns: ["travel_order_id"]
            isOneToOne: false
            referencedRelation: "travel_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_orders: {
        Row: {
          advance_payment: number | null
          approved_at: string | null
          approved_by: string | null
          co_travelers: string | null
          created_at: string
          currency_rate_date: string | null
          currency_rate_eur_czk: number | null
          date_from: string
          date_to: string
          driver_id: string | null
          id: string
          notes: string | null
          number: string
          place_from: string | null
          place_to: string | null
          purpose: string | null
          report_approved_at: string | null
          report_approved_by: string | null
          report_submitted_at: string | null
          report_submitted_by: string | null
          request_approved_at: string | null
          request_approved_by: string | null
          requested_at: string | null
          requested_by: string | null
          status: string
          time_from: string | null
          time_to: string | null
          total_amount: number | null
          transport_mode: Json
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          advance_payment?: number | null
          approved_at?: string | null
          approved_by?: string | null
          co_travelers?: string | null
          created_at?: string
          currency_rate_date?: string | null
          currency_rate_eur_czk?: number | null
          date_from: string
          date_to: string
          driver_id?: string | null
          id?: string
          notes?: string | null
          number: string
          place_from?: string | null
          place_to?: string | null
          purpose?: string | null
          report_approved_at?: string | null
          report_approved_by?: string | null
          report_submitted_at?: string | null
          report_submitted_by?: string | null
          request_approved_at?: string | null
          request_approved_by?: string | null
          requested_at?: string | null
          requested_by?: string | null
          status?: string
          time_from?: string | null
          time_to?: string | null
          total_amount?: number | null
          transport_mode?: Json
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          advance_payment?: number | null
          approved_at?: string | null
          approved_by?: string | null
          co_travelers?: string | null
          created_at?: string
          currency_rate_date?: string | null
          currency_rate_eur_czk?: number | null
          date_from?: string
          date_to?: string
          driver_id?: string | null
          id?: string
          notes?: string | null
          number?: string
          place_from?: string | null
          place_to?: string | null
          purpose?: string | null
          report_approved_at?: string | null
          report_approved_by?: string | null
          report_submitted_at?: string | null
          report_submitted_by?: string | null
          request_approved_at?: string | null
          request_approved_by?: string | null
          requested_at?: string | null
          requested_by?: string | null
          status?: string
          time_from?: string | null
          time_to?: string | null
          total_amount?: number | null
          transport_mode?: Json
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "travel_orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_orders_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_logs: {
        Row: {
          break_minutes: number | null
          created_at: string
          date: string
          description: string | null
          driver_id: string | null
          fuel_price: number | null
          fuel_quantity: number | null
          id: string
          km_end: number | null
          km_start: number | null
          km_total: number | null
          other_price: number | null
          other_quantity: number | null
          purpose: string | null
          route_from: string | null
          route_to: string | null
          time: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          break_minutes?: number | null
          created_at?: string
          date?: string
          description?: string | null
          driver_id?: string | null
          fuel_price?: number | null
          fuel_quantity?: number | null
          id?: string
          km_end?: number | null
          km_start?: number | null
          km_total?: number | null
          other_price?: number | null
          other_quantity?: number | null
          purpose?: string | null
          route_from?: string | null
          route_to?: string | null
          time?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          break_minutes?: number | null
          created_at?: string
          date?: string
          description?: string | null
          driver_id?: string | null
          fuel_price?: number | null
          fuel_quantity?: number | null
          id?: string
          km_end?: number | null
          km_start?: number | null
          km_total?: number | null
          other_price?: number | null
          other_quantity?: number | null
          purpose?: string | null
          route_from?: string | null
          route_to?: string | null
          time?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_logs_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_templates: {
        Row: {
          created_at: string
          description: string | null
          driver_id: string | null
          id: string
          km_total: number | null
          label: string
          purpose: string | null
          route_from: string | null
          route_to: string | null
          updated_at: string
          use_count: number
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          driver_id?: string | null
          id?: string
          km_total?: number | null
          label: string
          purpose?: string | null
          route_from?: string | null
          route_to?: string | null
          updated_at?: string
          use_count?: number
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          driver_id?: string | null
          id?: string
          km_total?: number | null
          label?: string
          purpose?: string | null
          route_from?: string | null
          route_to?: string | null
          updated_at?: string
          use_count?: number
          vehicle_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_checklists: {
        Row: {
          created_at: string
          driver_name: string | null
          id: string
          items: Json
          km: number | null
          notes: string | null
          photos: string[] | null
          type: string
          user_id: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          driver_name?: string | null
          id?: string
          items?: Json
          km?: number | null
          notes?: string | null
          photos?: string[] | null
          type?: string
          user_id?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string
          driver_name?: string | null
          id?: string
          items?: Json
          km?: number | null
          notes?: string | null
          photos?: string[] | null
          type?: string
          user_id?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_checklists_vehicle_id_fkey"
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
      vehicle_mileage: {
        Row: {
          created_at: string
          id: string
          km: number
          note: string | null
          recorded_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          km: number
          note?: string | null
          recorded_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          km?: number
          note?: string | null
          recorded_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_mileage_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_vignettes: {
        Row: {
          country: string
          created_at: string
          id: string
          valid_until: string
          vehicle_id: string
        }
        Insert: {
          country: string
          created_at?: string
          id?: string
          valid_until: string
          vehicle_id: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          valid_until?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_vignettes_vehicle_id_fkey"
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
          kategorie: string | null
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
          spravce_id: string | null
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
          vychozi_stav_tachometru: string | null
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
          kategorie?: string | null
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
          spravce_id?: string | null
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
          vychozi_stav_tachometru?: string | null
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
          kategorie?: string | null
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
          spravce_id?: string | null
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
          vychozi_stav_tachometru?: string | null
          zelena_karta?: string | null
          znacka?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_spravce_id_fkey"
            columns: ["spravce_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vehicle_key_status: {
        Row: {
          action: string | null
          created_at: string | null
          from_user_id: string | null
          note: string | null
          to_name: string | null
          to_user_id: string | null
          vehicle_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "key_handovers_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "dispatcer" | "ridic"
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
      app_role: ["admin", "dispatcer", "ridic"],
    },
  },
} as const
