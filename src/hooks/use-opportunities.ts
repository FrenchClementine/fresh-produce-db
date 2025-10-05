'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Opportunity, CreateOpportunityData, UpdateOpportunityData, OpportunitySummary, OpportunityStatus, OpportunityPriority } from '@/types/opportunities'
import { toast } from 'sonner'

// Get all opportunities with filters
async function fetchOpportunities(
  statusFilter: OpportunityStatus = 'all',
  priorityFilter: OpportunityPriority = 'all',
  activeOnly: boolean = true,
  assignedTo?: string
): Promise<Opportunity[]> {
  console.log('🔍 Fetching opportunities...', { statusFilter, priorityFilter, activeOnly, assignedTo })

  let query = supabase
    .from('opportunities')
    .select(`
      *,
      customer:customers!opportunities_customer_id_fkey(
        id,
        name,
        city,
        country,
        agent:staff!customers_agent_id_fkey(
          id,
          name
        )
      ),
      supplier:suppliers!opportunities_supplier_id_fkey(
        id,
        name,
        city,
        country
      ),
      selected_supplier:suppliers!opportunities_selected_supplier_id_fkey(
        id,
        name,
        city,
        country
      ),
      product_packaging_specs!opportunities_product_packaging_spec_id_fkey(
        id,
        boxes_per_pallet,
        weight_per_pallet,
        weight_unit,
        products!product_packaging_specs_product_id_fkey(
          id,
          name,
          category,
          sold_by
        ),
        packaging_options!product_packaging_specs_packaging_id_fkey(
          label
        ),
        size_options!product_packaging_specs_size_option_id_fkey(
          name
        )
      ),
      selected_transporter:transporters!opportunities_selected_transporter_id_fkey(
        id,
        name
      ),
      supplier_price:current_supplier_prices!opportunities_supplier_price_id_fkey(
        id,
        valid_until,
        price_per_unit,
        currency,
        delivery_mode,
        hub_id,
        hub_name,
        hub_code
      ),
      assigned_agent:staff!opportunities_assigned_to_fkey(
        id,
        name,
        email
      ),
      created_by_staff:staff!opportunities_created_by_fkey(
        id,
        name
      )
    `)
    .order('created_at', { ascending: false })

  // Apply filters
  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  if (priorityFilter !== 'all') {
    query = query.eq('priority', priorityFilter)
  }

  if (assignedTo) {
    query = query.eq('assigned_to', assignedTo)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching opportunities:', error)
    throw error
  }

  if (!data || data.length === 0) {
    return []
  }

  // Get transport band information for opportunities that have selected_transport_band_id
  // Try to fetch ALL transport band IDs (including non-UUID ones like 'band-0')
  const allTransportBandIds = data
    .filter(opp => opp.selected_transport_band_id)
    .map(opp => opp.selected_transport_band_id)

  if (allTransportBandIds.length > 0) {
    console.log('🚛 Transport band IDs found:', allTransportBandIds)
  }

  let transportBands: any[] = []
  if (allTransportBandIds.length > 0) {
    // Try to fetch transport bands by ID first
    const { data: bandData, error: bandError } = await supabase
      .from('transporter_route_price_bands')
      .select('id, min_pallets, max_pallets, price_per_pallet')
      .in('id', allTransportBandIds)

    if (!bandError && bandData) {
      transportBands = bandData
      console.log('🚛 Transport bands fetched:', transportBands)
    } else {
      console.error('🚛 Error fetching transport bands:', bandError)

      // If that fails, maybe the IDs are stored differently - try a different approach
      // Check if there are any bands at all
      const { data: allBands, error: allBandsError } = await supabase
        .from('transporter_route_price_bands')
        .select('*')
        .limit(10)

      if (!allBandsError) {
        console.log('🚛 Sample transport bands in database:', allBands)
      }
    }
  }

  // Merge transport band data with opportunities
  const enrichedData = data.map(opportunity => {
    if (opportunity.selected_transport_band_id) {
      const transportBand = transportBands.find(band => band.id === opportunity.selected_transport_band_id)
      if (transportBand) {
        return {
          ...opportunity,
          selected_transport_band: transportBand
        }
      }
    }
    return opportunity
  })

  return enrichedData || []
}

// Get opportunity summary/stats
async function fetchOpportunitySummary(): Promise<OpportunitySummary> {
  console.log('📊 Fetching opportunity summary...')

  const { data, error } = await supabase
    .from('opportunities')
    .select('status, priority, is_active, valid_till')

  if (error) throw error

  const summary: OpportunitySummary = {
    total: data.length,
    active: 0,
    inactive: 0,
    draft: 0,
    negotiating: 0,
    offered: 0,
    confirmed: 0,
    byPriority: { low: 0, medium: 0, high: 0, urgent: 0 },
    byStatus: {
      draft: 0,
      active: 0,
      negotiating: 0,
      offered: 0,
      confirmed: 0,
      cancelled: 0,
      completed: 0
    },
    byPriceStatus: {
      current: 0,
      changed: 0,
      expired: 0,
      reviewed: 0
    },
    expiringSoon: 0,
    expired: 0,
    priceChanges: 0
  }

  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  data.forEach(opportunity => {
    // Active/Inactive counts
    if (opportunity.is_active) {
      summary.active++
    } else {
      summary.inactive++
    }

    // Status counts (only for active opportunities)
    if (opportunity.is_active) {
      summary.byStatus[opportunity.status as keyof typeof summary.byStatus]++

      // Legacy status counts for backwards compatibility
      if (opportunity.status === 'draft') summary.draft++
      if (opportunity.status === 'negotiating') summary.negotiating++
      if (opportunity.status === 'offered') summary.offered++
      if (opportunity.status === 'confirmed') summary.confirmed++
    }

    // Priority counts (only for active opportunities)
    if (opportunity.is_active) {
      summary.byPriority[opportunity.priority as keyof typeof summary.byPriority]++
    }

    // Expiry tracking (only for active opportunities)
    if (opportunity.is_active && opportunity.valid_till) {
      const validTill = new Date(opportunity.valid_till)
      if (validTill < now) {
        summary.expired++
      } else if (validTill <= sevenDaysFromNow) {
        summary.expiringSoon++
      }
    }
  })

  return summary
}

// Get single opportunity by ID
async function fetchOpportunity(id: string): Promise<Opportunity> {
  console.log('🔍 Fetching opportunity:', id)

  const { data, error } = await supabase
    .from('opportunities')
    .select(`
      *,
      customer:customers!opportunities_customer_id_fkey(
        id,
        name,
        city,
        country,
        agent:staff!customers_agent_id_fkey(
          id,
          name
        )
      ),
      supplier:suppliers!opportunities_supplier_id_fkey(
        id,
        name,
        city,
        country
      ),
      selected_supplier:suppliers!opportunities_selected_supplier_id_fkey(
        id,
        name,
        city,
        country
      ),
      product_packaging_specs!opportunities_product_packaging_spec_id_fkey(
        id,
        boxes_per_pallet,
        weight_per_pallet,
        weight_unit,
        products!product_packaging_specs_product_id_fkey(
          id,
          name,
          category,
          sold_by
        ),
        packaging_options!product_packaging_specs_packaging_id_fkey(
          label
        ),
        size_options!product_packaging_specs_size_option_id_fkey(
          name
        )
      ),
      selected_transporter:transporters!opportunities_selected_transporter_id_fkey(
        id,
        name
      ),
      supplier_price:current_supplier_prices!opportunities_supplier_price_id_fkey(
        id,
        valid_until,
        price_per_unit,
        currency,
        delivery_mode,
        hub_id,
        hub_name,
        hub_code
      ),
      assigned_agent:staff!opportunities_assigned_to_fkey(
        id,
        name,
        email
      ),
      created_by_staff:staff!opportunities_created_by_fkey(
        id,
        name
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error

  if (!data) return data

  // Get transport band information if the opportunity has selected_transport_band_id
  if (data.selected_transport_band_id) {
    const { data: bandData, error: bandError } = await supabase
      .from('transporter_route_price_bands')
      .select('id, min_pallets, max_pallets, price_per_pallet')
      .eq('id', data.selected_transport_band_id)
      .single()

    if (!bandError && bandData) {
      return {
        ...data,
        selected_transport_band: bandData
      }
    }
  }

  return data
}

// Create new opportunity
async function createOpportunity(data: CreateOpportunityData): Promise<Opportunity> {
  console.log('✨ Creating opportunity:', data)

  // Clean the data to remove any undefined values that might cause issues
  const cleanData = Object.fromEntries(
    Object.entries({
      ...data,
      status: data.status || 'draft',
      priority: data.priority || 'medium'
    }).filter(([_, value]) => value !== undefined)
  )

  console.log('✨ Clean data for insertion:', cleanData)

  try {
    const { data: opportunity, error } = await supabase
      .from('opportunities')
      .insert(cleanData)
      .select()
      .single()

    if (error) {
      console.error('❌ Supabase error creating opportunity:', error)
      throw error
    }

    console.log('✅ Opportunity created successfully:', opportunity)
    return opportunity
  } catch (err) {
    console.error('❌ Network/fetch error creating opportunity:', err)
    throw err
  }
}

// Update opportunity
async function updateOpportunity(id: string, data: UpdateOpportunityData): Promise<Opportunity> {
  console.log('📝 Updating opportunity:', id, data)

  const { data: opportunity, error } = await supabase
    .from('opportunities')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return opportunity
}

// Delete opportunity (hard delete - removes from database)
async function deleteOpportunity(id: string): Promise<void> {
  console.log('🗑️ Deleting opportunity:', id)

  const { error } = await supabase
    .from('opportunities')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Hook to get all opportunities
export function useOpportunities(
  statusFilter: OpportunityStatus = 'all',
  priorityFilter: OpportunityPriority = 'all',
  activeOnly: boolean = true,
  assignedTo?: string
) {
  return useQuery({
    queryKey: ['opportunities', statusFilter, priorityFilter, activeOnly, assignedTo],
    queryFn: () => fetchOpportunities(statusFilter, priorityFilter, activeOnly, assignedTo),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Hook to get opportunity summary
export function useOpportunitySummary() {
  return useQuery({
    queryKey: ['opportunity-summary'],
    queryFn: fetchOpportunitySummary,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Hook to get single opportunity
export function useOpportunity(id: string) {
  return useQuery({
    queryKey: ['opportunity', id],
    queryFn: () => fetchOpportunity(id),
    enabled: !!id,
  })
}

// Hook to create opportunity
export function useCreateOpportunity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createOpportunity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
      queryClient.invalidateQueries({ queryKey: ['opportunity-summary'] })
      queryClient.invalidateQueries({ queryKey: ['trade-potential'] })
      toast.success('Opportunity created successfully')
    },
    onError: (error) => {
      console.error('Error creating opportunity:', error)
      toast.error('Failed to create opportunity')
    },
  })
}

// Hook to update opportunity
export function useUpdateOpportunity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOpportunityData }) =>
      updateOpportunity(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
      queryClient.invalidateQueries({ queryKey: ['opportunity'] })
      queryClient.invalidateQueries({ queryKey: ['opportunity-summary'] })
      queryClient.invalidateQueries({ queryKey: ['trade-potential'] })
      toast.success('Opportunity updated successfully')
    },
    onError: (error) => {
      console.error('Error updating opportunity:', error)
      toast.error('Failed to update opportunity')
    },
  })
}

// Hook to delete opportunity
export function useDeleteOpportunity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteOpportunity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
      queryClient.invalidateQueries({ queryKey: ['opportunity-summary'] })
      queryClient.invalidateQueries({ queryKey: ['trade-potential'] })
      toast.success('Opportunity removed - trade is now back to potential')
    },
    onError: (error) => {
      console.error('Error deleting opportunity:', error)
      toast.error('Failed to delete opportunity')
    },
  })
}
