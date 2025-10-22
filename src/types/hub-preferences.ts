// Hub Product Preferences Types

export type HubPreferencePriority = 'low' | 'medium' | 'high' | 'urgent' | 'all'

export interface HubProductPreference {
  id: string
  hub_id: string
  product_id: string
  product_packaging_spec_id?: string | null
  packaging_option_id?: string | null
  size_option_id?: string | null
  priority: string
  is_active: boolean
  estimated_volume_per_week?: number | null
  volume_unit?: string | null
  notes?: string | null
  requirements?: string | null
  added_by?: string | null
  added_at: string
  updated_at: string
}

export interface HubProductPreferenceDetailed {
  preference_id: string
  hub_id: string
  hub_name: string
  hub_code: string
  hub_city: string
  hub_country: string

  product_id: string
  product_name: string
  product_category: string
  sold_by: string

  product_packaging_spec_id?: string | null
  boxes_per_pallet?: number | null
  weight_per_pallet?: number | null
  weight_unit?: string | null

  packaging_option_id?: string | null
  packaging_label?: string | null

  size_option_id?: string | null
  size_name?: string | null

  priority: string
  is_active: boolean
  estimated_volume_per_week?: number | null
  volume_unit?: string | null
  notes?: string | null
  requirements?: string | null

  added_by?: string | null
  added_at: string
  updated_at: string

  available_supplier_count: number
}

export interface AddHubPreferenceData {
  hub_id: string
  product_id: string
  product_packaging_spec_id?: string | null
  packaging_option_id?: string | null
  size_option_id?: string | null
  priority?: string
  estimated_volume_per_week?: number | null
  volume_unit?: string | null
  notes?: string | null
  requirements?: string | null
  added_by?: string | null
}

export interface UpdateHubPreferenceData {
  priority?: string
  estimated_volume_per_week?: number | null
  volume_unit?: string | null
  notes?: string | null
  requirements?: string | null
  is_active?: boolean
}

export interface HubPreferencesSummary {
  totalPreferences: number
  byHub: Record<string, {
    total: number
    high: number
    urgent: number
  }>
}
