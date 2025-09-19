'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Transporter {
  id: string
  name: string
  email?: string
  phone_number?: string
  address?: string
  city?: string
  zip_code?: string
  country?: string
  diesel_surcharge_percentage: number
  agent_id?: string
  notes?: string
  is_active: boolean
  created_at: string
}

export interface TransporterRoute {
  id: string
  transporter_id: string
  origin_hub_id: string
  destination_hub_id: string
  transport_duration_days: number
  fixed_departure_days?: string[]
  customs_cost_per_shipment: number
  customs_description?: string
  notes?: string
  is_active: boolean
  created_at: string
}

export interface TransporterRoutePriceBand {
  id: string
  transporter_route_id: string
  pallet_dimensions: '120x80' | '120x100'
  min_pallets: number
  max_pallets?: number
  price_per_pallet: number
  valid_till?: string
  created_at: string
  last_updated_at: string
}

export interface RouteWithDetails extends TransporterRoute {
  transporters: Transporter
  origin_hub: {
    id: string
    name: string
    hub_code: string
    country_code?: string
    city_name?: string
  }
  destination_hub: {
    id: string
    name: string
    hub_code: string
    country_code?: string
    city_name?: string
  }
}

export interface PriceBandWithRoute extends TransporterRoutePriceBand {
  transporter_routes: RouteWithDetails
}

// Transporters
export function useTransporters() {
  return useQuery({
    queryKey: ['transporters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transporters')
        .select(`
          *,
          staff:agent_id(id, name, role)
        `)
        .order('name')
      
      if (error) throw error
      return data as Transporter[]
    },
  })
}

export function useTransporter(id?: string) {
  return useQuery({
    queryKey: ['transporter', id],
    queryFn: async () => {
      if (!id) return null
      
      const { data, error } = await supabase
        .from('transporters')
        .select(`
          *,
          staff:agent_id(id, name, role)
        `)
        .eq('id', id)
        .single()
      
      if (error) throw error
      return data as Transporter
    },
    enabled: !!id,
  })
}

export function useCreateTransporter() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (transporter: Omit<Transporter, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('transporters')
        .insert([transporter])
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transporters'] })
    },
  })
}

export function useUpdateTransporter() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Transporter> & { id: string }) => {
      const { data, error } = await supabase
        .from('transporters')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transporters'] })
      queryClient.invalidateQueries({ queryKey: ['transporter', data.id] })
    },
  })
}

export function useDeleteTransporter() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transporters')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transporters'] })
      queryClient.invalidateQueries({ queryKey: ['transporter-routes'] })
    },
  })
}

// Transporter Routes
export function useTransporterRoutes() {
  return useQuery({
    queryKey: ['transporter-routes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transporter_routes')
        .select(`
          *,
          transporters!inner(*),
          origin_hub:hubs!origin_hub_id(*),
          destination_hub:hubs!destination_hub_id(*)
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as RouteWithDetails[]
    },
  })
}

export function useTransporterRoute(id?: string) {
  return useQuery({
    queryKey: ['transporter-route', id],
    queryFn: async () => {
      if (!id) return null
      
      const { data, error } = await supabase
        .from('transporter_routes')
        .select(`
          *,
          transporters!inner(*),
          origin_hub:hubs!origin_hub_id(*),
          destination_hub:hubs!destination_hub_id(*)
        `)
        .eq('id', id)
        .single()
      
      if (error) throw error
      return data as RouteWithDetails
    },
    enabled: !!id,
  })
}

export function useCreateTransporterRoute() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (route: Omit<TransporterRoute, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('transporter_routes')
        .insert([route])
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transporter-routes'] })
    },
  })
}

export function useUpdateTransporterRoute() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TransporterRoute> & { id: string }) => {
      const { data, error } = await supabase
        .from('transporter_routes')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transporter-routes'] })
      queryClient.invalidateQueries({ queryKey: ['transporter-route', data.id] })
    },
  })
}

export function useDeleteTransporterRoute() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transporter_routes')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transporter-routes'] })
      queryClient.invalidateQueries({ queryKey: ['route-price-bands'] })
    },
  })
}

// Route Price Bands
export function useRoutePriceBands(routeId?: string) {
  return useQuery({
    queryKey: ['route-price-bands', routeId],
    queryFn: async () => {
      let query = supabase
        .from('transporter_route_price_bands')
        .select(`
          *,
          transporter_routes!inner(
            *,
            transporters!inner(*),
            origin_hub:hubs!origin_hub_id(*),
            destination_hub:hubs!destination_hub_id(*)
          )
        `)
        .order('pallet_dimensions')
        .order('min_pallets')
      
      if (routeId) {
        query = query.eq('transporter_route_id', routeId)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data as PriceBandWithRoute[]
    },
    enabled: routeId ? !!routeId : true,
  })
}

export function useCreateRoutePriceBand() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (priceBand: Omit<TransporterRoutePriceBand, 'id' | 'created_at' | 'last_updated_at'>) => {
      const { data, error } = await supabase
        .from('transporter_route_price_bands')
        .insert([{
          ...priceBand,
          last_updated_at: new Date().toISOString()
        }])
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['route-price-bands'] })
      queryClient.invalidateQueries({ queryKey: ['route-price-bands', data.transporter_route_id] })
    },
  })
}

export function useUpdateRoutePriceBand() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TransporterRoutePriceBand> & { id: string }) => {
      const { data, error } = await supabase
        .from('transporter_route_price_bands')
        .update({
          ...updates,
          last_updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['route-price-bands'] })
      queryClient.invalidateQueries({ queryKey: ['route-price-bands', data.transporter_route_id] })
    },
  })
}

export function useDeleteRoutePriceBand() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transporter_route_price_bands')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route-price-bands'] })
    },
  })
}

// Route Planning Functions
export interface RouteSearch {
  origin_hub_id: string
  destination_hub_id: string
  pallet_count?: number
  pallet_dimensions?: '120x80' | '120x100'
}

export interface DirectRouteResult {
  transporter_name: string
  route_id: string
  pallet_dimensions: string
  transport_days: number
  departure_days: string[] | null
  base_cost: number
  diesel_surcharge: number
  customs_cost: number
  total_cost: number
  price_age_days: number
}

export function useFindDirectRoutes(search?: RouteSearch) {
  return useQuery({
    queryKey: ['direct-routes', search],
    queryFn: async () => {
      if (!search || !search.origin_hub_id || !search.destination_hub_id) return []
      
      const { data, error } = await supabase.rpc('find_direct_routes', {
        p_origin_hub_id: search.origin_hub_id,
        p_destination_hub_id: search.destination_hub_id,
        p_pallet_count: search.pallet_count || null,
        p_pallet_dimensions: search.pallet_dimensions || '120x100'
      })
      
      if (error) throw error
      return data as DirectRouteResult[]
    },
    enabled: !!(search?.origin_hub_id && search?.destination_hub_id),
  })
}