'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

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

// Fetch current active prices from the view
export function useCurrentSupplierPrices(supplierId?: string) {
  return useQuery({
    queryKey: ['current-supplier-prices', supplierId],
    queryFn: async () => {
      let query = supabase
        .from('current_supplier_prices')
        .select(`
          *,
          suppliers:supplier_id (
            agent_id,
            staff:agent_id (
              id,
              name,
              role
            )
          )
        `)
        .order('product_name', { ascending: true })

      if (supplierId) {
        query = query.eq('supplier_id', supplierId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as CurrentSupplierPrice[]
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

      // Deactivate each existing price by ID
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

      // Trigger price change detection for affected opportunities
      try {
        await supabase.rpc('detect_opportunity_price_changes')
        queryClient.invalidateQueries({ queryKey: ['opportunities'] })
        queryClient.invalidateQueries({ queryKey: ['price-change-detection'] })
      } catch (error) {
        console.error('Error triggering price change detection:', error)
      }

      toast.success('Price saved successfully!')
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

      // Trigger price change detection for affected opportunities
      try {
        await supabase.rpc('detect_opportunity_price_changes')
        queryClient.invalidateQueries({ queryKey: ['opportunities'] })
        queryClient.invalidateQueries({ queryKey: ['price-change-detection'] })
      } catch (error) {
        console.error('Error triggering price change detection:', error)
      }

      toast.success('Price updated successfully!')
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