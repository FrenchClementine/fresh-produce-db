import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useProducts() {
  const { data: products, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category, intended_use, is_active, created_at')
        .eq('is_active', true)
        .order('name')
      
      if (error) throw error
      return data
    },
  })

  return { products, isLoading, error }
}

export function useProductSpecs() {
  const { data: productSpecs, isLoading, error } = useQuery({
    queryKey: ['product-specs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_packaging_specs')
        .select(`
          *,
          products:product_id(id, name, category),
          packaging_options:packaging_id(id, label, unit_type),
          pallets:pallet_id(id, label, dimensions_cm),
          size_options:size_option_id(id, name)
        `)
        .order('created_at')
      
      if (error) {
        console.error('Product specs query failed:', error)
        throw error
      }
      
      return data || []
    },
  })

  return { productSpecs, isLoading, error }
}

export function usePackagingOptions() {
  const { data: packagingOptions, isLoading, error } = useQuery({
    queryKey: ['packaging-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packaging_options')
        .select('*')
        .order('label')
      
      if (error) throw error
      return data
    },
  })

  return { packagingOptions, isLoading, error }
}

export function useSizeOptions() {
  const { data: sizeOptions, isLoading, error } = useQuery({
    queryKey: ['size-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('size_options')
        .select('*')
        .order('name')
      
      if (error) throw error
      return data
    },
  })

  return { sizeOptions, isLoading, error }
}

export function usePallets() {
  const { data: pallets, isLoading, error } = useQuery({
    queryKey: ['pallets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pallets')
        .select('*')
        .order('label')
      
      if (error) throw error
      return data
    },
  })

  return { pallets, isLoading, error }
}

// ================================================
// SUPPLIER HOOKS
// ================================================

export function useSuppliers() {
  const { data: suppliers, isLoading, error } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select(`
          *,
          staff:agent_id(id, name, role)
        `)
        .order('name')
      
      if (error) {
        console.error('Error fetching suppliers:', error)
        throw error
      }
      
      return data
    }
  })

  return {
    suppliers,
    isLoading,
    error
  }
}

export function useCertifications() {
  const { data: certifications, isLoading, error } = useQuery({
    queryKey: ['certifications'],
    queryFn: async () => {
      console.log('Fetching certifications...')
      const { data, error } = await supabase
        .from('certifications')
        .select('*')
        .order('name')
      
      console.log('Certifications query result:', { data, error })
      
      if (error) {
        console.error('Error fetching certifications:', error)
        throw error
      }
      
      return data
    }
  })

  return {
    certifications,
    isLoading,
    error
  }
}

export interface Hub {
  id: string
  name: string
  hub_code: string
  country_code?: string
  city_name?: string
  region?: string
  is_active: boolean
  created_at: string
}

export function useHubs() {
  const { data: hubs, isLoading, error } = useQuery({
    queryKey: ['hubs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hubs')
        .select('*')
        .order('name')
      
      if (error) {
        console.error('Error fetching hubs:', error)
        throw error
      }
      
      return data as Hub[]
    }
  })

  return {
    hubs,
    isLoading,
    error
  }
}

export function useCreateHub() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (hub: Omit<Hub, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('hubs')
        .insert([hub])
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubs'] })
    },
  })
}

export function useSupplierProducts(supplierId?: string) {
  const { data: supplierProducts, isLoading, error } = useQuery({
    queryKey: ['supplier-products', supplierId],
    queryFn: async () => {
      let query = supabase
        .from('supplier_product_packaging_spec')
        .select(`
          *,
          suppliers:supplier_id(id, name),
          product_packaging_specs:product_packaging_spec_id(
            id,
            products:product_id(id, name, category),
            packaging_options:packaging_id(id, label, unit_type),
            pallets:pallet_id(id, label, dimensions_cm),
            size_options:size_option_id(id, name),
            boxes_per_pallet,
            weight_per_box,
            weight_per_pallet,
            weight_unit,
            pieces_per_box
          )
        `)
        .order('created_at', { ascending: false })

      if (supplierId) {
        query = query.eq('supplier_id', supplierId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching supplier products:', error)
        throw error
      }
      
      return data
    },
    enabled: !!supplierId || supplierId === undefined
  })

  return {
    supplierProducts,
    isLoading,
    error
  }
}

export function useSupplierLogistics(supplierId?: string) {
  const { data: supplierLogistics, isLoading, error } = useQuery({
    queryKey: ['supplier-logistics', supplierId],
    queryFn: async () => {
      if (!supplierId) return []
      
      const { data, error } = await supabase
        .from('supplier_logistics_capabilities')
        .select(`
          *,
          origin_hub:hubs!origin_hub_id(*),
          destination_hub:hubs!destination_hub_id(*)
        `)
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching supplier logistics:', error)
        throw error
      }
      
      return data
    },
    enabled: !!supplierId
  })

  return {
    supplierLogistics,
    isLoading,
    error
  }
}

export function useSupplierCertifications(supplierId?: string) {
  const { data: supplierCertifications, isLoading, error } = useQuery({
    queryKey: ['supplier-certifications', supplierId],
    queryFn: async () => {
      if (!supplierId) return []
      
      const { data, error } = await supabase
        .from('supplier_certifications')
        .select(`
          *,
          certifications:certification_id(*)
        `)
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching supplier certifications:', error)
        throw error
      }
      
      return data
    },
    enabled: !!supplierId
  })

  return {
    supplierCertifications,
    isLoading,
    error
  }
}

export function useProductSuppliers(productId?: string) {
  const { data: productSuppliers, isLoading, error } = useQuery({
    queryKey: ['product-suppliers', productId],
    queryFn: async () => {
      if (!productId) return []
      
      const { data, error } = await supabase
        .from('supplier_product_packaging_spec')
        .select(`
          *,
          suppliers:supplier_id(id, name, city, country, phone_number, email),
          product_packaging_specs:product_packaging_spec_id(
            *,
            products:product_id(id, name, category)
          )
        `)
        .eq('product_packaging_specs.product_id', productId)
      
      if (error) {
        console.error('Error fetching product suppliers:', error)
        throw error
      }
      
      return data || []
    },
    enabled: !!productId
  })

  return { productSuppliers, isLoading, error }
}

export function useProductCategories() {
  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      // Get all distinct categories from existing products
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .order('category')
      
      if (error) {
        console.error('Error fetching product categories:', error)
        throw error
      }
      
      // Get unique categories
      const uniqueCategories = [...new Set(data?.map(item => item.category) || [])]
      return uniqueCategories
    },
  })

  return { categories, isLoading, error }
}

export function useAllProductCategories() {
  const { data: allCategories, isLoading, error } = useQuery({
    queryKey: ['all-product-categories'],
    queryFn: async () => {
      try {
        // Call the database function to get actual enum values
        const { data, error } = await supabase
          .rpc('get_product_categories')
        
        if (error) {
          console.error('Database function failed:', error)
          throw error
        }
        
        if (data && data.length > 0) {
          const categories = data.map((item: any) => item.category)
          console.log('Successfully loaded categories from database function:', categories)
          return categories
        }
        
        throw new Error('No categories returned from database function')
        
      } catch (error) {
        console.error('Database function failed, using fallback:', error)
        
        // Fallback: Query existing products for used categories
        try {
          const { data: products } = await supabase
            .from('products')
            .select('category')
            .order('category')
          
          if (products && products.length > 0) {
            const uniqueCategories = [...new Set(products.map(p => p.category))]
            console.log('Using categories from existing products:', uniqueCategories)
            return uniqueCategories
          }
        } catch (fallbackError) {
          console.error('Fallback query failed:', fallbackError)
        }
        
        // Final fallback to original enum values
        console.log('Using hardcoded fallback categories')
        return [
          'tomatoes',
          'lettuce', 
          'babyleaf',
          'citrus',
          'greenhouse_crop',
          'mushroom',
          'grapes',
          'carrots',
          'potatoes',
          'onions',
          'fruit',
          'vegetables'
        ]
      }
    },
  })

  return { allCategories, isLoading, error }
}

export function useProductSizeOptions(productId?: string) {
  const { data: sizeOptions, isLoading, error } = useQuery({
    queryKey: ['product-size-options', productId],
    queryFn: async () => {
      if (!productId) return []
      
      const { data, error } = await supabase
        .from('product_packaging_specs')
        .select(`
          size_options:size_option_id(
            id,
            name
          )
        `)
        .eq('product_id', productId)
      
      if (error) {
        console.error('Error fetching product size options:', error)
        throw error
      }
      
      // Get unique size options
      const uniqueSizes = data
        ?.map(spec => spec.size_options)
        .filter(Boolean)
        .filter((size, index, self) => 
          index === self.findIndex(s => s.id === size.id)
        ) || []
      
      return uniqueSizes
    },
    enabled: !!productId
  })

  return { sizeOptions, isLoading, error }
}

export function useAvailableDeliveryHubs(productId?: string, sizeOptionId?: string) {
  const { data: deliveryHubs, isLoading, error } = useQuery({
    queryKey: ['available-delivery-hubs', productId, sizeOptionId],
    queryFn: async () => {
      if (!productId) return []
      
      // First get product packaging specs for the selected product (and size if specified)
      let productSpecsQuery = supabase
        .from('product_packaging_specs')
        .select('id')
        .eq('product_id', productId)
      
      if (sizeOptionId) {
        productSpecsQuery = productSpecsQuery.eq('size_option_id', sizeOptionId)
      }
      
      const { data: productSpecs, error: specsError } = await productSpecsQuery
      
      if (specsError) {
        console.error('Error fetching product specs:', specsError)
        throw specsError
      }
      
      if (!productSpecs || productSpecs.length === 0) {
        return []
      }
      
      const specIds = productSpecs.map(s => s.id)
      
      // Get suppliers that have this product
      const { data: supplierProducts, error: supplierError } = await supabase
        .from('supplier_product_packaging_spec')
        .select('supplier_id')
        .in('product_packaging_spec_id', specIds)
      
      if (supplierError) {
        console.error('Error fetching supplier products:', supplierError)
        throw supplierError
      }
      
      if (!supplierProducts || supplierProducts.length === 0) {
        return []
      }
      
      const supplierIds = [...new Set(supplierProducts.map(sp => sp.supplier_id))]
      
      // Get supplier logistics capabilities to find available delivery destinations
      const { data: logistics, error: logisticsError } = await supabase
        .from('supplier_logistics_capabilities')
        .select(`
          destination_hub_id,
          origin_hub_id,
          destination_hub:hubs!destination_hub_id(
            id,
            name,
            city_name,
            country_code
          ),
          origin_hub:hubs!origin_hub_id(
            id,
            name,
            city_name,
            country_code
          )
        `)
        .in('supplier_id', supplierIds)
      
      if (logisticsError) {
        console.error('Error fetching supplier logistics:', logisticsError)
        throw logisticsError
      }
      
      // Get transporter routes to find additional delivery destinations
      const { data: routes, error: routesError } = await supabase
        .from('transporter_routes')
        .select(`
          destination_hub_id,
          origin_hub_id,
          destination_hub:hubs!destination_hub_id(
            id,
            name,
            city_name,
            country_code
          ),
          origin_hub:hubs!origin_hub_id(
            id,
            name,
            city_name,
            country_code
          )
        `)
        .eq('is_active', true)
      
      if (routesError) {
        console.error('Error fetching transporter routes:', routesError)
        throw routesError
      }
      
      // Collect all possible delivery destinations
      const availableHubs = new Map<string, any>()
      
      // Add direct delivery destinations from suppliers
      logistics?.forEach(logistic => {
        if (logistic.destination_hub_id && logistic.destination_hub) {
          availableHubs.set(logistic.destination_hub_id, {
            ...logistic.destination_hub,
            delivery_type: 'direct'
          })
        }
      })
      
      // Add destinations reachable via transporter routes
      const supplierOriginHubs = new Set(
        logistics?.map(l => l.origin_hub_id).filter(Boolean) || []
      )
      
      routes?.forEach(route => {
        // If this route starts from a hub where we have suppliers
        if (supplierOriginHubs.has(route.origin_hub_id) && route.destination_hub_id && route.destination_hub) {
          if (!availableHubs.has(route.destination_hub_id)) {
            availableHubs.set(route.destination_hub_id, {
              ...route.destination_hub,
              delivery_type: 'transport'
            })
          }
        }
      })
      
      return Array.from(availableHubs.values())
        .sort((a, b) => a.name.localeCompare(b.name))
    },
    enabled: !!productId
  })

  return { deliveryHubs, isLoading, error }
}

export function useCustomerProducts(customerId?: string) {
  const { data: customerProducts, isLoading, error } = useQuery({
    queryKey: ['customer-products', customerId],
    queryFn: async () => {
      if (!customerId) return []

      const { data, error } = await supabase
        .from('customer_product_packaging_spec')
        .select(`
          *,
          product_packaging_specs:product_packaging_spec_id(
            *,
            products:product_id(
              id,
              name,
              category,
              intended_use
            ),
            packaging_options:packaging_id(id, label, unit_type),
            size_options:size_option_id(id, name)
          )
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching customer products:', error)
        throw error
      }

      // Extract unique products
      const uniqueProducts = data
        ?.map(spec => spec.product_packaging_specs?.products)
        .filter(Boolean)
        .filter((product, index, self) =>
          index === self.findIndex(p => p.id === product.id)
        ) || []

      return uniqueProducts
    },
    enabled: !!customerId
  })

  return { customerProducts, isLoading, error }
}

export function useCustomerDeliveryHubs(customerId?: string) {
  const { data: customerDeliveryHubs, isLoading, error } = useQuery({
    queryKey: ['customer-delivery-hubs', customerId],
    queryFn: async () => {
      if (!customerId) return []

      const { data, error } = await supabase
        .from('customer_logistics_capabilities')
        .select(`
          *,
          origin_hub:origin_hub_id(
            id,
            name,
            city_name,
            country_code
          ),
          destination_hub:destination_hub_id(
            id,
            name,
            city_name,
            country_code
          )
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching customer delivery hubs:', error)
        throw error
      }

      // Extract unique destination hubs (where customer wants deliveries)
      const deliveryHubs = data
        ?.map(capability => capability.destination_hub)
        .filter(Boolean)
        .filter((hub, index, self) =>
          index === self.findIndex(h => h.id === hub.id)
        ) || []

      return deliveryHubs
    },
    enabled: !!customerId
  })

  return { customerDeliveryHubs, isLoading, error }
}
