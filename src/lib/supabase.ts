import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Types for our database
export type Database = {
  public: {
    Tables: {
      agents: {
        Row: {
          id: string
          name: string
          role: string
          email: string
          phone: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          role: string
          email: string
          phone?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          role?: string
          email?: string
          phone?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      growers: {
        Row: {
          id: string
          name: string
          legal_name: string | null
          tax_id: string | null
          country: string
          region: string | null
          city: string | null
          address: string | null
          email: string | null
          phone: string | null
          website: string | null
          preferred_contact: string | null
          payment_terms: string | null
          notes: string | null
          active: boolean
          responsible_agent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          legal_name?: string | null
          tax_id?: string | null
          country: string
          region?: string | null
          city?: string | null
          address?: string | null
          email?: string | null
          phone?: string | null
          website?: string | null
          preferred_contact?: string | null
          payment_terms?: string | null
          notes?: string | null
          active?: boolean
          responsible_agent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          legal_name?: string | null
          tax_id?: string | null
          country?: string
          region?: string | null
          city?: string | null
          address?: string | null
          email?: string | null
          phone?: string | null
          website?: string | null
          preferred_contact?: string | null
          payment_terms?: string | null
          notes?: string | null
          active?: boolean
          responsible_agent_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          category: string
          subcategory: string | null
          scientific_name: string | null
          storage_type: string | null
          shelf_life_days: number | null
          notes: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category: string
          subcategory?: string | null
          scientific_name?: string | null
          storage_type?: string | null
          shelf_life_days?: number | null
          notes?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          subcategory?: string | null
          scientific_name?: string | null
          storage_type?: string | null
          shelf_life_days?: number | null
          notes?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      v_product_specs_complete: {
        Row: {
          id: string
          organic: boolean
          quality_class: string | null
          weight_per_box_kg: number | null
          units_per_box: number | null
          pieces_per_box: number | null
          boxes_per_pallet: number | null
          pallet_type: string | null
          weight_per_pallet_kg: number | null
          units_per_pallet: number | null
          pieces_per_pallet: number | null
          min_order_kg: number | null
          notes: string | null
          active: boolean
          created_at: string
          updated_at: string
          product_name: string | null
          product_category: string | null
          product_subcategory: string | null
          variety_name: string | null
          size_code: string | null
          caliber: string | null
          size_class: string | null
          packaging_name: string | null
          packaging_material: string | null
          packaging_returnable: boolean | null
          site_name: string | null
          site_type: string | null
          country: string | null
          region: string | null
          city: string | null
          site_organic_certified: boolean | null
          grower_name: string | null
          grower_legal_name: string | null
          grower_email: string | null
          grower_phone: string | null
          agent_name: string | null
          agent_email: string | null
        }
      }
    }
  }
}