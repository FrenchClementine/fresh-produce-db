import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useStaff() {
  const { data: staff, isLoading, error } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching staff:', error)
        throw error
      }

      return data
    }
  })

  return {
    staff,
    isLoading,
    error
  }
}

export function useActiveStaff() {
  const { data: activeStaff, isLoading, error } = useQuery({
    queryKey: ['active-staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) {
        console.error('Error fetching active staff:', error)
        throw error
      }

      return data
    }
  })

  return {
    activeStaff,
    isLoading,
    error
  }
}

export function useStaffWithCustomerCount() {
  const { data: staffWithCount, isLoading, error } = useQuery({
    queryKey: ['staff-with-customer-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select(`
          *,
          customers!customers_agent_id_fkey(id)
        `)
        .order('name')

      if (error) {
        console.error('Error fetching staff with customer count:', error)
        throw error
      }

      // Transform data to include customer count
      return data?.map(staff => ({
        ...staff,
        customer_count: staff.customers?.filter((c: any) => c.id).length || 0
      }))
    }
  })

  return {
    staffWithCount,
    isLoading,
    error
  }
}