'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  MarketOpportunity,
  CreateMarketOpportunityData,
  UpdateMarketOpportunityData,
  MarketOpportunitySummary,
  MarketOpportunityStatus,
  MarketOpportunityPriority
} from '@/types/market-opportunities'
import { toast } from 'sonner'

// Get all market opportunities with filters
export function useMarketOpportunities(
  statusFilter?: MarketOpportunityStatus,
  priorityFilter?: MarketOpportunityPriority,
  activeOnly?: boolean,
  assignedTo?: string
) {
  return useQuery({
    queryKey: ['market-opportunities', statusFilter, priorityFilter, activeOnly, assignedTo],
    queryFn: async () => {
      let query = supabase
        .from('market_opportunities')
        .select(`
          *,
          hub:hubs!market_opportunities_hub_id_fkey(id, name, hub_code, city_name, country_code),
          supplier:suppliers!market_opportunities_supplier_id_fkey(id, name, city, country),
          product_packaging_specs:product_packaging_specs(
            id,
            boxes_per_pallet,
            pieces_per_box,
            weight_per_pallet,
            weight_unit,
            products(id, name, category, sold_by),
            packaging_options(label),
            size_options(name)
          ),
          assigned_agent:staff!market_opportunities_assigned_to_fkey(id, name, email)
        `)
        .order('created_at', { ascending: false })

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (priorityFilter && priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter)
      }

      if (activeOnly) {
        query = query.eq('is_active', true)
      }

      if (assignedTo) {
        query = query.eq('assigned_to', assignedTo)
      }

      const { data, error } = await query

      if (error) throw error

      // Fetch current supplier prices for all opportunities
      const { data: currentPrices, error: pricesError } = await supabase
        .from('current_supplier_prices')
        .select('*')

      if (pricesError) throw pricesError

      // Fetch selected transport bands for opportunities that have one
      const uniqueSelectedBandIds = [...new Set(data.map(opp => opp.selected_transport_band_id).filter(Boolean))] as string[]

      let selectedBandsMap: Record<string, any> = {}
      if (uniqueSelectedBandIds.length > 0) {
        const { data: selectedBandsData, error: selectedBandsError } = await supabase
          .from('transport_bands')
          .select('id, pallet_dimensions, min_pallets, max_pallets, price_per_pallet')
          .in('id', uniqueSelectedBandIds)

        if (!selectedBandsError && selectedBandsData) {
          selectedBandsData.forEach(band => {
            selectedBandsMap[band.id] = band
          })
        }
      }

      // Fetch route information (transporter and duration)
      const uniqueRouteIds = [...new Set(data.map(opp => opp.selected_route_id).filter(Boolean))] as string[]

      let routesMap: Record<string, any> = {}
      if (uniqueRouteIds.length > 0) {
        const { data: routesData, error: routesError } = await supabase
          .from('transport_routes')
          .select(`
            id,
            duration_days,
            transporter_id,
            transporters(id, name)
          `)
          .in('id', uniqueRouteIds)

        if (!routesError && routesData) {
          routesData.forEach(route => {
            routesMap[route.id] = route
          })
        }
      }

      // Fetch all transport bands for routes (for the dropdown)
      let allRouteBands: Record<string, any[]> = {}
      if (uniqueRouteIds.length > 0) {
        const { data: bandsData, error: bandsError } = await supabase
          .from('transport_bands')
          .select('*')
          .in('route_id', uniqueRouteIds)
          .order('min_pallets', { ascending: true })

        if (!bandsError && bandsData) {
          // Group bands by route_id
          bandsData.forEach(band => {
            if (!allRouteBands[band.route_id]) {
              allRouteBands[band.route_id] = []
            }
            allRouteBands[band.route_id].push(band)
          })
        }
      }

      // Map opportunities and update with current prices
      const updatedData = data.map(opp => {
        // Find current supplier price
        const currentPrice = currentPrices?.find(
          p => p.supplier_id === opp.supplier_id &&
               p.product_packaging_spec_id === opp.product_packaging_spec_id &&
               p.hub_id === opp.price_source_hub_id
        )

        // Get selected transport band
        const selectedTransportBand = opp.selected_transport_band_id ? selectedBandsMap[opp.selected_transport_band_id] : null

        // Get route information
        const routeInfo = opp.selected_route_id ? routesMap[opp.selected_route_id] : null

        // Get available bands for this route
        const availableBands = opp.selected_route_id ? allRouteBands[opp.selected_route_id] || [] : []

        if (currentPrice && currentPrice.id !== opp.supplier_price_id) {
          // Price has changed - recalculate delivered price
          const newSupplierPrice = currentPrice.price_per_unit
          const transportCost = opp.transport_cost_per_unit || 0
          const totalCost = newSupplierPrice + transportCost
          const newDeliveredPrice = totalCost * (1 + (opp.margin_percentage || 0) / 100)

          return {
            ...opp,
            supplier_price_per_unit: newSupplierPrice,
            delivered_price_per_unit: newDeliveredPrice,
            supplier_price_id: currentPrice.id,
            selected_transport_band: selectedTransportBand,
            _route_info: routeInfo,
            _available_bands: availableBands,
            // Mark that price was auto-updated
            _price_updated: true,
            _original_supplier_price: opp.supplier_price_per_unit,
            _original_delivered_price: opp.delivered_price_per_unit
          }
        }

        return {
          ...opp,
          selected_transport_band: selectedTransportBand,
          _route_info: routeInfo,
          _available_bands: availableBands
        }
      })

      return updatedData as MarketOpportunity[]
    },
  })
}

// Get summary statistics
export function useMarketOpportunitySummary() {
  return useQuery({
    queryKey: ['market-opportunities-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_opportunities')
        .select('status, priority, is_active, valid_till')

      if (error) throw error

      const now = new Date()
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      const summary: MarketOpportunitySummary = {
        total: data.length,
        active: data.filter(o => o.is_active).length,
        inactive: data.filter(o => !o.is_active).length,
        draft: data.filter(o => o.status === 'draft').length,
        suspended: data.filter(o => o.status === 'suspended').length,
        expired: data.filter(o => o.status === 'expired').length,
        byPriority: {
          low: data.filter(o => o.priority === 'low').length,
          medium: data.filter(o => o.priority === 'medium').length,
          high: data.filter(o => o.priority === 'high').length,
          urgent: data.filter(o => o.priority === 'urgent').length,
        },
        byStatus: {
          draft: data.filter(o => o.status === 'draft').length,
          active: data.filter(o => o.status === 'active').length,
          suspended: data.filter(o => o.status === 'suspended').length,
          cancelled: data.filter(o => o.status === 'cancelled').length,
          expired: data.filter(o => o.status === 'expired').length,
        },
        expiringSoon: data.filter(o =>
          o.valid_till && new Date(o.valid_till) < sevenDaysFromNow && new Date(o.valid_till) > now
        ).length,
        expired: data.filter(o => o.valid_till && new Date(o.valid_till) < now).length,
      }

      return summary
    },
  })
}

// Create market opportunity
export function useCreateMarketOpportunity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateMarketOpportunityData) => {
      const { data: result, error } = await supabase
        .from('market_opportunities')
        .insert(data)
        .select()
        .single()

      if (error) throw error
      return result as MarketOpportunity
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-opportunities'] })
      queryClient.invalidateQueries({ queryKey: ['market-opportunities-summary'] })
      queryClient.invalidateQueries({ queryKey: ['market-potential'] })
      toast.success('Market opportunity created')
    },
    onError: (error: any) => {
      toast.error(`Failed to create opportunity: ${error.message}`)
    },
  })
}

// Update market opportunity
export function useUpdateMarketOpportunity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateMarketOpportunityData }) => {
      const { data, error } = await supabase
        .from('market_opportunities')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as MarketOpportunity
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-opportunities'] })
      queryClient.invalidateQueries({ queryKey: ['market-opportunities-summary'] })
      toast.success('Market opportunity updated')
    },
    onError: (error: any) => {
      toast.error(`Failed to update opportunity: ${error.message}`)
    },
  })
}

// Delete market opportunity
export function useDeleteMarketOpportunity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('market_opportunities')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-opportunities'] })
      queryClient.invalidateQueries({ queryKey: ['market-opportunities-summary'] })
      queryClient.invalidateQueries({ queryKey: ['market-potential'] })
      toast.success('Market opportunity deleted')
    },
    onError: (error: any) => {
      toast.error(`Failed to delete opportunity: ${error.message}`)
    },
  })
}
