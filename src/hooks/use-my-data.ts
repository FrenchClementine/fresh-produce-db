'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentStaffMember } from './use-staff'
import { useSuppliers } from './use-suppliers'
import { useCustomers } from './use-customers'
import { useTransporters } from './use-transporters'
import { supabase } from '@/lib/supabase'

// Staff-filtered suppliers
export function useMySuppliers() {
  const { data: currentStaff } = useCurrentStaffMember()
  const { data: allSuppliers, isLoading, error } = useSuppliers()

  const mySuppliers = currentStaff?.id
    ? allSuppliers?.filter(supplier => supplier.agent_id === currentStaff.id) || []
    : []

  return {
    data: mySuppliers,
    suppliers: mySuppliers,
    isLoading,
    error
  }
}

// Staff-filtered customers
export function useMyCustomers() {
  const { data: currentStaff } = useCurrentStaffMember()
  const { customers, isLoading, error } = useCustomers()

  const myCustomers = currentStaff?.id
    ? customers?.filter(customer => customer.agent_id === currentStaff.id) || []
    : []

  return {
    data: myCustomers,
    customers: myCustomers,
    isLoading,
    error
  }
}

// Staff-filtered transporters
export function useMyTransporters() {
  const { data: currentStaff } = useCurrentStaffMember()
  const { data: allTransporters, isLoading, error } = useTransporters()

  const myTransporters = currentStaff?.id
    ? allTransporters?.filter(transporter => transporter.agent_id === currentStaff.id) || []
    : []

  return {
    data: myTransporters,
    transporters: myTransporters,
    isLoading,
    error
  }
}

// Get single supplier with staff access check
export function useMySupplier(supplierId: string) {
  const { data: currentStaff } = useCurrentStaffMember()

  return useQuery({
    queryKey: ['my-supplier', supplierId, currentStaff?.id],
    queryFn: async () => {
      if (!currentStaff?.id || !supplierId) return null

      const { data, error } = await supabase
        .from('suppliers')
        .select(`
          *,
          supplier_product_packaging_spec (
            id,
            product_packaging_spec_id,
            notes,
            season,
            available_months,
            product_packaging_specs (
              id,
              boxes_per_pallet,
              weight_per_box,
              weight_per_pallet,
              weight_unit,
              pieces_per_box,
              products (
                id,
                name,
                category,
                intended_use,
                sold_by
              ),
              packaging_options (
                id,
                label,
                unit_type,
                description
              ),
              pallets (
                id,
                label,
                dimensions_cm
              ),
              size_options (
                id,
                name
              )
            )
          )
        `)
        .eq('id', supplierId)
        .eq('agent_id', currentStaff.id)
        .eq('is_active', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - supplier doesn't exist or not assigned to this staff
          return null
        }
        throw error
      }

      return data
    },
    enabled: !!supplierId && !!currentStaff?.id
  })
}

// Get single customer with staff access check
export function useMyCustomer(customerId: string) {
  const { data: currentStaff } = useCurrentStaffMember()

  return useQuery({
    queryKey: ['my-customer', customerId, currentStaff?.id],
    queryFn: async () => {
      if (!currentStaff?.id || !customerId) return null

      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          staff:agent_id(id, name, role, email, phone_number)
        `)
        .eq('id', customerId)
        .eq('agent_id', currentStaff.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - customer doesn't exist or not assigned to this staff
          return null
        }
        throw error
      }

      return data
    },
    enabled: !!customerId && !!currentStaff?.id
  })
}

// Get single transporter with staff access check
export function useMyTransporter(transporterId: string) {
  const { data: currentStaff } = useCurrentStaffMember()

  return useQuery({
    queryKey: ['my-transporter', transporterId, currentStaff?.id],
    queryFn: async () => {
      if (!currentStaff?.id || !transporterId) return null

      const { data, error } = await supabase
        .from('transporters')
        .select(`
          *,
          staff:agent_id(id, name, role)
        `)
        .eq('id', transporterId)
        .eq('agent_id', currentStaff.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - transporter doesn't exist or not assigned to this staff
          return null
        }
        throw error
      }

      return data
    },
    enabled: !!transporterId && !!currentStaff?.id
  })
}