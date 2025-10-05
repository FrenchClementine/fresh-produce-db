'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { TradePotential } from '@/types/trade-potential'

export interface ExcludedPotential {
  id: string
  customer_id: string
  supplier_id: string
  product_packaging_spec_id: string
  reason: 'business_decision' | 'quality_concerns' | 'pricing_issues' | 'logistics_problems' | 'certification_mismatch' | 'capacity_constraints' | 'relationship_issues' | 'other'
  notes?: string
  excluded_by?: string
  excluded_at: string
  created_at: string
  updated_at: string
}

export interface ExcludePotentialData {
  customer_id: string
  supplier_id: string
  product_packaging_spec_id: string
  reason: ExcludedPotential['reason']
  notes?: string
  excluded_by?: string
}

// Hook to exclude a trade potential
export function useExcludePotential() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ExcludePotentialData) => {
      console.log('🚫 Excluding trade potential:', data)

      const { data: excluded, error } = await supabase
        .from('excluded_trade_potentials')
        .insert([{
          customer_id: data.customer_id,
          supplier_id: data.supplier_id,
          product_packaging_spec_id: data.product_packaging_spec_id,
          reason: data.reason,
          notes: data.notes,
          excluded_by: data.excluded_by
        }])
        .select()
        .single()

      if (error) throw error
      return excluded
    },
    onSuccess: () => {
      // Invalidate trade potential queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['trade-potential'] })
      toast.success('Trade potential marked as non-viable')
    },
    onError: (error: any) => {
      console.error('Error excluding trade potential:', error)
      toast.error('Failed to mark potential as non-viable')
    },
  })
}

// Hook to re-enable a previously excluded potential
export function useReenablePotential() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ customer_id, supplier_id, product_packaging_spec_id }: {
      customer_id: string
      supplier_id: string
      product_packaging_spec_id: string
    }) => {
      console.log('✅ Re-enabling trade potential:', { customer_id, supplier_id, product_packaging_spec_id })

      const { error } = await supabase
        .from('excluded_trade_potentials')
        .delete()
        .eq('customer_id', customer_id)
        .eq('supplier_id', supplier_id)
        .eq('product_packaging_spec_id', product_packaging_spec_id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trade-potential'] })
      toast.success('Trade potential re-enabled')
    },
    onError: (error: any) => {
      console.error('Error re-enabling trade potential:', error)
      toast.error('Failed to re-enable potential')
    },
  })
}

// Helper function to extract exclusion data from a TradePotential
export function extractExclusionData(potential: TradePotential, reason: ExcludedPotential['reason'], notes?: string): ExcludePotentialData {
  return {
    customer_id: potential.customer.id,
    supplier_id: potential.supplier.id,
    product_packaging_spec_id: potential.product.specId,
    reason,
    notes
  }
}