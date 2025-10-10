'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Supplier {
  id: string
  name: string
  email?: string
  phone_number?: string
  address?: string
  city?: string
  country?: string
  delivery_modes: string[]
  agent_id?: string
  is_active: boolean
  notes?: string
  created_at: string
}

export interface SupplierWithProducts extends Supplier {
  supplier_product_packaging_spec: Array<{
    id: string
    product_packaging_spec_id: string
    notes?: string
    season?: string
    available_months?: string[]
    product_packaging_specs: {
      id: string
      boxes_per_pallet: number
      weight_per_box: number
      weight_per_pallet: number
      weight_unit: string
      pieces_per_box?: number
      products: {
        id: string
        name: string
        category: string
        intended_use: string
        sold_by: string
      }
      packaging_options: {
        id: string
        label: string
        unit_type: string
        description?: string
      }
      pallets: {
        id: string
        label: string
        dimensions_cm?: string
      }
      size_options: {
        id: string
        name: string
      }
    }
  }>
}

// Get all active suppliers
export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      return data as Supplier[]
    }
  })
}

// Get supplier with their products
export function useSupplierWithProducts(supplierId: string) {
  return useQuery({
    queryKey: ['supplier-with-products', supplierId],
    queryFn: async () => {
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
        .eq('is_active', true)
        .single()

      if (error) throw error
      return data as SupplierWithProducts
    },
    enabled: !!supplierId
  })
}

// Get supplier products for a specific supplier
export function useSupplierProducts(supplierId: string) {
  return useQuery({
    queryKey: ['supplier-products', supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_product_packaging_spec')
        .select(`
          id,
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
        `)
        .eq('supplier_id', supplierId)
        .order('id', { ascending: true })

      if (error) throw error
      return data
    },
    enabled: !!supplierId
  })
}

// Get supplier logistics capabilities (available hubs and delivery modes)
export function useSupplierLogistics(supplierId: string) {
  return useQuery({
    queryKey: ['supplier-logistics', supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_logistics_capabilities')
        .select(`
          id,
          mode,
          typical_lead_time_days,
          fixed_operational_days,
          notes,
          origin_hub:origin_hub_id (
            id,
            name,
            hub_code,
            city_name,
            country_code
          ),
          destination_hub:destination_hub_id (
            id,
            name,
            hub_code,
            city_name,
            country_code
          )
        `)
        .eq('supplier_id', supplierId)
        .order('mode', { ascending: true })

      if (error) throw error
      return data
    },
    enabled: !!supplierId
  })
}

// Get unique hubs where supplier can operate from and deliver to
export function useSupplierHubs(supplierId: string) {
  return useQuery({
    queryKey: ['supplier-hubs', supplierId],
    queryFn: async () => {
      const { data: logistics, error } = await supabase
        .from('supplier_logistics_capabilities')
        .select(`
          mode,
          origin_hub:origin_hub_id (
            id,
            name,
            hub_code,
            city_name,
            country_code
          ),
          destination_hub:destination_hub_id (
            id,
            name,
            hub_code,
            city_name,
            country_code
          )
        `)
        .eq('supplier_id', supplierId)

      if (error) throw error

      // Get unique hubs and their available delivery modes
      const hubsMap = new Map()

      logistics?.forEach(item => {
        // Add origin hubs (for Ex Works and Transit)
        if (item.origin_hub) {
          const hubId = (item.origin_hub as any)?.id || (item.origin_hub as any)?.[0]?.id
          if (!hubsMap.has(hubId)) {
            hubsMap.set(hubId, {
              ...item.origin_hub,
              delivery_modes: [],
              hub_type: 'origin'
            })
          }
          // For Ex Works and Transit, supplier provides from origin
          if (item.mode === 'Ex Works') {
            hubsMap.get(hubId).delivery_modes.push('Ex Works')
          }
          if (item.mode === 'TRANSIT') {
            hubsMap.get(hubId).delivery_modes.push('TRANSIT')
          }
        }

        // Add destination hubs (for Delivery)
        if (item.destination_hub) {
          const hubId = (item.destination_hub as any)?.id || (item.destination_hub as any)?.[0]?.id
          if (!hubsMap.has(hubId)) {
            hubsMap.set(hubId, {
              ...item.destination_hub,
              delivery_modes: [],
              hub_type: 'destination'
            })
          }
          // For Delivery, supplier delivers to destination
          if (item.mode === 'DELIVERY') {
            hubsMap.get(hubId).delivery_modes.push('DELIVERY')
          }
        }
      })

      return Array.from(hubsMap.values())
    },
    enabled: !!supplierId
  })
}