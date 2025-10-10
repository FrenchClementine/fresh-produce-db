import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useSupplierPricesForMatching(
  productId?: string,
  deliveryMode?: 'DELIVERY' | 'Ex Works' | 'TRANSIT',
  hubId?: string,
  enabled: boolean = false
) {
  return useQuery({
    queryKey: ['supplier-matching', productId, deliveryMode, hubId],
    queryFn: async () => {
      if (!productId) throw new Error('Product ID is required')

      let query = supabase
        .from('supplier_prices')
        .select(`
          *,
          suppliers (
            id,
            name,
            city,
            country
          ),
          packaging_options:packaging_id (
            id,
            label
          )
        `)
        .eq('product_id', productId)
        .eq('is_active', true)

      // Filter by delivery mode if specified
      if (deliveryMode) {
        query = query.eq('delivery_mode', deliveryMode)
      }

      // Filter by hub if specified (for DELIVERY mode)
      if (hubId && deliveryMode === 'DELIVERY') {
        query = query.eq('origin_hub_id', hubId)
      }

      const { data, error } = await query.order('price_per_unit', { ascending: true })

      if (error) {
        console.error('Error fetching supplier matches:', error)
        throw error
      }

      return data
    },
    enabled: enabled && !!productId
  })
}
