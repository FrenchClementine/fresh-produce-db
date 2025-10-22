// Market Potential Types (Hub-based, copied from Trade Potential pattern)

// Multi-leg transport types (shared)
export interface TransportLeg {
  leg: number
  routeId: string
  originHubId: string
  originHubName: string
  destinationHubId: string
  destinationHubName: string
  transporterId: string
  transporterName: string
  costPerPallet: number
  costPerUnit: number
  durationDays: number
}

export interface MultiLegTransportRoute {
  id: string
  legs: TransportLeg[]
  totalLegs: number
  totalCostPerPallet: number
  totalCostPerUnit: number
  totalDurationDays: number
  intermediateHubs: Array<{
    id: string
    name: string
  }>
  unitsPerPallet: number
  availableBands?: Array<{
    id: string
    pallet_dimensions?: string
    min_pallets?: number
    max_pallets?: number
    price_per_pallet: number
  }>
}

export interface MarketPotential {
  id: string
  hub: {                    // Changed from customer
    id: string
    name: string
    hubCode: string
    city: string
    country: string
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
    supplierProductPackagingSpecId: string
    palletDimensions: string | null
    boxesPerPallet: number
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
    transporterId: string | null
    originHubId: string
    destinationHubId: string
    originHubName: string
    destinationHubName: string
    transporterName: string
    durationDays: number
    pricePerPallet: number
    dieselSurchargePerPallet: number
    pricePerUnit: number
    unitsPerPallet: number
    customsCostPerShipment: number
    availableBands: Array<{
      id: string
      pallet_dimensions?: string
      min_pallets?: number
      max_pallets?: number
      price_per_pallet: number
    }>
    // Multi-leg route fields
    legs?: TransportLeg[]
    totalLegs?: number
    totalCostPerPallet?: number
    totalCostPerUnit?: number
    totalDurationDays?: number
    intermediateHubs?: Array<{
      id: string
      name: string
    }>
  }

  // All available transport routes
  availableTransportRoutes?: Array<{
    id: string
    transporterId: string | null
    originHubId: string
    destinationHubId: string
    originHubName: string
    destinationHubName: string
    transporterName: string
    durationDays: number
    pricePerPallet: number
    dieselSurchargePerPallet: number
    pricePerUnit: number
    unitsPerPallet: number
    customsCostPerShipment: number
    availableBands: Array<{
      id: string
      pallet_dimensions?: string
      min_pallets?: number
      max_pallets?: number
      price_per_pallet: number
    }>
    legs?: TransportLeg[]
    totalLegs?: number
    totalCostPerPallet?: number
    totalCostPerUnit?: number
    totalDurationDays?: number
    intermediateHubs?: Array<{
      id: string
      name: string
    }>
  }>

  // Gap analysis
  priceGap: boolean
  transportGap: boolean

  // Actions available
  canAddPrice: boolean
  canAddTransport: boolean

  // Completion score (0-100)
  completionScore: number

  // Logistics solution type
  logisticsSolution?: 'SAME_LOCATION' | 'SUPPLIER_DELIVERY' | 'THIRD_PARTY_TRANSPORT' | 'MULTI_LEG_TRANSPORT' | 'UNKNOWN'

  // Market Opportunity information (changed from opportunity)
  marketOpportunity?: {
    id: string
    status: 'draft' | 'active' | 'suspended' | 'cancelled' | 'expired'
    priority: 'low' | 'medium' | 'high' | 'urgent'
    isActive: boolean
    deliveredPrice?: number
    marginPercentage?: number
    assignedTo?: string
    validTill?: string
    createdAt: string
    updatedAt: string
  }

  // Calculated fields
  hasMarketOpportunity: boolean      // Changed from hasOpportunity
  isActiveMarketOpportunity: boolean  // Changed from isActiveOpportunity
}

export interface MarketPotentialSummary {
  total: number
  complete: number
  missingPrice: number
  missingTransport: number
  missingBoth: number
  completionRate: number
}

export type MarketPotentialStatus = 'all' | 'complete' | 'missing_price' | 'missing_transport' | 'missing_both'
