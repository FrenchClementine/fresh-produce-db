'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { MarketPotential, MarketPotentialSummary, MarketPotentialStatus, TransportLeg } from '@/types/market-potential'

// Helper function to convert transport route data to standard format
function convertTransportRoute(route: any, unitsPerPallet: number) {
  const pricePerPallet = route.transporter_route_price_bands?.[0]?.price_per_pallet || 0
  const pricePerUnit = unitsPerPallet > 0 ? pricePerPallet / unitsPerPallet : 0
  const transporterName = route.transporters?.name || 'Third-party Transport'

  return {
    id: route.id,
    transporterId: route.transporter_id,
    originHubId: route.origin_hub_id,
    destinationHubId: route.destination_hub_id,
    originHubName: route.origin_hub?.name || '',
    destinationHubName: route.destination_hub?.name || '',
    transporterName: transporterName,
    durationDays: route.transport_duration_days,
    pricePerPallet: pricePerPallet,
    dieselSurchargePerPallet: 0,
    pricePerUnit: pricePerUnit,
    unitsPerPallet: unitsPerPallet,
    customsCostPerShipment: route.customs_cost_per_shipment || 0,
    availableBands: route.transporter_route_price_bands || []
  }
}

/**
 * Find 2-leg routes through designated transshipment hubs
 */
function findTwoLegRoutes(
  originHubId: string,
  destinationHubId: string,
  allRoutes: any[],
  allHubs: any[],
  unitsPerPallet: number
): any[] {
  const twoLegRoutes: any[] = []

  // Get only hubs marked as transshipment points
  const transshipmentHubs = allHubs.filter(hub => hub.can_transship === true)
  const transshipmentHubIds = transshipmentHubs.map(hub => hub.id)

  // Find all routes FROM origin that END at transshipment hubs
  const firstLegRoutes = allRoutes.filter(r =>
    r.origin_hub_id === originHubId &&
    transshipmentHubIds.includes(r.destination_hub_id)
  )

  firstLegRoutes.forEach(leg1 => {
    // Find routes FROM this transshipment hub TO destination hub
    const secondLegRoutes = allRoutes.filter(r =>
      r.origin_hub_id === leg1.destination_hub_id &&
      r.destination_hub_id === destinationHubId
    )

    secondLegRoutes.forEach(leg2 => {
      const leg1PricePerPallet = leg1.transporter_route_price_bands?.[0]?.price_per_pallet || 0
      const leg2PricePerPallet = leg2.transporter_route_price_bands?.[0]?.price_per_pallet || 0

      const totalCostPerPallet = leg1PricePerPallet + leg2PricePerPallet
      const totalCostPerUnit = unitsPerPallet > 0 ? totalCostPerPallet / unitsPerPallet : 0
      const totalDurationDays = leg1.transport_duration_days + leg2.transport_duration_days

      const intermediateHub = transshipmentHubs.find(h => h.id === leg1.destination_hub_id)
      const originHub = allHubs.find(h => h.id === leg1.origin_hub_id)
      const destinationHub = allHubs.find(h => h.id === leg2.destination_hub_id)

      const multiLegRoute = {
        id: `multi-${leg1.id}-${leg2.id}`,
        transporterId: null,
        originHubId: leg1.origin_hub_id,
        destinationHubId: leg2.destination_hub_id,
        originHubName: originHub?.name || 'Unknown',
        destinationHubName: destinationHub?.name || 'Unknown',
        transporterName: `Multi-leg via ${intermediateHub?.name || 'Hub'}`,
        durationDays: totalDurationDays,
        pricePerPallet: totalCostPerPallet,
        dieselSurchargePerPallet: 0,
        pricePerUnit: totalCostPerUnit,
        unitsPerPallet: unitsPerPallet,
        customsCostPerShipment: (leg1.customs_cost_per_shipment || 0) + (leg2.customs_cost_per_shipment || 0),
        availableBands: [],
        legs: [
          {
            leg: 1,
            routeId: leg1.id,
            originHubId: leg1.origin_hub_id,
            originHubName: originHub?.name || 'Unknown',
            destinationHubId: leg1.destination_hub_id,
            destinationHubName: intermediateHub?.name || 'Unknown',
            transporterId: leg1.transporter_id,
            transporterName: leg1.transporters?.name || 'Unknown',
            costPerPallet: leg1PricePerPallet,
            costPerUnit: unitsPerPallet > 0 ? leg1PricePerPallet / unitsPerPallet : 0,
            durationDays: leg1.transport_duration_days
          },
          {
            leg: 2,
            routeId: leg2.id,
            originHubId: leg2.origin_hub_id,
            originHubName: intermediateHub?.name || 'Unknown',
            destinationHubId: leg2.destination_hub_id,
            destinationHubName: destinationHub?.name || 'Unknown',
            transporterId: leg2.transporter_id,
            transporterName: leg2.transporters?.name || 'Unknown',
            costPerPallet: leg2PricePerPallet,
            costPerUnit: unitsPerPallet > 0 ? leg2PricePerPallet / unitsPerPallet : 0,
            durationDays: leg2.transport_duration_days
          }
        ],
        totalLegs: 2,
        totalCostPerPallet: totalCostPerPallet,
        totalCostPerUnit: totalCostPerUnit,
        totalDurationDays: totalDurationDays,
        intermediateHubs: intermediateHub ? [{
          id: intermediateHub.id,
          name: intermediateHub.name
        }] : []
      }

      twoLegRoutes.push(multiLegRoute)
    })
  })

  return twoLegRoutes
}

// Generate hub-supplier-product matrix
async function generateMarketPotentialMatrix(
  hubIdFilter?: string,
  preferredOnly?: boolean
): Promise<MarketPotential[]> {
  console.log('🏬 Generating market potential matrix...')
  if (hubIdFilter) console.log(`   Filtering for hub: ${hubIdFilter}`)
  if (preferredOnly) console.log(`   Showing preferred products only`)

  // 1. Get hub product preferences
  let preferencesQuery = supabase
    .from('hub_product_preferences')
    .select(`
      hub_id,
      product_id,
      product_packaging_spec_id,
      priority,
      is_active,
      hubs!inner(
        id,
        name,
        hub_code,
        city_name,
        country_code
      ),
      products!inner(
        id,
        name,
        category,
        sold_by
      )
    `)
    .eq('is_active', true)

  if (hubIdFilter) {
    preferencesQuery = preferencesQuery.eq('hub_id', hubIdFilter)
  }

  const { data: hubPreferences, error: preferencesError } = await preferencesQuery

  if (preferencesError) throw preferencesError

  // If showing preferred only but no preferences, return empty
  if (preferredOnly && (!hubPreferences || hubPreferences.length === 0)) {
    console.log('No preferences configured for this hub')
    return []
  }

  // 2. Get all product packaging specs (if not showing preferred only)
  let productSpecsQuery = supabase
    .from('product_packaging_specs')
    .select(`
      id,
      product_id,
      boxes_per_pallet,
      pieces_per_box,
      weight_per_pallet,
      weight_unit,
      pallet_id,
      products!inner(
        id,
        name,
        category,
        sold_by
      ),
      packaging_options!inner(
        label
      ),
      size_options!inner(
        name
      ),
      pallets(
        dimensions_cm
      )
    `)

  // If showing preferred only, filter by those product IDs
  if (preferredOnly && hubPreferences) {
    const preferredProductIds = hubPreferences.map(p => p.product_id)
    productSpecsQuery = productSpecsQuery.in('product_id', preferredProductIds)
  }

  const { data: productSpecs, error: specsError } = await productSpecsQuery

  if (specsError) throw specsError

  // 3. Get all supplier capabilities
  const { data: supplierCapabilities, error: supplierError } = await supabase
    .from('supplier_product_packaging_spec')
    .select(`
      id,
      supplier_id,
      product_packaging_spec_id,
      suppliers!inner(
        id,
        name,
        city,
        country,
        is_active
      )
    `)
    .eq('suppliers.is_active', true)

  if (supplierError) throw supplierError

  // 4. Get all supplier prices
  const { data: supplierPrices, error: pricesError } = await supabase
    .from('current_supplier_prices')
    .select('*')

  if (pricesError) throw pricesError

  // 5. Get all transport routes
  const { data: transportRoutes, error: routesError } = await supabase
    .from('transporter_routes')
    .select(`
      id,
      transporter_id,
      origin_hub_id,
      destination_hub_id,
      transport_duration_days,
      customs_cost_per_shipment,
      is_active,
      transporters!inner(
        id,
        name,
        is_active
      ),
      origin_hub:origin_hub_id(
        id,
        name
      ),
      destination_hub:destination_hub_id(
        id,
        name
      ),
      transporter_route_price_bands(
        id,
        price_per_pallet,
        pallet_dimensions,
        min_pallets,
        max_pallets
      )
    `)
    .eq('is_active', true)
    .eq('transporters.is_active', true)

  if (routesError) throw routesError

  // 6. Get all hubs
  const { data: allHubs, error: hubsError } = await supabase
    .from('hubs')
    .select(`
      id,
      name,
      city_name,
      country_code,
      can_transship
    `)

  if (hubsError) throw hubsError

  // 7. Get existing market opportunities
  const { data: existingOpportunities, error: opportunitiesError } = await supabase
    .from('market_opportunities')
    .select(`
      id,
      hub_id,
      supplier_id,
      product_packaging_spec_id,
      status,
      priority,
      is_active,
      delivered_price_per_unit,
      margin_percentage,
      assigned_to,
      valid_till,
      created_at,
      updated_at
    `)
    .eq('is_active', true)

  if (opportunitiesError) throw opportunitiesError

  console.log(`📋 Found ${hubPreferences?.length || 0} hub preferences`)
  console.log(`📦 Found ${productSpecs?.length || 0} product specs`)
  console.log(`🏭 Found ${supplierCapabilities?.length || 0} supplier capabilities`)
  console.log(`💰 Found ${supplierPrices?.length || 0} supplier prices`)
  console.log(`🚛 Found ${transportRoutes?.length || 0} transport routes`)
  console.log(`🏬 Found ${allHubs?.length || 0} hubs`)
  console.log(`💼 Found ${existingOpportunities?.length || 0} existing market opportunities`)

  const potentials: MarketPotential[] = []

  // Get unique hubs to process
  const hubsToProcess = hubIdFilter
    ? allHubs?.filter(h => h.id === hubIdFilter) || []
    : allHubs || []

  // Get products to process based on preferences filter
  const productsToProcess = preferredOnly && hubPreferences
    ? productSpecs?.filter(spec =>
        hubPreferences.some(pref => pref.product_id === spec.product_id)
      ) || []
    : productSpecs || []

  // For each hub, check what products can be delivered
  hubsToProcess.forEach(hub => {
    productsToProcess.forEach(spec => {
      const product = (spec.products as any)?.[0] || spec.products
      const packaging = (spec.packaging_options as any)?.[0] || spec.packaging_options
      const size = (spec.size_options as any)?.[0] || spec.size_options
      const pallet = (spec.pallets as any)?.[0] || spec.pallets

      // Calculate units per pallet
      let unitsPerPallet = 0
      switch (product.sold_by) {
        case 'kg':
          unitsPerPallet = spec.weight_per_pallet || 0
          break
        case 'piece':
        case 'punnet':
          unitsPerPallet = spec.pieces_per_box ? spec.pieces_per_box * spec.boxes_per_pallet : spec.boxes_per_pallet || 0
          break
        case 'box':
        case 'bag':
          unitsPerPallet = spec.boxes_per_pallet || 0
          break
        default:
          unitsPerPallet = spec.boxes_per_pallet || 0
      }

      // Find suppliers who can provide this product
      const matchingSuppliers = supplierCapabilities?.filter(
        cap => cap.product_packaging_spec_id === spec.id
      ) || []

      matchingSuppliers.forEach(supplierCap => {
        const supplier = (supplierCap.suppliers as any)?.[0] || supplierCap.suppliers

        // Find ALL supplier prices for this product at different hubs
        const supplierPricesForProduct = supplierPrices?.filter(
          price => price.supplier_id === supplier.id &&
                  price.product_packaging_spec_id === spec.id
        ) || []

        // If no prices, create one potential without pricing
        const pricesToProcess = supplierPricesForProduct.length > 0 ? supplierPricesForProduct : [null]

        pricesToProcess.forEach(supplierPrice => {
          // Check transport
          let hasTransport = false
          let logisticsSolution = null
          let transportRoute = null
          let availableTransportRoutes: any[] = []

          if (supplierPrice?.hub_id) {
            const supplierHubId = supplierPrice.hub_id

            // Check if supplier hub is same as destination hub
            if (supplierHubId === hub.id) {
              hasTransport = true
              logisticsSolution = 'SAME_LOCATION'
              transportRoute = {
                id: 'same-location',
                transporterId: null,
                originHubId: supplierHubId,
                destinationHubId: hub.id,
                originHubName: hub.name,
                destinationHubName: hub.name,
                transporterName: 'Same Location',
                durationDays: 0,
                pricePerPallet: 0,
                dieselSurchargePerPallet: 0,
                pricePerUnit: 0,
                unitsPerPallet: unitsPerPallet,
                customsCostPerShipment: 0,
                availableBands: []
              }
            } else if (supplierPrice.delivery_mode === 'DELIVERY') {
              // Check if supplier can deliver to this hub
              hasTransport = true
              logisticsSolution = 'SUPPLIER_DELIVERY'
              transportRoute = {
                id: 'supplier-delivery',
                transporterId: null,
                originHubId: supplierHubId,
                destinationHubId: hub.id,
                originHubName: supplierPrice.hub_name,
                destinationHubName: hub.name,
                transporterName: 'Supplier Delivery',
                durationDays: 1,
                pricePerPallet: 0,
                dieselSurchargePerPallet: 0,
                pricePerUnit: 0,
                unitsPerPallet: unitsPerPallet,
                customsCostPerShipment: 0,
                availableBands: []
              }
            } else {
              // Find third-party transport routes
              const directRoutes = transportRoutes?.filter(route =>
                route.origin_hub_id === supplierHubId &&
                route.destination_hub_id === hub.id
              ) || []

              const directRoutesConverted = directRoutes.map(route => convertTransportRoute(route, unitsPerPallet))

              // Try multi-leg routes if no direct routes
              let twoLegRoutes: any[] = []
              if (directRoutesConverted.length === 0 && allHubs && allHubs.length > 0) {
                twoLegRoutes = findTwoLegRoutes(
                  supplierHubId,
                  hub.id,
                  transportRoutes || [],
                  allHubs,
                  unitsPerPallet
                )
              }

              availableTransportRoutes = [...directRoutesConverted, ...twoLegRoutes]

              if (availableTransportRoutes.length > 0) {
                hasTransport = true
                logisticsSolution = twoLegRoutes.length > 0 ? 'MULTI_LEG_TRANSPORT' : 'THIRD_PARTY_TRANSPORT'
                transportRoute = availableTransportRoutes.sort((a, b) => a.pricePerPallet - b.pricePerPallet)[0]
              }
            }
          }

          // Determine status
          const hasPrice = !!supplierPrice
          let status: MarketPotential['status']
          if (hasPrice && hasTransport) {
            status = 'complete'
          } else if (hasPrice && !hasTransport) {
            status = 'missing_transport'
          } else if (!hasPrice && hasTransport) {
            status = 'missing_price'
          } else {
            status = 'missing_both'
          }

          const completionScore = (hasPrice ? 50 : 0) + (hasTransport ? 50 : 0)

          // Check for existing market opportunity
          const existingOpportunity = existingOpportunities?.find(opp =>
            opp.hub_id === hub.id &&
            opp.supplier_id === supplier.id &&
            opp.product_packaging_spec_id === spec.id
          )

          const hasMarketOpportunity = !!existingOpportunity
          const isActiveMarketOpportunity = existingOpportunity?.is_active ?? false

          const potentialId = supplierPrice?.hub_id
            ? `${hub.id}-${supplier.id}-${spec.id}-${supplierPrice.hub_id}`
            : `${hub.id}-${supplier.id}-${spec.id}`

          const potential: MarketPotential = {
            id: potentialId,
            hub: {
              id: hub.id,
              name: hub.name,
              hubCode: hub.hub_code || '',
              city: hub.city_name || '',
              country: hub.country_code || ''
            },
            supplier: {
              id: supplier.id,
              name: supplier.name,
              city: supplier.city || '',
              country: supplier.country || '',
              defaultHubId: supplierPrice?.hub_id,
              defaultHubName: supplierPrice?.hub_name
            },
            product: {
              id: product.id,
              name: product.name,
              category: product.category,
              packagingLabel: packaging.label,
              sizeName: size.name,
              soldBy: product.sold_by,
              specId: spec.id,
              supplierProductPackagingSpecId: supplierCap.id,
              palletDimensions: pallet?.dimensions_cm || null,
              boxesPerPallet: spec.boxes_per_pallet
            },
            status,
            hasSupplierPrice: hasPrice,
            hasTransportRoute: hasTransport,
            supplierPrice: supplierPrice ? {
              id: supplierPrice.id,
              pricePerUnit: supplierPrice.price_per_unit,
              currency: supplierPrice.currency,
              deliveryMode: supplierPrice.delivery_mode,
              hubId: supplierPrice.hub_id,
              hubName: supplierPrice.hub_name,
              validUntil: supplierPrice.valid_until
            } : undefined,
            transportRoute: transportRoute ? {
              id: transportRoute.id,
              transporterId: transportRoute.transporterId || null,
              originHubId: transportRoute.originHubId,
              destinationHubId: transportRoute.destinationHubId,
              originHubName: transportRoute.originHubName,
              destinationHubName: transportRoute.destinationHubName,
              transporterName: transportRoute.transporterName,
              durationDays: transportRoute.durationDays,
              pricePerPallet: transportRoute.pricePerPallet,
              dieselSurchargePerPallet: transportRoute.dieselSurchargePerPallet,
              pricePerUnit: transportRoute.pricePerUnit,
              unitsPerPallet: transportRoute.unitsPerPallet,
              customsCostPerShipment: transportRoute.customsCostPerShipment,
              availableBands: transportRoute.availableBands,
              legs: transportRoute.legs,
              totalLegs: transportRoute.totalLegs,
              totalCostPerPallet: transportRoute.totalCostPerPallet,
              totalCostPerUnit: transportRoute.totalCostPerUnit,
              totalDurationDays: transportRoute.totalDurationDays,
              intermediateHubs: transportRoute.intermediateHubs
            } : undefined,
            availableTransportRoutes: availableTransportRoutes.length > 0 ? availableTransportRoutes : undefined,
            priceGap: !hasPrice,
            transportGap: !hasTransport,
            canAddPrice: !hasPrice,
            canAddTransport: !hasTransport,
            completionScore,
            logisticsSolution: logisticsSolution as any,
            hasMarketOpportunity,
            isActiveMarketOpportunity,
            marketOpportunity: existingOpportunity ? {
              id: existingOpportunity.id,
              status: existingOpportunity.status as any,
              priority: existingOpportunity.priority as any,
              isActive: existingOpportunity.is_active,
              deliveredPrice: existingOpportunity.delivered_price_per_unit,
              marginPercentage: existingOpportunity.margin_percentage,
              assignedTo: existingOpportunity.assigned_to,
              validTill: existingOpportunity.valid_till,
              createdAt: existingOpportunity.created_at,
              updatedAt: existingOpportunity.updated_at
            } : undefined
          }

          potentials.push(potential)
        })
      })
    })
  })

  console.log(`🎯 Generated ${potentials.length} market potentials`)
  console.log(`✅ Complete: ${potentials.filter(p => p.status === 'complete').length}`)
  console.log(`🟡 Missing price: ${potentials.filter(p => p.status === 'missing_price').length}`)
  console.log(`🔴 Missing transport: ${potentials.filter(p => p.status === 'missing_transport').length}`)
  console.log(`⚫ Missing both: ${potentials.filter(p => p.status === 'missing_both').length}`)

  return potentials
}

export function useMarketPotential(
  hubId?: string,
  preferredOnly: boolean = false,
  statusFilter: MarketPotentialStatus = 'all'
) {
  return useQuery({
    queryKey: ['market-potential', hubId, preferredOnly, statusFilter],
    queryFn: async () => {
      const allPotentials = await generateMarketPotentialMatrix(hubId, preferredOnly)

      // Apply status filter
      const filteredPotentials = statusFilter === 'all'
        ? allPotentials
        : allPotentials.filter(p => p.status === statusFilter)

      // Generate summary
      const summary: MarketPotentialSummary = {
        total: allPotentials.length,
        complete: allPotentials.filter(p => p.status === 'complete').length,
        missingPrice: allPotentials.filter(p => p.status === 'missing_price').length,
        missingTransport: allPotentials.filter(p => p.status === 'missing_transport').length,
        missingBoth: allPotentials.filter(p => p.status === 'missing_both').length,
        completionRate: allPotentials.length > 0
          ? (allPotentials.filter(p => p.status === 'complete').length / allPotentials.length) * 100
          : 0
      }

      return {
        potentials: filteredPotentials,
        summary
      }
    },
    staleTime: 0,
  })
}
