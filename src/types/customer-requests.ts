export type RequestStatus = 'open' | 'matched' | 'quoted' | 'closed'
export type RequestFrequency = 'one-time' | 'weekly' | 'monthly' | 'seasonal'
export type CustomerResponse = 'interested' | 'not_interested' | 'pending'
export type QualityClass = 'Class I' | 'Class II' | 'Extra'
export type ActionType =
  | 'created'
  | 'updated'
  | 'supplier_checked'
  | 'match_found'
  | 'quote_sent'
  | 'customer_feedback'
  | 'status_changed'
  | 'closed'

export interface CustomerProductRequest {
  id: string
  created_at: string
  updated_at: string

  // Customer information
  customer_id: string
  staff_id: string

  // Product details
  product_id: string
  variety?: string

  // Packaging requirements
  packaging_type_id?: string
  units_per_package?: number
  packages_per_pallet?: number

  // Quality & Certification
  quality_class?: QualityClass
  certifications?: string[]

  // Pricing & Logistics
  target_price_per_unit?: number
  target_currency: string
  delivery_mode: 'DELIVERY' | 'Ex Works' | 'TRANSIT'
  delivery_hub_id?: string

  // Timeline
  needed_by_date?: string
  availability_window_start?: string
  availability_window_end?: string

  // Request details
  quantity_needed?: number
  quantity_unit: 'units' | 'pallets' | 'packages'
  frequency?: RequestFrequency
  notes?: string

  // Status tracking
  status: RequestStatus

  // Match tracking
  suppliers_checked: number
  potential_matches: number
  quotes_sent: number

  // Relations (populated by joins)
  customers?: {
    id: string
    name: string
  }
  products?: {
    id: string
    name: string
  }
  staff?: {
    id: string
    name: string
  }
  hubs?: {
    id: string
    code: string
    name: string
  }
  packaging_options?: {
    id: string
    label: string
  }
}

export interface RequestSupplierMatch {
  id: string
  created_at: string

  request_id: string
  supplier_id: string
  supplier_price_id?: string

  // Match quality
  match_score?: number
  match_notes?: string

  // Match details
  price_match: boolean
  quality_match: boolean
  certification_match: boolean
  logistics_match: boolean

  // Actions taken
  quote_sent: boolean
  quote_sent_at?: string
  customer_response?: CustomerResponse

  // Relations
  suppliers?: {
    id: string
    name: string
    city?: string
    country?: string
  }
  supplier_prices?: {
    id: string
    price_per_unit: number
    sold_by: string
    delivery_mode: string
    products: {
      name: string
    }
  }
}

export interface RequestActivityLog {
  id: string
  created_at: string

  request_id: string
  staff_id: string

  action_type: ActionType
  details?: any
  notes?: string

  // Relations
  staff?: {
    id: string
    name: string
  }
}

export interface CustomerRequestWithMatches extends CustomerProductRequest {
  matches?: RequestSupplierMatch[]
  activity_log?: RequestActivityLog[]
}

// Form data types for creating/editing requests
export interface CreateCustomerRequestData {
  customer_id: string
  product_id: string
  variety?: string
  packaging_type_id?: string
  units_per_package?: number
  packages_per_pallet?: number
  certifications?: string[]
  target_price_per_unit?: number
  target_currency?: string
  delivery_mode: 'DELIVERY' | 'Ex Works' | 'TRANSIT'
  delivery_hub_id?: string
  needed_by_date?: string
  availability_window_start?: string
  availability_window_end?: string
  quantity_needed?: number
  quantity_unit?: 'units' | 'pallets' | 'packages'
  frequency?: RequestFrequency
  notes?: string
}

export interface UpdateCustomerRequestData extends Partial<CreateCustomerRequestData> {
  status?: RequestStatus
}

// Search/filter parameters
export interface CustomerRequestFilters {
  customer_id?: string
  product_id?: string
  status?: RequestStatus
  staff_id?: string
  needed_by_from?: string
  needed_by_to?: string
  delivery_mode?: 'DELIVERY' | 'EX_WORKS'
}
