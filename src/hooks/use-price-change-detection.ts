'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export interface PriceChangeDetection {
  opportunity_id: string
  current_price_status: string
  supplier_price_active: boolean
  supplier_price_expired: boolean
  current_supplier_price: number
  new_supplier_price: number
}

export interface OpportunityPriceStatus {
  id: string
  price_status: 'current' | 'changed' | 'expired' | 'reviewed'
  price_change_detected_at?: string
  price_change_notes?: string
  supplier_price_per_unit: number
  customer?: { name: string }
  supplier?: { name: string }
  product_packaging_specs?: {
    products: { name: string }
  }
}

// Hook to detect price changes across all active opportunities
export function usePriceChangeDetection() {
  return useQuery({
    queryKey: ['price-change-detection'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('detect_opportunity_price_changes')

      if (error) {
        console.error('Error detecting price changes:', error)
        throw error
      }

      return data as PriceChangeDetection[]
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 10, // Check every 10 minutes
  })
}

// Hook to get opportunities with price change issues
export function useOpportunitiesWithPriceChanges() {
  return useQuery({
    queryKey: ['opportunities-price-changes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opportunities')
        .select(`
          id,
          price_status,
          price_change_detected_at,
          price_change_notes,
          supplier_price_per_unit,
          offer_price_per_unit,
          status,
          customer:customers!opportunities_customer_id_fkey(name),
          supplier:suppliers!opportunities_supplier_id_fkey(name),
          product_packaging_specs!opportunities_product_packaging_spec_id_fkey(
            products!product_packaging_specs_product_id_fkey(name)
          )
        `)
        .eq('is_active', true)
        .in('price_status', ['changed', 'expired'])
        .order('price_change_detected_at', { ascending: false })

      if (error) {
        console.error('Error fetching opportunities with price changes:', error)
        throw error
      }

      return data as OpportunityPriceStatus[]
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

// Hook to update opportunity price status
export function useUpdateOpportunityPriceStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      opportunityId,
      newStatus,
      notes
    }: {
      opportunityId: string
      newStatus: 'current' | 'changed' | 'expired' | 'reviewed'
      notes?: string
    }) => {
      const { data, error } = await supabase.rpc('update_opportunity_price_status', {
        p_opportunity_id: opportunityId,
        p_new_status: newStatus,
        p_notes: notes
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
      queryClient.invalidateQueries({ queryKey: ['opportunities-price-changes'] })
      queryClient.invalidateQueries({ queryKey: ['price-change-detection'] })
      queryClient.invalidateQueries({ queryKey: ['opportunity-summary'] })
      toast.success('Price status updated successfully')
    },
    onError: (error: any) => {
      console.error('Error updating price status:', error)
      toast.error('Failed to update price status')
    },
  })
}

// Hook to batch flag price changes (run the detection and update statuses)
export function useBatchFlagPriceChanges() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      // First, detect price changes
      const { data: changes, error: detectError } = await supabase.rpc('detect_opportunity_price_changes')

      if (detectError) throw detectError

      const results = []

      // Update each opportunity with price change status
      for (const change of changes) {
        let newStatus: string
        let notes: string

        if (change.supplier_price_expired) {
          newStatus = 'expired'
          notes = 'Supplier price has expired'
        } else if (!change.supplier_price_active) {
          newStatus = 'changed'
          notes = 'Supplier price is no longer active (price updated)'
        } else if (change.new_supplier_price !== change.current_supplier_price) {
          newStatus = 'changed'
          notes = `Supplier price changed from €${change.current_supplier_price} to €${change.new_supplier_price}`
        } else {
          continue // No change needed
        }

        const { error: updateError } = await supabase.rpc('update_opportunity_price_status', {
          p_opportunity_id: change.opportunity_id,
          p_new_status: newStatus,
          p_notes: notes
        })

        if (updateError) {
          console.error('Error updating opportunity price status:', updateError)
        } else {
          results.push({ opportunityId: change.opportunity_id, status: newStatus })
        }
      }

      return { detectedChanges: changes.length, updatedOpportunities: results.length }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
      queryClient.invalidateQueries({ queryKey: ['opportunities-price-changes'] })
      queryClient.invalidateQueries({ queryKey: ['price-change-detection'] })
      queryClient.invalidateQueries({ queryKey: ['opportunity-summary'] })

      if (result.updatedOpportunities > 0) {
        toast.success(`Flagged ${result.updatedOpportunities} opportunities with price changes`)
      } else {
        toast.info('No price changes detected')
      }
    },
    onError: (error: any) => {
      console.error('Error flagging price changes:', error)
      toast.error('Failed to check for price changes')
    },
  })
}

// Hook to deactivate opportunities with changed prices
export function useDeactivateChangedOpportunities() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (opportunityIds: string[]) => {
      const { error } = await supabase
        .from('opportunities')
        .update({
          is_active: false,
          price_change_notes: 'Deactivated due to supplier price change'
        })
        .in('id', opportunityIds)

      if (error) throw error
      return opportunityIds.length
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
      queryClient.invalidateQueries({ queryKey: ['opportunities-price-changes'] })
      queryClient.invalidateQueries({ queryKey: ['opportunity-summary'] })
      toast.success(`Deactivated ${count} opportunities`)
    },
    onError: (error: any) => {
      console.error('Error deactivating opportunities:', error)
      toast.error('Failed to deactivate opportunities')
    },
  })
}

// Hook to auto-deactivate opportunities when prices change (combined detection and deactivation)
export function useAutoDeactivateOnPriceChange() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      console.log('🔍 Running automatic price change detection and deactivation...')

      // First, detect price changes
      const { data: changes, error: detectError } = await supabase.rpc('detect_opportunity_price_changes')

      if (detectError) throw detectError

      if (!changes || changes.length === 0) {
        return { detectedChanges: 0, deactivatedOpportunities: 0 }
      }

      // Get opportunities that should be deactivated (price expired or no longer active)
      const opportunitiesToDeactivate = changes.filter(change =>
        change.supplier_price_expired || !change.supplier_price_active
      ).map(change => change.opportunity_id)

      let deactivatedCount = 0

      // Deactivate opportunities with expired or removed prices
      if (opportunitiesToDeactivate.length > 0) {
        const { error: deactivateError } = await supabase
          .from('opportunities')
          .update({
            is_active: false,
            price_status: 'expired',
            price_change_detected_at: new Date().toISOString(),
            price_change_notes: 'Auto-deactivated: Supplier price expired or removed'
          })
          .in('id', opportunitiesToDeactivate)

        if (deactivateError) {
          console.error('Error deactivating opportunities:', deactivateError)
        } else {
          deactivatedCount = opportunitiesToDeactivate.length
        }
      }

      // Flag remaining opportunities with price changes (but keep them active)
      const opportunitiesToFlag = changes.filter(change =>
        !change.supplier_price_expired &&
        change.supplier_price_active &&
        change.new_supplier_price !== change.current_supplier_price
      )

      for (const change of opportunitiesToFlag) {
        const notes = `Supplier price changed from €${change.current_supplier_price} to €${change.new_supplier_price}`

        await supabase.rpc('update_opportunity_price_status', {
          p_opportunity_id: change.opportunity_id,
          p_new_status: 'changed',
          p_notes: notes
        })
      }

      return {
        detectedChanges: changes.length,
        deactivatedOpportunities: deactivatedCount,
        flaggedOpportunities: opportunitiesToFlag.length
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
      queryClient.invalidateQueries({ queryKey: ['opportunities-price-changes'] })
      queryClient.invalidateQueries({ queryKey: ['price-change-detection'] })
      queryClient.invalidateQueries({ queryKey: ['opportunity-summary'] })
      queryClient.invalidateQueries({ queryKey: ['trade-potential'] })

      if (result.deactivatedOpportunities > 0) {
        toast.success(`Auto-deactivated ${result.deactivatedOpportunities} opportunities with expired/removed prices`)
      }

      if (result.flaggedOpportunities > 0) {
        toast.info(`Flagged ${result.flaggedOpportunities} opportunities with price changes`)
      }

      if (result.detectedChanges === 0) {
        console.log('No price changes detected')
      }
    },
    onError: (error: any) => {
      console.error('Error in auto-deactivation:', error)
      toast.error('Failed to process price changes')
    },
  })
}