'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { TradePotential, TradePotentialSummary, NewSupplierPrice, PotentialStatus, TransportLeg, MultiLegTransportRoute } from '@/types/trade-potential'

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
    transporterName: transporterName,
    durationDays: route.transport_duration_days,
    pricePerPallet: pricePerPallet,
    pricePerUnit: pricePerUnit,
    unitsPerPallet: unitsPerPallet,
    customsCostPerShipment: route.customs_cost_per_shipment || 0,
    availableBands: route.transporter_route_price_bands || []
  }
}

/**
 * Find 2-leg routes through designated transshipment hubs
 * @param originHubId - Starting hub (supplier location)
 * @param destinationHubIds - Array of possible destination hubs (customer locations)
 * @param allRoutes - All available transport routes
 * @param allHubs - All hubs with transshipment flag info
 * @param unitsPerPallet - Units per pallet for cost calculation
 * @returns Array of valid 2-leg route options
 */
function findTwoLegRoutes(
  originHubId: string,
  destinationHubIds: string[],
  allRoutes: any[],
  allHubs: any[],
  unitsPerPallet: number
): any[] {
  const twoLegRoutes: any[] = []

  // Get only hubs marked as transshipment points
  const transshipmentHubs = allHubs.filter(hub => hub.can_transship === true)
  const transshipmentHubIds = transshipmentHubs.map(hub => hub.id)

  console.log(`🔄 Searching for 2-leg routes from hub ${originHubId}...`)
  console.log(`   Found ${transshipmentHubs.length} transshipment hubs: ${transshipmentHubs.map(h => h.name).join(', ')}`)

  // Find all routes FROM origin that END at transshipment hubs
  const firstLegRoutes = allRoutes.filter(r =>
    r.origin_hub_id === originHubId &&
    transshipmentHubIds.includes(r.destination_hub_id)
  )

  console.log(`   Found ${firstLegRoutes.length} first-leg routes from origin to transshipment hubs`)

  firstLegRoutes.forEach(leg1 => {
    // Find routes FROM this transshipment hub TO customer destinations
    const secondLegRoutes = allRoutes.filter(r =>
      r.origin_hub_id === leg1.destination_hub_id &&
      destinationHubIds.includes(r.destination_hub_id)
    )

    secondLegRoutes.forEach(leg2 => {
      const leg1PricePerPallet = leg1.transporter_route_price_bands?.[0]?.price_per_pallet || 0
      const leg2PricePerPallet = leg2.transporter_route_price_bands?.[0]?.price_per_pallet || 0
      const totalCostPerPallet = leg1PricePerPallet + leg2PricePerPallet
      const totalCostPerUnit = unitsPerPallet > 0 ? totalCostPerPallet / unitsPerPallet : 0
      const totalDurationDays = leg1.transport_duration_days + leg2.transport_duration_days

      const intermediateHub = transshipmentHubs.find(h => h.id === leg1.destination_hub_id)

      // Get hub names from the routes or hubs data
      const originHub = allHubs.find(h => h.id === leg1.origin_hub_id)
      const destinationHub = allHubs.find(h => h.id === leg2.destination_hub_id)

      const multiLegRoute = {
        id: `multi-${leg1.id}-${leg2.id}`,
        transporterId: null, // Multi-leg doesn't have single transporter
        originHubId: leg1.origin_hub_id,
        destinationHubId: leg2.destination_hub_id,
        transporterName: `Multi-leg via ${intermediateHub?.name || 'Hub'}`,
        durationDays: totalDurationDays,
        pricePerPallet: totalCostPerPallet,
        pricePerUnit: totalCostPerUnit,
        unitsPerPallet: unitsPerPallet,
        customsCostPerShipment: (leg1.customs_cost_per_shipment || 0) + (leg2.customs_cost_per_shipment || 0),
        availableBands: [], // Multi-leg routes don't have single price bands
        // Multi-leg specific fields
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

  if (twoLegRoutes.length > 0) {
    console.log(`   ✅ Found ${twoLegRoutes.length} valid 2-leg routes`)
  } else {
    console.log(`   ❌ No 2-leg routes found`)
  }

  return twoLegRoutes
}

// Get all possible customer-supplier-product combinations
async function generateTradePotentialMatrix(): Promise<TradePotential[]> {
  console.log('🔍 Generating trade potential matrix...')

  // 1. Get all customer requirements
  const { data: customerRequirements, error: customerError } = await supabase
    .from('customer_product_packaging_spec')
    .select(`
      customer_id,
      product_packaging_spec_id,
      customers!inner(
        id,
        name,
        city,
        country,
        staff(
          id,
          name,
          role
        )
      ),
      product_packaging_specs!inner(
        id,
        boxes_per_pallet,
        pieces_per_box,
        weight_per_pallet,
        weight_unit,
        pallet_id,
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
        ),
        pallets(
          id,
          label,
          dimensions_cm
        )
      )
    `)

  if (customerError) throw customerError

  // 2. Get all supplier capabilities
  const { data: supplierCapabilities, error: supplierError } = await supabase
    .from('supplier_product_packaging_spec')
    .select(`
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

  // 3. Get all existing supplier prices
  const { data: existingPrices, error: pricesError } = await supabase
    .from('current_supplier_prices')
    .select('*')

  if (pricesError) throw pricesError

  // 4. Get all transport routes
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

  // 5. Get all hubs with transshipment flag for multi-leg routing
  const { data: allHubs, error: hubsError } = await supabase
    .from('hubs')
    .select(`
      id,
      name,
      city_name,
      country_code,
      can_transship,
      transship_cost_per_pallet,
      transship_handling_time_hours
    `)

  if (hubsError) throw hubsError

  // 6. Get customer logistics capabilities
  const { data: customerLogistics, error: logisticsError } = await supabase
    .from('customer_logistics_capabilities')
    .select(`
      *,
      origin_hub:origin_hub_id (
        id,
        name,
        city_name,
        country_code
      ),
      destination_hub:destination_hub_id (
        id,
        name,
        city_name,
        country_code
      )
    `)

  if (logisticsError) throw logisticsError

  // 6. Get customer certification requirements
  const { data: customerCertRequirements, error: certReqError } = await supabase
    .from('customer_certifications')
    .select(`
      customer_id,
      certification_id,
      is_required,
      certifications!inner(
        id,
        name
      )
    `)
    .eq('is_required', true)

  if (certReqError) throw certReqError

  // 7. Get supplier certifications
  const { data: supplierCertifications, error: supplierCertError } = await supabase
    .from('supplier_certifications')
    .select(`
      supplier_id,
      certification_id,
      expires_at,
      certifications!inner(
        id,
        name
      )
    `)
    .or('expires_at.is.null,expires_at.gt.now()')

  if (supplierCertError) throw supplierCertError

  // 8. Get supplier logistics capabilities (hub information)
  const { data: supplierLogistics, error: supplierLogisticsError } = await supabase
    .from('supplier_logistics_capabilities')
    .select(`
      supplier_id,
      mode,
      origin_hub_id,
      destination_hub_id,
      origin_hub:origin_hub_id (
        id,
        name,
        city_name,
        country_code
      ),
      destination_hub:destination_hub_id (
        id,
        name,
        city_name,
        country_code
      )
    `)

  if (supplierLogisticsError) throw supplierLogisticsError

  // 9. Get existing ACTIVE opportunities to check which potentials already have opportunities
  const { data: existingOpportunities, error: opportunitiesError } = await supabase
    .from('opportunities')
    .select(`
      id,
      customer_id,
      supplier_id,
      product_packaging_spec_id,
      status,
      is_active,
      offer_price_per_unit,
      offer_currency,
      assigned_to,
      created_at,
      valid_till,
      quote_feedback
    `)
    .eq('is_active', true)

  if (opportunitiesError) throw opportunitiesError

  // 10. Get excluded trade potentials
  const { data: excludedPotentials, error: excludedError } = await supabase
    .from('excluded_trade_potentials')
    .select(`
      customer_id,
      supplier_id,
      product_packaging_spec_id,
      reason,
      notes
    `)

  if (excludedError) throw excludedError

  console.log(`📋 Found ${customerRequirements?.length} customer requirements`)
  console.log(`🚫 Found ${excludedPotentials?.length} excluded potentials`)
  console.log(`🏭 Found ${supplierCapabilities?.length} supplier capabilities`)
  console.log(`💰 Found ${existingPrices?.length} existing prices`)
  console.log(`🚛 Found ${transportRoutes?.length} transport routes`)
  console.log(`🏬 Found ${allHubs?.length} hubs (${allHubs?.filter(h => h.can_transship).length} transshipment-enabled)`)
  console.log(`🎯 Found ${customerLogistics?.length} customer logistics capabilities`)
  console.log(`📜 Found ${customerCertRequirements?.length} customer cert requirements`)
  console.log(`✅ Found ${supplierCertifications?.length} supplier certifications`)
  console.log(`🏢 Found ${supplierLogistics?.length} supplier logistics capabilities`)
  console.log(`💼 Found ${existingOpportunities?.length} existing opportunities`)

  const potentials: TradePotential[] = []

  // 5. Create matrix by matching customer requirements with supplier capabilities
  customerRequirements?.forEach(customerReq => {
    const customer = customerReq.customers
    const customerSpec = customerReq.product_packaging_specs
    const product = (customerSpec as any).products?.[0] || (customerSpec as any).products
    const packaging = (customerSpec as any).packaging_options?.[0] || (customerSpec as any).packaging_options
    const size = (customerSpec as any).size_options?.[0] || (customerSpec as any).size_options
    const pallet = (customerSpec as any).pallets?.[0] || (customerSpec as any).pallets

    // Calculate units per pallet based on sold_by for transport cost calculations
    let unitsPerPallet = 0
    const spec = Array.isArray(customerSpec) ? customerSpec[0] : customerSpec
    switch (product.sold_by) {
      case 'kg':
        unitsPerPallet = (spec as any)?.weight_per_pallet || 0
        break
      case 'piece':
      case 'punnet':
        // For piece/punnet: multiply pieces_per_box * boxes_per_pallet
        unitsPerPallet = (spec as any)?.pieces_per_box ? (spec as any).pieces_per_box * (spec as any).boxes_per_pallet : (spec as any)?.boxes_per_pallet || 0
        break
      case 'box':
      case 'bag':
        unitsPerPallet = (spec as any)?.boxes_per_pallet || 0
        break
      default:
        unitsPerPallet = (spec as any)?.boxes_per_pallet || 0
    }

    // Find suppliers who can provide this product
    const matchingSuppliers = supplierCapabilities?.filter(
      supplierCap => supplierCap.product_packaging_spec_id === customerReq.product_packaging_spec_id
    ) || []

    matchingSuppliers.forEach(supplierCap => {
      const supplier = (supplierCap.suppliers as any)?.[0] || supplierCap.suppliers

      // Check if this potential is excluded
      const isExcluded = excludedPotentials?.some(excluded =>
        excluded.customer_id === (customer as any)?.id &&
        excluded.supplier_id === supplier.id &&
        excluded.product_packaging_spec_id === customerReq.product_packaging_spec_id
      )

      // Skip this combination if it's been marked as non-viable
      if (isExcluded) {
        console.log(`🚫 Skipping excluded potential: ${(customer as any)?.name} × ${supplier.name} × ${product?.name}`)
        return
      }

      // Find ALL supplier prices for this product at different hubs
      const supplierPrices = existingPrices?.filter(
        price => price.supplier_id === supplier.id &&
                price.product_packaging_spec_id === customerReq.product_packaging_spec_id
      ) || []

      // If supplier has no prices at all, create one potential without pricing
      const pricesToProcess = supplierPrices.length > 0 ? supplierPrices : [null]

      // Create a separate potential for EACH hub where supplier has a price
      pricesToProcess.forEach(supplierPrice => {

      // Check certification compliance
      const customerCertReqs = customerCertRequirements?.filter(req => req.customer_id === (customer as any)?.id) || []
      const supplierCerts = supplierCertifications?.filter(cert => cert.supplier_id === supplier.id) || []

      const hasCertificationCompliance = customerCertReqs.length === 0 || customerCertReqs.every(req =>
        supplierCerts.some(cert => cert.certification_id === req.certification_id)
      )

      // Get customer logistics capabilities for this customer
      const customerLogisticsCaps = customerLogistics?.filter(cap => cap.customer_id === (customer as any)?.id) || []

      // Check logistics/transport solution
      let hasTransport = false
      let logisticsSolution = null
      let transportRoute = null
      let availableTransportRoutes: any[] = []

      // Get customer hubs for transport checking (both DELIVERY and TRANSIT)
      // DELIVERY: customer receives delivery at destination_hub_id
      // TRANSIT: customer picks up from origin_hub_id (their transit hub)
      const customerDeliveryHubs = [
        ...customerLogisticsCaps
          .filter(cap => cap.mode === 'DELIVERY')
          .map(cap => cap.destination_hub_id)
          .filter(Boolean),
        ...customerLogisticsCaps
          .filter(cap => cap.mode === 'TRANSIT')
          .map(cap => cap.origin_hub_id)
          .filter(Boolean)
      ]

      // Get supplier's logistics capabilities to check delivery hubs
      const supplierLogisticsCaps = supplierLogistics?.filter(cap => cap.supplier_id === supplier.id) || []

      // First, check if supplier and customer are in the same city (simple location match)
      const sameCityMatch = supplier.city && (customer as any)?.city &&
          supplier.city.toLowerCase() === (customer as any).city.toLowerCase() &&
          supplier.country && (customer as any)?.country &&
          supplier.country.toLowerCase() === (customer as any).country.toLowerCase()

      // Second, check if supplier can deliver to customer's logistics hubs (transit or delivery)
      const supplierCanDeliverToCustomerHubs = supplierLogisticsCaps.some(supplierCap => {
        const supplierDestinationHub = (supplierCap as any)?.destination_hub
        if (!supplierDestinationHub) return false

        // Check if supplier can deliver to any of customer's transit or delivery hubs
        return customerLogisticsCaps.some(customerCap => {
          // Check customer's transit hubs (origin_hub for customer pickup)
          const customerTransitHub = (customerCap as any)?.origin_hub
          if (customerTransitHub && customerCap.mode === 'TRANSIT' &&
              customerTransitHub.id === supplierDestinationHub.id) {
            return true
          }

          // Check customer's delivery hubs (destination_hub for customer delivery)
          const customerDeliveryHub = (customerCap as any)?.destination_hub
          if (customerDeliveryHub && customerCap.mode === 'DELIVERY' &&
              customerDeliveryHub.id === supplierDestinationHub.id) {
            return true
          }

          return false
        })
      })

      if (sameCityMatch || supplierCanDeliverToCustomerHubs) {
        hasTransport = true
        logisticsSolution = 'SUPPLIER_DELIVERY'

        // Find the matching supplier capability for route details
        const matchingSupplierCap = supplierLogisticsCaps.find(supplierCap => {
          const supplierDestinationHub = (supplierCap as any)?.destination_hub
          if (!supplierDestinationHub) return false

          // Check if this supplier capability matches a customer hub
          return customerLogisticsCaps.some(customerCap => {
            const customerTransitHub = (customerCap as any)?.origin_hub
            const customerDeliveryHub = (customerCap as any)?.destination_hub

            return (customerTransitHub && customerCap.mode === 'TRANSIT' && customerTransitHub.id === supplierDestinationHub.id) ||
                   (customerDeliveryHub && customerCap.mode === 'DELIVERY' && customerDeliveryHub.id === supplierDestinationHub.id)
          })
        })

        transportRoute = {
          id: 'supplier-transport',
          transporterId: null,
          originHubId: sameCityMatch ? supplier.city : matchingSupplierCap?.origin_hub_id,
          destinationHubId: sameCityMatch ? (customer as any).city : matchingSupplierCap?.destination_hub_id,
          transporterName: 'Supplier Transport',
          durationDays: sameCityMatch ? 0 : 1,
          pricePerPallet: 0,
          pricePerUnit: 0,
          unitsPerPallet: unitsPerPallet,
          customsCostPerShipment: 0,
          availableBands: []
        }
      } else if (supplierPrice?.hub_id) {
        // Supplier has pricing with specific hub - check transport with that hub
        const supplierHub = supplierPrice.hub_id

        // 1. Check if customer is in same location as supplier (no transport needed)
        const customerCanPickupAtSupplierHub = customerLogisticsCaps.some(cap =>
          cap.mode === 'Ex Works' && cap.origin_hub_id === supplierHub
        )

        const customerCanReceiveDeliveryAtSameHub = customerLogisticsCaps.some(cap =>
          cap.mode === 'DELIVERY' && cap.destination_hub_id === supplierHub
        )

        if (customerCanPickupAtSupplierHub || customerCanReceiveDeliveryAtSameHub) {
          hasTransport = true
          logisticsSolution = 'SAME_LOCATION'
          transportRoute = {
            id: 'same-location',
            transporterId: null,
            originHubId: supplierHub,
            destinationHubId: supplierHub,
            transporterName: 'Same Location',
            durationDays: 0,
            pricePerPallet: 0,
            pricePerUnit: 0,
            unitsPerPallet: unitsPerPallet,
            customsCostPerShipment: 0,
            availableBands: []
          }
        } else if (supplierPrice.delivery_mode === 'DELIVERY' && customerDeliveryHubs.includes(supplierHub)) {
          // 2. Check if supplier can deliver to customer's delivery hubs
          hasTransport = true
          logisticsSolution = 'SUPPLIER_DELIVERY'
          transportRoute = {
            id: 'supplier-delivery',
            transporterId: null,
            originHubId: supplierHub,
            destinationHubId: supplierHub,
            transporterName: 'Supplier Delivery',
            durationDays: 1,
            pricePerPallet: 0,
            pricePerUnit: 0,
            unitsPerPallet: unitsPerPallet,
            customsCostPerShipment: 0,
            availableBands: []
          }
        } else if (supplierPrice.delivery_mode === 'Ex Works' && customerCanPickupAtSupplierHub) {
          // 3. Check if supplier offers Ex Works and customer can pickup
          hasTransport = true
          logisticsSolution = 'SAME_LOCATION'
          transportRoute = {
            id: 'ex-works-pickup',
            transporterId: null,
            originHubId: supplierHub,
            destinationHubId: supplierHub,
            transporterName: 'Customer Pickup',
            durationDays: 0,
            pricePerPallet: 0,
            pricePerUnit: 0,
            unitsPerPallet: unitsPerPallet,
            customsCostPerShipment: 0,
            availableBands: []
          }
        } else {
          // 4. Check if third-party transport exists - find ALL matching direct routes
          const directRoutes = transportRoutes?.filter(route =>
            route.origin_hub_id === supplierHub &&
            customerDeliveryHubs.includes(route.destination_hub_id)
          ) || []

          // Convert direct routes to standard format
          const directRoutesConverted = directRoutes.map(route => convertTransportRoute(route, unitsPerPallet))

          // 5. Only search for 2-leg routes if NO direct routes exist
          // This prevents illogical routes like Rome → Belgium → Verona
          let twoLegRoutes: any[] = []
          if (directRoutesConverted.length === 0 && allHubs && allHubs.length > 0) {
            twoLegRoutes = findTwoLegRoutes(
              supplierHub,
              customerDeliveryHubs,
              transportRoutes || [],
              allHubs,
              unitsPerPallet
            )
          }

          // 6. Combine both direct and multi-leg routes into available options
          availableTransportRoutes = [...directRoutesConverted, ...twoLegRoutes]

          if (availableTransportRoutes.length > 0) {
            hasTransport = true

            // Determine logistics solution based on what we found
            if (twoLegRoutes.length > 0) {
              // Only multi-leg available (no direct routes existed)
              logisticsSolution = 'MULTI_LEG_TRANSPORT'
            } else {
              // Direct routes available
              logisticsSolution = 'THIRD_PARTY_TRANSPORT'
            }

            // Use cheapest route overall as default (comparing all options)
            transportRoute = availableTransportRoutes.sort((a, b) => a.pricePerPallet - b.pricePerPallet)[0]
          }
        }
      } else {
        // Supplier has no pricing - check logistics compatibility
        // First check if customer can pickup Ex Works from any of supplier's hubs
        const supplierHubIds = supplierLogistics
          ?.filter(logistics => logistics.supplier_id === supplier.id)
          ?.map(logistics => logistics.origin_hub_id)
          ?.filter(Boolean) || []

        const customerCanPickupFromSupplierHubs = supplierHubIds.some(hubId =>
          customerLogisticsCaps.some(cap => cap.mode === 'Ex Works' && cap.origin_hub_id === hubId)
        )

        if (customerCanPickupFromSupplierHubs) {
          // Customer can pickup Ex Works from supplier's hub
          hasTransport = true
          logisticsSolution = 'SAME_LOCATION'
          const supplierHubId = supplierHubIds.find(hubId =>
            customerLogisticsCaps.some(cap => cap.mode === 'Ex Works' && cap.origin_hub_id === hubId)
          )
          transportRoute = {
            id: 'ex-works-pickup-no-price',
            transporterId: null,
            originHubId: supplierHubId!,
            destinationHubId: supplierHubId!,
            transporterName: 'Customer Pickup',
            durationDays: 0,
            pricePerPallet: 0,
            pricePerUnit: 0,
            unitsPerPallet: unitsPerPallet,
            customsCostPerShipment: 0,
            availableBands: []
          }
        } else if (customerDeliveryHubs.length > 0 && transportRoutes && transportRoutes.length > 0) {
          // Check if transport routes exist from supplier's actual hub locations to customer locations
          // This ensures we only show realistic transport options based on supplier's actual logistics capabilities

          console.log(`🔍 ${supplier.name} has hubs: ${supplierHubIds.join(', ')}`)

          if (supplierHubIds.length > 0) {
            // Find ALL direct transport routes that originate from supplier's actual hubs and reach customer delivery hubs
            const directRoutes = transportRoutes?.filter(route =>
              supplierHubIds.includes(route.origin_hub_id) &&
              customerDeliveryHubs.includes(route.destination_hub_id)
            ) || []

            // Convert direct routes to standard format
            const directRoutesConverted = directRoutes.map(route => convertTransportRoute(route, unitsPerPallet))

            // Only try 2-leg routes if NO direct routes exist
            // This prevents illogical routes like Rome → Belgium → Verona
            const allTwoLegRoutes: any[] = []
            if (directRoutesConverted.length === 0 && allHubs && allHubs.length > 0) {
              supplierHubIds.forEach(hubId => {
                const twoLegRoutes = findTwoLegRoutes(
                  hubId,
                  customerDeliveryHubs,
                  transportRoutes || [],
                  allHubs,
                  unitsPerPallet
                )
                allTwoLegRoutes.push(...twoLegRoutes)
              })
            }

            // Combine both direct and multi-leg routes
            availableTransportRoutes = [...directRoutesConverted, ...allTwoLegRoutes]

            if (availableTransportRoutes.length > 0) {
              hasTransport = true

              // Determine logistics solution based on what we found
              if (allTwoLegRoutes.length > 0) {
                // Only multi-leg available (no direct routes existed)
                logisticsSolution = 'MULTI_LEG_TRANSPORT'
                console.log(`✅ Found ${allTwoLegRoutes.length} multi-leg transport option(s)`)
              } else {
                // Direct routes available
                logisticsSolution = 'THIRD_PARTY_TRANSPORT'
                console.log(`✅ Found ${directRoutesConverted.length} direct transport option(s)`)
              }

              // Use cheapest route overall as default (comparing all options)
              transportRoute = availableTransportRoutes.sort((a, b) => a.pricePerPallet - b.pricePerPallet)[0]
            } else {
              console.log(`❌ No transport options found for ${supplier.name}`)
            }
          } else {
            console.log(`⚠️ ${supplier.name} has no hub logistics configured - cannot determine realistic transport`)
          }
        }
      }

      // Skip this potential if certification requirements are not met
      if (!hasCertificationCompliance) {
        console.log(`   ❌ Skipping ${supplier.name} - certification requirements not met`)
        return // Skip this iteration
      }

      // Determine status
      const hasPrice = !!supplierPrice
      let status: TradePotential['status']
      if (hasPrice && hasTransport) {
        status = 'complete'
      } else if (hasPrice && !hasTransport) {
        status = 'missing_transport'
      } else if (!hasPrice && hasTransport) {
        status = 'missing_price'
      } else {
        status = 'missing_both'
      }

      // Calculate completion score
      const completionScore = (hasPrice ? 50 : 0) + (hasTransport ? 50 : 0)

      // Check for existing opportunities for this combination
      const existingOpportunity = existingOpportunities?.find(opp =>
        opp.customer_id === (customer as any)?.id &&
        opp.supplier_id === supplier.id &&
        opp.product_packaging_spec_id === customerReq.product_packaging_spec_id
      )

      const hasOpportunity = !!existingOpportunity
      const isActiveOpportunity = existingOpportunity?.is_active ?? false

      // Include hub_id in the potential ID to create unique potentials for each hub
      const potentialId = supplierPrice?.hub_id
        ? `${(customer as any)?.id}-${supplier.id}-${customerReq.product_packaging_spec_id}-${supplierPrice.hub_id}`
        : `${(customer as any)?.id}-${supplier.id}-${customerReq.product_packaging_spec_id}`

      const potential: TradePotential = {
        id: potentialId,
        customer: {
          id: (customer as any)?.id,
          name: (customer as any)?.name,
          city: (customer as any)?.city || '',
          country: (customer as any)?.country || '',
          agent: {
            id: (customer as any)?.staff?.[0]?.id || (customer as any)?.staff?.id || '',
            name: (customer as any)?.staff?.[0]?.name || (customer as any)?.staff?.name || '',
            role: (customer as any)?.staff?.[0]?.role || (customer as any)?.staff?.role || ''
          }
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
          specId: (customerSpec as any)?.id,
          palletDimensions: pallet?.dimensions_cm || null
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
          transporterId: (transportRoute as any).transporterId || '',
          originHubId: transportRoute.originHubId,
          destinationHubId: transportRoute.destinationHubId,
          transporterName: transportRoute.transporterName,
          durationDays: transportRoute.durationDays,
          pricePerPallet: transportRoute.pricePerPallet,
          pricePerUnit: (transportRoute as any).pricePerUnit || 0,
          unitsPerPallet: (transportRoute as any).unitsPerPallet || 0,
          customsCostPerShipment: (transportRoute as any).customsCostPerShipment || 0,
          availableBands: (transportRoute as any).availableBands || [],
          // Multi-leg route fields (if present)
          legs: (transportRoute as any).legs,
          totalLegs: (transportRoute as any).totalLegs,
          totalCostPerPallet: (transportRoute as any).totalCostPerPallet,
          totalCostPerUnit: (transportRoute as any).totalCostPerUnit,
          totalDurationDays: (transportRoute as any).totalDurationDays,
          intermediateHubs: (transportRoute as any).intermediateHubs
        } : undefined,
        availableTransportRoutes: availableTransportRoutes.length > 0 ? availableTransportRoutes : undefined,
        priceGap: !hasPrice,
        transportGap: !hasTransport,
        canAddPrice: !hasPrice,
        canAddTransport: !hasTransport,
        completionScore,
        logisticsSolution: logisticsSolution as any,
        hasOpportunity,
        isActiveOpportunity,
        opportunity: existingOpportunity ? {
          id: existingOpportunity.id || '',
          status: existingOpportunity.status as any,
          priority: 'medium' as any, // Default since we don't have priority in the query
          isActive: existingOpportunity.is_active,
          offerPrice: existingOpportunity.offer_price_per_unit,
          offerCurrency: existingOpportunity.offer_currency,
          assignedAgent: existingOpportunity.assigned_to,
          assignedAgentName: '', // We'd need to join with staff to get this
          validTill: existingOpportunity.valid_till,
          quoteSentDate: undefined, // Not in our current schema
          quoteFeedback: existingOpportunity.quote_feedback,
          createdAt: existingOpportunity.created_at,
          updatedAt: existingOpportunity.created_at // Using created_at as fallback
        } : undefined
      }

      potentials.push(potential)
      }) // End of forEach for each supplier price/hub
    }) // End of forEach for each matching supplier
  }) // End of forEach for each customer requirement

  console.log(`🎯 Generated ${potentials.length} trade potentials`)
  console.log(`✅ Complete: ${potentials.filter(p => p.status === 'complete').length}`)
  console.log(`🟡 Missing price: ${potentials.filter(p => p.status === 'missing_price').length}`)
  console.log(`🔴 Missing transport: ${potentials.filter(p => p.status === 'missing_transport').length}`)
  console.log(`⚫ Missing both: ${potentials.filter(p => p.status === 'missing_both').length}`)

  return potentials
}

export function useTradePotential(statusFilter: PotentialStatus = 'all') {
  return useQuery({
    queryKey: ['trade-potential', statusFilter],
    queryFn: async () => {
      const allPotentials = await generateTradePotentialMatrix()

      // Apply status filter
      const filteredPotentials = statusFilter === 'all'
        ? allPotentials
        : allPotentials.filter(p => p.status === statusFilter)

      // Generate summary
      const summary: TradePotentialSummary = {
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
    staleTime: 0, // Force immediate refresh
  })
}

export function useAddSupplierPrice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (priceData: NewSupplierPrice) => {
      const { data, error } = await supabase
        .from('supplier_prices')
        .insert(priceData)
        .select()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trade-potential'] })
      queryClient.invalidateQueries({ queryKey: ['trade-opportunities'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-prices'] })
    }
  })
}