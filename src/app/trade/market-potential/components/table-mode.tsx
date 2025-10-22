'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, AlertCircle, XCircle, MinusCircle, Plus, Eye, RefreshCcw } from 'lucide-react'
import { MarketPotential } from '@/types/market-potential'
import { useCreateMarketOpportunity, useUpdateMarketOpportunity } from '@/hooks/use-market-opportunities'
import { toast } from 'sonner'
import Link from 'next/link'

interface MarketPotentialTableModeProps {
  potentials: (MarketPotential & { existingOpportunity?: any })[]
  bulkMargin: number
  selectedIds: Set<string>
  setSelectedIds: (ids: Set<string>) => void
  selectedBands: Record<string, string>
  setSelectedBands: (bands: Record<string, string>) => void
  selectedMargins: Record<string, number>
  setSelectedMargins: (margins: Record<string, number>) => void
  onRefresh: () => void
}

interface PricingState {
  [key: string]: {
    marginPercent: number
    deliveredPrice: number
  }
}

// Simple currency formatter
const formatCurrency = (amount: number, currency: string = 'EUR') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export default function MarketPotentialTableMode({
  potentials,
  bulkMargin,
  selectedIds,
  setSelectedIds,
  selectedBands,
  setSelectedBands,
  selectedMargins,
  setSelectedMargins,
  onRefresh
}: MarketPotentialTableModeProps) {
  const [pricingState, setPricingState] = useState<PricingState>({})
  const createOpportunityMutation = useCreateMarketOpportunity()
  const updateOpportunityMutation = useUpdateMarketOpportunity()

  // Get pricing state for a potential
  const getPricingState = (potential: MarketPotential & { existingOpportunity?: any }, selectedBandId?: string) => {
    if (pricingState[potential.id]) {
      return pricingState[potential.id]
    }

    // If there's an existing opportunity and no user changes, show opportunity's current values
    if (potential.existingOpportunity &&
        !selectedBands[potential.id] &&
        !selectedMargins[potential.id]) {
      return {
        marginPercent: potential.existingOpportunity.margin_percentage || bulkMargin,
        deliveredPrice: potential.existingOpportunity.delivered_price_per_unit || 0
      }
    }

    const supplierCost = potential.supplierPrice?.pricePerUnit || 0

    // Use selected band or default to existing opportunity band or first available band
    const bandId = selectedBandId ||
                   selectedBands[potential.id] ||
                   potential.existingOpportunity?.selected_transport_band_id ||
                   potential.transportRoute?.availableBands?.[0]?.id
    const selectedBand = potential.transportRoute?.availableBands?.find(b => b.id === bandId)

    // Calculate transport cost including diesel surcharge
    const dieselSurcharge = potential.transportRoute?.dieselSurchargePerPallet || 0
    const unitsPerPallet = potential.transportRoute?.unitsPerPallet || 0
    const transportCost = selectedBand && unitsPerPallet > 0
      ? (selectedBand.price_per_pallet + dieselSurcharge) / unitsPerPallet
      : 0

    // Use selected margin or existing opportunity margin or bulk margin
    const margin = selectedMargins[potential.id] ||
                  potential.existingOpportunity?.margin_percentage ||
                  bulkMargin

    const totalCost = supplierCost + transportCost
    const deliveredPrice = totalCost * (1 + margin / 100)

    return {
      marginPercent: margin,
      deliveredPrice: deliveredPrice
    }
  }

  // Toggle selection of a potential
  const toggleSelection = (potentialId: string) => {
    const newSelectedIds = new Set(selectedIds)
    if (newSelectedIds.has(potentialId)) {
      newSelectedIds.delete(potentialId)
    } else {
      newSelectedIds.add(potentialId)
    }
    setSelectedIds(newSelectedIds)
  }

  // Toggle all selections
  const toggleAllSelections = () => {
    const completeIds = potentials
      .filter(p => p.status === 'complete')
      .map(p => p.id)

    if (selectedIds.size === completeIds.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(completeIds))
    }
  }

  // Get selected transport band for a potential
  const getSelectedBandId = (potential: MarketPotential & { existingOpportunity?: any }): string | undefined => {
    // Priority: user selection > existing opportunity > first available
    if (selectedBands[potential.id]) {
      return selectedBands[potential.id]
    }
    if (potential.existingOpportunity?.selected_transport_band_id) {
      return potential.existingOpportunity.selected_transport_band_id
    }
    // Default to first available band
    return potential.transportRoute?.availableBands?.[0]?.id
  }

  // Update selected transport band and recalculate pricing
  const handleBandChange = (potentialId: string, bandId: string, potential: MarketPotential) => {
    // First update the selected band
    setSelectedBands({ ...selectedBands, [potentialId]: bandId })

    // Get current pricing to preserve the margin
    const currentPricing = getPricingState(potential, bandId)

    // Recalculate pricing with new band
    const band = potential.transportRoute?.availableBands?.find(b => b.id === bandId)
    const unitsPerPallet = potential.transportRoute?.unitsPerPallet || 0
    if (band && unitsPerPallet > 0) {
      const supplierCost = potential.supplierPrice?.pricePerUnit || 0
      const transportCostPerUnit = band.price_per_pallet / unitsPerPallet
      const totalCost = supplierCost + transportCostPerUnit

      // If there's existing pricing state, use that margin, otherwise use bulk margin
      const marginToUse = pricingState[potentialId]?.marginPercent ?? bulkMargin
      const deliveredPrice = totalCost * (1 + marginToUse / 100)

      setPricingState(prev => ({
        ...prev,
        [potentialId]: {
          marginPercent: marginToUse,
          deliveredPrice: deliveredPrice
        }
      }))
    }
  }

  // Update margin
  const updateMargin = (potential: MarketPotential & { existingOpportunity?: any }, newMargin: number) => {
    const selectedBandId = getSelectedBandId(potential)
    const selectedBand = potential.transportRoute?.availableBands?.find(b => b.id === selectedBandId)

    const supplierCost = potential.supplierPrice?.pricePerUnit || 0
    const dieselSurcharge = potential.transportRoute?.dieselSurchargePerPallet || 0
    const unitsPerPallet = potential.transportRoute?.unitsPerPallet || 0
    const transportCost = selectedBand && unitsPerPallet > 0
      ? (selectedBand.price_per_pallet + dieselSurcharge) / unitsPerPallet
      : 0
    const totalCost = supplierCost + transportCost
    const deliveredPrice = totalCost * (1 + newMargin / 100)

    // Update selected margins state
    setSelectedMargins({ ...selectedMargins, [potential.id]: newMargin })

    setPricingState(prev => ({
      ...prev,
      [potential.id]: {
        marginPercent: newMargin,
        deliveredPrice: deliveredPrice
      }
    }))
  }

  // Update delivered price
  const updateDeliveredPrice = (potential: MarketPotential, newPrice: number) => {
    const selectedBandId = getSelectedBandId(potential)
    const selectedBand = potential.transportRoute?.availableBands?.find(b => b.id === selectedBandId)

    const supplierCost = potential.supplierPrice?.pricePerUnit || 0
    const dieselSurcharge = potential.transportRoute?.dieselSurchargePerPallet || 0
    const unitsPerPallet = potential.transportRoute?.unitsPerPallet || 0
    const transportCost = selectedBand && unitsPerPallet > 0
      ? (selectedBand.price_per_pallet + dieselSurcharge) / unitsPerPallet
      : 0
    const totalCost = supplierCost + transportCost
    const margin = totalCost > 0 ? ((newPrice - totalCost) / totalCost) * 100 : 0

    setPricingState(prev => ({
      ...prev,
      [potential.id]: {
        marginPercent: margin,
        deliveredPrice: newPrice
      }
    }))
  }

  // Create market opportunity
  const handleCreateOpportunity = async (potential: MarketPotential) => {
    if (!potential.supplierPrice || !potential.transportRoute) {
      toast.error('Cannot create opportunity: missing price or transport')
      return
    }

    const pricing = getPricingState(potential)

    // Check if this is a same-location or supplier-delivery scenario (no transport bands needed)
    const isSameLocation = potential.transportRoute.id === 'same-location' || potential.transportRoute.id === 'supplier-delivery'
    const hasBands = potential.transportRoute.availableBands && potential.transportRoute.availableBands.length > 0

    let transportCostPerPallet = 0
    let transportCostPerUnit = 0
    let selectedBandId = null
    let dieselSurcharge = 0

    if (isSameLocation || !hasBands) {
      // Same location or supplier delivery - no band needed, transport cost is 0
      transportCostPerPallet = potential.transportRoute.pricePerPallet || 0
      transportCostPerUnit = potential.transportRoute.pricePerUnit || 0
      dieselSurcharge = 0
    } else {
      // Third-party transport - need to select a band
      selectedBandId = getSelectedBandId(potential)
      const selectedBand = potential.transportRoute.availableBands?.find(b => b.id === selectedBandId)

      if (!selectedBand) {
        toast.error('No transport band selected')
        return
      }

      // Calculate transport cost based on selected band + diesel surcharge
      const bandPrice = selectedBand.price_per_pallet
      dieselSurcharge = potential.transportRoute.dieselSurchargePerPallet || 0
      transportCostPerPallet = bandPrice + dieselSurcharge
      const unitsPerPallet = potential.transportRoute.unitsPerPallet || 0
      transportCostPerUnit = unitsPerPallet > 0
        ? transportCostPerPallet / unitsPerPallet
        : 0
    }

    const opportunityData = {
      hub_id: potential.hub.id,
      supplier_id: potential.supplier.id,
      product_packaging_spec_id: potential.product.specId,
      supplier_product_packaging_spec_id: potential.product.supplierProductPackagingSpecId,
      selected_supplier_id: potential.supplier.id,
      selected_route_id: isSameLocation ? null : potential.transportRoute.id,
      selected_transport_band_id: selectedBandId,
      price_source_hub_id: potential.supplierPrice.hubId,
      supplier_price_id: potential.supplierPrice.id,
      supplier_price_per_unit: potential.supplierPrice.pricePerUnit,
      transport_cost_per_unit: transportCostPerUnit,
      transport_cost_per_pallet: transportCostPerPallet,
      diesel_surcharge_per_pallet: dieselSurcharge,
      margin_percentage: pricing.marginPercent,
      delivered_price_per_unit: pricing.deliveredPrice,
      status: 'active' as const,
      priority: 'medium' as const
    }

    await createOpportunityMutation.mutateAsync(opportunityData)
    onRefresh()
  }

  // Update existing market opportunity
  const handleUpdateOpportunity = async (potential: MarketPotential & { existingOpportunity?: any }) => {
    if (!potential.existingOpportunity) {
      toast.error('No existing opportunity to update')
      return
    }

    if (!potential.supplierPrice || !potential.transportRoute) {
      toast.error('Cannot update opportunity: missing price or transport')
      return
    }

    const pricing = getPricingState(potential)

    // Check if this is a same-location or supplier-delivery scenario (no transport bands needed)
    const isSameLocation = potential.transportRoute.id === 'same-location' || potential.transportRoute.id === 'supplier-delivery'
    const hasBands = potential.transportRoute.availableBands && potential.transportRoute.availableBands.length > 0

    let transportCostPerPallet = 0
    let transportCostPerUnit = 0
    let selectedBandId = null
    let dieselSurcharge = 0

    if (isSameLocation || !hasBands) {
      // Same location or supplier delivery - no band needed, transport cost is 0
      transportCostPerPallet = potential.transportRoute.pricePerPallet || 0
      transportCostPerUnit = potential.transportRoute.pricePerUnit || 0
      dieselSurcharge = 0
    } else {
      // Third-party transport - need to select a band
      selectedBandId = getSelectedBandId(potential)
      const selectedBand = potential.transportRoute.availableBands?.find(b => b.id === selectedBandId)

      if (!selectedBand) {
        toast.error('No transport band selected')
        return
      }

      // Calculate transport cost based on selected band + diesel surcharge
      const bandPrice = selectedBand.price_per_pallet
      dieselSurcharge = potential.transportRoute.dieselSurchargePerPallet || 0
      transportCostPerPallet = bandPrice + dieselSurcharge
      const unitsPerPallet = potential.transportRoute.unitsPerPallet || 0
      transportCostPerUnit = unitsPerPallet > 0
        ? transportCostPerPallet / unitsPerPallet
        : 0
    }

    const updates = {
      selected_route_id: isSameLocation ? null : potential.transportRoute.id,
      selected_transport_band_id: selectedBandId,
      supplier_price_id: potential.supplierPrice.id,
      supplier_price_per_unit: potential.supplierPrice.pricePerUnit,
      transport_cost_per_unit: transportCostPerUnit,
      transport_cost_per_pallet: transportCostPerPallet,
      diesel_surcharge_per_pallet: dieselSurcharge,
      margin_percentage: pricing.marginPercent,
      delivered_price_per_unit: pricing.deliveredPrice
    }

    await updateOpportunityMutation.mutateAsync({
      id: potential.existingOpportunity.id,
      updates
    })
    onRefresh()
  }

  // Get status badge
  const getStatusBadge = (status: MarketPotential['status']) => {
    switch (status) {
      case 'complete':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200 font-mono text-xs">
            <CheckCircle className="h-3 w-3 mr-1" />
            Complete
          </Badge>
        )
      case 'missing_price':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 font-mono text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            No Price
          </Badge>
        )
      case 'missing_transport':
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-200 font-mono text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            No Transport
          </Badge>
        )
      case 'missing_both':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200 font-mono text-xs">
            <XCircle className="h-3 w-3 mr-1" />
            Incomplete
          </Badge>
        )
    }
  }

  if (potentials.length === 0) {
    return (
      <div className="bg-terminal-panel border border-terminal-border rounded-lg p-12 text-center">
        <MinusCircle className="h-12 w-12 text-terminal-muted mx-auto mb-4" />
        <p className="font-mono text-terminal-muted">No market potential matches found</p>
      </div>
    )
  }

  const completeCount = potentials.filter(p => p.status === 'complete').length
  const allSelected = completeCount > 0 && selectedIds.size === completeCount

  return (
    <div className="bg-terminal-panel border border-terminal-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-terminal-border hover:bg-terminal-dark">
              <TableHead className="font-mono text-terminal-text w-[50px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAllSelections}
                  disabled={completeCount === 0}
                />
              </TableHead>
              <TableHead className="font-mono text-terminal-text w-[180px]">Route (FROM → TO)</TableHead>
              <TableHead className="font-mono text-terminal-text w-[150px]">Supplier</TableHead>
              <TableHead className="font-mono text-terminal-text w-[180px]">Product</TableHead>
              <TableHead className="font-mono text-terminal-text w-[120px]">Supplier Price</TableHead>
              <TableHead className="font-mono text-terminal-text w-[180px]">Transport Band</TableHead>
              <TableHead className="font-mono text-terminal-text w-[100px]">Margin %</TableHead>
              <TableHead className="font-mono text-terminal-text w-[120px]">Delivered Price</TableHead>
              <TableHead className="font-mono text-terminal-text w-[100px]">Status</TableHead>
              <TableHead className="font-mono text-terminal-text w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {potentials.map((potential) => {
              const pricing = getPricingState(potential)
              const supplierCost = potential.supplierPrice?.pricePerUnit || 0
              const selectedBandId = getSelectedBandId(potential)
              const selectedBand = potential.transportRoute?.availableBands?.find(b => b.id === selectedBandId)
              const dieselSurcharge = potential.transportRoute?.dieselSurchargePerPallet || 0
              const unitsPerPallet = potential.transportRoute?.unitsPerPallet || 0
              const transportCost = selectedBand && unitsPerPallet > 0
                ? (selectedBand.price_per_pallet + dieselSurcharge) / unitsPerPallet
                : 0
              const totalCost = supplierCost + transportCost
              const isComplete = potential.status === 'complete'
              const isSelected = selectedIds.has(potential.id)

              return (
                <TableRow
                  key={potential.id}
                  className="border-terminal-border hover:bg-terminal-dark"
                >
                  {/* Checkbox */}
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelection(potential.id)}
                      disabled={!isComplete}
                    />
                  </TableCell>

                  {/* Route (FROM → TO) */}
                  <TableCell className="font-mono text-terminal-text text-xs">
                    {potential.transportRoute ? (
                      <div>
                        <div className="font-semibold text-green-400">
                          {potential.transportRoute.originHubName} → {potential.transportRoute.destinationHubName}
                        </div>
                        <div className="text-terminal-muted text-xs">
                          To: {potential.hub.name} ({potential.hub.hubCode})
                        </div>
                        {potential.transportRoute.durationDays && (
                          <div className="text-terminal-muted text-xs">
                            {potential.transportRoute.durationDays} days
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="font-semibold text-yellow-400">No Transport Route</div>
                        <div className="text-terminal-muted text-xs">
                          To: {potential.hub.name} ({potential.hub.hubCode})
                        </div>
                      </div>
                    )}
                  </TableCell>

                  {/* Supplier */}
                  <TableCell className="font-mono text-terminal-text text-xs">
                    <div>
                      <div className="font-semibold">{potential.supplier.name}</div>
                      <div className="text-terminal-muted">
                        {potential.supplier.city}, {potential.supplier.country}
                      </div>
                      {potential.supplier.defaultHubName && (
                        <div className="text-terminal-muted text-xs">
                          Hub: {potential.supplier.defaultHubName}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Product */}
                  <TableCell className="font-mono text-terminal-text text-xs">
                    <div>
                      <div className="font-semibold">{potential.product.name}</div>
                      <div className="text-terminal-muted">
                        {potential.product.packagingLabel} - {potential.product.sizeName}
                      </div>
                      <div className="text-terminal-muted">
                        {potential.product.boxesPerPallet} boxes/pallet
                      </div>
                    </div>
                  </TableCell>

                  {/* Supplier Price */}
                  <TableCell className="font-mono text-terminal-text text-xs">
                    {potential.supplierPrice ? (
                      <div>
                        <div className="font-semibold">
                          {formatCurrency(potential.supplierPrice.pricePerUnit, potential.supplierPrice.currency)}
                        </div>
                        <div className="text-terminal-muted">
                          {potential.supplierPrice.deliveryMode}
                        </div>
                      </div>
                    ) : (
                      <span className="text-terminal-muted">No price</span>
                    )}
                  </TableCell>

                  {/* Transport Band Selection */}
                  <TableCell className="font-mono text-terminal-text text-xs">
                    {potential.transportRoute && potential.transportRoute.availableBands && potential.transportRoute.availableBands.length > 0 ? (
                      <div className="space-y-1">
                        <Select
                          value={selectedBandId}
                          onValueChange={(value) => handleBandChange(potential.id, value, potential)}
                          disabled={!isComplete}
                        >
                          <SelectTrigger className="w-full bg-terminal-dark border-terminal-border text-terminal-text font-mono text-xs h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-terminal-panel border-terminal-border">
                            {potential.transportRoute.availableBands.map((band) => {
                              const unitsPerPallet = potential.transportRoute?.unitsPerPallet || 0
                              const bandCostPerUnit = unitsPerPallet > 0
                                ? band.price_per_pallet / unitsPerPallet
                                : 0
                              const palletRange = band.min_pallets && band.max_pallets
                                ? `${band.min_pallets}-${band.max_pallets} pallets`
                                : 'Standard'
                              const dimensions = band.pallet_dimensions || 'Standard'

                              return (
                                <SelectItem
                                  key={band.id}
                                  value={band.id}
                                  className="font-mono text-terminal-text hover:bg-terminal-dark text-xs"
                                >
                                  {dimensions} | {palletRange} | {formatCurrency(bandCostPerUnit)}/unit
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                        <div className="text-terminal-accent text-xs font-semibold">
                          Cost: {formatCurrency(transportCost)}/unit
                        </div>
                        <div className="text-terminal-muted text-xs">
                          {potential.transportRoute.transporterName}
                          {potential.transportRoute.durationDays > 0 && ` • ${potential.transportRoute.durationDays} days`}
                        </div>
                      </div>
                    ) : (
                      <span className="text-terminal-muted">No transport</span>
                    )}
                  </TableCell>

                  {/* Margin % */}
                  <TableCell>
                    {potential.status === 'complete' ? (
                      <Input
                        type="number"
                        value={pricing.marginPercent}
                        onChange={(e) => updateMargin(potential, parseFloat(e.target.value) || 0)}
                        className="w-20 bg-terminal-dark border-terminal-border text-terminal-text font-mono text-xs"
                        step="0.1"
                      />
                    ) : (
                      <span className="text-terminal-muted font-mono text-xs">-</span>
                    )}
                  </TableCell>

                  {/* Delivered Price */}
                  <TableCell>
                    {potential.status === 'complete' ? (
                      <Input
                        type="number"
                        value={pricing.deliveredPrice.toFixed(2)}
                        onChange={(e) => updateDeliveredPrice(potential, parseFloat(e.target.value) || 0)}
                        className="w-24 bg-terminal-dark border-terminal-border text-terminal-text font-mono text-xs"
                        step="0.01"
                      />
                    ) : (
                      <span className="text-terminal-muted font-mono text-xs">-</span>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {getStatusBadge(potential.status)}
                      {potential.existingOpportunity && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-mono text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Has Opportunity
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <div className="flex gap-2">
                      {potential.existingOpportunity ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateOpportunity(potential)}
                            disabled={updateOpportunityMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs"
                          >
                            <RefreshCcw className="h-3 w-3 mr-1" />
                            Update
                          </Button>
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="bg-terminal-dark border-terminal-accent text-terminal-accent hover:bg-terminal-accent hover:text-terminal-dark font-mono text-xs"
                          >
                            <Link href="/trade/market-opportunity">
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Link>
                          </Button>
                        </>
                      ) : potential.status === 'complete' ? (
                        <Button
                          size="sm"
                          onClick={() => handleCreateOpportunity(potential)}
                          disabled={createOpportunityMutation.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white font-mono text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Create
                        </Button>
                      ) : (
                        <span className="text-terminal-muted font-mono text-xs">Incomplete</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
