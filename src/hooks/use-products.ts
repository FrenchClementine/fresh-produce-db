import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useProducts() {
  const { data: products, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
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
        .select('*')
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
      
      return data
    }
  })

  return {
    hubs,
    isLoading,
    error
  }
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