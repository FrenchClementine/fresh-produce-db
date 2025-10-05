export interface Opportunity {
  id: string
  customer_id: string
  supplier_id: string
  product_packaging_spec_id: string

  // Selected options
  selected_supplier_id?: string
  selected_transporter_id?: string
  selected_route_id?: string
  selected_transport_band_id?: string

  // Pricing information
  supplier_price_id?: string
  supplier_price_per_unit?: number
  transport_cost_per_pallet?: number
  transport_cost_per_unit?: number
  estimated_total_cost?: number

  // Quote/Offer information
  offer_price_per_unit?: number
  offer_currency: string
  quote_sent_date?: string
  quote_feedback?: string

  // Customer feedback
  customer_feedback?: string
  feedback_date?: string
  feedback_status: 'none' | 'pending' | 'received' | 'addressed'

  // Lifecycle
  valid_till?: string
  is_active: boolean

  // Status
  status: 'draft' | 'active' | 'negotiating' | 'offered' | 'feedback_received' | 'confirmed' | 'cancelled' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'urgent'

  // Notes
  internal_notes?: string
  customer_requirements?: string
  supplier_notes?: string

  // Price change tracking
  price_status?: 'current' | 'changed' | 'expired' | 'reviewed'
  price_change_detected_at?: string
  price_change_notes?: string

  // Metadata
  created_by?: string
  assigned_to?: string
  created_at: string
  updated_at: string

  // Conversion tracking
  converted_to_order: boolean
  order_reference?: string

  // Joined data
  customer?: {
    id: string
    name: string
    city: string
    country: string
    agent?: {
      id: string
      name: string
    }
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

  delivery_hub?: {
    id: string
    name: string
    city: string
    country: string
  }

  supplier_price?: {
    id: string
    valid_until: string
    price_per_unit: number
    currency: string
    delivery_mode: string
    hub_name: string
    hub_city?: string
    hub_country?: string
    hub_code?: string
    hub_id?: string
    hub?: {
      id: string
      name: string
      city?: string
      country?: string
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

export interface CreateOpportunityData {
  customer_id: string
  supplier_id: string
  product_packaging_spec_id: string
  selected_supplier_id?: string
  selected_transporter_id?: string
  selected_route_id?: string
  selected_transport_band_id?: string
  supplier_price_id?: string
  supplier_price_per_unit?: number
  transport_cost_per_pallet?: number
  transport_cost_per_unit?: number
  estimated_total_cost?: number
  offer_price_per_unit: number
  offer_currency?: string
  valid_till?: string
  status?: 'draft' | 'active' | 'negotiating' | 'offered' | 'feedback_received' | 'confirmed' | 'cancelled' | 'completed'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  internal_notes?: string
  customer_requirements?: string
  assigned_to?: string
}

export interface UpdateOpportunityData {
  offer_price_per_unit?: number
  offer_currency?: string
  quote_sent_date?: string
  quote_feedback?: string
  customer_feedback?: string
  feedback_status?: 'none' | 'pending' | 'received' | 'addressed'
  valid_till?: string
  is_active?: boolean
  status?: 'draft' | 'active' | 'negotiating' | 'offered' | 'feedback_received' | 'confirmed' | 'cancelled' | 'completed'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  internal_notes?: string
  customer_requirements?: string
  supplier_notes?: string
  assigned_to?: string
  converted_to_order?: boolean
  order_reference?: string
}

export interface OpportunitySummary {
  total: number
  active: number
  inactive: number
  draft: number
  negotiating: number
  offered: number
  confirmed: number
  byPriority: {
    low: number
    medium: number
    high: number
    urgent: number
  }
  byStatus: {
    draft: number
    active: number
    negotiating: number
    offered: number
    confirmed: number
    cancelled: number
    completed: number
  }
  byPriceStatus: {
    current: number
    changed: number
    expired: number
    reviewed: number
  }
  expiringSoon: number // expiring in next 7 days
  expired: number
  priceChanges: number // total with changed/expired price status
}

export type OpportunityStatus = 'all' | 'draft' | 'active' | 'negotiating' | 'offered' | 'feedback_received' | 'confirmed' | 'cancelled' | 'completed'
export type OpportunityPriority = 'all' | 'low' | 'medium' | 'high' | 'urgent'
