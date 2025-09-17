import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useCustomers() {
  const { data: customers, isLoading, error } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          staff:agent_id(id, name, role)
        `)
        .order('name')

      if (error) {
        console.error('Error fetching customers:', error)
        throw error
      }

      return data
    }
  })

  return {
    customers,
    isLoading,
    error
  }
}

export function useActiveCustomers() {
  const { data: activeCustomers, isLoading, error } = useQuery({
    queryKey: ['active-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          staff:agent_id(id, name, role)
        `)
        .eq('is_active', true)
        .order('name')

      if (error) {
        console.error('Error fetching active customers:', error)
        throw error
      }

      return data
    }
  })

  return {
    activeCustomers,
    isLoading,
    error
  }
}

export function useCustomer(customerId: string) {
  const { data: customer, isLoading, error } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          staff:agent_id(id, name, role, email, phone_number)
        `)
        .eq('id', customerId)
        .single()

      if (error) {
        console.error('Error fetching customer:', error)
        throw error
      }

      return data
    },
    enabled: !!customerId
  })

  return {
    customer,
    isLoading,
    error
  }
}

export function useCustomerProductSpecs(customerId: string) {
  const { data: customerProductSpecs, isLoading, error } = useQuery({
    queryKey: ['customer-product-specs', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_product_packaging_spec')
        .select(`
          *,
          product_packaging_specs:product_packaging_spec_id(
            *,
            products:product_id(id, name, category),
            packaging_options:packaging_id(id, label, unit_type),
            pallets:pallet_id(id, label, dimensions_cm),
            size_options:size_option_id(id, name)
          )
        `)
        .eq('customer_id', customerId)
        .order('created_at')

      if (error) {
        console.error('Error fetching customer product specs:', error)
        throw error
      }

      return data
    },
    enabled: !!customerId
  })

  return {
    customerProductSpecs,
    isLoading,
    error
  }
}

export function useCustomerCertifications(customerId: string) {
  const { data: customerCertifications, isLoading, error } = useQuery({
    queryKey: ['customer-certifications', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_certifications')
        .select(`
          *,
          certifications:certification_id(id, name, description)
        `)
        .eq('customer_id', customerId)
        .order('created_at')

      if (error) {
        console.error('Error fetching customer certifications:', error)
        throw error
      }

      return data
    },
    enabled: !!customerId
  })

  return {
    customerCertifications,
    isLoading,
    error
  }
}

export function useCustomerLogistics(customerId: string) {
  const { data: customerLogistics, isLoading, error } = useQuery({
    queryKey: ['customer-logistics', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_logistics_capabilities')
        .select(`
          *,
          origin_hub:origin_hub_id(id, name, hub_code, city_name, country_code),
          destination_hub:destination_hub_id(id, name, hub_code, city_name, country_code)
        `)
        .eq('customer_id', customerId)
        .order('created_at')

      if (error) {
        console.error('Error fetching customer logistics:', error)
        throw error
      }

      return data
    },
    enabled: !!customerId
  })

  return {
    customerLogistics,
    isLoading,
    error
  }
}