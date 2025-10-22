// Market Opportunities Types (Hub-based, copied from Opportunities pattern)

export interface MarketOpportunity {
  id: string
  hub_id: string // Changed from customer_id
  supplier_id: string
  product_packaging_spec_id: string
  supplier_product_packaging_spec_id: string

  // Selected options
  selected_supplier_id?: string
  selected_transporter_id?: string
  selected_route_id?: string
  selected_transport_band_id?: string

  // Price source
  price_source_hub_id?: string

  // Pricing information
  supplier_price_id?: string
  supplier_price_per_unit?: number
  transport_cost_per_unit?: number
  transport_cost_per_pallet?: number
  diesel_surcharge_per_pallet?: number

  // Market pricing
  margin_percentage: number
  custom_markup?: number
  delivered_price_per_unit?: number

  // Lifecycle
  valid_till?: string
  is_active: boolean

  // Status
  status: 'draft' | 'active' | 'suspended' | 'cancelled' | 'expired'
  priority: 'low' | 'medium' | 'high' | 'urgent'

  // Notes
  internal_notes?: string
  supplier_notes?: string

  // Metadata
  created_by?: string
  assigned_to?: string
  created_at: string
  updated_at: string

  // Joined data
  hub?: {
    id: string
    name: string
    hub_code: string
    city_name: string
    country_code: string
  }

  supplier?: {
    id: string
    name: string
    city: string
    country: string
  }

  selected_supplier?: {
    id: string
    name: string
    city: string
    country: string
  }

  product_packaging_specs?: {
    id: string
    boxes_per_pallet: number
    weight_per_pallet?: number
    weight_unit: string
    products: {
      id: string
      name: string
      category: string
      sold_by: string
    }
    packaging_options: {
      label: string
    }
    size_options: {
      name: string
    }
  }

  selected_transporter?: {
    id: string
    name: string
  }

  selected_transport_band?: {
    id: string
    min_pallets: number
    max_pallets: number
    price_per_pallet: number
  }

  supplier_price?: {
    id: string
    valid_until: string
    price_per_unit: number
    currency: string
    delivery_mode: string
    hub_name: string
    hub_id?: string
    hub?: {
      id: string
      name: string
      hub_code?: string
    }
  }

  assigned_agent?: {
    id: string
    name: string
    email?: string
  }

  created_by_staff?: {
    id: string
    name: string
  }
}

export interface CreateMarketOpportunityData {
  hub_id: string // Changed from customer_id
  supplier_id: string
  product_packaging_spec_id: string
  supplier_product_packaging_spec_id: string
  selected_supplier_id?: string
  selected_transporter_id?: string
  selected_route_id?: string
  selected_transport_band_id?: string
  price_source_hub_id?: string
  supplier_price_id?: string
  supplier_price_per_unit?: number
  transport_cost_per_unit?: number
  transport_cost_per_pallet?: number
  diesel_surcharge_per_pallet?: number
  margin_percentage: number
  custom_markup?: number
  delivered_price_per_unit?: number
  valid_till?: string
  status?: 'draft' | 'active' | 'suspended' | 'cancelled' | 'expired'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  internal_notes?: string
  supplier_notes?: string
  assigned_to?: string
}

export interface UpdateMarketOpportunityData {
  selected_route_id?: string
  selected_transport_band_id?: string
  supplier_price_id?: string
  supplier_price_per_unit?: number
  transport_cost_per_unit?: number
  transport_cost_per_pallet?: number
  diesel_surcharge_per_pallet?: number
  margin_percentage?: number
  custom_markup?: number
  delivered_price_per_unit?: number
  valid_till?: string
  is_active?: boolean
  status?: 'draft' | 'active' | 'suspended' | 'cancelled' | 'expired'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  internal_notes?: string
  supplier_notes?: string
  assigned_to?: string
}

export interface MarketOpportunitySummary {
  total: number
  active: number
  inactive: number
  draft: number
  suspended: number
  expired: number
  byPriority: {
    low: number
    medium: number
    high: number
    urgent: number
  }
  byStatus: {
    draft: number
    active: number
    suspended: number
    cancelled: number
    expired: number
  }
  expiringSoon: number // expiring in next 7 days
  expired: number
}

export type MarketOpportunityStatus = 'all' | 'draft' | 'active' | 'suspended' | 'cancelled' | 'expired'
export type MarketOpportunityPriority = 'all' | 'low' | 'medium' | 'high' | 'urgent'
