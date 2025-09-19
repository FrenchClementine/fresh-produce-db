'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Hub {
  id: string
  name: string
  hub_code: string
  country_code?: string
  city_name?: string
  region?: string
  is_active: boolean
  can_transship: boolean
  transship_handling_time_hours: number
  transship_cost_per_pallet: number
  latitude?: number
  longitude?: number
  coordinates_last_updated?: string
  coordinates_source?: string
  geocoding_failed: boolean
  geocoding_attempts: number
  created_at: string
}

// Get all active hubs
export function useHubs() {
  return useQuery({
    queryKey: ['hubs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hubs')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      return data as Hub[]
    }
  })
}

// Get all hubs (including inactive) - for logistics forms
export function useAllHubs() {
  return useQuery({
    queryKey: ['all-hubs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hubs')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      return data as Hub[]
    }
  })
}

// Get hubs by country
export function useHubsByCountry(countryCode?: string) {
  return useQuery({
    queryKey: ['hubs-by-country', countryCode],
    queryFn: async () => {
      let query = supabase
        .from('hubs')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (countryCode) {
        query = query.eq('country_code', countryCode)
      }

      const { data, error } = await query

      if (error) throw error
      return data as Hub[]
    }
  })
}

// Get single hub
export function useHub(hubId: string) {
  return useQuery({
    queryKey: ['hub', hubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hubs')
        .select('*')
        .eq('id', hubId)
        .single()

      if (error) throw error
      return data as Hub
    },
    enabled: !!hubId
  })
}