import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  CustomerProductRequest,
  CustomerRequestWithMatches,
  RequestSupplierMatch,
  RequestActivityLog,
  CreateCustomerRequestData,
  UpdateCustomerRequestData,
  CustomerRequestFilters
} from '@/types/customer-requests'
import { useToast } from '@/hooks/use-toast'

// Fetch all customer requests with filters
export function useCustomerRequests(filters?: CustomerRequestFilters) {
  return useQuery({
    queryKey: ['customer-requests', filters],
    queryFn: async () => {
      let query = supabase
        .from('customer_product_requests')
        .select(`
          *,
          customers (
            id,
            name
          ),
          products (
            id,
            name
          ),
          staff (
            id,
            name
          ),
          hubs (
            id,
            name
          ),
          packaging_options (
            id,
            label
          )
        `)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id)
      }
      if (filters?.product_id) {
        query = query.eq('product_id', filters.product_id)
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.staff_id) {
        query = query.eq('staff_id', filters.staff_id)
      }
      if (filters?.delivery_mode) {
        query = query.eq('delivery_mode', filters.delivery_mode)
      }
      if (filters?.needed_by_from) {
        query = query.gte('needed_by_date', filters.needed_by_from)
      }
      if (filters?.needed_by_to) {
        query = query.lte('needed_by_date', filters.needed_by_to)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching customer requests:', error)
        throw error
      }

      return data as CustomerProductRequest[]
    }
  })
}

// Fetch single customer request with all related data
export function useCustomerRequest(requestId?: string) {
  return useQuery({
    queryKey: ['customer-request', requestId],
    queryFn: async () => {
      if (!requestId) throw new Error('Request ID is required')

      const { data, error } = await supabase
        .from('customer_product_requests')
        .select(`
          *,
          customers (
            id,
            name
          ),
          products (
            id,
            name
          ),
          staff (
            id,
            name
          ),
          hubs (
            id,
            name
          ),
          packaging_options (
            id,
            label
          )
        `)
        .eq('id', requestId)
        .single()

      if (error) {
        console.error('Error fetching customer request:', error)
        throw error
      }

      return data as CustomerProductRequest
    },
    enabled: !!requestId
  })
}

// Fetch supplier matches for a request
export function useRequestSupplierMatches(requestId?: string) {
  return useQuery({
    queryKey: ['request-supplier-matches', requestId],
    queryFn: async () => {
      if (!requestId) throw new Error('Request ID is required')

      const { data, error } = await supabase
        .from('request_supplier_matches')
        .select(`
          *,
          suppliers (
            id,
            name,
            city,
            country
          ),
          supplier_prices (
            id,
            price_per_unit,
            sold_by,
            delivery_mode,
            products (
              name
            )
          )
        `)
        .eq('request_id', requestId)
        .order('match_score', { ascending: false })

      if (error) {
        console.error('Error fetching supplier matches:', error)
        throw error
      }

      return data as RequestSupplierMatch[]
    },
    enabled: !!requestId
  })
}

// Fetch activity log for a request
export function useRequestActivityLog(requestId?: string) {
  return useQuery({
    queryKey: ['request-activity-log', requestId],
    queryFn: async () => {
      if (!requestId) throw new Error('Request ID is required')

      const { data, error } = await supabase
        .from('request_activity_log')
        .select(`
          *,
          staff (
            id,
            name
          )
        `)
        .eq('request_id', requestId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching activity log:', error)
        throw error
      }

      return data as RequestActivityLog[]
    },
    enabled: !!requestId
  })
}

// Create new customer request
export function useCreateCustomerRequest() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: CreateCustomerRequestData & { staff_id: string }) => {
      const { data: request, error } = await supabase
        .from('customer_product_requests')
        .insert([data])
        .select()
        .single()

      if (error) {
        console.error('Error creating customer request:', error)
        throw error
      }

      return request
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-requests'] })
      toast({
        title: 'Success',
        description: 'Customer request created successfully'
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create customer request',
        variant: 'destructive'
      })
    }
  })
}

// Update customer request
export function useUpdateCustomerRequest() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCustomerRequestData }) => {
      const { data: request, error } = await supabase
        .from('customer_product_requests')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating customer request:', error)
        throw error
      }

      return request
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-requests'] })
      queryClient.invalidateQueries({ queryKey: ['customer-request', variables.id] })
      toast({
        title: 'Success',
        description: 'Customer request updated successfully'
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update customer request',
        variant: 'destructive'
      })
    }
  })
}

// Create supplier match
export function useCreateSupplierMatch() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: Omit<RequestSupplierMatch, 'id' | 'created_at'>) => {
      const { data: match, error } = await supabase
        .from('request_supplier_matches')
        .insert([data])
        .select()
        .single()

      if (error) {
        console.error('Error creating supplier match:', error)
        throw error
      }

      return match
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['request-supplier-matches', variables.request_id] })
      toast({
        title: 'Success',
        description: 'Supplier match recorded successfully'
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record supplier match',
        variant: 'destructive'
      })
    }
  })
}

// Update supplier match
export function useUpdateSupplierMatch() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({
      id,
      requestId,
      data
    }: {
      id: string
      requestId: string
      data: Partial<RequestSupplierMatch>
    }) => {
      const { data: match, error } = await supabase
        .from('request_supplier_matches')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating supplier match:', error)
        throw error
      }

      return match
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['request-supplier-matches', variables.requestId] })
      toast({
        title: 'Success',
        description: 'Supplier match updated successfully'
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update supplier match',
        variant: 'destructive'
      })
    }
  })
}

// Log activity
export function useLogRequestActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Omit<RequestActivityLog, 'id' | 'created_at'>) => {
      const { data: log, error } = await supabase
        .from('request_activity_log')
        .insert([data])
        .select()
        .single()

      if (error) {
        console.error('Error logging activity:', error)
        throw error
      }

      return log
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['request-activity-log', variables.request_id] })
    }
  })
}

// Get summary statistics for customer requests
export function useCustomerRequestStats() {
  return useQuery({
    queryKey: ['customer-request-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_product_requests')
        .select('status')

      if (error) {
        console.error('Error fetching request stats:', error)
        throw error
      }

      const stats = {
        total: data.length,
        open: data.filter(r => r.status === 'open').length,
        matched: data.filter(r => r.status === 'matched').length,
        quoted: data.filter(r => r.status === 'quoted').length,
        closed: data.filter(r => r.status === 'closed').length
      }

      return stats
    }
  })
}
