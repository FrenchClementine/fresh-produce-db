'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface TradeOpportunityFilters {
  staffId?: string
  customerId?: string
  productCategory?: string
  region?: string
  priority?: 'high' | 'medium' | 'low'
  status?: 'active' | 'potential' | 'quoted'
}

export interface TradeOpportunity {
  id: string
  customer: {
    id: string
    name: string
    city: string
    country: string
    agent: {
      id: string
      name: string
      role?: string
    }
  }
  product: {
    id: string
    name: string
    category: string
    soldBy: string
    intendedUse: string
    packagingLabel: string
    sizeName: string
    unitsPerPallet: number
    weightPerPallet: number
    weightUnit: string
  }
  supplier: {
    id: string
    name: string
    hubName: string
    hubCode: string
    deliveryMode: 'Ex Works' | 'DELIVERY' | 'TRANSIT'
    basePrice: number
    currency: string
    validUntil: string
  }
  logistics: {
    solutionType: 'SUPPLIER_DELIVERY' | 'CUSTOMER_PICKUP' | 'THIRD_PARTY_TRANSPORT' | 'SUPPLIER_TRANSIT'
    supplierHub: string
    customerHub: string
    transportCostPerPallet: number
    transportCostPerUnit: number
    transporterName?: string
    durationDays: number
    description: string
  }
  pricing: {
    basePricePerUnit: number
    transportCostPerUnit: number
    subtotalPerUnit: number
    marginPercentage: number
    marginPerUnit: number
    finalPricePerUnit: number
    currency: string
  }
  confidence: number
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  createdAt: string
}

interface CustomerRequirement {
  customer_id: string
  customer_name: string
  customer_city: string
  customer_country: string
  agent_id: string
  agent_name: string
  agent_role: string
  product_packaging_spec_id: string
  product_id: string
  product_name: string
  product_category: string
  sold_by: string
  intended_use: string
  packaging_label: string
  size_name: string
  units_per_pallet: number
  weight_per_pallet: number
  weight_unit: string
}

interface SupplierPrice {
  id: string
  supplier_id: string
  supplier_name: string
  hub_id: string
  hub_name: string
  hub_code: string
  product_packaging_spec_id: string
  price_per_unit: number
  currency: string
  delivery_mode: 'Ex Works' | 'DELIVERY' | 'TRANSIT'
  valid_until: string
  units_per_pallet: number
  has_pricing?: boolean // Flag to indicate if supplier has active pricing
}

interface CustomerLogisticsCapability {
  customer_id: string
  mode: 'Ex Works' | 'DELIVERY' | 'TRANSIT'
  origin_hub_id: string
  destination_hub_id: string | null
  typical_lead_time_days: number
  preferred_delivery_time?: string
  special_requirements?: string
}

interface SupplierLogisticsCapability {
  supplier_id: string
  mode: 'Ex Works' | 'DELIVERY' | 'TRANSIT'
  origin_hub_id: string
  destination_hub_id: string | null
  typical_lead_time_days: number
}

interface TransportRoute {
  route_id: string
  transporter_name: string
  agent_name: string
  origin_hub_id: string
  destination_hub_id: string
  transport_days: number
  base_cost: number
  diesel_surcharge: number
  customs_cost: number
  total_cost: number
  price_age_days: number
}

interface LogisticsSolution {
  type: 'SUPPLIER_DELIVERY' | 'CUSTOMER_PICKUP' | 'THIRD_PARTY_TRANSPORT' | 'SUPPLIER_TRANSIT'
  supplierHub: string
  customerHub: string
  transportCostPerPallet: number
  transportCostPerUnit: number
  transporterName?: string
  durationDays: number
  description: string
}

// Fetch customer requirements
async function getCustomerRequirements(): Promise<CustomerRequirement[]> {
  const { data, error } = await supabase
    .from('customer_product_packaging_spec')
    .select(`
      customer_id,
      customers!inner(
        id,
        name,
        city,
        country,
        agent_id,
        staff!inner(
          id,
          name,
          role
        )
      ),
      product_packaging_spec_id,
      product_packaging_specs!inner(
        id,
        boxes_per_pallet,
        weight_per_box,
        weight_per_pallet,
        weight_unit,
        pieces_per_box,
        products!inner(
          id,
          name,
          category,
          sold_by,
          intended_use
        ),
        packaging_options!inner(
          label
        ),
        size_options!inner(
          name
        )
      )
    `)

  if (error) throw error

  return data.map(item => {
    const customer = (item.customers as any)?.[0] || item.customers
    const spec = (item.product_packaging_specs as any)?.[0] || item.product_packaging_specs
    const product = (spec as any).products?.[0] || (spec as any).products
    const packaging = (spec as any).packaging_options?.[0] || (spec as any).packaging_options
    const size = (spec as any).size_options?.[0] || (spec as any).size_options

    // Calculate units per pallet based on sold_by
    let unitsPerPallet = 0
    switch (product.sold_by) {
      case 'kg':
        unitsPerPallet = spec.weight_per_pallet
        break
      case 'piece':
        unitsPerPallet = spec.pieces_per_box ? spec.pieces_per_box * spec.boxes_per_pallet : spec.boxes_per_pallet
        break
      case 'box':
      case 'punnet':
      case 'bag':
        unitsPerPallet = spec.boxes_per_pallet
        break
      default:
        unitsPerPallet = spec.boxes_per_pallet
    }

    return {
      customer_id: customer.id,
      customer_name: customer.name,
      customer_city: customer.city || '',
      customer_country: customer.country || '',
      agent_id: customer.staff.id,
      agent_name: customer.staff.name,
      agent_role: customer.staff.role || '',
      product_packaging_spec_id: spec.id,
      product_id: product.id,
      product_name: product.name,
      product_category: product.category,
      sold_by: product.sold_by,
      intended_use: product.intended_use,
      packaging_label: packaging.label,
      size_name: size.name,
      units_per_pallet: unitsPerPallet,
      weight_per_pallet: spec.weight_per_pallet,
      weight_unit: spec.weight_unit
    }
  })
}

// Find matching suppliers for customer requirements (with and without active pricing)
async function findMatchingSuppliers(requirements: CustomerRequirement[]): Promise<SupplierPrice[]> {
  const productSpecIds = requirements.map(req => req.product_packaging_spec_id)

  // First, get suppliers with active pricing
  const { data: suppliersWithPricing, error: pricingError } = await supabase
    .from('current_supplier_prices')
    .select('*')
    .in('product_packaging_spec_id', productSpecIds)
    .eq('is_active', true)

  if (pricingError) throw pricingError

  // Then, get suppliers without pricing but who offer these products
  const { data: suppliersWithoutPricing, error: noPricingError } = await supabase
    .from('supplier_product_packaging_spec')
    .select(`
      supplier_id,
      product_packaging_spec_id,
      suppliers!inner(
        id,
        name,
        is_active
      ),
      product_packaging_specs!inner(
        id,
        boxes_per_pallet,
        weight_per_box,
        weight_per_pallet,
        weight_unit,
        pieces_per_box,
        products!inner(
          id,
          name,
          category,
          sold_by,
          intended_use
        ),
        packaging_options!inner(
          label
        ),
        size_options!inner(
          name
        )
      )
    `)
    .in('product_packaging_spec_id', productSpecIds)
    .eq('suppliers.is_active', true)

  if (noPricingError) throw noPricingError

  // Filter out suppliers that already have pricing
  const suppliersWithPricingIds = new Set(suppliersWithPricing?.map(s => s.supplier_id) || [])
  const filteredSuppliersWithoutPricing = suppliersWithoutPricing?.filter(
    s => !suppliersWithPricingIds.has(s.supplier_id)
  ) || []

  // Convert suppliers without pricing to the same format
  const suppliersWithoutPricingFormatted = filteredSuppliersWithoutPricing.map(item => {
    const supplier = (item.suppliers as any)?.[0] || item.suppliers
    const spec = (item.product_packaging_specs as any)?.[0] || item.product_packaging_specs
    const product = (spec as any).products?.[0] || (spec as any).products
    const packaging = (spec as any).packaging_options?.[0] || (spec as any).packaging_options
    const size = (spec as any).size_options?.[0] || (spec as any).size_options

    // Calculate units per pallet based on sold_by
    let unitsPerPallet = 0
    switch (product.sold_by) {
      case 'kg':
        unitsPerPallet = spec.weight_per_pallet
        break
      case 'piece':
        unitsPerPallet = spec.pieces_per_box ? spec.pieces_per_box * spec.boxes_per_pallet : spec.boxes_per_pallet
        break
      case 'box':
      case 'punnet':
      case 'bag':
        unitsPerPallet = spec.boxes_per_pallet
        break
      default:
        unitsPerPallet = spec.boxes_per_pallet
    }

    return {
      id: `no-price-${item.supplier_id}-${item.product_packaging_spec_id}`,
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      hub_id: '', // Unknown - no hub info without pricing
      hub_name: 'No Hub Info',
      hub_code: '',
      product_packaging_spec_id: spec.id,
      price_per_unit: 0, // No pricing available
      currency: 'EUR',
      delivery_mode: 'Ex Works' as const, // Default assumption
      valid_until: '',
      units_per_pallet: unitsPerPallet,
      has_pricing: false // Flag to indicate no pricing
    }
  })

  // Add has_pricing flag to suppliers with pricing
  const suppliersWithPricingFlagged = (suppliersWithPricing || []).map(supplier => ({
    ...supplier,
    has_pricing: true
  }))

  // Combine both lists
  return [...suppliersWithPricingFlagged, ...suppliersWithoutPricingFormatted]
}

// Get customer logistics capabilities
async function getCustomerLogisticsCapabilities(customerIds: string[]): Promise<CustomerLogisticsCapability[]> {
  const { data, error } = await supabase
    .from('customer_logistics_capabilities')
    .select('*')
    .in('customer_id', customerIds)

  if (error) throw error
  return data || []
}

// Get supplier logistics capabilities
async function getSupplierLogisticsCapabilities(supplierIds: string[]): Promise<SupplierLogisticsCapability[]> {
  const { data, error } = await supabase
    .from('supplier_logistics_capabilities')
    .select('*')
    .in('supplier_id', supplierIds)

  if (error) throw error
  return data || []
}

// Find direct transport routes using simple database queries (avoiding complex RPC)
async function findDirectTransport(originHubId: string, destinationHubId: string): Promise<TransportRoute | null> {
  console.log(`     🚛 Finding transport routes from ${originHubId} to ${destinationHubId}`)

  // Query routes with price bands directly
  const { data: routesWithPricing, error } = await supabase
    .from('transporter_routes')
    .select(`
      id,
      transport_duration_days,
      transporters!inner(
        id,
        name,
        is_active,
        staff(name)
      ),
      transporter_route_price_bands!inner(
        price_per_pallet,
        pallet_dimensions,
        min_pallets,
        max_pallets
      )
    `)
    .eq('origin_hub_id', originHubId)
    .eq('destination_hub_id', destinationHubId)
    .eq('is_active', true)
    .eq('transporters.is_active', true)
    .eq('transporter_route_price_bands.pallet_dimensions', '120x100')

  console.log(`     📋 Routes with pricing query result:`, routesWithPricing?.length || 0, 'routes found')

  if (error) {
    console.log(`     ❌ Routes query error:`, error)
    return null
  }

  if (!routesWithPricing || routesWithPricing.length === 0) {
    console.log(`     ❌ No transport routes found with pricing`)
    return null
  }

  console.log(`     ✅ Found ${routesWithPricing.length} routes with pricing:`)

  // Find the cheapest route (considering all price bands)
  let cheapestRoute = null
  let cheapestPrice = Infinity

  routesWithPricing.forEach(route => {
    const transporter = (route.transporters as any)?.[0] || route.transporters
    const priceBands = route.transporter_route_price_bands

    console.log(`       - ${transporter.name}: ${priceBands.length} price bands`)

    priceBands.forEach((band: any) => {
      console.log(`         ${band.min_pallets}-${band.max_pallets || '∞'} pallets: €${band.price_per_pallet}`)

      if (band.price_per_pallet < cheapestPrice) {
        cheapestPrice = band.price_per_pallet
        cheapestRoute = {
          route_id: route.id,
          transporter_name: transporter.name,
          agent_name: transporter.staff?.name || 'Unknown',
          transport_days: route.transport_duration_days,
          price_per_pallet: band.price_per_pallet,
          min_pallets: band.min_pallets,
          max_pallets: band.max_pallets
        }
      }
    })
  })

  if (!cheapestRoute) {
    console.log(`     ❌ No valid pricing found`)
    return null
  }

  console.log(`     → Using cheapest: ${(cheapestRoute as any).transporter_name} - €${(cheapestRoute as any).price_per_pallet}/pallet`)

  return {
    route_id: (cheapestRoute as any).route_id,
    transporter_name: (cheapestRoute as any).transporter_name,
    agent_name: (cheapestRoute as any).agent_name,
    origin_hub_id: originHubId,
    destination_hub_id: destinationHubId,
    transport_days: (cheapestRoute as any).transport_days,
    base_cost: (cheapestRoute as any).price_per_pallet,
    diesel_surcharge: 0, // Not tracking separately in this simple version
    customs_cost: 0, // Not tracking separately in this simple version
    total_cost: (cheapestRoute as any).price_per_pallet,
    price_age_days: 0 // Not tracking age in this simple version
  }
}

// Validate logistics for supplier delivery mode
async function validateSupplierDelivery(
  supplier: SupplierPrice,
  customerCapabilities: CustomerLogisticsCapability[],
  supplierCapabilities: SupplierLogisticsCapability[]
): Promise<LogisticsSolution | null> {

  // Find customer delivery hubs
  const customerDeliveryHubs = customerCapabilities
    .filter(cap => cap.mode === 'DELIVERY' && cap.destination_hub_id)
    .map(cap => cap.destination_hub_id!)

  if (customerDeliveryHubs.length === 0) {
    return null
  }

  // Check if supplier can deliver to any customer delivery hub
  const matchingDeliveries = supplierCapabilities.filter(cap =>
    cap.supplier_id === supplier.supplier_id &&
    cap.mode === 'DELIVERY' &&
    cap.destination_hub_id &&
    customerDeliveryHubs.includes(cap.destination_hub_id)
  )

  if (matchingDeliveries.length > 0) {
    const delivery = matchingDeliveries[0]
    return {
      type: 'SUPPLIER_DELIVERY',
      supplierHub: supplier.hub_name,
      customerHub: delivery.destination_hub_id || '', // TODO: Get hub name
      transportCostPerPallet: 0,
      transportCostPerUnit: 0,
      durationDays: delivery.typical_lead_time_days,
      description: `${supplier.supplier_name} delivers from ${supplier.hub_name} to customer hub`
    }
  }

  return null
}

// Validate logistics for Ex Works mode
async function validateExWorksLogistics(
  supplier: SupplierPrice,
  customerCapabilities: CustomerLogisticsCapability[]
): Promise<LogisticsSolution | null> {

  console.log(`🔍 Validating Ex Works logistics for supplier ${supplier.supplier_name} at ${supplier.hub_name}`)

  // Option A: Customer can pickup at supplier hub
  const customerPickupHubs = customerCapabilities
    .filter(cap => cap.mode === 'Ex Works')
    .map(cap => cap.origin_hub_id)

  console.log(`   Customer pickup hubs:`, customerPickupHubs)

  if (customerPickupHubs.includes(supplier.hub_id)) {
    console.log(`   ✅ Customer can pickup at ${supplier.hub_name}`)
    return {
      type: 'CUSTOMER_PICKUP',
      supplierHub: supplier.hub_name,
      customerHub: supplier.hub_name,
      transportCostPerPallet: 0,
      transportCostPerUnit: 0,
      durationDays: 1,
      description: `Customer picks up Ex Works at ${supplier.hub_name}`
    }
  }

  // Option B: Third-party transport to customer delivery hubs
  const customerDeliveryHubs = customerCapabilities
    .filter(cap => cap.mode === 'DELIVERY' && cap.destination_hub_id)
    .map(cap => cap.destination_hub_id!)

  console.log(`   Customer delivery hubs:`, customerDeliveryHubs)
  console.log(`   Checking transport from ${supplier.hub_id} (${supplier.hub_name}) to customer hubs...`)

  for (const deliveryHubId of customerDeliveryHubs) {
    console.log(`   → Checking route from ${supplier.hub_id} to ${deliveryHubId}`)
    const transportSolution = await findDirectTransport(supplier.hub_id, deliveryHubId)

    if (transportSolution) {
      const transportCostPerUnit = transportSolution.total_cost / supplier.units_per_pallet
      console.log(`   ✅ Found transport: ${transportSolution.transporter_name} - €${transportSolution.total_cost}/pallet`)

      // Get hub name for display (we should really fetch this from DB)
      const hubName = deliveryHubId // This will be the hub ID for now

      return {
        type: 'THIRD_PARTY_TRANSPORT',
        supplierHub: supplier.hub_name,
        customerHub: hubName,
        transportCostPerPallet: transportSolution.total_cost,
        transportCostPerUnit: transportCostPerUnit,
        transporterName: transportSolution.transporter_name,
        durationDays: transportSolution.transport_days,
        description: `${transportSolution.transporter_name}: ${supplier.hub_name} → ${hubName} (${transportSolution.transport_days} days)`
      }
    } else {
      console.log(`   ❌ No transport found from ${supplier.hub_id} to ${deliveryHubId}`)
    }
  }

  console.log(`   ❌ No logistics solution found for Ex Works supplier`)
  return null
}

// Validate logistics for TRANSIT mode
async function validateTransitLogistics(
  supplier: SupplierPrice,
  customerCapabilities: CustomerLogisticsCapability[],
  supplierCapabilities: SupplierLogisticsCapability[]
): Promise<LogisticsSolution | null> {

  // Find customer delivery hubs
  const customerDeliveryHubs = customerCapabilities
    .filter(cap => cap.mode === 'DELIVERY' && cap.destination_hub_id)
    .map(cap => cap.destination_hub_id!)

  if (customerDeliveryHubs.length === 0) {
    return null
  }

  // Check if supplier has transit capability to customer hubs
  const matchingTransits = supplierCapabilities.filter(cap =>
    cap.supplier_id === supplier.supplier_id &&
    cap.mode === 'TRANSIT' &&
    cap.destination_hub_id &&
    customerDeliveryHubs.includes(cap.destination_hub_id)
  )

  if (matchingTransits.length > 0) {
    const transit = matchingTransits[0]
    return {
      type: 'SUPPLIER_TRANSIT',
      supplierHub: supplier.hub_name,
      customerHub: transit.destination_hub_id || '', // TODO: Get hub name
      transportCostPerPallet: 0,
      transportCostPerUnit: 0,
      durationDays: transit.typical_lead_time_days,
      description: `${supplier.supplier_name} transits from ${supplier.hub_name} to customer hub`
    }
  }

  return null
}

// Main logistics validation function
async function validateLogistics(
  supplier: SupplierPrice,
  customerCapabilities: CustomerLogisticsCapability[],
  supplierCapabilities: SupplierLogisticsCapability[]
): Promise<LogisticsSolution | null> {

  switch (supplier.delivery_mode) {
    case 'DELIVERY':
      return validateSupplierDelivery(supplier, customerCapabilities, supplierCapabilities)

    case 'Ex Works':
      return validateExWorksLogistics(supplier, customerCapabilities)

    case 'TRANSIT':
      return validateTransitLogistics(supplier, customerCapabilities, supplierCapabilities)

    default:
      return null
  }
}

// Generate trade opportunities
async function generateTradeOpportunities(): Promise<TradeOpportunity[]> {
  console.log('🔍 Starting trade opportunity generation...')

  // 1. Get customer requirements
  const requirements = await getCustomerRequirements()
  console.log(`📋 Found ${requirements.length} customer requirements`)

  // 2. Find matching supplier prices
  const supplierPrices = await findMatchingSuppliers(requirements)
  console.log(`💰 Found ${supplierPrices.length} supplier prices`)

  // 3. Get logistics capabilities
  const customerIds = [...new Set(requirements.map(req => req.customer_id))]
  const supplierIds = [...new Set(supplierPrices.map(price => price.supplier_id))]

  const customerCapabilities = await getCustomerLogisticsCapabilities(customerIds)
  const supplierCapabilities = await getSupplierLogisticsCapabilities(supplierIds)

  console.log(`🚚 Found ${customerCapabilities.length} customer logistics capabilities`)
  console.log(`🏭 Found ${supplierCapabilities.length} supplier logistics capabilities`)

  const opportunities: TradeOpportunity[] = []

  // 4. Match requirements to suppliers and validate logistics
  for (const requirement of requirements) {
    console.log(`\n🔄 Processing requirement: ${requirement.customer_name} needs ${requirement.product_name}`)

    const matchingPrices = supplierPrices.filter(price =>
      price.product_packaging_spec_id === requirement.product_packaging_spec_id
    )

    console.log(`   Found ${matchingPrices.length} matching suppliers:`)
    matchingPrices.forEach(price => {
      console.log(`   - ${price.supplier_name} (${price.hub_name}) - ${price.delivery_mode} - €${price.price_per_unit}`)
    })

    const customerCaps = customerCapabilities.filter(cap =>
      cap.customer_id === requirement.customer_id
    )

    console.log(`   Customer logistics capabilities:`)
    customerCaps.forEach(cap => {
      console.log(`   - ${cap.mode}: ${cap.origin_hub_id} → ${cap.destination_hub_id || 'same hub'}`)
    })

    for (const supplierPrice of matchingPrices) {
      console.log(`\n   🔍 Checking logistics for ${supplierPrice.supplier_name} (${supplierPrice.delivery_mode})`)
      const logisticsSolution = await validateLogistics(
        supplierPrice,
        customerCaps,
        supplierCapabilities
      )

      if (logisticsSolution) {
        console.log(`   ✅ Found logistics solution: ${logisticsSolution.type}`)

        // Calculate pricing with 10% margin (only if supplier has pricing)
        let basePricePerUnit, transportCostPerUnit, subtotalPerUnit, marginPercentage, marginPerUnit, finalPricePerUnit

        if (supplierPrice.has_pricing) {
          basePricePerUnit = supplierPrice.price_per_unit
          transportCostPerUnit = logisticsSolution.transportCostPerUnit
          subtotalPerUnit = basePricePerUnit + transportCostPerUnit
          marginPercentage = 10
          marginPerUnit = subtotalPerUnit * (marginPercentage / 100)
          finalPricePerUnit = subtotalPerUnit + marginPerUnit
          console.log(`   💰 Pricing: Base €${basePricePerUnit} + Transport €${transportCostPerUnit} + Margin €${marginPerUnit} = €${finalPricePerUnit}`)
        } else {
          // Supplier without pricing - show as TBD
          basePricePerUnit = 0
          transportCostPerUnit = 0
          subtotalPerUnit = 0
          marginPercentage = 10
          marginPerUnit = 0
          finalPricePerUnit = 0
          console.log(`   💰 Pricing: TBD (supplier has no active pricing)`)
        }

        const opportunity: TradeOpportunity = {
          id: `${requirement.customer_id}-${supplierPrice.supplier_id}-${requirement.product_packaging_spec_id}`,
          customer: {
            id: requirement.customer_id,
            name: requirement.customer_name,
            city: requirement.customer_city,
            country: requirement.customer_country,
            agent: {
              id: requirement.agent_id,
              name: requirement.agent_name,
              role: requirement.agent_role
            }
          },
          product: {
            id: requirement.product_id,
            name: requirement.product_name,
            category: requirement.product_category,
            soldBy: requirement.sold_by,
            intendedUse: requirement.intended_use,
            packagingLabel: requirement.packaging_label,
            sizeName: requirement.size_name,
            unitsPerPallet: requirement.units_per_pallet,
            weightPerPallet: requirement.weight_per_pallet,
            weightUnit: requirement.weight_unit
          },
          supplier: {
            id: supplierPrice.supplier_id,
            name: supplierPrice.supplier_name,
            hubName: supplierPrice.hub_name,
            hubCode: supplierPrice.hub_code,
            deliveryMode: supplierPrice.delivery_mode,
            basePrice: supplierPrice.price_per_unit,
            currency: supplierPrice.currency,
            validUntil: supplierPrice.valid_until
          },
          logistics: {
            solutionType: logisticsSolution.type,
            supplierHub: logisticsSolution.supplierHub,
            customerHub: logisticsSolution.customerHub,
            transportCostPerPallet: logisticsSolution.transportCostPerPallet,
            transportCostPerUnit: logisticsSolution.transportCostPerUnit,
            transporterName: logisticsSolution.transporterName,
            durationDays: logisticsSolution.durationDays,
            description: logisticsSolution.description
          },
          pricing: {
            basePricePerUnit: basePricePerUnit,
            transportCostPerUnit: transportCostPerUnit,
            subtotalPerUnit: subtotalPerUnit,
            marginPercentage: marginPercentage,
            marginPerUnit: marginPerUnit,
            finalPricePerUnit: finalPricePerUnit,
            currency: supplierPrice.currency
          },
          confidence: 85, // Base confidence level
          priority: 'MEDIUM',
          createdAt: new Date().toISOString()
        }

        opportunities.push(opportunity)
        console.log(`   🎯 Created opportunity for ${requirement.customer_name} - ${supplierPrice.supplier_name}`)
      } else {
        console.log(`   ❌ No logistics solution found for ${supplierPrice.supplier_name} → ${requirement.customer_name}`)
      }
    }
  }

  console.log(`✅ Generated ${opportunities.length} trade opportunities`)
  return opportunities
}

export function useTradeOpportunities(filters?: TradeOpportunityFilters) {
  return useQuery({
    queryKey: ['trade-opportunities', filters],
    queryFn: async () => {
      const opportunities = await generateTradeOpportunities()

      // Apply filters
      let filtered = opportunities

      // Filter by staff ID
      if (filters?.staffId && filters.staffId !== 'all') {
        if (filters.staffId === 'me') {
          // TODO: Filter by current user's ID
          // For now, this will return all
        } else {
          filtered = filtered.filter(opp => opp.customer.agent.id === filters.staffId)
        }
      }

      // Filter by customer ID
      if (filters?.customerId) {
        filtered = filtered.filter(opp => opp.customer.id === filters.customerId)
      }

      // Filter by product category
      if (filters?.productCategory) {
        filtered = filtered.filter(opp => opp.product.category === filters.productCategory)
      }

      // Filter by priority
      if (filters?.priority) {
        filtered = filtered.filter(opp => opp.priority.toLowerCase() === filters.priority?.toLowerCase())
      }

      // Filter by status (if implemented)
      if (filters?.status) {
        // TODO: Implement status filtering when status is tracked
      }

      return filtered
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useTradeOpportunityStats(filters?: TradeOpportunityFilters) {
  const { data: opportunities = [], isLoading } = useTradeOpportunities(filters)

  const stats = {
    totalOpportunities: opportunities.length,
    totalPotentialRevenue: opportunities.reduce((sum, opp) =>
      sum + (opp.pricing.finalPricePerUnit * opp.product.unitsPerPallet), 0
    ),
    highPriorityCount: opportunities.filter(opp => opp.priority === 'HIGH').length,
    averageMargin: opportunities.length > 0
      ? opportunities.reduce((sum, opp) => sum + opp.pricing.marginPercentage, 0) / opportunities.length
      : 0,
    uniqueCustomers: new Set(opportunities.map(opp => opp.customer.id)).size,
    uniqueSuppliers: new Set(opportunities.map(opp => opp.supplier.id)).size,
    uniqueProducts: new Set(opportunities.map(opp => opp.product.id)).size
  }

  return { stats, isLoading }
}