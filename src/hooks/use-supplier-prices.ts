'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useEffect } from 'react'

export interface SupplierPrice {
  id: string
  supplier_id: string
  supplier_product_packaging_spec_id: string
  hub_id: string
  price_per_unit: number
  currency: string
  delivery_mode: 'Ex Works' | 'DELIVERY' | 'TRANSIT'
  valid_from: string
  valid_until: string
  is_active: boolean
  created_by_staff_id: string | null
  notes?: string
  created_at: string
}

export interface CurrentSupplierPrice extends SupplierPrice {
  supplier_name: string
  hub_name: string
  hub_code: string
  product_packaging_spec_id: string
  product_id: string
  product_name: string
  sold_by: string
  packaging_label: string
  size_name: string
  boxes_per_pallet: number
  weight_per_box: number
  weight_per_pallet: number
  weight_unit: string
  units_per_pallet: number
  product_packaging_specs: {
    products: {
      id: string
      name: string
      category: string
      sold_by: string
    }
    weight_per_pallet: number
    boxes_per_pallet: number
    weight_per_box: number
    weight_unit: string
  }
  created_by_name?: string
  suppliers?: {
    agent_id: string | null
    staff: {
      id: string
      name: string
      role: string
    } | null
  }
}

// Fetch current active prices from the view (including recently expired ones)
export function useCurrentSupplierPrices(supplierId?: string) {
  return useQuery({
    queryKey: ['current-supplier-prices', supplierId],
    queryFn: async () => {
      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      // First, get active prices from the view
      let activeQuery = supabase
        .from('current_supplier_prices')
        .select('*')
        .order('product_name', { ascending: true })

      if (supplierId) {
        activeQuery = activeQuery.eq('supplier_id', supplierId)
      }

      const { data: activeData, error: activeError } = await activeQuery

      if (activeError) throw activeError

      // Then, get recently expired prices (active but expired within 7 days)
      let expiredQuery = supabase
        .from('supplier_prices')
        .select(`
          id,
          supplier_id,
          supplier_product_packaging_spec_id,
          hub_id,
          price_per_unit,
          currency,
          delivery_mode,
          valid_from,
          valid_until,
          is_active,
          created_at,
          notes
        `)
        .eq('is_active', true)
        .lt('valid_until', now.toISOString())
        .gte('valid_until', sevenDaysAgo.toISOString())

      if (supplierId) {
        expiredQuery = expiredQuery.eq('supplier_id', supplierId)
      }

      const { data: expiredRaw, error: expiredError } = await expiredQuery

      if (expiredError) throw expiredError

      // Enrich expired prices with product/supplier/hub info
      const enrichedExpired = await Promise.all(
        (expiredRaw || []).map(async (price) => {
          // Get supplier info
          const { data: supplier } = await supabase
            .from('suppliers')
            .select('id, name, agent_id')
            .eq('id', price.supplier_id)
            .single()

          // Get hub info
          const { data: hub } = await supabase
            .from('hubs')
            .select('id, name, city, country, hub_code')
            .eq('id', price.hub_id)
            .single()

          // Get product spec info
          const { data: supplierSpec } = await supabase
            .from('supplier_product_packaging_spec')
            .select(`
              product_packaging_specs (
                id,
                product_id,
                boxes_per_pallet,
                weight_per_box,
                weight_per_pallet,
                weight_unit,
                products (id, name, category, sold_by),
                packaging_options (label),
                size_options (name)
              )
            `)
            .eq('id', price.supplier_product_packaging_spec_id)
            .single()

          const spec = Array.isArray(supplierSpec?.product_packaging_specs)
            ? supplierSpec.product_packaging_specs[0]
            : supplierSpec?.product_packaging_specs
          const product = Array.isArray(spec?.products) ? spec.products[0] : spec?.products
          const packaging = Array.isArray(spec?.packaging_options) ? spec.packaging_options[0] : spec?.packaging_options
          const size = Array.isArray(spec?.size_options) ? spec.size_options[0] : spec?.size_options

          return {
            ...price,
            supplier_name: supplier?.name || '',
            hub_name: hub?.name || '',
            hub_code: hub?.hub_code || '',
            hub_city: hub?.city || '',
            hub_country: hub?.country || '',
            product_packaging_spec_id: spec?.id || '',
            product_id: product?.id || '',
            product_name: product?.name || '',
            sold_by: product?.sold_by || '',
            packaging_label: packaging?.label || '',
            size_name: size?.name || '',
            boxes_per_pallet: spec?.boxes_per_pallet || 0,
            weight_per_box: spec?.weight_per_box || 0,
            weight_per_pallet: spec?.weight_per_pallet || 0,
            weight_unit: spec?.weight_unit || '',
            units_per_pallet: product?.sold_by?.toLowerCase().includes('kg')
              ? (spec?.weight_per_pallet || 0)
              : (spec?.boxes_per_pallet || 0),
            product_packaging_specs: {
              products: {
                id: product?.id || '',
                name: product?.name || '',
                category: product?.category || '',
                sold_by: product?.sold_by || ''
              },
              weight_per_pallet: spec?.weight_per_pallet || 0,
              boxes_per_pallet: spec?.boxes_per_pallet || 0,
              weight_per_box: spec?.weight_per_box || 0,
              weight_unit: spec?.weight_unit || ''
            },
            suppliers: {
              agent_id: supplier?.agent_id || null,
              staff: null
            }
          }
        })
      )

      // Combine active and expired prices
      const allPrices = [...(activeData || []), ...enrichedExpired]

      // Get staff info for all unique agent IDs
      const agentIds = [...new Set(allPrices.map(p => p.suppliers?.agent_id).filter(Boolean))]
      let staffMap = new Map()

      if (agentIds.length > 0) {
        const { data: staffData } = await supabase
          .from('staff')
          .select('id, name, role')
          .in('id', agentIds)

        staffData?.forEach(s => staffMap.set(s.id, s))
      }

      // Add staff info to all prices
      const finalPrices = allPrices.map(p => ({
        ...p,
        suppliers: {
          ...p.suppliers,
          staff: p.suppliers?.agent_id ? staffMap.get(p.suppliers.agent_id) : null
        }
      }))

      // Sort: active first, then by product name
      return finalPrices.sort((a, b) => {
        const aExpired = new Date(a.valid_until) < now
        const bExpired = new Date(b.valid_until) < now

        if (aExpired !== bExpired) return aExpired ? 1 : -1
        return a.product_name.localeCompare(b.product_name)
      }) as CurrentSupplierPrice[]
    },
    enabled: true
  })
}

// Fetch prices for a specific supplier hub
export function useSupplierHubPrices(supplierId: string, hubId: string) {
  return useQuery({
    queryKey: ['supplier-hub-prices', supplierId, hubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('current_supplier_prices')
        .select('*')
        .eq('supplier_id', supplierId)
        .eq('hub_id', hubId)
        .order('product_name', { ascending: true })

      if (error) throw error
      return data as CurrentSupplierPrice[]
    },
    enabled: !!supplierId && !!hubId
  })
}

// Create new price entry
export function useCreateSupplierPrice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (price: Omit<SupplierPrice, 'id' | 'created_at'>) => {
      // First, find existing active prices for the same combo
      const { data: existingPrices, error: findError } = await supabase
        .from('supplier_prices')
        .select('id')
        .eq('supplier_id', price.supplier_id)
        .eq('supplier_product_packaging_spec_id', price.supplier_product_packaging_spec_id)
        .eq('hub_id', price.hub_id)
        .eq('delivery_mode', price.delivery_mode)
        .eq('is_active', true)

      if (findError) throw findError

      // Find and delete opportunities using this supplier/product combination
      const { data: affectedOpportunities, error: findOppError } = await supabase
        .from('opportunities')
        .select('id')
        .eq('supplier_id', price.supplier_id)
        .eq('is_active', true)

      if (findOppError) {
        console.error('Error finding affected opportunities:', findOppError)
      } else if (affectedOpportunities && affectedOpportunities.length > 0) {
        console.log(`🔄 Deleting ${affectedOpportunities.length} opportunities for supplier ${price.supplier_id} due to price change`)

        // Delete affected opportunities
        const { error: deleteOppError } = await supabase
          .from('opportunities')
          .delete()
          .in('id', affectedOpportunities.map(o => o.id))

        if (deleteOppError) {
          console.error('Error deleting affected opportunities:', deleteOppError)
        }
      }

      // Deactivate existing prices if any
      if (existingPrices && existingPrices.length > 0) {
        for (const existingPrice of existingPrices) {
          const { error: deactivateError } = await supabase
            .from('supplier_prices')
            .update({ is_active: false })
            .eq('id', existingPrice.id)

          if (deactivateError) throw deactivateError
        }
      }

      // Create new price entry
      const { data, error } = await supabase
        .from('supplier_prices')
        .insert(price)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['current-supplier-prices'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-hub-prices'] })
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
      queryClient.invalidateQueries({ queryKey: ['trade-potential'] })

      // Trigger price change detection for affected opportunities
      try {
        await supabase.rpc('detect_opportunity_price_changes')
        queryClient.invalidateQueries({ queryKey: ['price-change-detection'] })
      } catch (error) {
        console.error('Error triggering price change detection:', error)
      }

      toast.success('Price saved successfully! Affected opportunities moved back to potential.')
    },
    onError: (error: any) => {
      toast.error(`Failed to save price: ${error.message}`)
    }
  })
}

// Quick update price (inline edit)
export function useQuickUpdatePrice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      priceId,
      newPrice,
      validUntil,
      notes,
      currentUserId
    }: {
      priceId: string
      newPrice: number
      validUntil: string
      notes?: string
      currentUserId?: string | null // This should be the staff UUID, not auth user ID
    }) => {
      // Get the existing price details
      const { data: oldPrice, error: fetchError } = await supabase
        .from('supplier_prices')
        .select('*')
        .eq('id', priceId)
        .single()

      if (fetchError) throw fetchError

      // Find and delete opportunities using this supplier
      const { data: affectedOpportunities, error: findOppError } = await supabase
        .from('opportunities')
        .select('id')
        .eq('supplier_id', oldPrice.supplier_id)
        .eq('is_active', true)

      if (findOppError) {
        console.error('Error finding affected opportunities:', findOppError)
      } else if (affectedOpportunities && affectedOpportunities.length > 0) {
        console.log(`🔄 Deleting ${affectedOpportunities.length} opportunities for supplier ${oldPrice.supplier_id} due to price update`)

        // Delete affected opportunities
        const { error: deleteOppError } = await supabase
          .from('opportunities')
          .delete()
          .in('id', affectedOpportunities.map(o => o.id))

        if (deleteOppError) {
          console.error('Error deleting affected opportunities:', deleteOppError)
        }
      }

      // Deactivate old price
      const { error: deactivateError } = await supabase
        .from('supplier_prices')
        .update({ is_active: false })
        .eq('id', priceId)

      if (deactivateError) throw deactivateError

      // Create new price entry
      const { data, error } = await supabase
        .from('supplier_prices')
        .insert({
          supplier_id: oldPrice.supplier_id,
          supplier_product_packaging_spec_id: oldPrice.supplier_product_packaging_spec_id,
          hub_id: oldPrice.hub_id,
          price_per_unit: newPrice,
          currency: oldPrice.currency,
          delivery_mode: oldPrice.delivery_mode,
          valid_from: new Date().toISOString(),
          valid_until: validUntil,
          is_active: true,
          created_by_staff_id: currentUserId || null,
          notes: notes || `Quick update from €${oldPrice.price_per_unit}`
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['current-supplier-prices'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-hub-prices'] })
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
      queryClient.invalidateQueries({ queryKey: ['trade-potential'] })

      // Trigger price change detection for affected opportunities
      try {
        await supabase.rpc('detect_opportunity_price_changes')
        queryClient.invalidateQueries({ queryKey: ['price-change-detection'] })
      } catch (error) {
        console.error('Error triggering price change detection:', error)
      }

      toast.success('Price updated successfully! Affected opportunities moved back to potential.')
    },
    onError: (error: any) => {
      toast.error(`Failed to update price: ${error.message}`)
    }
  })
}

// Get price history for a product
export function usePriceHistory(
  supplierId: string,
  productSpecId: string,
  hubId: string
) {
  return useQuery({
    queryKey: ['price-history', supplierId, productSpecId, hubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_prices')
        .select(`
          *,
          staff:created_by_staff_id (name)
        `)
        .eq('supplier_id', supplierId)
        .eq('supplier_product_packaging_spec_id', productSpecId)
        .eq('hub_id', hubId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!supplierId && !!productSpecId && !!hubId
  })
}

// Extend price by 1 day
export function useExtendPriceByDay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (priceId: string) => {
      // Get the current price
      const { data: currentPrice, error: fetchError } = await supabase
        .from('supplier_prices')
        .select('valid_until')
        .eq('id', priceId)
        .single()

      if (fetchError) throw fetchError

      // Calculate new date (current valid_until + 1 day)
      const currentDate = new Date(currentPrice.valid_until)
      const newDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)

      // Update the price
      const { error } = await supabase
        .from('supplier_prices')
        .update({ valid_until: newDate.toISOString() })
        .eq('id', priceId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-supplier-prices'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-hub-prices'] })
      toast.success('Price extended by 1 day')
    },
    onError: (error: any) => {
      toast.error(`Failed to extend price: ${error.message}`)
    }
  })
}

// Deactivate (soft delete) a price
export function useDeactivateSupplierPrice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (priceId: string) => {
      // Get the price details to find supplier_id
      const { data: price, error: fetchError } = await supabase
        .from('supplier_prices')
        .select('supplier_id')
        .eq('id', priceId)
        .single()

      if (fetchError) throw fetchError

      // Find and delete opportunities using this supplier
      const { data: affectedOpportunities, error: findOppError } = await supabase
        .from('opportunities')
        .select('id')
        .eq('supplier_id', price.supplier_id)
        .eq('is_active', true)

      if (findOppError) {
        console.error('Error finding affected opportunities:', findOppError)
      } else if (affectedOpportunities && affectedOpportunities.length > 0) {
        console.log(`🔄 Deleting ${affectedOpportunities.length} opportunities for supplier ${price.supplier_id} due to price deactivation`)

        // Delete affected opportunities
        const { error: deleteOppError } = await supabase
          .from('opportunities')
          .delete()
          .in('id', affectedOpportunities.map(o => o.id))

        if (deleteOppError) {
          console.error('Error deleting affected opportunities:', deleteOppError)
        }
      }

      // Deactivate the price
      const { error } = await supabase
        .from('supplier_prices')
        .update({ is_active: false })
        .eq('id', priceId)

      if (error) throw error
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['current-supplier-prices'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-hub-prices'] })
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
      queryClient.invalidateQueries({ queryKey: ['trade-potential'] })

      // Trigger price change detection for affected opportunities
      try {
        await supabase.rpc('detect_opportunity_price_changes')
        queryClient.invalidateQueries({ queryKey: ['price-change-detection'] })
      } catch (error) {
        console.error('Error triggering price change detection:', error)
      }

      toast.success('Price deactivated successfully! Affected opportunities moved back to potential.')
    },
    onError: (error: any) => {
      toast.error(`Failed to deactivate price: ${error.message}`)
    }
  })
}

// Realtime subscription for supplier prices
export function useSupplierPricesRealtime() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('supplier_prices_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'supplier_prices'
        },
        () => {
          // Invalidate all supplier price queries
          queryClient.invalidateQueries({ queryKey: ['current-supplier-prices'] })
          queryClient.invalidateQueries({ queryKey: ['supplier-hub-prices'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])
}