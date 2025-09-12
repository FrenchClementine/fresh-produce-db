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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      certifications: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      customer_certifications: {
        Row: {
          certification_id: string
          created_at: string
          customer_id: string
          id: string
        }
        Insert: {
          certification_id: string
          created_at?: string
          customer_id: string
          id?: string
        }
        Update: {
          certification_id?: string
          created_at?: string
          customer_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_certifications_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "certifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_certifications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_delivery_preferences: {
        Row: {
          country_code: string | null
          created_at: string
          customer_id: string
          hub_id: string | null
          id: string
          notes: string | null
          preference_type: Database["public"]["Enums"]["customer_hub_preference_type"]
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          customer_id: string
          hub_id?: string | null
          id?: string
          notes?: string | null
          preference_type: Database["public"]["Enums"]["customer_hub_preference_type"]
        }
        Update: {
          country_code?: string | null
          created_at?: string
          customer_id?: string
          hub_id?: string | null
          id?: string
          notes?: string | null
          preference_type?: Database["public"]["Enums"]["customer_hub_preference_type"]
        }
        Relationships: [
          {
            foreignKeyName: "customer_delivery_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_delivery_preferences_hub_id_fkey"
            columns: ["hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_product_interest_sizes: {
        Row: {
          created_at: string
          customer_product_interest_id: string
          id: string
          size_option_id: string
        }
        Insert: {
          created_at?: string
          customer_product_interest_id: string
          id?: string
          size_option_id: string
        }
        Update: {
          created_at?: string
          customer_product_interest_id?: string
          id?: string
          size_option_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_product_interest_siz_customer_product_interest_id_fkey"
            columns: ["customer_product_interest_id"]
            isOneToOne: false
            referencedRelation: "customer_product_interests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_product_interest_siz_customer_product_interest_id_fkey"
            columns: ["customer_product_interest_id"]
            isOneToOne: false
            referencedRelation: "v_customer_interests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_product_interest_sizes_size_option_id_fkey"
            columns: ["size_option_id"]
            isOneToOne: false
            referencedRelation: "size_options"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_product_interests: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          notes: string | null
          product_packaging_spec_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          notes?: string | null
          product_packaging_spec_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          notes?: string | null
          product_packaging_spec_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_product_interests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_product_interests_product_packaging_spec_id_fkey"
            columns: ["product_packaging_spec_id"]
            isOneToOne: false
            referencedRelation: "product_packaging_specs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_product_interests_product_packaging_spec_id_fkey"
            columns: ["product_packaging_spec_id"]
            isOneToOne: false
            referencedRelation: "v_product_specs_complete"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          billing_address: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          phone_number: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          billing_address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          phone_number?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          billing_address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          phone_number?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      hubs: {
        Row: {
          city_name: string | null
          country_code: string
          created_at: string
          hub_code: string | null
          id: string
          is_active: boolean | null
          name: string
          region: string | null
        }
        Insert: {
          city_name?: string | null
          country_code: string
          created_at?: string
          hub_code?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          region?: string | null
        }
        Update: {
          city_name?: string | null
          country_code?: string
          created_at?: string
          hub_code?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          region?: string | null
        }
        Relationships: []
      }
      packaging_options: {
        Row: {
          created_at: string
          description: string | null
          id: string
          label: string
          unit_type: Database["public"]["Enums"]["unit_type_enum"] | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          label: string
          unit_type?: Database["public"]["Enums"]["unit_type_enum"] | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          unit_type?: Database["public"]["Enums"]["unit_type_enum"] | null
        }
        Relationships: []
      }
      pallets: {
        Row: {
          brutto_weight: number | null
          created_at: string
          dimensions_cm: string | null
          id: string
          label: string
          pallets_per_truck: number | null
        }
        Insert: {
          brutto_weight?: number | null
          created_at?: string
          dimensions_cm?: string | null
          id?: string
          label: string
          pallets_per_truck?: number | null
        }
        Update: {
          brutto_weight?: number | null
          created_at?: string
          dimensions_cm?: string | null
          id?: string
          label?: string
          pallets_per_truck?: number | null
        }
        Relationships: []
      }
      product_packaging_spec_selected_sizes: {
        Row: {
          created_at: string
          id: string
          product_packaging_spec_id: string
          size_option_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_packaging_spec_id: string
          size_option_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_packaging_spec_id?: string
          size_option_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_packaging_spec_selected__product_packaging_spec_id_fkey"
            columns: ["product_packaging_spec_id"]
            isOneToOne: false
            referencedRelation: "product_packaging_specs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_packaging_spec_selected__product_packaging_spec_id_fkey"
            columns: ["product_packaging_spec_id"]
            isOneToOne: false
            referencedRelation: "v_product_specs_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_packaging_spec_selected_sizes_size_option_id_fkey"
            columns: ["size_option_id"]
            isOneToOne: false
            referencedRelation: "size_options"
            referencedColumns: ["id"]
          },
        ]
      }
      product_packaging_specs: {
        Row: {
          boxes_per_pallet: number | null
          created_at: string
          id: string
          packaging_id: string
          pallet_id: string | null
          pieces_per_box: number | null
          product_id: string
          weight_per_box: number | null
          weight_per_pallet: number | null
          weight_unit: Database["public"]["Enums"]["weight_unit"] | null
        }
        Insert: {
          boxes_per_pallet?: number | null
          created_at?: string
          id?: string
          packaging_id: string
          pallet_id?: string | null
          pieces_per_box?: number | null
          product_id: string
          weight_per_box?: number | null
          weight_per_pallet?: number | null
          weight_unit?: Database["public"]["Enums"]["weight_unit"] | null
        }
        Update: {
          boxes_per_pallet?: number | null
          created_at?: string
          id?: string
          packaging_id?: string
          pallet_id?: string | null
          pieces_per_box?: number | null
          product_id?: string
          weight_per_box?: number | null
          weight_per_pallet?: number | null
          weight_unit?: Database["public"]["Enums"]["weight_unit"] | null
        }
        Relationships: [
          {
            foreignKeyName: "product_packaging_specs_packaging_id_fkey"
            columns: ["packaging_id"]
            isOneToOne: false
            referencedRelation: "packaging_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_packaging_specs_pallet_id_fkey"
            columns: ["pallet_id"]
            isOneToOne: false
            referencedRelation: "pallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_packaging_specs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_valid_sizes: {
        Row: {
          created_at: string
          product_id: string
          size_option_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          size_option_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          size_option_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_valid_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_valid_sizes_size_option_id_fkey"
            columns: ["size_option_id"]
            isOneToOne: false
            referencedRelation: "size_options"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: Database["public"]["Enums"]["product_category"] | null
          created_at: string
          id: string
          intended_use:
            | Database["public"]["Enums"]["product_intended_use_enum"]
            | null
          is_active: boolean | null
          name: string
          sold_by: Database["public"]["Enums"]["sold_by_enum"] | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["product_category"] | null
          created_at?: string
          id?: string
          intended_use?:
            | Database["public"]["Enums"]["product_intended_use_enum"]
            | null
          is_active?: boolean | null
          name: string
          sold_by?: Database["public"]["Enums"]["sold_by_enum"] | null
        }
        Update: {
          category?: Database["public"]["Enums"]["product_category"] | null
          created_at?: string
          id?: string
          intended_use?:
            | Database["public"]["Enums"]["product_intended_use_enum"]
            | null
          is_active?: boolean | null
          name?: string
          sold_by?: Database["public"]["Enums"]["sold_by_enum"] | null
        }
        Relationships: []
      }
      size_options: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      supplier_certifications: {
        Row: {
          certification_id: string
          created_at: string
          expires_at: string | null
          id: string
          issued_at: string | null
          supplier_id: string
        }
        Insert: {
          certification_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          supplier_id: string
        }
        Update: {
          certification_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_certifications_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "certifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_certifications_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_logistics_capabilities: {
        Row: {
          created_at: string
          destination_hub_id: string | null
          fixed_operational_days:
            | Database["public"]["Enums"]["day_of_week_enum"][]
            | null
          id: string
          mode: string
          notes: string | null
          origin_hub_id: string | null
          supplier_id: string
          typical_lead_time_days: number | null
        }
        Insert: {
          created_at?: string
          destination_hub_id?: string | null
          fixed_operational_days?:
            | Database["public"]["Enums"]["day_of_week_enum"][]
            | null
          id?: string
          mode: string
          notes?: string | null
          origin_hub_id?: string | null
          supplier_id: string
          typical_lead_time_days?: number | null
        }
        Update: {
          created_at?: string
          destination_hub_id?: string | null
          fixed_operational_days?:
            | Database["public"]["Enums"]["day_of_week_enum"][]
            | null
          id?: string
          mode?: string
          notes?: string | null
          origin_hub_id?: string | null
          supplier_id?: string
          typical_lead_time_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_logistics_capabilities_destination_hub_id_fkey"
            columns: ["destination_hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_logistics_capabilities_origin_hub_id_fkey"
            columns: ["origin_hub_id"]
            isOneToOne: false
            referencedRelation: "hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_logistics_capabilities_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_offering_actual_sizes: {
        Row: {
          created_at: string
          id: string
          size_option_id: string
          supplier_product_packaging_spec_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          size_option_id: string
          supplier_product_packaging_spec_id: string
        }
        Update: {
          created_at?: string
          id?: string
          size_option_id?: string
          supplier_product_packaging_spec_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_offering_actual_size_supplier_product_packaging_s_fkey"
            columns: ["supplier_product_packaging_spec_id"]
            isOneToOne: false
            referencedRelation: "supplier_product_packaging_spec"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_offering_actual_size_supplier_product_packaging_s_fkey"
            columns: ["supplier_product_packaging_spec_id"]
            isOneToOne: false
            referencedRelation: "v_supplier_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_offering_actual_sizes_size_option_id_fkey"
            columns: ["size_option_id"]
            isOneToOne: false
            referencedRelation: "size_options"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_product_packaging_spec: {
        Row: {
          available_from: string | null
          available_till: string | null
          created_at: string
          id: string
          notes: string | null
          product_packaging_spec_id: string
          supplier_id: string
        }
        Insert: {
          available_from?: string | null
          available_till?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_packaging_spec_id: string
          supplier_id: string
        }
        Update: {
          available_from?: string | null
          available_till?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_packaging_spec_id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_product_packaging_spec_product_packaging_spec_id_fkey"
            columns: ["product_packaging_spec_id"]
            isOneToOne: false
            referencedRelation: "product_packaging_specs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_product_packaging_spec_product_packaging_spec_id_fkey"
            columns: ["product_packaging_spec_id"]
            isOneToOne: false
            referencedRelation: "v_product_specs_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_product_packaging_spec_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          delivery_modes: string[] | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          phone_number: string | null
          warehouse_address: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          delivery_modes?: string[] | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          phone_number?: string | null
          warehouse_address?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          delivery_modes?: string[] | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          phone_number?: string | null
          warehouse_address?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_customer_interests: {
        Row: {
          customer_city: string | null
          customer_country: string | null
          customer_email: string | null
          customer_name: string | null
          id: string | null
          notes: string | null
          packaging_label: string | null
          packaging_unit_type:
            | Database["public"]["Enums"]["unit_type_enum"]
            | null
          product_category:
            | Database["public"]["Enums"]["product_category"]
            | null
          product_name: string | null
          product_sold_by: Database["public"]["Enums"]["sold_by_enum"] | null
        }
        Relationships: []
      }
      v_product_specs_complete: {
        Row: {
          boxes_per_pallet: number | null
          created_at: string | null
          id: string | null
          packaging_description: string | null
          packaging_label: string | null
          packaging_unit_type:
            | Database["public"]["Enums"]["unit_type_enum"]
            | null
          pallet_brutto_weight: number | null
          pallet_dimensions: string | null
          pallet_label: string | null
          pieces_per_box: number | null
          product_category:
            | Database["public"]["Enums"]["product_category"]
            | null
          product_intended_use:
            | Database["public"]["Enums"]["product_intended_use_enum"]
            | null
          product_name: string | null
          product_sold_by: Database["public"]["Enums"]["sold_by_enum"] | null
          weight_per_box: number | null
          weight_per_pallet: number | null
          weight_unit: Database["public"]["Enums"]["weight_unit"] | null
        }
        Relationships: []
      }
      v_supplier_offerings: {
        Row: {
          available_from: string | null
          available_till: string | null
          boxes_per_pallet: number | null
          id: string | null
          notes: string | null
          packaging_label: string | null
          packaging_unit_type:
            | Database["public"]["Enums"]["unit_type_enum"]
            | null
          product_category:
            | Database["public"]["Enums"]["product_category"]
            | null
          product_name: string | null
          product_sold_by: Database["public"]["Enums"]["sold_by_enum"] | null
          supplier_city: string | null
          supplier_country: string | null
          supplier_email: string | null
          supplier_name: string | null
          supplier_phone: string | null
          weight_per_box: number | null
          weight_per_pallet: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
    }
    Enums: {
      customer_hub_preference_type: "loading" | "delivery"
      day_of_week_enum:
        | "monday"
        | "tuesday"
        | "wednesday"
        | "thursday"
        | "friday"
        | "saturday"
        | "sunday"
      product_category: "Fruits" | "Vegetables" | "Root vegetables" | "Salads"
      product_intended_use_enum: "Fresh Market" | "Processing"
      sold_by_enum: "Kg" | "Tonnes" | "Box" | "Unit"
      unit_type_enum: "Bag" | "Box" | "Crate" | "Punnet" | "Each"
      weight_unit: "KG" | "Tonnes" | "Gr"
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
      customer_hub_preference_type: ["loading", "delivery"],
      day_of_week_enum: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      product_category: ["Fruits", "Vegetables", "Root vegetables", "Salads"],
      product_intended_use_enum: ["Fresh Market", "Processing"],
      sold_by_enum: ["Kg", "Tonnes", "Box", "Unit"],
      unit_type_enum: ["Bag", "Box", "Crate", "Punnet", "Each"],
      weight_unit: ["KG", "Tonnes", "Gr"],
    },
  },
} as const
