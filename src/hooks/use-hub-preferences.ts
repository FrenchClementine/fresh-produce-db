'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  HubProductPreference,
  HubProductPreferenceDetailed,
  AddHubPreferenceData,
  UpdateHubPreferenceData,
  HubPreferencesSummary,
  HubPreferencePriority
} from '@/types/hub-preferences'
import { toast } from 'sonner'

// Get all preferences for a hub
export function useHubPreferences(hubId?: string, priorityFilter?: HubPreferencePriority) {
  return useQuery({
    queryKey: ['hub-preferences', hubId, priorityFilter],
    queryFn: async () => {
      let query = supabase
        .from('v_hub_product_preferences_detailed')
        .select('*')
        .order('priority', { ascending: false })
        .order('product_name', { ascending: true })

      if (hubId) {
        query = query.eq('hub_id', hubId)
      }

      if (priorityFilter && priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter)
      }

      const { data, error } = await query

      if (error) throw error
      return data as HubProductPreferenceDetailed[]
    },
    enabled: true,
  })
}

// Get summary stats
export function useHubPreferencesSummary() {
  return useQuery({
    queryKey: ['hub-preferences-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hub_product_preferences')
        .select('hub_id, is_active, priority')
        .eq('is_active', true)

      if (error) throw error

      const byHub = data.reduce((acc, pref) => {
        if (!acc[pref.hub_id]) {
          acc[pref.hub_id] = { total: 0, high: 0, urgent: 0 }
        }
        acc[pref.hub_id].total++
        if (pref.priority === 'high') acc[pref.hub_id].high++
        if (pref.priority === 'urgent') acc[pref.hub_id].urgent++
        return acc
      }, {} as Record<string, { total: number; high: number; urgent: number }>)

      return {
        totalPreferences: data.length,
        byHub,
      } as HubPreferencesSummary
    },
  })
}

// Add preference
export function useAddHubPreference() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: AddHubPreferenceData) => {
      const { data: result, error } = await supabase
        .from('hub_product_preferences')
        .insert(data)
        .select()
        .single()

      if (error) throw error
      return result as HubProductPreference
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hub-preferences'] })
      queryClient.invalidateQueries({ queryKey: ['hub-preferences', variables.hub_id] })
      queryClient.invalidateQueries({ queryKey: ['hub-preferences-summary'] })
      toast.success('Product preference added')
    },
    onError: (error: any) => {
      toast.error(`Failed to add preference: ${error.message}`)
    },
  })
}

// Update preference
export function useUpdateHubPreference() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateHubPreferenceData }) => {
      const { data, error } = await supabase
        .from('hub_product_preferences')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as HubProductPreference
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-preferences'] })
      queryClient.invalidateQueries({ queryKey: ['hub-preferences-summary'] })
      toast.success('Preference updated')
    },
    onError: (error: any) => {
      toast.error(`Failed to update preference: ${error.message}`)
    },
  })
}

// Delete preference
export function useDeleteHubPreference() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('hub_product_preferences')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-preferences'] })
      queryClient.invalidateQueries({ queryKey: ['hub-preferences-summary'] })
      toast.success('Preference removed')
    },
    onError: (error: any) => {
      toast.error(`Failed to remove preference: ${error.message}`)
    },
  })
}
