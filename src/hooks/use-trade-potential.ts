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
      origin_hub_id,
      destination_hub_id,
      transport_duration_days,
      is_active,
      transporters!inner(
        name,
        is_active
      ),
      transporter_route_price_bands(
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
    .select('*')

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

  console.log(`📋 Found ${customerRequirements?.length} customer requirements`)
  console.log(`🏭 Found ${supplierCapabilities?.length} supplier capabilities`)
  console.log(`💰 Found ${existingPrices?.length} existing prices`)
  console.log(`🚛 Found ${transportRoutes?.length} transport routes`)
  console.log(`🎯 Found ${customerLogistics?.length} customer logistics capabilities`)
  console.log(`📜 Found ${customerCertRequirements?.length} customer cert requirements`)
  console.log(`✅ Found ${supplierCertifications?.length} supplier certifications`)

  const potentials: TradePotential[] = []

  // 5. Create matrix by matching customer requirements with supplier capabilities
  customerRequirements?.forEach(customerReq => {
    const customer = customerReq.customers
    const customerSpec = customerReq.product_packaging_specs
    const product = customerSpec.products
    const packaging = customerSpec.packaging_options
    const size = customerSpec.size_options

    // Find suppliers who can provide this product
    const matchingSuppliers = supplierCapabilities?.filter(
      supplierCap => supplierCap.product_packaging_spec_id === customerReq.product_packaging_spec_id
    ) || []

    matchingSuppliers.forEach(supplierCap => {
      const supplier = supplierCap.suppliers

      // Check if supplier has pricing for this product
      const supplierPrice = existingPrices?.find(
        price => price.supplier_id === supplier.id &&
                price.product_packaging_spec_id === customerReq.product_packaging_spec_id
      )

      // Check certification compliance
      const customerCertReqs = customerCertRequirements?.filter(req => req.customer_id === customer.id) || []
      const supplierCerts = supplierCertifications?.filter(cert => cert.supplier_id === supplier.id) || []

      const hasCertificationCompliance = customerCertReqs.length === 0 || customerCertReqs.every(req =>
        supplierCerts.some(cert => cert.certification_id === req.certification_id)
      )

      // Get customer logistics capabilities for this customer
      const customerLogisticsCaps = customerLogistics?.filter(cap => cap.customer_id === customer.id) || []

      // Check logistics/transport solution
      let hasTransport = false
      let logisticsSolution = null

      if (supplierPrice?.hub_id) {
        // Supplier has pricing with specific hub

        // 1. Check if customer is in same location as supplier (no transport needed)
        const supplierHub = supplierPrice.hub_id
        const customerCanPickupAtSupplierHub = customerLogisticsCaps.some(cap =>
          cap.mode === 'Ex Works' && cap.origin_hub_id === supplierHub
        )

        const customerCanReceiveDeliveryAtSameHub = customerLogisticsCaps.some(cap =>
          cap.mode === 'DELIVERY' && cap.destination_hub_id === supplierHub
        )

        if (customerCanPickupAtSupplierHub || customerCanReceiveDeliveryAtSameHub) {
          hasTransport = true
          logisticsSolution = 'SAME_LOCATION'
        } else {
          // 2. Check if supplier can deliver to customer's delivery hubs
          const customerDeliveryHubs = customerLogisticsCaps
            .filter(cap => cap.mode === 'DELIVERY')
            .map(cap => cap.destination_hub_id)
            .filter(Boolean)

          if (supplierPrice.delivery_mode === 'DELIVERY' && customerDeliveryHubs.includes(supplierHub)) {
            hasTransport = true
            logisticsSolution = 'SUPPLIER_DELIVERY'
          } else {
            // 3. Check if third-party transport exists
            hasTransport = transportRoutes?.some(route =>
              route.origin_hub_id === supplierHub &&
              customerDeliveryHubs.includes(route.destination_hub_id)
            ) || false
            if (hasTransport) logisticsSolution = 'THIRD_PARTY_TRANSPORT'
          }
        }
      } else {
        // Supplier has no pricing - optimistically assume transport could exist
        hasTransport = transportRoutes && transportRoutes.length > 0
        logisticsSolution = 'UNKNOWN'
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

      const potential: TradePotential = {
        id: `${customer.id}-${supplier.id}-${customerReq.product_packaging_spec_id}`,
        customer: {
          id: customer.id,
          name: customer.name,
          city: customer.city || '',
          country: customer.country || '',
          agent: {
            id: customer.staff?.id || '',
            name: customer.staff?.name || '',
            role: customer.staff?.role || ''
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
          specId: customerSpec.id
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
        priceGap: !hasPrice,
        transportGap: !hasTransport,
        canAddPrice: !hasPrice,
        canAddTransport: !hasTransport,
        completionScore,
        logisticsSolution
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