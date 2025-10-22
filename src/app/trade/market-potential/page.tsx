'use client'

import { useState, useMemo, useRef } from 'react'
import { Store, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useMarketPotential } from '@/hooks/use-market-potential'
import { useCreateMarketOpportunity, useUpdateMarketOpportunity } from '@/hooks/use-market-opportunities'
import { MarketPotentialStatus } from '@/types/market-potential'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import MarketPotentialTableMode from './components/table-mode'

export default function MarketPotentialPage() {
  const [selectedHubId, setSelectedHubId] = useState<string>('')
  const [showPreferredOnly, setShowPreferredOnly] = useState<boolean>(true) // Default to TRUE
  const [statusFilter, setStatusFilter] = useState<MarketPotentialStatus>('all')
  const [bulkMargin, setBulkMargin] = useState<number>(15)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedBands, setSelectedBands] = useState<Record<string, string>>({})
  const [selectedMargins, setSelectedMargins] = useState<Record<string, number>>({})
  const [isCreatingBulk, setIsCreatingBulk] = useState(false)

  const createOpportunityMutation = useCreateMarketOpportunity()
  const updateOpportunityMutation = useUpdateMarketOpportunity()

  // Fetch hubs
  const { data: hubs, isLoading: hubsLoading } = useQuery({
    queryKey: ['hubs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hubs')
        .select('id, name, hub_code, city_name, country_code')
        .order('name')

      if (error) throw error
      return data
    },
  })

  // Fetch market potential data - only when hub is selected
  const { data, isLoading, error, refetch } = useMarketPotential(
    selectedHubId || undefined,
    showPreferredOnly,
    statusFilter
  )

  // Fetch existing opportunities for the selected hub
  const { data: existingOpportunities } = useQuery({
    queryKey: ['hub-opportunities', selectedHubId],
    queryFn: async () => {
      if (!selectedHubId || selectedHubId === 'all') return []

      const { data, error } = await supabase
        .from('market_opportunities')
        .select(`
          id,
          hub_id,
          supplier_id,
          product_packaging_spec_id,
          selected_transport_band_id,
          margin_percentage,
          delivered_price_per_unit,
          is_active
        `)
        .eq('hub_id', selectedHubId)

      if (error) throw error
      return data
    },
    enabled: selectedHubId !== '' && selectedHubId !== 'all'
  })

  // Don't fetch if no hub selected
  const shouldShowData = selectedHubId !== '' && selectedHubId !== 'all'

  // Match potentials with existing opportunities
  const potentialsWithOpportunities = data?.potentials.map(potential => {
    const existingOpp = existingOpportunities?.find(
      opp => opp.hub_id === potential.hub.id &&
             opp.supplier_id === potential.supplier.id &&
             opp.product_packaging_spec_id === potential.product.specId
    )

    return {
      ...potential,
      existingOpportunity: existingOpp || null
    }
  }) || []

  // Handle bulk create/update
  const handleBulkCreate = async () => {
    if (selectedIds.size === 0) {
      toast.error('Please select at least one match')
      return
    }

    setIsCreatingBulk(true)
    let createCount = 0
    let updateCount = 0
    let errorCount = 0

    try {
      const selectedPotentials = potentialsWithOpportunities.filter(p => selectedIds.has(p.id)) || []

      for (const potential of selectedPotentials) {
        if (!potential.supplierPrice || !potential.transportRoute) {
          errorCount++
          continue
        }

        try {
          // Check if this is a same-location or supplier-delivery scenario
          const isSameLocation = potential.transportRoute.id === 'same-location' || potential.transportRoute.id === 'supplier-delivery'
          const hasBands = potential.transportRoute.availableBands && potential.transportRoute.availableBands.length > 0

          let transportCostPerPallet = 0
          let transportCostPerUnit = 0
          let selectedBandId = null

          if (isSameLocation || !hasBands) {
            // Same location or supplier delivery - no band needed, transport cost is 0
            transportCostPerPallet = 0
            transportCostPerUnit = 0
          } else {
            // Third-party transport - need to select a band
            selectedBandId = selectedBands[potential.id] ||
                             potential.existingOpportunity?.selected_transport_band_id ||
                             potential.transportRoute.availableBands?.[0]?.id
            const selectedBand = potential.transportRoute.availableBands?.find(b => b.id === selectedBandId)

            if (!selectedBand) {
              errorCount++
              continue
            }

            // Calculate transport cost based on selected band
            transportCostPerPallet = selectedBand.price_per_pallet
            transportCostPerUnit = potential.product.boxesPerPallet > 0
              ? transportCostPerPallet / potential.product.boxesPerPallet
              : 0
          }

          // Get margin - use from state or default to bulk margin or existing
          const margin = selectedMargins[potential.id] ||
                        potential.existingOpportunity?.margin_percentage ||
                        bulkMargin

          const supplierCost = potential.supplierPrice.pricePerUnit
          const totalCost = supplierCost + transportCostPerUnit
          const deliveredPrice = totalCost * (1 + margin / 100)

          if (potential.existingOpportunity) {
            // Update existing opportunity
            await updateOpportunityMutation.mutateAsync({
              id: potential.existingOpportunity.id,
              updates: {
                selected_route_id: isSameLocation ? null : potential.transportRoute.id,
                selected_transport_band_id: selectedBandId,
                supplier_price_id: potential.supplierPrice.id,
                supplier_price_per_unit: potential.supplierPrice.pricePerUnit,
                transport_cost_per_unit: transportCostPerUnit,
                transport_cost_per_pallet: transportCostPerPallet,
                margin_percentage: margin,
                delivered_price_per_unit: deliveredPrice
              }
            })
            updateCount++
          } else {
            // Create new opportunity
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
              diesel_surcharge_per_pallet: 0,
              margin_percentage: margin,
              delivered_price_per_unit: deliveredPrice,
              status: 'active' as const,
              priority: 'medium' as const
            }

            await createOpportunityMutation.mutateAsync(opportunityData)
            createCount++
          }
        } catch (err) {
          console.error('Error creating/updating opportunity:', err)
          errorCount++
        }
      }

      // Show results
      if (createCount > 0 || updateCount > 0) {
        const messages = []
        if (createCount > 0) messages.push(`Created ${createCount}`)
        if (updateCount > 0) messages.push(`Updated ${updateCount}`)
        toast.success(`${messages.join(', ')} market opportunities`)
        setSelectedIds(new Set()) // Clear selections
        refetch() // Refresh data
      }
      if (errorCount > 0) {
        toast.error(`Failed to process ${errorCount} opportunities`)
      }
    } catch (err) {
      toast.error('Bulk operation failed')
    } finally {
      setIsCreatingBulk(false)
    }
  }

  if (hubsLoading) {
    return (
      <div className="min-h-screen bg-terminal-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terminal-accent mx-auto mb-4"></div>
          <p className="text-terminal-muted font-mono">Loading hubs...</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-terminal-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terminal-accent mx-auto mb-4"></div>
          <p className="text-terminal-muted font-mono">Loading market potential...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-terminal-dark flex items-center justify-center">
        <div className="text-center">
          <p className="text-terminal-alert font-mono mb-4">Error loading market potential</p>
          <Button onClick={() => refetch()} className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-terminal-dark px-2 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-terminal-border pb-4 px-2">
        <div className="flex items-center gap-4">
          <Store className="h-8 w-8 text-terminal-accent" />
          <div>
            <h1 className="text-2xl font-mono font-bold text-terminal-text tracking-wider">
              MARKET POTENTIAL
            </h1>
            <p className="text-terminal-muted font-mono text-sm">
              Hub → Supplier product matches
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => refetch()}
            disabled={isLoading}
            variant="outline"
            className="bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Calculating...' : 'Recalculate All'}
          </Button>
          <Button asChild className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono">
            <Link href="/trade/market-opportunity">
              View Market Opportunities
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-terminal-panel border border-terminal-border rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Hub Filter */}
          <div className="space-y-2">
            <Label className="font-mono text-sm text-terminal-muted">Hub</Label>
            <Select value={selectedHubId} onValueChange={setSelectedHubId}>
              <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text font-mono">
                <SelectValue placeholder="All hubs" />
              </SelectTrigger>
              <SelectContent className="bg-terminal-panel border-terminal-border">
                <SelectItem value="all" className="font-mono text-terminal-text hover:bg-terminal-dark">
                  All hubs
                </SelectItem>
                {hubs?.map((hub) => (
                  <SelectItem
                    key={hub.id}
                    value={hub.id}
                    className="font-mono text-terminal-text hover:bg-terminal-dark"
                  >
                    {hub.name} ({hub.hub_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label className="font-mono text-sm text-terminal-muted">Status</Label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as MarketPotentialStatus)}>
              <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-terminal-panel border-terminal-border">
                <SelectItem value="all" className="font-mono">All</SelectItem>
                <SelectItem value="complete" className="font-mono">Complete</SelectItem>
                <SelectItem value="missing_price" className="font-mono">Missing Price</SelectItem>
                <SelectItem value="missing_transport" className="font-mono">Missing Transport</SelectItem>
                <SelectItem value="missing_both" className="font-mono">Missing Both</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preferred Products Toggle */}
          <div className="space-y-2">
            <Label className="font-mono text-sm text-terminal-muted">Filter by Preferences</Label>
            <div className="flex items-center space-x-2 h-10 px-3 bg-terminal-dark border border-terminal-border rounded-md">
              <Switch
                id="preferred-toggle"
                checked={showPreferredOnly}
                onCheckedChange={setShowPreferredOnly}
              />
              <Label htmlFor="preferred-toggle" className="font-mono text-sm text-terminal-text cursor-pointer">
                Preferred products only
              </Label>
            </div>
          </div>
        </div>

        {/* Summary Stats - only show when hub is selected */}
        {shouldShowData && data?.summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-terminal-border">
            <div className="text-center">
              <p className="text-2xl font-mono font-bold text-terminal-text">{data.summary.total}</p>
              <p className="text-xs font-mono text-terminal-muted">Total Matches</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-mono font-bold text-green-400">{data.summary.complete}</p>
              <p className="text-xs font-mono text-terminal-muted">Complete</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-mono font-bold text-yellow-400">{data.summary.missingPrice}</p>
              <p className="text-xs font-mono text-terminal-muted">Missing Price</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-mono font-bold text-orange-400">{data.summary.missingTransport}</p>
              <p className="text-xs font-mono text-terminal-muted">Missing Transport</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-mono font-bold text-red-400">{data.summary.missingBoth}</p>
              <p className="text-xs font-mono text-terminal-muted">Missing Both</p>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions - only show when hub is selected */}
      {shouldShowData && (
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="space-y-2">
                <Label className="font-mono text-sm text-terminal-muted">Bulk Margin %</Label>
                <Input
                  type="number"
                  value={bulkMargin}
                  onChange={(e) => setBulkMargin(parseFloat(e.target.value) || 15)}
                  className="w-32 bg-terminal-dark border-terminal-border text-terminal-text font-mono"
                  step="0.1"
                />
              </div>
              <div className="pt-6">
                <Button
                  onClick={handleBulkCreate}
                  disabled={selectedIds.size === 0 || isCreatingBulk}
                  className="bg-green-600 hover:bg-green-700 text-white font-mono"
                >
                  {isCreatingBulk ? 'Processing...' : `Create/Update ${selectedIds.size > 0 ? `${selectedIds.size} ` : ''}Selected`}
                </Button>
              </div>
            </div>
            <div className="font-mono text-sm text-terminal-muted">
              {selectedIds.size} of {potentialsWithOpportunities.filter(p => p.status === 'complete').length || 0} selected
            </div>
          </div>
        </div>
      )}

      {/* Table Mode - only show when hub is selected */}
      {shouldShowData ? (
        <MarketPotentialTableMode
          potentials={potentialsWithOpportunities || []}
          bulkMargin={bulkMargin}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          selectedBands={selectedBands}
          setSelectedBands={setSelectedBands}
          selectedMargins={selectedMargins}
          setSelectedMargins={setSelectedMargins}
          onRefresh={refetch}
        />
      ) : (
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-12 text-center">
          <Store className="h-16 w-16 text-terminal-muted mx-auto mb-4" />
          <h3 className="text-lg font-mono font-semibold text-terminal-text mb-2">
            Select a Hub
          </h3>
          <p className="text-sm font-mono text-terminal-muted">
            Choose a hub from the dropdown above to see product matches
          </p>
        </div>
      )}
    </div>
  )
}
