import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { subDays, format, parseISO } from 'date-fns'

export interface ProductPriceTrend {
  product_id: string
  product_name: string
  product_category: string
  current_avg_price: number
  currency: string
  sold_by: string
  trend: 'up' | 'down' | 'stable'
  trend_percentage: number
  price_history: Array<{
    date: string
    avg_price: number
  }>
}

interface SupplierPriceData {
  id: string
  price_per_unit: number
  currency: string
  created_at: string
  product_packaging_specs: {
    id: string
    product_id: string
    products: {
      id: string
      name: string
      category: string
      sold_by: string
    }
  }
}

export function usePriceTrends() {
  return useQuery({
    queryKey: ['price-trends'],
    queryFn: async () => {
      // Get date 10 days ago
      const tenDaysAgo = subDays(new Date(), 10).toISOString()

      // Fetch all supplier prices from last 10 days with product info
      const { data: supplierPrices, error } = await supabase
        .from('supplier_prices')
        .select(`
          id,
          price_per_unit,
          currency,
          created_at,
          product_packaging_specs!inner(
            id,
            product_id,
            products!inner(
              id,
              name,
              category,
              sold_by
            )
          )
        `)
        .gte('created_at', tenDaysAgo)
        .gte('valid_until', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching price trends:', error)
        throw error
      }

      // Process the data
      return processPriceTrends(supplierPrices as any)
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

function processPriceTrends(supplierPrices: SupplierPriceData[]): ProductPriceTrend[] {
  // Group prices by product
  const productMap = new Map<string, {
    product: {
      id: string
      name: string
      category: string
      sold_by: string
    }
    pricesByDate: Map<string, number[]>
    currencies: Set<string>
  }>()

  supplierPrices.forEach(sp => {
    const product = sp.product_packaging_specs.products
    const date = format(parseISO(sp.created_at), 'yyyy-MM-dd')

    if (!productMap.has(product.id)) {
      productMap.set(product.id, {
        product: product,
        pricesByDate: new Map(),
        currencies: new Set(),
      })
    }

    const productData = productMap.get(product.id)!

    if (!productData.pricesByDate.has(date)) {
      productData.pricesByDate.set(date, [])
    }

    productData.pricesByDate.get(date)!.push(sp.price_per_unit)
    productData.currencies.add(sp.currency)
  })

  // Calculate trends for each product
  const trends: ProductPriceTrend[] = []

  productMap.forEach((data, productId) => {
    // Calculate daily averages
    const priceHistory: Array<{ date: string; avg_price: number }> = []

    data.pricesByDate.forEach((prices, date) => {
      const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length
      priceHistory.push({ date, avg_price: avg })
    })

    // Sort by date
    priceHistory.sort((a, b) => a.date.localeCompare(b.date))

    if (priceHistory.length === 0) return

    // Get current (most recent) and old (first) average
    const currentAvg = priceHistory[priceHistory.length - 1].avg_price
    const oldAvg = priceHistory[0].avg_price

    // Calculate trend
    let trendPercentage = 0
    let trend: 'up' | 'down' | 'stable' = 'stable'

    if (oldAvg > 0) {
      trendPercentage = ((currentAvg - oldAvg) / oldAvg) * 100

      if (trendPercentage > 2) {
        trend = 'up'
      } else if (trendPercentage < -2) {
        trend = 'down'
      }
    }

    // Use the most common currency
    const currency = Array.from(data.currencies)[0] || 'EUR'

    trends.push({
      product_id: productId,
      product_name: data.product.name,
      product_category: data.product.category,
      current_avg_price: currentAvg,
      currency: currency,
      sold_by: data.product.sold_by,
      trend: trend,
      trend_percentage: trendPercentage,
      price_history: priceHistory,
    })
  })

  // Sort by product name
  trends.sort((a, b) => a.product_name.localeCompare(b.product_name))

  return trends
}
