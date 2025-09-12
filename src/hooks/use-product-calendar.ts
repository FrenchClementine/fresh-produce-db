'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ProductCalendarData {
  product_id: string
  product_name: string
  country: string
  available_months: string[]
  suppliers: Array<{
    id: string
    name: string
    specs: Array<{
      id: string
      packaging_label: string
      size_name: string
      available_months: string[]
    }>
  }>
}

interface CalendarFilters {
  searchTerm?: string
  category?: string
  sizeOption?: string
  certificationId?: string
}

async function fetchProductCalendarData(filters: CalendarFilters = {}): Promise<ProductCalendarData[]> {
  let query = supabase
    .from('supplier_product_packaging_spec')
    .select(`
      id,
      available_months,
      suppliers!inner(
        id,
        name,
        country
      ),
      product_packaging_specs!inner(
        id,
        products!inner(
          id,
          name,
          category
        ),
        packaging_options(
          label
        ),
        size_options(
          id,
          name
        )
      )
    `)
    .not('available_months', 'is', null)
    .not('suppliers.country', 'is', null)

  // When filtering by certification, we need to join with supplier_certifications
  if (filters.certificationId) {
    // We need to modify the query to include certification filter
    // This requires a different approach since we need to filter suppliers by their certifications
    const { data: supplierIds, error: certError } = await supabase
      .from('supplier_certifications')
      .select('supplier_id')
      .eq('certification_id', filters.certificationId)

    if (certError) throw certError

    const validSupplierIds = supplierIds?.map(s => s.supplier_id) || []
    if (validSupplierIds.length === 0) {
      // No suppliers have this certification, return empty array
      return []
    }

    query = query.in('supplier_id', validSupplierIds)
  }

  if (filters.searchTerm) {
    query = query.ilike('product_packaging_specs.products.name', `%${filters.searchTerm}%`)
  }

  if (filters.category) {
    query = query.eq('product_packaging_specs.products.category', filters.category)
  }

  if (filters.sizeOption) {
    query = query.eq('product_packaging_specs.size_options.id', filters.sizeOption)
  }

  const { data, error } = await query

  if (error) throw error

  // Process data to group by product and country
  const processed = new Map<string, ProductCalendarData>()

  data?.forEach((item: any) => {
    const productId = item.product_packaging_specs.products.id
    const productName = item.product_packaging_specs.products.name
    const country = item.suppliers.country
    const key = `${productId}-${country}`

    if (!processed.has(key)) {
      processed.set(key, {
        product_id: productId,
        product_name: productName,
        country: country,
        available_months: [],
        suppliers: []
      })
    }

    const entry = processed.get(key)!
    
    // Union the available months
    if (item.available_months) {
      const newMonths = item.available_months.filter((month: string) => 
        !entry.available_months.includes(month)
      )
      entry.available_months.push(...newMonths)
    }

    // Add supplier and spec info
    let supplier = entry.suppliers.find(s => s.id === item.suppliers.id)
    if (!supplier) {
      supplier = {
        id: item.suppliers.id,
        name: item.suppliers.name,
        specs: []
      }
      entry.suppliers.push(supplier)
    }

    supplier.specs.push({
      id: item.product_packaging_specs.id,
      packaging_label: item.product_packaging_specs.packaging_options?.label || 'Unknown',
      size_name: item.product_packaging_specs.size_options?.name || 'Unknown',
      available_months: item.available_months || []
    })
  })

  return Array.from(processed.values())
    .sort((a, b) => a.product_name.localeCompare(b.product_name))
}

export function useProductCalendar(filters: CalendarFilters = {}) {
  return useQuery({
    queryKey: ['product-calendar', filters],
    queryFn: () => fetchProductCalendarData(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get some random products for default view
export function useRandomProducts() {
  return useQuery({
    queryKey: ['random-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('name')
        .eq('is_active', true)
        .limit(3)

      if (error) throw error
      return data?.map(p => p.name) || []
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Get available product categories for filtering
export function useProductCategories() {
  return useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .eq('is_active', true)

      if (error) throw error
      
      // Get unique categories
      const categories = [...new Set(data?.map(p => p.category) || [])]
      return categories.sort()
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Get available size options for filtering
export function useSizeOptions() {
  return useQuery({
    queryKey: ['size-options-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('size_options')
        .select('id, name')
        .order('name')

      if (error) throw error
      return data || []
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Get certifications that are actively used by suppliers for filtering
export function useActiveCertifications() {
  return useQuery({
    queryKey: ['active-certifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_certifications')
        .select(`
          certifications:certification_id(
            id,
            name
          )
        `)
        .not('certifications', 'is', null)

      if (error) throw error
      
      // Extract unique certifications
      const uniqueCertifications = new Map()
      data?.forEach((item: any) => {
        if (item.certifications) {
          uniqueCertifications.set(item.certifications.id, item.certifications)
        }
      })
      
      return Array.from(uniqueCertifications.values()).sort((a: any, b: any) => a.name.localeCompare(b.name))
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Export the interface for use in components
export type { CalendarFilters }