import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ProductFinderCriteria {
  product_id: string
  delivery_mode: 'delivery' | 'ex_works'
  delivery_hub_id?: string // Only required for delivery mode
  size_option_id?: string // Optional size filter
  customer_id?: string // Optional customer for certification filtering
}

export interface SupplierResult {
  id: string
  name: string
  location: string
  phone?: string
  email?: string
  delivery_modes: string[]
  distance_km?: number
  rating?: number
  certifications: string[]
  agent?: {
    id: string
    name: string
    role?: string
  }
  available_from_hub: {
    id: string
    name: string
    city: string
    country_code: string
  }
  delivery_to_hub?: {
    id: string
    name: string
    city: string
    country_code: string
    transport_days: number
    cost_estimate?: number
    transporter_name?: string
    is_supplier_transport?: boolean
    pricing_bands?: {
      min_pallets: number
      max_pallets: number | null
      price_per_pallet: number
      pallet_dimensions: string
    }[]
    multi_hop_route?: {
      transshipment_hub: {
        id?: string
        name?: string
        city?: string
        handling_time_hours?: number
        handling_cost_per_pallet?: number
      }
      first_leg: {
        from_hub?: string
        to_hub?: string
        duration_days: number
        transport_type: 'supplier_delivery'
        mode?: string
      }
      second_leg: {
        from_hub?: string
        to_hub?: string
        duration_days: number
        transport_type: 'transporter_delivery'
        transporter_name?: string
        cost_per_pallet?: number
      }
    }
  }
  seasonal_availability: string[]
  is_currently_available: boolean
  product_specs: {
    id: string
    boxes_per_pallet: number
    weight_per_box: number
    weight_per_pallet: number
    pieces_per_box: number
    packaging_type: string
    size_option: string
  }[]
}

// Helper function to check if supplier meets customer certification requirements
const supplierMeetsCertificationRequirements = (supplierCerts: any[], customerRequiredCertifications: any[]) => {
  if (!customerRequiredCertifications || customerRequiredCertifications.length === 0) {
    return true // No requirements, so all suppliers qualify
  }

  const supplierCertNames = new Set(
    supplierCerts
      .map(sc => sc.certifications?.name)
      .filter(Boolean)
  )

  const requiredCertNames = customerRequiredCertifications
    .map(cc => cc.certifications?.name)
    .filter(Boolean)

  // Check if supplier has all required certifications
  return requiredCertNames.every(required => supplierCertNames.has(required))
}

// Helper function to get seasonal availability from supplier product data
const getSeasonalAvailability = (supplierProduct: any): string[] => {
  // Check if we have seasonal data
  if (supplierProduct.season) {
    return [supplierProduct.season]
  }

  // If we have available months, convert them to seasonal display
  if (supplierProduct.available_months && supplierProduct.available_months.length > 0) {
    // If all 12 months, it's year round
    if (supplierProduct.available_months.length === 12) {
      return ['year_round']
    }

    // Otherwise, show the specific months
    return supplierProduct.available_months
  }

  // Default fallback - but this indicates missing seasonal data
  return ['year_round']
}

// Helper function to check if supplier is currently available based on seasonal data
const isCurrentlyAvailable = (supplierProduct: any): boolean => {
  const now = new Date()
  const currentMonth = now.toLocaleDateString('en-US', { month: 'long' }).toLowerCase()

  // If year round, always available
  if (supplierProduct.season === 'year_round') {
    return true
  }

  // Check specific available months
  if (supplierProduct.available_months && supplierProduct.available_months.length > 0) {
    // If all 12 months, it's year round
    if (supplierProduct.available_months.length === 12) {
      return true
    }
    // Check if current month is in available months
    return supplierProduct.available_months.includes(currentMonth)
  }

  // Check seasonal availability
  if (supplierProduct.season) {
    const currentDate = now.getDate()
    const currentMonthNum = now.getMonth() + 1 // 1-12

    switch (supplierProduct.season) {
      case 'spring':
        // March (3) to May (5)
        return currentMonthNum >= 3 && currentMonthNum <= 5
      case 'summer':
        // June (6) to August (8)
        return currentMonthNum >= 6 && currentMonthNum <= 8
      case 'autumn':
        // September (9) to November (11)
        return currentMonthNum >= 9 && currentMonthNum <= 11
      case 'winter':
        // December (12), January (1), February (2)
        return currentMonthNum === 12 || currentMonthNum === 1 || currentMonthNum === 2
      case 'year_round':
        return true
      default:
        return true
    }
  }

  // Default fallback - if no seasonal data, assume available
  return true
}

export function useProductFinder(criteria: ProductFinderCriteria | null) {
  return useQuery({
    queryKey: ['product-finder', criteria],
    queryFn: async () => {
      if (!criteria) return []

      console.log('Searching for suppliers with criteria:', criteria)

      // First get product packaging specs for the requested product
      let productSpecsQuery = supabase
        .from('product_packaging_specs')
        .select('id')
        .eq('product_id', criteria.product_id)
      
      // Apply size filter if specified
      if (criteria.size_option_id) {
        productSpecsQuery = productSpecsQuery.eq('size_option_id', criteria.size_option_id)
      }
      
      const { data: productSpecs, error: specsError } = await productSpecsQuery
      
      if (specsError) {
        console.error('Error fetching product specs:', specsError)
        throw specsError
      }
      
      if (!productSpecs || productSpecs.length === 0) {
        console.log('No product packaging specs found for product:', criteria.product_id)
        return []
      }
      
      const specIds = productSpecs.map(s => s.id)
      console.log('Found product packaging spec IDs:', specIds)
      
      // Query suppliers that have the requested product
      const { data: supplierProducts, error: supplierError } = await supabase
        .from('supplier_product_packaging_spec')
        .select(`
          *,
          suppliers:supplier_id(
            id,
            name,
            city,
            country,
            phone_number,
            email,
            staff:agent_id(id, name, role)
          ),
          product_packaging_specs:product_packaging_spec_id(
            id,
            boxes_per_pallet,
            weight_per_box,
            weight_per_pallet,
            pieces_per_box,
            products:product_id(
              id,
              name,
              category
            ),
            packaging_options:packaging_id(
              id,
              label,
              unit_type
            ),
            size_options:size_option_id(
              id,
              name
            )
          )
        `)
        .in('product_packaging_spec_id', specIds)

      if (supplierError) {
        console.error('Error fetching supplier products:', supplierError)
        throw supplierError
      }

      if (!supplierProducts || supplierProducts.length === 0) {
        return []
      }

      // Get supplier logistics capabilities
      const supplierIds = supplierProducts.map(sp => sp.supplier_id)
      
      const { data: logistics, error: logisticsError } = await supabase
        .from('supplier_logistics_capabilities')
        .select(`
          *,
          origin_hub:hubs!origin_hub_id(
            id,
            name,
            city_name,
            country_code
          ),
          destination_hub:hubs!destination_hub_id(
            id,
            name,
            city_name,
            country_code
          )
        `)
        .in('supplier_id', supplierIds)

      if (logisticsError) {
        console.error('Error fetching logistics:', logisticsError)
        throw logisticsError
      }

      // Get supplier certifications
      const { data: certifications, error: certError } = await supabase
        .from('supplier_certifications')
        .select(`
          *,
          certifications:certification_id(
            id,
            name
          )
        `)
        .in('supplier_id', supplierIds)

      if (certError) {
        console.error('Error fetching certifications:', certError)
        throw certError
      }

      // Get customer certification requirements if customer is specified
      let customerRequiredCertifications = null
      if (criteria.customer_id) {
        const { data: customerCerts, error: customerCertsError } = await supabase
          .from('customer_certifications')
          .select(`
            *,
            certifications:certification_id(
              id,
              name
            )
          `)
          .eq('customer_id', criteria.customer_id)
          .eq('is_required', true)

        if (customerCertsError) {
          console.error('Error fetching customer certifications:', customerCertsError)
          throw customerCertsError
        }

        customerRequiredCertifications = customerCerts || []
        console.log('Customer required certifications:', customerRequiredCertifications.map(c => c.certifications?.name))
      }

      // For delivery mode, get transporter routes to target hub(s)
      let routes = null
      let pricingBands = null
      let customerDeliveryHubs = null
      let targetHubIds: string[] = []

      if (criteria.delivery_mode === 'delivery') {
        // If customer is specified but no specific delivery hub, get customer's delivery hubs
        if (criteria.customer_id && !criteria.delivery_hub_id) {
          const { data: customerHubs, error: customerHubsError } = await supabase
            .from('customer_logistics_capabilities')
            .select(`
              destination_hub_id,
              destination_hub:hubs!destination_hub_id(
                id,
                name,
                city_name,
                country_code
              )
            `)
            .eq('customer_id', criteria.customer_id)
            .not('destination_hub_id', 'is', null)

          if (customerHubsError) {
            console.error('Error fetching customer delivery hubs:', customerHubsError)
            throw customerHubsError
          }

          customerDeliveryHubs = customerHubs?.map(ch => ch.destination_hub_id).filter(Boolean) || []
          console.log('Customer delivery hubs:', customerDeliveryHubs)
        }

        // Get routes for specific hub or customer's hubs
        targetHubIds = criteria.delivery_hub_id
          ? [criteria.delivery_hub_id]
          : customerDeliveryHubs || []

        if (targetHubIds.length > 0) {
          const { data: routeData, error: routesError } = await supabase
            .from('transporter_routes')
            .select(`
              *,
              origin_hub:hubs!origin_hub_id(
                id,
                name,
                city_name,
                country_code
              ),
              destination_hub:hubs!destination_hub_id(
                id,
                name,
                city_name,
                country_code
              ),
              transporters(
                id,
                name
              )
            `)
            .in('destination_hub_id', targetHubIds)
            .eq('is_active', true)

          if (routesError) {
            console.error('Error fetching routes:', routesError)
            throw routesError
          }
          routes = routeData
        }
      }

      // Get pricing bands for these routes
      if (routes && routes.length > 0) {
        const routeIds = routes.map(r => r.id)
        const { data: pricingData, error: pricingError } = await supabase
          .from('transporter_route_price_bands')
          .select('*')
          .in('transporter_route_id', routeIds)
          .order('min_pallets', { ascending: true })

        if (pricingError) {
          console.error('Error fetching pricing bands:', pricingError)
        } else {
          pricingBands = pricingData
        }
      }

      console.log('Available transporter routes to destination:', routes?.map(r => ({
        from: r.origin_hub?.name,
        from_id: r.origin_hub_id,
        to: r.destination_hub?.name,
        to_id: r.destination_hub_id
      })))

      // Get multi-hop possibilities for delivery mode
      let multiHopRoutes = null
      if (criteria.delivery_mode === 'delivery' && targetHubIds.length > 0) {

        // Step 1: Find all transshipment hubs that transporters can reach our target destinations from
        const { data: transshipHubs, error: transshipError } = await supabase
          .from('transporter_routes')
          .select(`
            id,
            origin_hub_id,
            destination_hub_id,
            transporter_id,
            transport_duration_days,
            origin_hub:hubs!origin_hub_id(
              id,
              name,
              city_name,
              country_code,
              can_transship,
              transship_handling_time_hours,
              transship_cost_per_pallet
            ),
            destination_hub:hubs!destination_hub_id(id, name, city_name, country_code),
            transporters(id, name)
          `)
          .in('destination_hub_id', targetHubIds)
          .eq('is_active', true)
          .not('origin_hub.can_transship', 'is', null)
          .eq('origin_hub.can_transship', true)

        if (transshipError) {
          console.error('Error fetching transshipment routes:', transshipError)
        } else {
          multiHopRoutes = transshipHubs
        }

        // Get pricing for the second leg (transshipment → destination)
        if (multiHopRoutes && multiHopRoutes.length > 0) {
          const routeIds = multiHopRoutes.map(r => r.id)
          const { data: secondLegPricing, error: pricingError } = await supabase
            .from('transporter_route_price_bands')
            .select('*')
            .in('transporter_route_id', routeIds)
            .order('min_pallets', { ascending: true })

          if (!pricingError && secondLegPricing) {
            multiHopRoutes.forEach(route => {
              route.pricing_bands = secondLegPricing.filter(p => p.transporter_route_id === route.id)
            })
          }
        }
      }

      console.log('Available transshipment hubs for multi-hop:', multiHopRoutes?.map(r => ({
        transship_hub: r.origin_hub?.name,
        transship_hub_id: r.origin_hub_id,
        to: r.destination_hub?.name,
        transporter: r.transporters?.name,
        can_transship: r.origin_hub?.can_transship
      })))

      // Process the data to create SupplierResult objects
      const results: SupplierResult[] = []

      for (const supplierProduct of supplierProducts) {
        const supplier = supplierProduct.suppliers
        if (!supplier) continue

        const supplierLogistics = logistics?.filter(l => l.supplier_id === supplier.id) || []
        const supplierCertifications = certifications?.filter(c => c.supplier_id === supplier.id) || []

        // Skip supplier if they don't meet customer certification requirements
        if (!supplierMeetsCertificationRequirements(supplierCertifications, customerRequiredCertifications)) {
          console.log(`Supplier ${supplier.name} skipped - missing required certifications`)
          continue
        }
        
        console.log(`Supplier ${supplier.name} logistics:`, supplierLogistics.map(l => ({
          mode: l.mode,
          from_hub: l.origin_hub?.name,
          from_hub_id: l.origin_hub_id,
          to_hub: l.destination_hub?.name,
          to_hub_id: l.destination_hub_id
        })))
        
        if (criteria.delivery_mode === 'ex_works') {
          // For Ex Works mode, show all suppliers with their pickup locations
          for (const logistic of supplierLogistics) {
            if (!logistic.origin_hub) continue
            
            const result: SupplierResult = {
              id: `${supplier.id}-${logistic.id}`,
              name: supplier.name,
              location: [supplier.city, supplier.country].filter(Boolean).join(', ') || 'Location not specified',
              phone: supplier.phone_number || undefined,
              email: supplier.email,
              delivery_modes: ['Ex Works'],
              certifications: supplierCertifications
                .map(sc => sc.certifications?.name)
                .filter(Boolean) as string[],
              agent: supplier.staff ? {
                id: supplier.staff.id,
                name: supplier.staff.name,
                role: supplier.staff.role
              } : undefined,
              available_from_hub: {
                id: logistic.origin_hub.id,
                name: logistic.origin_hub.name,
                city: logistic.origin_hub.city_name || 'Unknown',
                country_code: logistic.origin_hub.country_code || 'N/A'
              },
              delivery_to_hub: undefined, // No delivery for ex works
              seasonal_availability: getSeasonalAvailability(supplierProduct),
              is_currently_available: isCurrentlyAvailable(supplierProduct),
              product_specs: supplierProduct.product_packaging_specs ? [{
                id: supplierProduct.product_packaging_specs.id,
                boxes_per_pallet: supplierProduct.product_packaging_specs.boxes_per_pallet || 0,
                weight_per_box: supplierProduct.product_packaging_specs.weight_per_box || 0,
                weight_per_pallet: supplierProduct.product_packaging_specs.weight_per_pallet || 0,
                pieces_per_box: supplierProduct.product_packaging_specs.pieces_per_box || 0,
                packaging_type: supplierProduct.product_packaging_specs.packaging_options?.label || 'Standard',
                size_option: supplierProduct.product_packaging_specs.size_options?.name || 'Standard'
              }] : []
            }
            results.push(result)
          }
        } else if (criteria.delivery_mode === 'delivery') {
          // For Delivery mode, show suppliers that can deliver to target hub
          // This includes both direct delivery AND Ex Works with transporter routes
          for (const logistic of supplierLogistics) {
            if (!logistic.origin_hub) continue

            let deliveryToHub = undefined
            
            // Check if supplier can deliver directly to target hub(s)
            // targetHubIds is already declared at function level

            const directDelivery = supplierLogistics.find(l =>
              l.destination_hub_id && targetHubIds.includes(l.destination_hub_id)
            )
            
            if (directDelivery && directDelivery.destination_hub) {
              deliveryToHub = {
                id: directDelivery.destination_hub.id,
                name: directDelivery.destination_hub.name,
                city: directDelivery.destination_hub.city_name || 'Unknown',
                country_code: directDelivery.destination_hub.country_code || 'N/A',
                transport_days: directDelivery.typical_lead_time_days || 1,
                cost_estimate: undefined, // Would need pricing data
                is_supplier_transport: true,
                transporter_name: 'Direct from Supplier'
              }
            } else {
              // Check if there's a transporter route from supplier's hub to target hub
              // This allows Ex Works suppliers to be matched with transporter routes
              const availableRoute = routes?.find(r => 
                r.origin_hub_id === logistic.origin_hub_id
              )
              
              if (availableRoute && availableRoute.destination_hub) {
                // Get pricing bands for this specific route
                const routePricing = pricingBands?.filter(p => p.transporter_route_id === availableRoute.id) || []
                
                deliveryToHub = {
                  id: availableRoute.destination_hub.id,
                  name: availableRoute.destination_hub.name,
                  city: availableRoute.destination_hub.city_name || 'Unknown',
                  country_code: availableRoute.destination_hub.country_code || 'N/A',
                  transport_days: availableRoute.transport_duration_days || 2,
                  cost_estimate: routePricing.length > 0 ? routePricing[0].price_per_pallet : undefined,
                  is_supplier_transport: false,
                  transporter_name: availableRoute.transporters?.name || 'Third-party Transport',
                  pricing_bands: routePricing.map(p => ({
                    min_pallets: p.min_pallets,
                    max_pallets: p.max_pallets,
                    price_per_pallet: p.price_per_pallet,
                    pallet_dimensions: p.pallet_dimensions
                  }))
                }
              } else {
                // Check if this supplier can deliver to any transshipment hub that has onward transport
                const supplierCanDeliverToTransship = supplierLogistics.find(sl => {
                  // Check if supplier can deliver TO a transshipment hub
                  if (!sl.destination_hub_id) return false

                  // Check if there's a transporter route FROM that same hub to our target
                  const onwardRoute = multiHopRoutes?.find(mhr =>
                    mhr.origin_hub_id === sl.destination_hub_id
                  )

                  return !!onwardRoute
                })

                if (supplierCanDeliverToTransship) {
                  // Find the matching onward transport route
                  const onwardRoute = multiHopRoutes?.find(mhr =>
                    mhr.origin_hub_id === supplierCanDeliverToTransship.destination_hub_id
                  )

                  if (onwardRoute) {
                    const routePricing = onwardRoute.pricing_bands || []
                    const transshipHub = onwardRoute.origin_hub

                    // Calculate total cost and time
                    const supplierDuration = supplierCanDeliverToTransship.typical_lead_time_days || 1
                    const transportDuration = onwardRoute.transport_duration_days || 2
                    const handlingTime = Math.ceil((transshipHub?.transship_handling_time_hours || 4) / 24)
                    const totalDuration = supplierDuration + transportDuration + handlingTime

                    // Estimate total cost (supplier delivery + handling + transport)
                    const handlingCost = transshipHub?.transship_cost_per_pallet || 15
                    const transportCost = routePricing.length > 0 ? routePricing[0].price_per_pallet : 40
                    const estimatedTotalCost = handlingCost + transportCost

                    deliveryToHub = {
                      id: onwardRoute.destination_hub.id,
                      name: onwardRoute.destination_hub.name,
                      city: onwardRoute.destination_hub.city_name || 'Unknown',
                      country_code: onwardRoute.destination_hub.country_code || 'N/A',
                      transport_days: totalDuration,
                      cost_estimate: estimatedTotalCost,
                      is_supplier_transport: false,
                      transporter_name: 'Multi-hop Transport',
                      multi_hop_route: {
                        transshipment_hub: {
                          id: transshipHub?.id,
                          name: transshipHub?.name,
                          city: transshipHub?.city_name,
                          handling_time_hours: transshipHub?.transship_handling_time_hours,
                          handling_cost_per_pallet: transshipHub?.transship_cost_per_pallet
                        },
                        first_leg: {
                          from_hub: logistic.origin_hub?.name,
                          to_hub: transshipHub?.name,
                          duration_days: supplierDuration,
                          transport_type: 'supplier_delivery',
                          mode: supplierCanDeliverToTransship.mode
                        },
                        second_leg: {
                          from_hub: transshipHub?.name,
                          to_hub: onwardRoute.destination_hub.name,
                          duration_days: transportDuration,
                          transport_type: 'transporter_delivery',
                          transporter_name: onwardRoute.transporters?.name,
                          cost_per_pallet: transportCost
                        }
                      },
                      pricing_bands: routePricing.map(p => ({
                        min_pallets: p.min_pallets,
                        max_pallets: p.max_pallets,
                        price_per_pallet: p.price_per_pallet + handlingCost, // Include handling in total price
                        pallet_dimensions: p.pallet_dimensions
                      }))
                    }
                  }
                }
              }
            }

            // Only include suppliers that have delivery options
            if (deliveryToHub) {
              const result: SupplierResult = {
                id: `${supplier.id}-${logistic.id}`,
                name: supplier.name,
                location: [supplier.city, supplier.country].filter(Boolean).join(', ') || 'Location not specified',
                phone: supplier.phone_number || undefined,
                email: supplier.email,
                delivery_modes: [logistic.mode],
                certifications: supplierCertifications
                  .map(sc => sc.certifications?.name)
                  .filter(Boolean) as string[],
                agent: supplier.staff ? {
                  id: supplier.staff.id,
                  name: supplier.staff.name,
                  role: supplier.staff.role
                } : undefined,
                available_from_hub: {
                  id: logistic.origin_hub.id,
                  name: logistic.origin_hub.name,
                  city: logistic.origin_hub.city_name || 'Unknown',
                  country_code: logistic.origin_hub.country_code || 'N/A'
                },
                delivery_to_hub: deliveryToHub,
                seasonal_availability: getSeasonalAvailability(supplierProduct),
                is_currently_available: isCurrentlyAvailable(supplierProduct),
                product_specs: supplierProduct.product_packaging_specs ? [{
                  id: supplierProduct.product_packaging_specs.id,
                  boxes_per_pallet: supplierProduct.product_packaging_specs.boxes_per_pallet || 0,
                  weight_per_box: supplierProduct.product_packaging_specs.weight_per_box || 0,
                  weight_per_pallet: supplierProduct.product_packaging_specs.weight_per_pallet || 0,
                  pieces_per_box: supplierProduct.product_packaging_specs.pieces_per_box || 0,
                  packaging_type: supplierProduct.product_packaging_specs.packaging_options?.label || 'Standard',
                  size_option: supplierProduct.product_packaging_specs.size_options?.name || 'Standard'
                }] : []
              }
              results.push(result)
            }
          }
        }
      }

      // Remove duplicates and sort
      const uniqueResults = results.filter((result, index, self) => 
        index === self.findIndex(r => r.name === result.name && r.available_from_hub.id === result.available_from_hub.id)
      )

      return uniqueResults.sort((a, b) => {
        // First, prioritize available products (currently in season)
        if (a.is_currently_available !== b.is_currently_available) {
          return a.is_currently_available ? -1 : 1
        }

        // For delivery mode, prioritize those with direct delivery
        if (criteria.delivery_mode === 'delivery') {
          if (!!a.delivery_to_hub !== !!b.delivery_to_hub) {
            return a.delivery_to_hub ? -1 : 1
          }
        }
        return a.name.localeCompare(b.name)
      })
    },
    enabled: !!criteria?.product_id && (
      criteria.delivery_mode === 'ex_works' ||
      !!criteria.delivery_hub_id ||
      (criteria.delivery_mode === 'delivery' && !!criteria.customer_id)
    ),
  })
}
