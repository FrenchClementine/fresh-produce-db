'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'
import { CheckCircle, AlertCircle, XCircle, MinusCircle, Check, X, Eye, CheckSquare, Square, ChevronsUpDown } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { useExcludePotential, extractExclusionData } from '@/hooks/use-excluded-potentials'
import { useSuppliers } from '@/hooks/use-suppliers'
import { useCustomers } from '@/hooks/use-customers'
import { useActiveStaff } from '@/hooks/use-staff'
import { useCreateOpportunity } from '@/hooks/use-opportunities'
import React from 'react'
import { TradePotential, PotentialStatus } from '@/types/trade-potential'
import { toast } from 'sonner'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'

// Simple currency formatter
const formatCurrency = (amount: number, currency: string = 'EUR') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

interface TradePotentialTableModeProps {
  potentials: TradePotential[]
  statusFilter: PotentialStatus
  setStatusFilter: (status: PotentialStatus) => void
  showOpportunityFilter: boolean
  setShowOpportunityFilter: (show: boolean) => void
  customerFilter: string
  setCustomerFilter: (filter: string) => void
  supplierFilter: string
  setSupplierFilter: (filter: string) => void
  agentFilter: string
  setAgentFilter: (filter: string) => void
  onRefresh: () => void
}

interface PricingState {
  [key: string]: {
    marginPercent: number
    offerPrice: number
    isEditing: boolean
    selectedBandIndex: number
    selectedTransporterIndex: number
  }
}

interface GroupedPotential {
  groupKey: string
  customer: TradePotential['customer']
  product: TradePotential['product']
  hubId: string
  hubName: string
  potentials: TradePotential[]
  selectedSupplierId: string
  selectedPackagingSpecId: string
  cheapestPotential: TradePotential
}

interface GroupSelectionState {
  [groupKey: string]: {
    selectedSupplierId: string
    selectedPackagingSpecId: string
  }
}

export default function TradePotentialTableMode({
  potentials: data,
  statusFilter,
  setStatusFilter,
  showOpportunityFilter,
  setShowOpportunityFilter,
  customerFilter,
  setCustomerFilter,
  supplierFilter,
  setSupplierFilter,
  agentFilter,
  setAgentFilter,
  onRefresh
}: TradePotentialTableModeProps) {
  const [pricingState, setPricingState] = useState<PricingState>({})
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkMargin, setBulkMargin] = useState<number>(10)
  const [autoSelectEnabled, setAutoSelectEnabled] = useState<boolean>(true)
  const [showAllRows, setShowAllRows] = useState<boolean>(false)
  const [groupSelectionState, setGroupSelectionState] = useState<GroupSelectionState>({})
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false)
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [supplierSearchOpen, setSupplierSearchOpen] = useState(false)
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('')

  const { customers } = useCustomers()
  const { data: suppliers } = useSuppliers()
  const { activeStaff } = useActiveStaff()
  const queryClient = useQueryClient()
  const excludePotentialMutation = useExcludePotential()
  const createOpportunityMutation = useCreateOpportunity()

  // Filter customers by selected agent
  const filteredCustomers = React.useMemo(() => {
    if (!customers) return []
    if (agentFilter === 'all') return customers

    // Filter customers that have the selected agent
    return customers.filter(customer => customer.agent_id === agentFilter)
  }, [customers, agentFilter])

  // Filter customers for search
  const filteredCustomersForSearch = React.useMemo(() => {
    if (!filteredCustomers) return []
    if (!customerSearchQuery) return filteredCustomers

    const searchTerm = customerSearchQuery.toLowerCase()
    return filteredCustomers.filter(customer =>
      customer.name.toLowerCase().includes(searchTerm) ||
      customer.city?.toLowerCase().includes(searchTerm) ||
      customer.country?.toLowerCase().includes(searchTerm)
    )
  }, [filteredCustomers, customerSearchQuery])

  // Filter suppliers for search
  const filteredSuppliersForSearch = React.useMemo(() => {
    if (!suppliers) return []
    if (!supplierSearchQuery) return suppliers

    const searchTerm = supplierSearchQuery.toLowerCase()
    return suppliers.filter(supplier =>
      supplier.name.toLowerCase().includes(searchTerm) ||
      supplier.city?.toLowerCase().includes(searchTerm) ||
      supplier.country?.toLowerCase().includes(searchTerm)
    )
  }, [suppliers, supplierSearchQuery])

  // Filter transport bands to match product's pallet dimensions
  const getFilteredBands = (potential: TradePotential) => {
    const bands = potential.transportRoute?.availableBands
    if (!bands || bands.length === 0) return []

    const productPalletDimensions = potential.product.palletDimensions
    if (!productPalletDimensions) return bands

    // Filter bands that match the product's pallet dimensions
    return bands.filter(band => {
      // If band has no pallet_dimensions, include it (backwards compatibility)
      if (!band.pallet_dimensions) return true

      // Match the pallet dimensions
      return band.pallet_dimensions === productPalletDimensions
    })
  }

  // Get transport cost per unit for a selected band and transporter
  const getTransportCostPerUnit = (potential: TradePotential, bandIndex: number = 0, transporterIndex: number = 0) => {
    // Use selected transporter if available, otherwise fall back to default transportRoute
    let route = potential.transportRoute
    if (potential.availableTransportRoutes && potential.availableTransportRoutes.length > 0) {
      route = potential.availableTransportRoutes[transporterIndex] || potential.transportRoute
    }

    if (!route) {
      return 0
    }

    // Use filtered bands instead of raw bands
    const filteredBands = getFilteredBands(potential)

    // If no filtered bands, check if we can use raw bands or route.pricePerUnit
    if (filteredBands.length === 0) {
      // If there are raw bands but they were filtered out, use the first raw band for customs calculation
      if (route.availableBands && route.availableBands.length > 0) {
        const rawBand = route.availableBands[0]
        let customsCostPerPallet = 0

        if (route.customsCostPerShipment > 0 && rawBand.min_pallets && rawBand.max_pallets && route.unitsPerPallet > 0) {
          const avgPallets = (rawBand.min_pallets + rawBand.max_pallets) / 2
          customsCostPerPallet = route.customsCostPerShipment / avgPallets
          const customsCostPerUnit = customsCostPerPallet / route.unitsPerPallet
          return (route.pricePerUnit || 0) + customsCostPerUnit
        }
      }
      // No bands at all, return the stored pricePerUnit (includes supplier delivery, same location, etc.)
      return route.pricePerUnit || 0
    }

    const band = filteredBands[bandIndex]

    if (!band || !route.unitsPerPallet || route.unitsPerPallet === 0) {
      return 0
    }

    // Calculate customs cost per pallet based on average band size
    let customsCostPerPallet = 0

    if (route.customsCostPerShipment > 0 && band.min_pallets && band.max_pallets) {
      const avgPallets = (band.min_pallets + band.max_pallets) / 2
      customsCostPerPallet = route.customsCostPerShipment / avgPallets
    }

    // Total cost per pallet includes transport + customs
    const totalCostPerPallet = band.price_per_pallet + customsCostPerPallet

    const costPerUnit = totalCostPerPallet / route.unitsPerPallet

    return costPerUnit
  }

  // Initialize pricing state for a potential
  const getPricingState = (potential: TradePotential) => {
    if (pricingState[potential.id]) {
      return pricingState[potential.id]
    }

    const cost = potential.supplierPrice?.pricePerUnit || 0
    const transportCost = getTransportCostPerUnit(potential, 0, 0)
    const totalCost = cost + transportCost
    const defaultMargin = 10 // 10% default margin
    const offerPrice = totalCost * (1 + defaultMargin / 100)

    return {
      marginPercent: defaultMargin,
      offerPrice: offerPrice,
      isEditing: false,
      selectedBandIndex: 0,
      selectedTransporterIndex: 0
    }
  }

  // Update margin percentage
  const updateMargin = (potentialId: string, totalCost: number, newMargin: number) => {
    const offerPrice = totalCost * (1 + newMargin / 100)
    const currentState = pricingState[potentialId] || { selectedBandIndex: 0, selectedTransporterIndex: 0 }
    setPricingState(prev => ({
      ...prev,
      [potentialId]: {
        marginPercent: newMargin,
        offerPrice: offerPrice,
        isEditing: true,
        selectedBandIndex: currentState.selectedBandIndex,
        selectedTransporterIndex: currentState.selectedTransporterIndex
      }
    }))
  }

  // Update offer price
  const updateOfferPrice = (potentialId: string, totalCost: number, newOfferPrice: number) => {
    const margin = totalCost > 0 ? ((newOfferPrice - totalCost) / totalCost) * 100 : 0
    const currentState = pricingState[potentialId] || { selectedBandIndex: 0, selectedTransporterIndex: 0 }
    setPricingState(prev => ({
      ...prev,
      [potentialId]: {
        marginPercent: margin,
        offerPrice: newOfferPrice,
        isEditing: true,
        selectedBandIndex: currentState.selectedBandIndex,
        selectedTransporterIndex: currentState.selectedTransporterIndex
      }
    }))
  }

  // Update selected transport band
  const updateTransportBand = (potential: TradePotential, bandIndex: number) => {
    const cost = potential.supplierPrice?.pricePerUnit || 0
    const currentState = pricingState[potential.id] || { marginPercent: 10, isEditing: false, selectedTransporterIndex: 0 }
    const transportCost = getTransportCostPerUnit(potential, bandIndex, currentState.selectedTransporterIndex)
    const totalCost = cost + transportCost
    const offerPrice = totalCost * (1 + currentState.marginPercent / 100)

    setPricingState(prev => ({
      ...prev,
      [potential.id]: {
        marginPercent: currentState.marginPercent,
        offerPrice: offerPrice,
        isEditing: true,
        selectedBandIndex: bandIndex,
        selectedTransporterIndex: currentState.selectedTransporterIndex
      }
    }))
  }

  // Update selected transporter
  const updateSelectedTransporter = (potential: TradePotential, transporterIndex: number) => {
    const cost = potential.supplierPrice?.pricePerUnit || 0
    const currentState = pricingState[potential.id] || { marginPercent: 10, isEditing: false, selectedBandIndex: 0 }
    const transportCost = getTransportCostPerUnit(potential, currentState.selectedBandIndex, transporterIndex)
    const totalCost = cost + transportCost
    const offerPrice = totalCost * (1 + currentState.marginPercent / 100)

    setPricingState(prev => ({
      ...prev,
      [potential.id]: {
        marginPercent: currentState.marginPercent,
        offerPrice: offerPrice,
        isEditing: true,
        selectedBandIndex: currentState.selectedBandIndex,
        selectedTransporterIndex: transporterIndex
      }
    }))
  }

  // Calculate summary from potentials
  const summary = {
    total: data.length,
    complete: data.filter(p => p.status === 'complete').length,
    missingPrice: data.filter(p => p.status === 'missing_price').length,
    missingTransport: data.filter(p => p.status === 'missing_transport').length,
    missingBoth: data.filter(p => p.status === 'missing_both').length,
    completionRate: data.length > 0 ? (data.filter(p => p.status === 'complete').length / data.length) * 100 : 0
  }

  // Bulk selection helpers
  const selectablePotentials = data.filter(p => p.status === 'complete' && !p.hasOpportunity)
  const filteredSelectablePotentials = selectablePotentials.filter(potential => {
    // Customer filter
    if (customerFilter !== 'all' && potential.customer.id !== customerFilter) {
      return false
    }

    // Supplier filter
    if (supplierFilter !== 'all' && potential.supplier.id !== supplierFilter) {
      return false
    }

    // Agent filter
    if (agentFilter !== 'all' && potential.customer.agent?.id !== agentFilter) {
      return false
    }

    return true
  })

  // Auto-select filtered items when filters change
  React.useEffect(() => {
    if (autoSelectEnabled) {
      setSelectedIds(new Set(filteredSelectablePotentials.map(p => p.id)))
    }
  }, [customerFilter, supplierFilter, agentFilter, statusFilter, showOpportunityFilter, autoSelectEnabled, filteredSelectablePotentials.length])

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredSelectablePotentials.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredSelectablePotentials.map(p => p.id)))
    }
  }

  const toggleSelect = (id: string) => {
    // Disable auto-select when user manually toggles
    setAutoSelectEnabled(false)
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const handleFilterChange = (type: 'customer' | 'supplier' | 'agent', value: string) => {
    // Re-enable auto-select when filters change
    setAutoSelectEnabled(true)
    switch (type) {
      case 'customer':
        setCustomerFilter(value)
        break
      case 'supplier':
        setSupplierFilter(value)
        break
      case 'agent':
        setAgentFilter(value)
        // Reset customer filter to 'all' when agent changes
        // This ensures we don't have an invalid customer selected
        if (customerFilter !== 'all') {
          const customerStillValid = customers?.some(
            c => c.id === customerFilter && (value === 'all' || c.agent_id === value)
          )
          if (!customerStillValid) {
            setCustomerFilter('all')
          }
        }
        break
    }
  }

  const handleStatusFilterChange = (value: PotentialStatus) => {
    // Re-enable auto-select when filters change
    setAutoSelectEnabled(true)
    setStatusFilter(value)
  }

  const handleOpportunityFilterChange = (checked: boolean) => {
    setAutoSelectEnabled(true)
    setShowOpportunityFilter(checked)
  }

  const applyBulkMargin = () => {
    const updates: PricingState = {}
    selectedIds.forEach(id => {
      const potential = data.find(p => p.id === id)
      if (potential) {
        const productCost = potential.supplierPrice?.pricePerUnit || 0
        const currentState = pricingState[id] || { selectedBandIndex: 0, selectedTransporterIndex: 0 }
        const transportCost = getTransportCostPerUnit(potential, currentState.selectedBandIndex, currentState.selectedTransporterIndex)
        const totalCost = productCost + transportCost
        const offerPrice = totalCost * (1 + bulkMargin / 100)

        updates[id] = {
          marginPercent: bulkMargin,
          offerPrice: offerPrice,
          isEditing: true,
          selectedBandIndex: currentState.selectedBandIndex,
          selectedTransporterIndex: currentState.selectedTransporterIndex
        }
      }
    })
    setPricingState(prev => ({ ...prev, ...updates }))
    toast.success(`Applied ${bulkMargin}% margin to ${selectedIds.size} items`)
  }

  const handleBulkCreate = async () => {
    const count = selectedIds.size
    if (count === 0) {
      toast.error('No items selected')
      return
    }

    if (!confirm(`Create ${count} opportunities?`)) {
      return
    }

    let successCount = 0
    let duplicateCount = 0
    let errorCount = 0

    for (const id of Array.from(selectedIds)) {
      const potential = data.find(p => p.id === id)
      if (!potential) continue

      const pricing = getPricingState(potential)

      // Get transport band if available (use filtered bands)
      const filteredBands = getFilteredBands(potential)
      const selectedBand = filteredBands[pricing.selectedBandIndex]

      // Get the selected transport route (could be direct or multi-leg)
      let selectedRoute = potential.transportRoute
      let selectedTransporterId: string | undefined = undefined

      if (potential.availableTransportRoutes && potential.availableTransportRoutes.length > 0) {
        selectedRoute = potential.availableTransportRoutes[pricing.selectedTransporterIndex]
        selectedTransporterId = selectedRoute?.transporterId || undefined
      } else if (potential.transportRoute?.transporterId) {
        selectedTransporterId = potential.transportRoute.transporterId
      }

      // Get delivery hub ID from the selected route
      let deliveryHubId: string | undefined = undefined
      if (selectedRoute) {
        if (selectedRoute.legs && selectedRoute.legs.length > 0) {
          // Multi-leg: use the final destination hub
          deliveryHubId = selectedRoute.legs[selectedRoute.legs.length - 1]?.destinationHubId
        } else if (selectedRoute.destinationHubId) {
          // Single-leg: use the destination hub
          deliveryHubId = selectedRoute.destinationHubId
        }
      }

      // Build opportunity data
      const opportunityData: any = {
        customer_id: potential.customer.id,
        supplier_id: potential.supplier.id,
        product_packaging_spec_id: potential.product.specId,
        offer_price_per_unit: pricing.offerPrice,
        offer_currency: potential.supplierPrice?.currency || 'EUR',
        status: 'draft',
        priority: 'medium',
        supplier_price_id: potential.supplierPrice?.id,
        assigned_to: potential.customer.agent?.id,
        selected_transporter_id: selectedTransporterId,
        selected_transport_band_id: selectedBand?.id || undefined,
        delivery_hub_id: deliveryHubId
      }

      // Add multi-leg transport data if the selected route is multi-leg
      if (selectedRoute?.legs && selectedRoute.legs.length > 1) {
        opportunityData.transport_route_legs = {
          total_legs: selectedRoute.totalLegs || selectedRoute.legs.length,
          total_cost_per_pallet: selectedRoute.totalCostPerPallet || selectedRoute.pricePerPallet || 0,
          total_duration_days: selectedRoute.totalDurationDays || selectedRoute.durationDays || 0,
          legs: selectedRoute.legs.map((leg: any) => ({
            leg: leg.leg,
            route_id: leg.routeId,
            origin_hub_id: leg.originHubId,
            origin_hub_name: leg.originHubName,
            destination_hub_id: leg.destinationHubId,
            destination_hub_name: leg.destinationHubName,
            transporter_id: leg.transporterId,
            transporter_name: leg.transporterName,
            cost_per_pallet: leg.costPerPallet,
            duration_days: leg.durationDays
          }))
        }
        opportunityData.total_transport_legs = selectedRoute.totalLegs || selectedRoute.legs.length
      }

      try {
        await createOpportunityMutation.mutateAsync(opportunityData)
        successCount++
      } catch (error: any) {
        // Check if it's a duplicate error (409 conflict)
        if (error?.code === '23505' || error?.message?.includes('duplicate') || error?.message?.includes('unique')) {
          console.log(`Opportunity already exists for ${potential.customer.name} - ${potential.product.name}`)
          duplicateCount++
        } else {
          console.error(`Failed to create opportunity for ${potential.id}:`, error)
          errorCount++
        }
      }
    }

    if (successCount > 0) {
      toast.success(`Created ${successCount} opportunities`)
      setSelectedIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['trade-potential'] })
    }

    if (duplicateCount > 0) {
      toast.warning(`Skipped ${duplicateCount} duplicate opportunities`)
    }

    if (errorCount > 0) {
      toast.error(`Failed to create ${errorCount} opportunities`)
    }
  }

  // Filter potentials based on all filters
  const filteredPotentials = data.filter(potential => {
    // Opportunity filter
    if (showOpportunityFilter && potential.hasOpportunity) {
      return false
    }

    // Customer filter
    if (customerFilter !== 'all' && potential.customer.id !== customerFilter) {
      return false
    }

    // Supplier filter
    if (supplierFilter !== 'all' && potential.supplier.id !== supplierFilter) {
      return false
    }

    // Agent filter
    if (agentFilter !== 'all' && potential.customer.agent?.id !== agentFilter) {
      return false
    }

    return true
  })

  // Group complete potentials by customer + product + hub
  const groupedPotentials = React.useMemo(() => {
    // Only group complete potentials without existing opportunities
    const completePotentials = filteredPotentials.filter(
      p => p.status === 'complete' && !p.hasOpportunity
    )

    const groups: Record<string, GroupedPotential> = {}

    completePotentials.forEach(potential => {
      const groupKey = `${potential.customer.id}-${potential.product.id}-${potential.supplierPrice?.hubId || 'no-hub'}`

      if (!groups[groupKey]) {
        // Find cheapest option in this group by calculating total cost
        const potentialsInGroup = completePotentials.filter(p =>
          `${p.customer.id}-${p.product.id}-${p.supplierPrice?.hubId || 'no-hub'}` === groupKey
        )

        const cheapest = potentialsInGroup.reduce((best, current) => {
          const currentCost = (current.supplierPrice?.pricePerUnit || 0) +
            getTransportCostPerUnit(current, 0, 0)
          const bestCost = (best.supplierPrice?.pricePerUnit || 0) +
            getTransportCostPerUnit(best, 0, 0)
          return currentCost < bestCost ? current : best
        })

        // Get saved selection or use cheapest
        const savedSelection = groupSelectionState[groupKey]
        const selectedSupplierId = savedSelection?.selectedSupplierId || cheapest.supplier.id
        const selectedPackagingSpecId = savedSelection?.selectedPackagingSpecId || cheapest.product.specId

        groups[groupKey] = {
          groupKey,
          customer: potential.customer,
          product: potential.product,
          hubId: potential.supplierPrice?.hubId || '',
          hubName: potential.supplierPrice?.hubName || '',
          potentials: potentialsInGroup,
          selectedSupplierId,
          selectedPackagingSpecId,
          cheapestPotential: cheapest
        }
      }
    })

    return Object.values(groups)
  }, [filteredPotentials, groupSelectionState])

  // Get the currently selected potential from a group
  const getSelectedPotentialFromGroup = (group: GroupedPotential): TradePotential | undefined => {
    return group.potentials.find(
      p => p.supplier.id === group.selectedSupplierId &&
           p.product.specId === group.selectedPackagingSpecId
    )
  }

  // Update group selection (supplier or packaging)
  const updateGroupSelection = (
    groupKey: string,
    supplierId: string,
    packagingSpecId: string
  ) => {
    setGroupSelectionState(prev => ({
      ...prev,
      [groupKey]: {
        selectedSupplierId: supplierId,
        selectedPackagingSpecId: packagingSpecId
      }
    }))
  }

  // Get potentials to display based on showAllRows toggle
  const potentialsToDisplay = React.useMemo(() => {
    if (showAllRows) {
      // Show all individual rows
      return filteredPotentials
    } else {
      // Show grouped rows for complete items, individual rows for incomplete
      const incompletePotentials = filteredPotentials.filter(
        p => p.status !== 'complete' || p.hasOpportunity
      )

      // Return a list with grouped potentials represented by their selected potential
      const groupedAsIndividual = groupedPotentials.map(group =>
        getSelectedPotentialFromGroup(group) || group.cheapestPotential
      )

      return [...groupedAsIndividual, ...incompletePotentials]
    }
  }, [showAllRows, filteredPotentials, groupedPotentials])

  // Get the group for a potential (if it's part of a group)
  const getGroupForPotential = (potential: TradePotential): GroupedPotential | undefined => {
    if (showAllRows) return undefined
    const groupKey = `${potential.customer.id}-${potential.product.id}-${potential.supplierPrice?.hubId || 'no-hub'}`
    return groupedPotentials.find(g => g.groupKey === groupKey)
  }

  // Get available suppliers for a group
  const getAvailableSuppliersForGroup = (group: GroupedPotential) => {
    const uniqueSuppliers = Array.from(
      new Map(
        group.potentials.map(p => [p.supplier.id, p.supplier])
      ).values()
    )
    return uniqueSuppliers
  }

  // Get available packaging options for a group, filtered by selected supplier
  const getAvailablePackagingForGroup = (group: GroupedPotential, supplierId: string) => {
    const potentialsForSupplier = group.potentials.filter(p => p.supplier.id === supplierId)
    const uniquePackaging = Array.from(
      new Map(
        potentialsForSupplier.map(p => [
          p.product.specId,
          {
            specId: p.product.specId,
            packagingLabel: p.product.packagingLabel,
            sizeName: p.product.sizeName,
            potential: p
          }
        ])
      ).values()
    )
    return uniquePackaging
  }

  // Handle supplier change in grouped row
  const handleSupplierChange = (group: GroupedPotential, newSupplierId: string) => {
    // Find first available packaging for the new supplier
    const availablePackaging = getAvailablePackagingForGroup(group, newSupplierId)
    const firstPackagingSpecId = availablePackaging[0]?.specId || group.selectedPackagingSpecId

    updateGroupSelection(group.groupKey, newSupplierId, firstPackagingSpecId)
  }

  // Handle packaging change in grouped row
  const handlePackagingChange = (group: GroupedPotential, newPackagingSpecId: string) => {
    updateGroupSelection(group.groupKey, group.selectedSupplierId, newPackagingSpecId)
  }

  const statusConfig = {
    complete: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-terminal-success text-white border-terminal-success', label: 'Complete' },
    missing_price: { icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-600 text-white border-yellow-600', label: 'Missing Price' },
    missing_transport: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-600 text-white border-red-600', label: 'Missing Transport' },
    missing_both: { icon: MinusCircle, color: 'text-gray-600', bg: 'bg-gray-600 text-white border-gray-600', label: 'Missing Both' }
  }

  const handleExcludePotential = (potential: TradePotential) => {
    const exclusionData = extractExclusionData(potential, 'business_decision', 'Marked as non-viable from potential list')
    excludePotentialMutation.mutate(exclusionData)
  }

  const handleQuickCreate = async (potential: TradePotential) => {
    const pricing = getPricingState(potential)

    // Get transport band if available (use filtered bands)
    const filteredBands = getFilteredBands(potential)
    const selectedBand = filteredBands[pricing.selectedBandIndex]

    // Get the selected transport route (could be direct or multi-leg)
    let selectedRoute = potential.transportRoute
    let selectedTransporterId: string | undefined = undefined

    if (potential.availableTransportRoutes && potential.availableTransportRoutes.length > 0) {
      selectedRoute = potential.availableTransportRoutes[pricing.selectedTransporterIndex]
      selectedTransporterId = selectedRoute?.transporterId || undefined
    } else if (potential.transportRoute?.transporterId) {
      selectedTransporterId = potential.transportRoute.transporterId
    }

    // Get delivery hub ID from the selected route
    let deliveryHubId: string | undefined = undefined
    if (selectedRoute) {
      if (selectedRoute.legs && selectedRoute.legs.length > 0) {
        // Multi-leg: use the final destination hub
        deliveryHubId = selectedRoute.legs[selectedRoute.legs.length - 1].destinationHubId
      } else if (selectedRoute.destinationHubId) {
        // Single-leg: use the destination hub
        deliveryHubId = selectedRoute.destinationHubId
      }
    }

    // Build opportunity data
    const opportunityData: any = {
      customer_id: potential.customer.id,
      supplier_id: potential.supplier.id,
      product_packaging_spec_id: potential.product.specId,
      offer_price_per_unit: pricing.offerPrice,
      offer_currency: potential.supplierPrice?.currency || 'EUR',
      status: 'draft',
      priority: 'medium',
      supplier_price_id: potential.supplierPrice?.id,
      assigned_to: potential.customer.agent?.id,
      selected_transporter_id: selectedTransporterId,
      selected_transport_band_id: selectedBand?.id || undefined,
      delivery_hub_id: deliveryHubId
    }

    // Add multi-leg transport data if the selected route is multi-leg
    if (selectedRoute?.legs && selectedRoute.legs.length > 1) {
      opportunityData.transport_route_legs = {
        total_legs: selectedRoute.totalLegs || selectedRoute.legs.length,
        total_cost_per_pallet: selectedRoute.totalCostPerPallet || selectedRoute.pricePerPallet || 0,
        total_duration_days: selectedRoute.totalDurationDays || selectedRoute.durationDays || 0,
        legs: selectedRoute.legs.map((leg: any) => ({
          leg: leg.leg,
          route_id: leg.routeId,
          origin_hub_id: leg.originHubId,
          origin_hub_name: leg.originHubName,
          destination_hub_id: leg.destinationHubId,
          destination_hub_name: leg.destinationHubName,
          transporter_id: leg.transporterId,
          transporter_name: leg.transporterName,
          cost_per_pallet: leg.costPerPallet,
          duration_days: leg.durationDays
        }))
      }
      opportunityData.total_transport_legs = selectedRoute.totalLegs || selectedRoute.legs.length
    }

    try {
      await createOpportunityMutation.mutateAsync(opportunityData)

      toast.success('Opportunity created!')
      // Invalidate queries to refresh data without full page reload
      queryClient.invalidateQueries({ queryKey: ['trade-potential'] })
    } catch (error) {
      toast.error('Failed to create opportunity')
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card className="bg-terminal-panel border-terminal-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-mono text-terminal-muted text-xs">TOTAL POTENTIAL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-bold text-terminal-text">{summary.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-terminal-panel border-terminal-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-mono text-terminal-muted text-xs">COMPLETE</CardTitle>
            <CheckCircle className="h-4 w-4 text-terminal-success" />
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-bold text-terminal-success">{summary.complete}</div>
          </CardContent>
        </Card>
        <Card className="bg-terminal-panel border-terminal-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-mono text-terminal-muted text-xs">MISSING PRICE</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-bold text-yellow-400">{summary.missingPrice}</div>
          </CardContent>
        </Card>
        <Card className="bg-terminal-panel border-terminal-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-mono text-terminal-muted text-xs">MISSING TRANSPORT</CardTitle>
            <XCircle className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-bold text-red-400">{summary.missingTransport}</div>
          </CardContent>
        </Card>
        <Card className="bg-terminal-panel border-terminal-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-mono text-terminal-muted text-xs">MISSING BOTH</CardTitle>
            <MinusCircle className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-bold text-gray-400">{summary.missingBoth}</div>
          </CardContent>
        </Card>
        <Card className="bg-terminal-panel border-terminal-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-mono text-terminal-muted text-xs">COMPLETION RATE</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl font-bold text-terminal-text">{summary.completionRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-terminal-panel border-terminal-border">
        <CardHeader>
          <CardTitle className="font-mono text-terminal-text">FILTERS</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <Label htmlFor="status-filter" className="font-mono text-terminal-muted text-xs uppercase">Status Filter</Label>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger id="status-filter" className="bg-terminal-dark border-terminal-border text-terminal-text font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-terminal-panel border-terminal-border">
                <SelectItem value="all" className="font-mono text-terminal-text">All Status</SelectItem>
                <SelectItem value="complete" className="font-mono text-terminal-text">Complete Only</SelectItem>
                <SelectItem value="missing_price" className="font-mono text-terminal-text">Missing Price</SelectItem>
                <SelectItem value="missing_transport" className="font-mono text-terminal-text">Missing Transport</SelectItem>
                <SelectItem value="missing_both" className="font-mono text-terminal-text">Missing Both</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="customer-filter" className="font-mono text-terminal-muted text-xs uppercase">Customer</Label>
            <Popover open={customerSearchOpen} onOpenChange={(open) => {
              setCustomerSearchOpen(open)
              if (!open) setCustomerSearchQuery('')
            }}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={customerSearchOpen}
                  className="w-full justify-between bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono text-xs h-10"
                >
                  {customerFilter === 'all'
                    ? 'All Customers'
                    : filteredCustomers?.find(c => c.id === customerFilter)?.name || 'All Customers'}
                  <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] h-[300px] p-0 bg-terminal-panel border-terminal-border">
                <Command className="bg-terminal-panel h-full flex flex-col">
                  <CommandInput
                    placeholder="Search customers..."
                    value={customerSearchQuery}
                    onValueChange={setCustomerSearchQuery}
                    className="font-mono text-terminal-text text-xs shrink-0"
                  />
                  <CommandEmpty className="text-terminal-muted font-mono p-4 text-xs">
                    No customers found.
                  </CommandEmpty>
                  <CommandGroup className="overflow-y-auto overflow-x-hidden flex-1">
                    <CommandItem
                      value="all"
                      onSelect={() => {
                        handleFilterChange('customer', 'all')
                        setCustomerSearchOpen(false)
                      }}
                      className="font-mono text-xs text-terminal-text hover:bg-terminal-dark"
                    >
                      <Check
                        className={cn(
                          'mr-2 h-3 w-3 text-terminal-accent',
                          customerFilter === 'all' ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      All Customers
                    </CommandItem>
                    {filteredCustomersForSearch.map((customer) => (
                      <CommandItem
                        key={customer.id}
                        value={customer.name}
                        onSelect={() => {
                          handleFilterChange('customer', customer.id)
                          setCustomerSearchOpen(false)
                        }}
                        className="font-mono text-xs text-terminal-text hover:bg-terminal-dark"
                      >
                        <Check
                          className={cn(
                            'mr-2 h-3 w-3 text-terminal-accent',
                            customerFilter === customer.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {customer.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="supplier-filter" className="font-mono text-terminal-muted text-xs uppercase">Supplier</Label>
            <Popover open={supplierSearchOpen} onOpenChange={(open) => {
              setSupplierSearchOpen(open)
              if (!open) setSupplierSearchQuery('')
            }}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={supplierSearchOpen}
                  className="w-full justify-between bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono text-xs h-10"
                >
                  {supplierFilter === 'all'
                    ? 'All Suppliers'
                    : suppliers?.find(s => s.id === supplierFilter)?.name || 'All Suppliers'}
                  <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] h-[300px] p-0 bg-terminal-panel border-terminal-border">
                <Command className="bg-terminal-panel h-full flex flex-col">
                  <CommandInput
                    placeholder="Search suppliers..."
                    value={supplierSearchQuery}
                    onValueChange={setSupplierSearchQuery}
                    className="font-mono text-terminal-text text-xs shrink-0"
                  />
                  <CommandEmpty className="text-terminal-muted font-mono p-4 text-xs">
                    No suppliers found.
                  </CommandEmpty>
                  <CommandGroup className="overflow-y-auto overflow-x-hidden flex-1">
                    <CommandItem
                      value="all"
                      onSelect={() => {
                        handleFilterChange('supplier', 'all')
                        setSupplierSearchOpen(false)
                      }}
                      className="font-mono text-xs text-terminal-text hover:bg-terminal-dark"
                    >
                      <Check
                        className={cn(
                          'mr-2 h-3 w-3 text-terminal-accent',
                          supplierFilter === 'all' ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      All Suppliers
                    </CommandItem>
                    {filteredSuppliersForSearch.map((supplier) => (
                      <CommandItem
                        key={supplier.id}
                        value={supplier.name}
                        onSelect={() => {
                          handleFilterChange('supplier', supplier.id)
                          setSupplierSearchOpen(false)
                        }}
                        className="font-mono text-xs text-terminal-text hover:bg-terminal-dark"
                      >
                        <Check
                          className={cn(
                            'mr-2 h-3 w-3 text-terminal-accent',
                            supplierFilter === supplier.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {supplier.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="agent-filter" className="font-mono text-terminal-muted text-xs uppercase">Agent</Label>
            <Select value={agentFilter} onValueChange={(value) => handleFilterChange('agent', value)}>
              <SelectTrigger id="agent-filter" className="bg-terminal-dark border-terminal-border text-terminal-text font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-terminal-panel border-terminal-border">
                <SelectItem value="all" className="font-mono text-terminal-text">All Agents</SelectItem>
                {activeStaff?.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id} className="font-mono text-terminal-text">
                    {staff.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="opportunity-filter"
                checked={showOpportunityFilter}
                onCheckedChange={handleOpportunityFilterChange}
              />
              <Label htmlFor="opportunity-filter" className="font-mono text-terminal-muted text-sm">Hide converted</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="show-all-rows"
                checked={showAllRows}
                onCheckedChange={setShowAllRows}
              />
              <Label htmlFor="show-all-rows" className="font-mono text-terminal-muted text-sm">Show all rows</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Toolbar - Always Visible */}
      <Card className={cn(
        "border-2 transition-colors",
        selectedIds.size > 0
          ? "bg-terminal-accent/10 border-terminal-accent"
          : "bg-terminal-panel border-terminal-border"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge className={cn(
                "font-mono font-bold",
                selectedIds.size > 0
                  ? "bg-terminal-accent text-terminal-dark"
                  : "bg-terminal-border text-terminal-muted"
              )}>
                {selectedIds.size} SELECTED
              </Badge>
              <div className="flex items-center gap-2">
                <Label htmlFor="bulk-margin" className="font-mono text-terminal-text text-sm">
                  Bulk Margin:
                </Label>
                <Input
                  id="bulk-margin"
                  type="number"
                  step="0.1"
                  value={bulkMargin}
                  onChange={(e) => setBulkMargin(parseFloat(e.target.value) || 10)}
                  className="w-20 h-9 bg-terminal-dark border-terminal-border text-terminal-text font-mono"
                />
                <span className="text-terminal-muted font-mono">%</span>
                <Button
                  size="sm"
                  onClick={applyBulkMargin}
                  disabled={selectedIds.size === 0}
                  className="bg-terminal-dark border-2 border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono disabled:opacity-50"
                >
                  Apply to All
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleBulkCreate}
                disabled={createOpportunityMutation.isPending || selectedIds.size === 0}
                className="bg-terminal-success text-white hover:bg-green-600 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="h-4 w-4 mr-2" />
                Create {selectedIds.size} Opportunities
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedIds(new Set())
                  setAutoSelectEnabled(false)
                }}
                disabled={selectedIds.size === 0}
                className="border-terminal-border text-terminal-text hover:bg-terminal-dark font-mono disabled:opacity-50"
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card className="bg-terminal-panel border-terminal-border">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="font-mono text-terminal-text">TRADE POTENTIAL ({filteredPotentials.length} results)</CardTitle>
              <CardDescription className="font-mono text-terminal-muted">
                Customer → Supplier product matches with quick opportunity creation
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-terminal-border">
                  <TableHead className="w-8 p-2">
                    <Checkbox
                      checked={selectedIds.size === filteredSelectablePotentials.length && filteredSelectablePotentials.length > 0}
                      onCheckedChange={toggleSelectAll}
                      disabled={filteredSelectablePotentials.length === 0}
                      className="border-terminal-border data-[state=checked]:bg-terminal-accent data-[state=checked]:text-terminal-dark"
                    />
                  </TableHead>
                  <TableHead className="font-mono text-terminal-muted uppercase text-xs p-2">Customer</TableHead>
                  <TableHead className="font-mono text-terminal-muted uppercase text-xs p-2">Supplier</TableHead>
                  <TableHead className="font-mono text-terminal-muted uppercase text-xs p-2">Product</TableHead>
                  <TableHead className="font-mono text-terminal-muted uppercase text-xs p-2">Status</TableHead>
                  <TableHead className="font-mono text-terminal-muted uppercase text-xs p-2">Price Del. To</TableHead>
                  <TableHead className="font-mono text-terminal-muted uppercase text-xs p-2">Transport</TableHead>
                  <TableHead className="font-mono text-terminal-muted uppercase text-xs p-2">Prod. Cost</TableHead>
                  <TableHead className="font-mono text-terminal-muted uppercase text-xs p-2">Trans. Cost</TableHead>
                  <TableHead className="font-mono text-terminal-muted uppercase text-xs p-2">Total</TableHead>
                  <TableHead className="font-mono text-terminal-muted uppercase text-xs p-2">Margin %</TableHead>
                  <TableHead className="font-mono text-terminal-muted uppercase text-xs p-2">Offer</TableHead>
                  <TableHead className="font-mono text-terminal-muted uppercase text-xs p-2">Profit</TableHead>
                  <TableHead className="font-mono text-terminal-muted uppercase text-xs text-right p-2">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {potentialsToDisplay.map((potential) => {
                  const group = getGroupForPotential(potential)
                  const StatusIcon = statusConfig[potential.status]?.icon || MinusCircle
                  const statusColor = statusConfig[potential.status]?.color || 'text-gray-600'
                  const pricing = getPricingState(potential)
                  const productCost = potential.supplierPrice?.pricePerUnit || 0
                  const transportCost = getTransportCostPerUnit(potential, pricing.selectedBandIndex, pricing.selectedTransporterIndex)
                  const totalCost = productCost + transportCost
                  const profit = pricing.offerPrice - totalCost
                  const hasOpportunity = potential.hasOpportunity
                  // Use filtered bands based on pallet dimensions
                  const filteredBands = getFilteredBands(potential)
                  const hasBands = filteredBands && filteredBands.length > 0
                  const isSelectable = potential.status === 'complete' && !hasOpportunity
                  const isSelected = selectedIds.has(potential.id)
                  // Check if multiple transporters are available
                  const hasMultipleTransporters = potential.availableTransportRoutes && potential.availableTransportRoutes.length > 1
                  const availableTransporters = potential.availableTransportRoutes || []

                  return (
                    <TableRow key={potential.id} className={cn(
                      "border-terminal-border hover:bg-terminal-dark/50",
                      hasOpportunity ? 'bg-blue-900/20' : '',
                      isSelected ? 'bg-terminal-accent/5 border-l-4 border-l-terminal-accent' : ''
                    )}>
                      <TableCell className="p-2">
                        {isSelectable ? (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(potential.id)}
                            className="border-terminal-border data-[state=checked]:bg-terminal-accent data-[state=checked]:text-terminal-dark"
                          />
                        ) : (
                          <div className="w-4" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-terminal-text p-2 text-xs">
                        <div>
                          <div className="font-medium whitespace-nowrap">{potential.customer.name}</div>
                          <div className="text-[10px] text-terminal-muted whitespace-nowrap">
                            {potential.customer.city}
                          </div>
                          {potential.customer.agent && (
                            <Badge variant="outline" className="text-[10px] font-mono border-terminal-border text-terminal-muted mt-0.5">
                              {potential.customer.agent.name}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="font-mono text-terminal-text p-2 text-xs">
                        {group && group.potentials.length > 1 ? (
                          <div>
                            <Select
                              value={group.selectedSupplierId}
                              onValueChange={(value) => handleSupplierChange(group, value)}
                            >
                              <SelectTrigger className="h-6 text-[10px] w-full bg-terminal-dark border-terminal-border text-terminal-text font-mono">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-terminal-panel border-terminal-border">
                                {getAvailableSuppliersForGroup(group).map((supplier) => (
                                  <SelectItem key={supplier.id} value={supplier.id} className="font-mono text-terminal-text text-xs">
                                    {supplier.name} - {supplier.city}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Badge variant="outline" className="text-[10px] font-mono border-terminal-accent text-terminal-accent mt-1">
                              {getAvailableSuppliersForGroup(group).length} suppliers
                            </Badge>
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium whitespace-nowrap">{potential.supplier.name}</div>
                            <div className="text-[10px] text-terminal-muted whitespace-nowrap">
                              {potential.supplier.city}
                            </div>
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="font-mono text-terminal-text p-2 text-xs">
                        {group && group.potentials.length > 1 ? (
                          <div>
                            <div className="font-medium mb-1">{potential.product.name}</div>
                            <Select
                              value={group.selectedPackagingSpecId}
                              onValueChange={(value) => handlePackagingChange(group, value)}
                            >
                              <SelectTrigger className="h-6 text-[10px] w-full bg-terminal-dark border-terminal-border text-terminal-text font-mono">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-terminal-panel border-terminal-border">
                                {getAvailablePackagingForGroup(group, group.selectedSupplierId).map((pkg) => (
                                  <SelectItem key={pkg.specId} value={pkg.specId} className="font-mono text-terminal-text text-xs">
                                    {pkg.packagingLabel} • {pkg.sizeName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Badge variant="outline" className="text-[10px] font-mono border-terminal-accent text-terminal-accent mt-1">
                              {group.potentials.length} variants
                            </Badge>
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium">{potential.product.name}</div>
                            <div className="flex gap-1 flex-wrap">
                              <Badge variant="outline" className="text-[10px] font-mono border-terminal-border text-terminal-muted">{potential.product.packagingLabel}</Badge>
                              <Badge variant="outline" className="text-[10px] font-mono border-terminal-border text-terminal-muted">{potential.product.sizeName}</Badge>
                            </div>
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="p-2">
                        <Badge className={cn("font-mono text-[10px]", statusConfig[potential.status]?.bg)}>
                          {statusConfig[potential.status]?.label}
                        </Badge>
                      </TableCell>

                      <TableCell className="font-mono text-terminal-text p-2 text-xs">
                        {potential.supplierPrice ? (
                          <div className="font-medium whitespace-nowrap">
                            {potential.supplierPrice.hubName}
                          </div>
                        ) : (
                          <span className="text-terminal-muted">-</span>
                        )}
                      </TableCell>

                      <TableCell className="font-mono text-terminal-text p-2 text-xs">
                        {potential.transportRoute ? (
                          <div>
                            {/* Check if multi-leg route */}
                            {potential.transportRoute.legs && potential.transportRoute.legs.length > 1 ? (
                              <>
                                {/* Multi-leg route display */}
                                <div className="font-medium text-blue-400 text-[10px] whitespace-nowrap mb-1">
                                  {potential.transportRoute.legs[0].originHubName} → {' '}
                                  {potential.transportRoute.intermediateHubs?.map(h => h.name).join(' → ')} → {' '}
                                  {potential.transportRoute.legs[potential.transportRoute.legs.length - 1].destinationHubName}
                                </div>
                                <div className="text-[10px] text-terminal-accent">
                                  {potential.transportRoute.totalLegs || potential.transportRoute.legs.length} legs • {potential.transportRoute.totalDurationDays || 0}d
                                </div>
                                {potential.transportRoute.legs.map((leg, idx) => (
                                  <div key={idx} className="text-[9px] text-terminal-muted mt-0.5">
                                    L{leg.leg}: {leg.transporterName}
                                  </div>
                                ))}
                              </>
                            ) : (
                              <>
                                {/* Single-leg route display (existing) */}
                                {/* Transporter Selector */}
                                {hasMultipleTransporters && potential.status === 'complete' && !hasOpportunity ? (
                                  <Select
                                    value={pricing.selectedTransporterIndex.toString()}
                                    onValueChange={(value) => updateSelectedTransporter(potential, parseInt(value))}
                                  >
                                    <SelectTrigger className="h-6 text-[10px] w-full bg-terminal-dark border-terminal-border text-blue-400 font-mono">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-terminal-panel border-terminal-border">
                                      {availableTransporters.map((transporter, index) => (
                                        <SelectItem key={index} value={index.toString()} className="font-mono text-terminal-text text-xs">
                                          {transporter.transporterName} - {formatCurrency(transporter.pricePerPallet)}/pallet
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <div className="font-medium text-blue-400 whitespace-nowrap">
                                    {availableTransporters[pricing.selectedTransporterIndex]?.transporterName || potential.transportRoute.transporterName}
                                  </div>
                                )}

                                {/* Duration */}
                                {(availableTransporters[pricing.selectedTransporterIndex]?.durationDays || potential.transportRoute.durationDays) > 0 && (
                                  <div className="text-[10px] text-terminal-muted">
                                    {availableTransporters[pricing.selectedTransporterIndex]?.durationDays || potential.transportRoute.durationDays}d
                                  </div>
                                )}
                              </>
                            )}

                            {/* Price Band Selector */}
                            {hasBands && (
                              <>
                                {potential.status === 'complete' && !hasOpportunity ? (
                                  <Select
                                    value={pricing.selectedBandIndex.toString()}
                                    onValueChange={(value) => updateTransportBand(potential, parseInt(value))}
                                  >
                                    <SelectTrigger className="h-6 text-[10px] w-full bg-terminal-dark border-terminal-border text-terminal-text font-mono mt-1">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-terminal-panel border-terminal-border">
                                      {filteredBands.map((band, index) => (
                                        <SelectItem key={index} value={index.toString()} className="font-mono text-terminal-text text-xs">
                                          {band.min_pallets}-{band.max_pallets}p
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <div className="text-[10px] text-terminal-muted mt-1">
                                    {filteredBands[pricing.selectedBandIndex]?.min_pallets}-{filteredBands[pricing.selectedBandIndex]?.max_pallets}p
                                  </div>
                                )}
                              </>
                            )}

                            {/* Customs Cost */}
                            {(availableTransporters[pricing.selectedTransporterIndex]?.customsCostPerShipment || potential.transportRoute.customsCostPerShipment) > 0 && (
                              <div className="text-[10px] text-yellow-400 mt-1">
                                +{formatCurrency(availableTransporters[pricing.selectedTransporterIndex]?.customsCostPerShipment || potential.transportRoute.customsCostPerShipment)} customs
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-terminal-muted">-</span>
                        )}
                      </TableCell>

                      <TableCell className="font-mono text-terminal-text p-2 text-xs">
                        {potential.supplierPrice ? (
                          <div className="font-medium whitespace-nowrap">
                            {formatCurrency(productCost)}
                          </div>
                        ) : (
                          <span className="text-terminal-muted">-</span>
                        )}
                      </TableCell>

                      <TableCell className="font-mono text-terminal-text p-2 text-xs">
                        {transportCost > 0 ? (
                          <div className="font-medium text-blue-400 whitespace-nowrap">
                            {formatCurrency(transportCost)}
                          </div>
                        ) : (
                          <span className="text-terminal-success">Free</span>
                        )}
                      </TableCell>

                      <TableCell className="font-mono text-terminal-text p-2 text-xs">
                        <div className="font-semibold whitespace-nowrap">
                          {formatCurrency(totalCost)}
                        </div>
                      </TableCell>

                      <TableCell className="font-mono text-terminal-text p-2 text-xs">
                        {potential.status === 'complete' && !hasOpportunity ? (
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={pricing.marginPercent.toFixed(1)}
                            onChange={(e) => updateMargin(potential.id, totalCost, parseFloat(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            className="w-14 h-6 text-[10px] bg-terminal-dark border-terminal-border text-terminal-text font-mono p-1"
                          />
                        ) : hasOpportunity && potential.opportunity?.offerPrice && totalCost > 0 ? (
                          <div className="font-medium">
                            {(((potential.opportunity.offerPrice - totalCost) / totalCost) * 100).toFixed(1)}%
                          </div>
                        ) : (
                          <span className="text-terminal-muted">-</span>
                        )}
                      </TableCell>

                      <TableCell className="font-mono text-terminal-text p-2 text-xs">
                        {potential.status === 'complete' && !hasOpportunity ? (
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={pricing.offerPrice.toFixed(2)}
                            onChange={(e) => updateOfferPrice(potential.id, totalCost, parseFloat(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            className="w-16 h-6 text-[10px] bg-terminal-dark border-terminal-border text-terminal-text font-mono p-1"
                          />
                        ) : hasOpportunity && potential.opportunity?.offerPrice ? (
                          <div className="font-medium text-terminal-success whitespace-nowrap">
                            {formatCurrency(potential.opportunity.offerPrice)}
                          </div>
                        ) : (
                          <span className="text-terminal-muted">-</span>
                        )}
                      </TableCell>

                      <TableCell className="font-mono text-terminal-text p-2 text-xs">
                        {potential.status === 'complete' ? (
                          hasOpportunity && potential.opportunity?.offerPrice ? (
                            <div className={cn(
                              "font-medium whitespace-nowrap",
                              (potential.opportunity.offerPrice - totalCost) > 0 ? "text-terminal-success" : "text-red-400"
                            )}>
                              {formatCurrency(potential.opportunity.offerPrice - totalCost)}
                            </div>
                          ) : (
                            <div className={cn(
                              "font-medium whitespace-nowrap",
                              profit > 0 ? "text-terminal-success" : "text-red-400"
                            )}>
                              {formatCurrency(profit)}
                            </div>
                          )
                        ) : (
                          <span className="text-terminal-muted">-</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right p-2">
                        <div className="flex items-center justify-end gap-1">
                          {hasOpportunity ? (
                            <>
                              <Badge variant="secondary" className="text-[10px] font-mono bg-terminal-dark border-terminal-border text-terminal-text px-1">
                                {potential.opportunity?.status}
                              </Badge>
                              <Button size="sm" asChild className="bg-blue-600 text-white hover:bg-blue-700 font-mono h-6 w-6 p-0">
                                <Link href={`/trade/opportunities/${potential.opportunity?.id}`}>
                                  <Eye className="h-3 w-3" />
                                </Link>
                              </Button>
                            </>
                          ) : potential.status === 'complete' ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleQuickCreate(potential)}
                                disabled={createOpportunityMutation.isPending}
                                className="bg-terminal-success text-white hover:bg-green-600 font-mono h-6 px-2 text-[10px]"
                              >
                                <Check className="h-3 w-3 mr-0.5" />
                                Create
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleExcludePotential(potential)}
                                disabled={excludePotentialMutation.isPending}
                                className="bg-red-600 text-white hover:bg-red-700 font-mono h-6 w-6 p-0"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleExcludePotential(potential)}
                              disabled={excludePotentialMutation.isPending}
                              className="bg-red-600 text-white hover:bg-red-700 font-mono h-6 w-6 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
