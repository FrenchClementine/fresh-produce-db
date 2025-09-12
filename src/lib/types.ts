// Core types for the Fresh Produce Finder application

export interface Supplier {
  id: string
  name: string
  legal_name?: string
  country: string
  region?: string
  city?: string
  email?: string
  phone?: string
  website?: string
  notes?: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface ProductSpec {
  id: string
  product_name: string
  product_category: string
  variety_name?: string
  size_code?: string
  country: string
  region?: string
  grower_name: string
  organic: boolean
  quality_class?: string
  weight_per_box_kg?: number
  boxes_per_pallet?: number
  weight_per_pallet_kg?: number
  packaging_name?: string
  packaging_material?: string
  min_order_kg?: number
  notes?: string
  active: boolean
}

export interface SeasonalAvailability {
  product_spec_id: string
  product_name: string
  variety_name?: string
  country: string
  grower_name: string
  season_name: string
  year: number
  start_date: string
  end_date: string
  peak_start_date?: string
  peak_end_date?: string
  estimated_volume_kg?: number
  availability_status: 'planned' | 'active' | 'finished'
}

export interface SearchFilters {
  country?: string[]
  product?: string[]
  organic?: boolean
  season?: string
  year?: number
}

export interface CalendarEntry {
  product_name: string
  variety_name?: string
  country: string
  grower_name: string
  months: boolean[] // 12 months, true if available
  peak_months?: boolean[] // 12 months, true if peak season
  volume?: number
}