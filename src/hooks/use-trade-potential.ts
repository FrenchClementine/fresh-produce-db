'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { TradePotential, TradePotentialSummary, NewSupplierPrice, PotentialStatus } from '@/types/trade-potential'

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
        weight_per_pallet,
        weight_unit,
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

  // 5. Get customer logistics capabilities
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

    // Calculate units per pallet based on sold_by for transport cost calculations
    let unitsPerPallet = 0
    const spec = Array.isArray(customerSpec) ? customerSpec[0] : customerSpec
    switch (product.sold_by) {
      case 'kg':
        unitsPerPallet = (spec as any)?.weight_per_pallet || 0
        break
      case 'piece':
        unitsPerPallet = (spec as any)?.pieces_per_box ? (spec as any).pieces_per_box * (spec as any).boxes_per_pallet : (spec as any)?.boxes_per_pallet || 0
        break
      case 'box':
      case 'punnet':
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

      // Check if supplier has pricing for this product
      const supplierPrice = existingPrices?.find(
        price => price.supplier_id === supplier.id &&
                price.product_packaging_spec_id === customerReq.product_packaging_spec_id
      )

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

      // Get customer delivery hubs for transport checking
      const customerDeliveryHubs = customerLogisticsCaps
        .filter(cap => cap.mode === 'DELIVERY')
        .map(cap => cap.destination_hub_id)
        .filter(Boolean)

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
            availableBands: []
          }
        } else {
          // 4. Check if third-party transport exists
          const availableRoute = transportRoutes?.find(route =>
            route.origin_hub_id === supplierHub &&
            customerDeliveryHubs.includes(route.destination_hub_id)
          )

          if (availableRoute) {
            hasTransport = true
            logisticsSolution = 'THIRD_PARTY_TRANSPORT'
            const pricePerPallet = availableRoute.transporter_route_price_bands?.[0]?.price_per_pallet || 0
            const pricePerUnit = unitsPerPallet > 0 ? pricePerPallet / unitsPerPallet : 0

            transportRoute = {
              id: availableRoute.id,
              transporterId: availableRoute.transporter_id,
              originHubId: availableRoute.origin_hub_id,
              destinationHubId: availableRoute.destination_hub_id,
              transporterName: (availableRoute.transporters as any)?.name || 'Third-party Transport',
              durationDays: availableRoute.transport_duration_days,
              pricePerPallet: pricePerPallet,
              pricePerUnit: pricePerUnit,
              unitsPerPallet: unitsPerPallet,
              availableBands: availableRoute.transporter_route_price_bands || []
            }
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
            availableBands: []
          }
        } else if (customerDeliveryHubs.length > 0 && transportRoutes && transportRoutes.length > 0) {
          // Check if transport routes exist from supplier's actual hub locations to customer locations
          // This ensures we only show realistic transport options based on supplier's actual logistics capabilities

          console.log(`🔍 ${supplier.name} has hubs: ${supplierHubIds.join(', ')}`)

          if (supplierHubIds.length > 0) {
            // Find transport routes that originate from supplier's actual hubs and reach customer delivery hubs
            const availableRoute = transportRoutes?.find(route =>
              supplierHubIds.includes(route.origin_hub_id) &&
              customerDeliveryHubs.includes(route.destination_hub_id)
            )

            if (availableRoute) {
              hasTransport = true
              logisticsSolution = 'THIRD_PARTY_TRANSPORT'
              const pricePerPallet = availableRoute.transporter_route_price_bands?.[0]?.price_per_pallet || 0
              const pricePerUnit = unitsPerPallet > 0 ? pricePerPallet / unitsPerPallet : 0

              console.log(`✅ Found realistic transport: ${availableRoute.transporters?.name} from hub ${availableRoute.origin_hub_id} → ${availableRoute.destination_hub_id}`)

              transportRoute = {
                id: availableRoute.id,
                transporterId: availableRoute.transporter_id,
                originHubId: availableRoute.origin_hub_id,
                destinationHubId: availableRoute.destination_hub_id,
                transporterName: (availableRoute.transporters as any)?.name || 'Third-party Transport',
                durationDays: availableRoute.transport_duration_days,
                pricePerPallet: pricePerPallet,
                pricePerUnit: pricePerUnit,
                unitsPerPallet: unitsPerPallet,
                availableBands: availableRoute.transporter_route_price_bands || []
              }
            } else {
              console.log(`❌ No realistic transport found for ${supplier.name} - no routes from their hubs (${supplierHubIds.join(', ')}) to customer hubs`)
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

      const potential: TradePotential = {
        id: `${(customer as any)?.id}-${supplier.id}-${customerReq.product_packaging_spec_id}`,
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
          specId: (customerSpec as any)?.id
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
          availableBands: (transportRoute as any).availableBands || []
        } : undefined,
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
    })
  })

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
    staleTime: 1000 * 60 * 5, // 5 minutes
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