export interface TradePotential {
  id: string
  customer: {
    id: string
    name: string
    city: string
    country: string
    agent: {
      id: string
      name: string
      role: string
    }
  }
  supplier: {
    id: string
    name: string
    city: string
    country: string
    defaultHubId?: string
    defaultHubName?: string
  }
  product: {
    id: string
    name: string
    category: string
    packagingLabel: string
    sizeName: string
    soldBy: string
    specId: string
  }
  status: 'complete' | 'missing_price' | 'missing_transport' | 'missing_both'

  // Existing data flags
  hasSupplierPrice: boolean
  hasTransportRoute: boolean

  // Existing data details
  supplierPrice?: {
    id: string
    pricePerUnit: number
    currency: string
    deliveryMode: string
    hubId: string
    hubName: string
    validUntil: string
  }

  transportRoute?: {
    id: string
    originHubId: string
    destinationHubId: string
    transporterName: string
    durationDays: number
    pricePerPallet: number
  }

  // Gap analysis
  priceGap: boolean
  transportGap: boolean

  // Actions available
  canAddPrice: boolean
  canAddTransport: boolean

  // Completion score (0-100)
  completionScore: number

  // Logistics solution type
  logisticsSolution?: 'SAME_LOCATION' | 'SUPPLIER_DELIVERY' | 'THIRD_PARTY_TRANSPORT' | 'UNKNOWN'
}

export interface TradePotentialSummary {
  total: number
  complete: number
  missingPrice: number
  missingTransport: number
  missingBoth: number
  completionRate: number
}

export interface NewSupplierPrice {
  supplier_id: string
  product_packaging_spec_id: string
  hub_id: string
  price_per_unit: number
  currency: string
  delivery_mode: 'Ex Works' | 'DELIVERY' | 'TRANSIT'
  valid_until: string
  min_order_quantity?: number
  is_active: boolean
}

export interface NewTransportRoute {
  origin_hub_id: string
  destination_hub_id: string
  transporter_id: string
  transport_duration_days: number
  is_active: boolean
  price_per_pallet?: number
  pallet_dimensions?: string
  min_pallets?: number
  max_pallets?: number
}

export type PotentialStatus = 'all' | 'complete' | 'missing_price' | 'missing_transport' | 'missing_both'