'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface CustomerPricingOption {
  // Product info
  product_id: string
  product_name: string
  packaging_label: string
  size_name: string

  // Supplier info
  supplier_id: string
  supplier_name: string
  supplier_hub_id: string
  supplier_hub_name: string
  supplier_hub_code: string

  // Price info
  ex_works_price: number
  delivery_mode: string
  valid_until: string
  currency: string

  // Route info
  route: string
  delivery_time: string
  transport_cost: number

  // Final pricing
  subtotal: number
  margin: number
  final_price: number
}

// Get pricing options for a customer's products
export function useCustomerPricing(customerId: string) {
  return useQuery({
    queryKey: ['customer-pricing', customerId],
    queryFn: async () => {
      if (!customerId) return []

      // Get customer's products
      const { data: customerProducts, error: customerError } = await supabase
        .from('customer_product_packaging_spec')
        .select(`
          id,
          product_packaging_spec_id,
          product_packaging_specs (
            id,
            products (
              id,
              name,
              category
            ),
            packaging_options (
              id,
              label
            ),
            size_options (
              id,
              name
            )
          )
        `)
        .eq('customer_id', customerId)

      if (customerError) throw customerError

      if (!customerProducts || customerProducts.length === 0) return []

      // Get current supplier prices for these products
      const productSpecIds = customerProducts.map(cp => cp.product_packaging_spec_id)

      const { data: supplierPrices, error: pricesError } = await supabase
        .from('current_supplier_prices')
        .select('*')
        .in('supplier_product_packaging_spec_id', productSpecIds)

      if (pricesError) throw pricesError

      if (!supplierPrices || supplierPrices.length === 0) return []

      // Transform into customer pricing options
      const pricingOptions: CustomerPricingOption[] = supplierPrices.map(price => {
        // Simple transport cost calculation (would normally involve route calculation)
        const transportCost = price.delivery_mode === 'Ex Works' ? 0 : 0.35 // €0.35 per unit example
        const subtotal = price.price_per_unit + transportCost
        const margin = subtotal * 0.10 // 10% margin
        const finalPrice = subtotal + margin

        return {
          // Product info
          product_id: price.product_id,
          product_name: price.product_name,
          packaging_label: price.packaging_label,
          size_name: price.size_name,

          // Supplier info
          supplier_id: price.supplier_id,
          supplier_name: price.supplier_name,
          supplier_hub_id: price.hub_id,
          supplier_hub_name: price.hub_name,
          supplier_hub_code: price.hub_code,

          // Price info
          ex_works_price: price.price_per_unit,
          delivery_mode: price.delivery_mode,
          valid_until: price.valid_until,
          currency: price.currency,

          // Route info (simplified - would normally calculate real routes)
          route: `${price.hub_name} → Customer Location`,
          delivery_time: price.delivery_mode === 'Ex Works' ? 'Pickup required' : '2-3 days',
          transport_cost: transportCost,

          // Final pricing
          subtotal,
          margin,
          final_price: finalPrice
        }
      })

      return pricingOptions
    },
    enabled: !!customerId
  })
}