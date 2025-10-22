'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import {
  Loader2,
  Eye,
  Edit,
  ToggleLeft,
  ToggleRight,
  Trash2,
  RefreshCw,
  Copy,
  RefreshCcw
} from 'lucide-react'
import {
  useMarketOpportunities,
  useMarketOpportunitySummary,
  useUpdateMarketOpportunity,
  useDeleteMarketOpportunity
} from '@/hooks/use-market-opportunities'
import { MarketOpportunityStatus, MarketOpportunityPriority } from '@/types/market-opportunities'
import Link from 'next/link'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

// Simple currency formatter
const formatCurrency = (amount: number, currency: string = 'EUR') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export default function MarketOpportunitiesPage() {
  const [statusFilter, setStatusFilter] = useState<MarketOpportunityStatus>('all')
  const [priorityFilter, setPriorityFilter] = useState<MarketOpportunityPriority>('all')
  const [activeOnly, setActiveOnly] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingMargins, setEditingMargins] = useState<Record<string, number>>({})
  const [selectedBands, setSelectedBands] = useState<Record<string, string>>({})
  const [selectedRoutes, setSelectedRoutes] = useState<Record<string, string>>({})
  const [availableRoutes, setAvailableRoutes] = useState<Record<string, any[]>>({})

  const { data: opportunities, isLoading, error, refetch } = useMarketOpportunities(
    statusFilter,
    priorityFilter,
    activeOnly,
    undefined
  )

  const { data: summary } = useMarketOpportunitySummary()
  const updateMutation = useUpdateMarketOpportunity()
  const deleteMutation = useDeleteMarketOpportunity()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-terminal-dark flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-terminal-accent mx-auto mb-4" />
          <p className="text-terminal-muted font-mono">Loading market opportunities...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-terminal-dark flex items-center justify-center">
        <Card className="bg-terminal-panel border-terminal-border">
          <CardHeader>
            <CardTitle className="font-mono text-terminal-alert">Error</CardTitle>
            <CardDescription className="font-mono">Failed to load market opportunities</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-terminal-alert font-mono">{(error as any).message}</p>
            <Button onClick={() => refetch()} className="mt-4 bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Filter opportunities by search term
  const filteredOpportunities = opportunities?.filter(opp => {
    if (searchTerm !== '' &&
        !opp.hub?.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !opp.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !opp.product_packaging_specs?.products.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false
    }
    return true
  }) || []

  const statusConfig = {
    draft: { color: 'bg-gray-600/20 text-gray-400 border-gray-600 font-mono', label: 'Draft' },
    active: { color: 'bg-blue-600/20 text-blue-400 border-blue-600 font-mono', label: 'Active' },
    suspended: { color: 'bg-yellow-600/20 text-yellow-400 border-yellow-600 font-mono', label: 'Suspended' },
    cancelled: { color: 'bg-terminal-alert/20 text-terminal-alert border-terminal-alert font-mono', label: 'Cancelled' },
    expired: { color: 'bg-red-600/20 text-red-400 border-red-600 font-mono', label: 'Expired' },
  }

  const priorityConfig = {
    low: { color: 'bg-gray-600/20 text-gray-400 border-gray-600 font-mono', label: 'Low' },
    medium: { color: 'bg-blue-600/20 text-blue-400 border-blue-600 font-mono', label: 'Medium' },
    high: { color: 'bg-orange-600/20 text-orange-400 border-orange-600 font-mono', label: 'High' },
    urgent: { color: 'bg-terminal-alert/20 text-terminal-alert border-terminal-alert font-mono', label: 'Urgent' },
  }

  const handleToggleActive = async (opportunityId: string, currentlyActive: boolean) => {
    try {
      await updateMutation.mutateAsync({
        id: opportunityId,
        updates: { is_active: !currentlyActive }
      })
      toast.success(`Market opportunity ${!currentlyActive ? 'activated' : 'deactivated'}`)
    } catch (error) {
      toast.error('Failed to update market opportunity')
    }
  }

  const handleStatusUpdate = async (opportunityId: string, newStatus: string) => {
    try {
      await updateMutation.mutateAsync({
        id: opportunityId,
        updates: { status: newStatus as any }
      })
      toast.success('Status updated successfully')
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const handleDeleteOpportunity = async (opportunityId: string, hubName: string, supplierName: string) => {
    if (window.confirm(`Remove market opportunity for ${hubName} ↔ ${supplierName}?`)) {
      try {
        await deleteMutation.mutateAsync(opportunityId)
        toast.success('Market opportunity removed successfully')
      } catch (error) {
        console.error('Failed to remove market opportunity:', error)
        toast.error('Failed to remove market opportunity')
      }
    }
  }

  // Handle transport band change
  const handleBandChange = async (opp: any, newBandId: string) => {
    const availableBands = (opp as any)._available_bands || []
    const newBand = availableBands.find((b: any) => b.id === newBandId)

    if (!newBand) {
      toast.error('Selected band not found')
      return
    }

    const boxesPerPallet = opp.product_packaging_specs?.boxes_per_pallet || 0
    if (boxesPerPallet === 0) {
      toast.error('Invalid boxes per pallet')
      return
    }

    // Calculate new transport costs including diesel surcharge
    const dieselSurcharge = opp.diesel_surcharge_per_pallet || 0
    const transportCostPerPallet = newBand.price_per_pallet + dieselSurcharge
    const transportCostPerUnit = transportCostPerPallet / boxesPerPallet

    // Recalculate delivered price keeping margin constant
    const supplierCost = opp.supplier_price_per_unit || 0
    const totalCost = supplierCost + transportCostPerUnit
    const margin = editingMargins[opp.id] ?? (opp.margin_percentage || 0)
    const newDeliveredPrice = totalCost * (1 + margin / 100)

    try {
      await updateMutation.mutateAsync({
        id: opp.id,
        updates: {
          selected_transport_band_id: newBandId,
          transport_cost_per_pallet: transportCostPerPallet,
          transport_cost_per_unit: transportCostPerUnit,
          delivered_price_per_unit: newDeliveredPrice
        }
      })
      toast.success('Transport band updated')

      // Update local state
      setSelectedBands(prev => ({ ...prev, [opp.id]: newBandId }))
    } catch (error) {
      console.error('Failed to update band:', error)
      toast.error('Failed to update transport band')
    }
  }

  // Handle margin change
  const handleMarginChange = async (opp: any, newMargin: number) => {
    const supplierCost = opp.supplier_price_per_unit || 0
    const transportCost = opp.transport_cost_per_unit || 0
    const totalCost = supplierCost + transportCost
    const newDeliveredPrice = totalCost * (1 + newMargin / 100)

    try {
      await updateMutation.mutateAsync({
        id: opp.id,
        updates: {
          margin_percentage: newMargin,
          delivered_price_per_unit: newDeliveredPrice
        }
      })
      toast.success('Margin updated')

      // Clear editing state for this opportunity
      setEditingMargins(prev => {
        const newState = { ...prev }
        delete newState[opp.id]
        return newState
      })
    } catch (error) {
      console.error('Failed to update margin:', error)
      toast.error('Failed to update margin')
    }
  }

  // Handle route change
  const handleRouteChange = async (opp: any, newRouteId: string) => {
    try {
      // Fetch the bands for the new route
      const { data: bandsData, error: bandsError } = await supabase
        .from('transport_bands')
        .select('*')
        .eq('route_id', newRouteId)
        .order('min_pallets', { ascending: true })

      if (bandsError) throw bandsError

      if (!bandsData || bandsData.length === 0) {
        toast.error('No transport bands available for this route')
        return
      }

      // Get route info including transporter
      const { data: routeData, error: routeError } = await supabase
        .from('transport_routes')
        .select(`
          id,
          duration_days,
          transporter_id,
          transporters(id, name)
        `)
        .eq('id', newRouteId)
        .single()

      if (routeError) throw routeError

      // Update the opportunity with the new route and first band
      const firstBand = bandsData[0]
      const boxesPerPallet = opp.product_packaging_specs?.boxes_per_pallet || 0

      if (boxesPerPallet === 0) {
        toast.error('Invalid boxes per pallet')
        return
      }

      const dieselSurcharge = opp.diesel_surcharge_per_pallet || 0
      const transportCostPerPallet = firstBand.price_per_pallet + dieselSurcharge
      const transportCostPerUnit = transportCostPerPallet / boxesPerPallet

      const supplierCost = opp.supplier_price_per_unit || 0
      const totalCost = supplierCost + transportCostPerUnit
      const margin = editingMargins[opp.id] ?? (opp.margin_percentage || 0)
      const newDeliveredPrice = totalCost * (1 + margin / 100)

      await updateMutation.mutateAsync({
        id: opp.id,
        updates: {
          selected_route_id: newRouteId,
          selected_transport_band_id: firstBand.id,
          transport_cost_per_pallet: transportCostPerPallet,
          transport_cost_per_unit: transportCostPerUnit,
          delivered_price_per_unit: newDeliveredPrice
        }
      })

      toast.success('Route updated successfully')

      // Update local state
      setSelectedRoutes(prev => ({ ...prev, [opp.id]: newRouteId }))
      setSelectedBands(prev => ({ ...prev, [opp.id]: firstBand.id }))

      // Trigger a refetch to get updated data with new bands
      refetch()
    } catch (error) {
      console.error('Failed to update route:', error)
      toast.error('Failed to update route')
    }
  }

  // Fetch available routes for an opportunity
  const fetchRoutesForOpportunity = async (opp: any) => {
    if (availableRoutes[opp.id]) {
      return // Already fetched
    }

    try {
      const { data: routesData, error } = await supabase
        .from('transport_routes')
        .select(`
          id,
          duration_days,
          transporter_id,
          origin_hub_id,
          destination_hub_id,
          transporters(id, name)
        `)
        .or(`origin_hub_id.eq.${opp.supplier?.id},origin_hub_id.eq.${opp.hub_id}`)
        .or(`destination_hub_id.eq.${opp.hub_id},destination_hub_id.eq.${opp.supplier?.id}`)

      if (!error && routesData) {
        setAvailableRoutes(prev => ({ ...prev, [opp.id]: routesData }))
      }
    } catch (error) {
      console.error('Failed to fetch routes:', error)
    }
  }

  const handleCopyToText = async () => {
    if (!filteredOpportunities || filteredOpportunities.length === 0) {
      toast.error('No opportunities to copy')
      return
    }

    const dateStr = new Date().toLocaleDateString('en-GB')
    const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

    let text = `📊 MARKET OPPORTUNITIES - ${dateStr} ${timeStr}\n`
    text += `Total: ${filteredOpportunities.length} opportunities\n`
    text += `${'='.repeat(50)}\n\n`

    // Group opportunities by hub and route/transport details
    const groupedForCopy = new Map()

    filteredOpportunities.forEach((opp) => {
      const hubId = opp.hub_id || 'unknown'
      const hubName = opp.hub?.name || 'Unknown Hub'
      let routeText: string
      let deliveryMode: string
      let transportPrice: number | null = null
      let destinationHub = hubName

      // Determine delivery mode and route text
      if (!opp.selected_route_id && !opp.selected_transport_band_id) {
        // Same location or supplier delivery
        deliveryMode = 'Same Location'
        routeText = `${hubName} → ${hubName}`
      } else if (opp._route_info) {
        // Has route information
        const route = opp._route_info
        routeText = `${opp.supplier?.name} → ${hubName}`
        deliveryMode = 'DDP'

        if (opp.selected_transport_band) {
          transportPrice = opp.selected_transport_band.price_per_pallet
        }
      } else {
        // Fallback
        routeText = `${opp.supplier?.name} → ${hubName}`
        deliveryMode = 'DDP'
      }

      const groupKey = `${hubId}|${routeText}|${transportPrice}`

      if (!groupedForCopy.has(groupKey)) {
        groupedForCopy.set(groupKey, {
          hubName,
          routeText,
          deliveryMode,
          transportPrice,
          destinationHub,
          products: []
        })
      }

      groupedForCopy.get(groupKey).products.push({
        name: opp.product_packaging_specs?.products?.name || '-',
        packaging: opp.product_packaging_specs?.packaging_options?.label || '-',
        sizeName: opp.product_packaging_specs?.size_options?.name || '-',
        price: opp.delivered_price_per_unit,
        unit: opp.product_packaging_specs?.products?.sold_by || 'unit'
      })
    })

    let groupIndex = 1
    groupedForCopy.forEach((group) => {
      text += `${groupIndex}. ${group.hubName}\n`

      // Format location header
      let locationHeader: string
      if (group.deliveryMode === 'Same Location') {
        locationHeader = `   Price at: ${group.destinationHub}`
      } else if (group.deliveryMode === 'DDP') {
        locationHeader = `   Price delivered to: ${group.destinationHub}`
      } else {
        locationHeader = `   ${group.routeText} Pick up:`
      }

      text += `${locationHeader}\n`

      // Add transport price if available
      if (group.transportPrice !== null) {
        text += `   Transport: €${group.transportPrice.toFixed(2)}/pallet\n`
      }

      text += '\n'

      // Add products
      group.products.forEach((product, idx) => {
        const priceFormatted = product.price
          ? `€${product.price.toFixed(2)}/${product.unit}`
          : 'N/A'

        text += `   ${idx + 1}. ${product.name} - ${product.packaging} ${product.sizeName} - ${priceFormatted}\n`
      })

      text += '\n'
      groupIndex++
    })

    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard! Ready to paste in WhatsApp')
    } catch (err) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const handleUpdateFromPotential = async (opportunityId: string) => {
    try {
      const opportunity = opportunities?.find(o => o.id === opportunityId)
      if (!opportunity) {
        toast.error('Opportunity not found')
        return
      }

      // Fetch current supplier price
      const { data: currentPrice, error: priceError } = await supabase
        .from('current_supplier_prices')
        .select('*')
        .eq('supplier_id', opportunity.supplier_id)
        .eq('product_packaging_spec_id', opportunity.product_packaging_spec_id)
        .eq('hub_id', opportunity.price_source_hub_id)
        .single()

      if (priceError || !currentPrice) {
        toast.error('Current supplier price not found')
        return
      }

      // Fetch transport band if one is selected
      let transportCostPerUnit = opportunity.transport_cost_per_unit || 0
      let transportCostPerPallet = opportunity.transport_cost_per_pallet || 0

      if (opportunity.selected_transport_band_id) {
        const { data: transportBand, error: bandError } = await supabase
          .from('transport_bands')
          .select('*')
          .eq('id', opportunity.selected_transport_band_id)
          .single()

        if (!bandError && transportBand) {
          transportCostPerPallet = transportBand.price_per_pallet
          const boxesPerPallet = opportunity.product_packaging_specs?.boxes_per_pallet || 0
          transportCostPerUnit = boxesPerPallet > 0
            ? transportCostPerPallet / boxesPerPallet
            : 0
        }
      }

      // Recalculate delivered price
      const supplierCost = currentPrice.price_per_unit
      const totalCost = supplierCost + transportCostPerUnit
      const marginPercent = opportunity.margin_percentage || 15
      const deliveredPrice = totalCost * (1 + marginPercent / 100)

      // Update opportunity
      await updateMutation.mutateAsync({
        id: opportunityId,
        updates: {
          supplier_price_id: currentPrice.id,
          supplier_price_per_unit: supplierCost,
          transport_cost_per_unit: transportCostPerUnit,
          transport_cost_per_pallet: transportCostPerPallet,
          delivered_price_per_unit: deliveredPrice
        }
      })

      toast.success('Opportunity updated from current market data')
    } catch (error) {
      console.error('Error updating opportunity:', error)
      toast.error('Failed to update opportunity')
    }
  }

  return (
    <div className="min-h-screen bg-terminal-dark px-2 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-terminal-border pb-4 px-2">
        <div className="flex items-center gap-4">
          <Eye className="h-8 w-8 text-terminal-accent" />
          <div>
            <h1 className="text-2xl font-mono font-bold text-terminal-text tracking-wider">
              MARKET OPPORTUNITIES
            </h1>
            <p className="text-terminal-muted font-mono text-sm">
              Active hub product catalog management
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleCopyToText}
            disabled={!filteredOpportunities || filteredOpportunities.length === 0}
            variant="outline"
            className="bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy to Text
          </Button>
          <Button
            onClick={() => refetch()}
            disabled={isLoading}
            variant="outline"
            className="bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono">
            <Link href="/trade/market-potential">
              View Market Potential
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-2xl font-mono font-bold text-terminal-text">{summary.total}</p>
              <p className="text-xs font-mono text-terminal-muted">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-mono font-bold text-green-400">{summary.active}</p>
              <p className="text-xs font-mono text-terminal-muted">Active</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-mono font-bold text-yellow-400">{summary.suspended}</p>
              <p className="text-xs font-mono text-terminal-muted">Suspended</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-mono font-bold text-orange-400">{summary.expiringSoon}</p>
              <p className="text-xs font-mono text-terminal-muted">Expiring Soon</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-mono font-bold text-red-400">{summary.expired}</p>
              <p className="text-xs font-mono text-terminal-muted">Expired</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-terminal-panel border border-terminal-border rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div className="space-y-2">
            <Label className="font-mono text-sm text-terminal-muted">Status</Label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as MarketOpportunityStatus)}>
              <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-terminal-panel border-terminal-border">
                <SelectItem value="all" className="font-mono">All</SelectItem>
                <SelectItem value="draft" className="font-mono">Draft</SelectItem>
                <SelectItem value="active" className="font-mono">Active</SelectItem>
                <SelectItem value="suspended" className="font-mono">Suspended</SelectItem>
                <SelectItem value="cancelled" className="font-mono">Cancelled</SelectItem>
                <SelectItem value="expired" className="font-mono">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority Filter */}
          <div className="space-y-2">
            <Label className="font-mono text-sm text-terminal-muted">Priority</Label>
            <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as MarketOpportunityPriority)}>
              <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-terminal-panel border-terminal-border">
                <SelectItem value="all" className="font-mono">All</SelectItem>
                <SelectItem value="low" className="font-mono">Low</SelectItem>
                <SelectItem value="medium" className="font-mono">Medium</SelectItem>
                <SelectItem value="high" className="font-mono">High</SelectItem>
                <SelectItem value="urgent" className="font-mono">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="space-y-2">
            <Label className="font-mono text-sm text-terminal-muted">Search</Label>
            <Input
              type="text"
              placeholder="Hub, supplier, or product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-terminal-dark border-terminal-border text-terminal-text font-mono"
            />
          </div>

          {/* Active Only Toggle */}
          <div className="space-y-2">
            <Label className="font-mono text-sm text-terminal-muted">Show Active Only</Label>
            <div className="flex items-center space-x-2 h-10 px-3 bg-terminal-dark border border-terminal-border rounded-md">
              <Switch
                id="active-toggle"
                checked={activeOnly}
                onCheckedChange={setActiveOnly}
              />
              <Label htmlFor="active-toggle" className="font-mono text-sm text-terminal-text cursor-pointer">
                Active only
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Opportunities Table */}
      <div className="bg-terminal-panel border border-terminal-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-terminal-border hover:bg-terminal-dark">
                <TableHead className="font-mono text-terminal-text w-[120px]">Hub</TableHead>
                <TableHead className="font-mono text-terminal-text w-[150px]">Supplier</TableHead>
                <TableHead className="font-mono text-terminal-text w-[180px]">Product</TableHead>
                <TableHead className="font-mono text-terminal-text w-[120px]">Pricing</TableHead>
                <TableHead className="font-mono text-terminal-text w-[180px]">Transport Band</TableHead>
                <TableHead className="font-mono text-terminal-text w-[100px]">Status</TableHead>
                <TableHead className="font-mono text-terminal-text w-[100px]">Priority</TableHead>
                <TableHead className="font-mono text-terminal-text w-[80px]">Active</TableHead>
                <TableHead className="font-mono text-terminal-text w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOpportunities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-terminal-muted font-mono">
                    No market opportunities found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOpportunities.map((opp) => (
                  <TableRow
                    key={opp.id}
                    className="border-terminal-border hover:bg-terminal-dark"
                  >
                    {/* Hub */}
                    <TableCell className="font-mono text-terminal-text text-xs">
                      <div>
                        <div className="font-semibold">{opp.hub?.name}</div>
                        <div className="text-terminal-muted">{opp.hub?.hub_code}</div>
                      </div>
                    </TableCell>

                    {/* Supplier */}
                    <TableCell className="font-mono text-terminal-text text-xs">
                      <div>
                        <div className="font-semibold">{opp.supplier?.name}</div>
                        <div className="text-terminal-muted">
                          {opp.supplier?.city}, {opp.supplier?.country}
                        </div>
                      </div>
                    </TableCell>

                    {/* Product */}
                    <TableCell className="font-mono text-terminal-text text-xs">
                      <div>
                        <div className="font-semibold">
                          {opp.product_packaging_specs?.products.name}
                        </div>
                        <div className="text-terminal-muted text-xs">
                          {opp.product_packaging_specs?.packaging_options.label} - {opp.product_packaging_specs?.size_options.name}
                        </div>
                      </div>
                    </TableCell>

                    {/* Pricing */}
                    <TableCell className="font-mono text-terminal-text text-xs">
                      <div>
                        <div className="font-semibold flex items-center gap-1">
                          {formatCurrency(opp.delivered_price_per_unit || 0)}
                          {(opp as any)._price_updated && (
                            <Badge className="bg-blue-600/20 text-blue-400 border-blue-600 text-xs">
                              Updated
                            </Badge>
                          )}
                        </div>

                        {/* Cost Breakdown */}
                        <div className="mt-1 space-y-0.5 text-xs text-terminal-muted border-t border-terminal-border/30 pt-1">
                          <div className="flex justify-between">
                            <span>Supplier:</span>
                            <span>{formatCurrency(opp.supplier_price_per_unit || 0)}/unit</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Transport:</span>
                            <span>{formatCurrency(opp.transport_cost_per_unit || 0)}/unit</span>
                          </div>
                          {(() => {
                            // Calculate units per pallet based on sold_by
                            const spec = opp.product_packaging_specs
                            const product = spec?.products
                            const soldBy = product?.sold_by || 'box'

                            let unitsPerPallet = 0
                            switch (soldBy) {
                              case 'kg':
                                unitsPerPallet = spec?.weight_per_pallet || 0
                                break
                              case 'piece':
                              case 'punnet':
                                unitsPerPallet = spec?.pieces_per_box ? spec.pieces_per_box * (spec.boxes_per_pallet || 0) : (spec?.boxes_per_pallet || 0)
                                break
                              case 'box':
                              case 'bag':
                              default:
                                unitsPerPallet = spec?.boxes_per_pallet || 0
                            }

                            const profitPerUnit = (opp.delivered_price_per_unit || 0) - (opp.supplier_price_per_unit || 0) - (opp.transport_cost_per_unit || 0)
                            const marginPerPallet = profitPerUnit * unitsPerPallet
                            return unitsPerPallet > 0 ? (
                              <div className="flex justify-between text-green-400 font-semibold border-t border-terminal-border/30 pt-0.5">
                                <span>Profit/Pallet:</span>
                                <span>{formatCurrency(marginPerPallet)}</span>
                              </div>
                            ) : null
                          })()}
                        </div>

                        {/* Editable Margin */}
                        <div className="flex items-center gap-1 mt-1 border-t border-terminal-border/30 pt-1">
                          <span className="text-terminal-muted text-xs">Margin:</span>
                          <Input
                            type="number"
                            value={editingMargins[opp.id] ?? (opp.margin_percentage || 0)}
                            onChange={(e) => setEditingMargins(prev => ({ ...prev, [opp.id]: parseFloat(e.target.value) || 0 }))}
                            onBlur={() => {
                              const newMargin = editingMargins[opp.id]
                              if (newMargin !== undefined && newMargin !== opp.margin_percentage) {
                                handleMarginChange(opp, newMargin)
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const newMargin = editingMargins[opp.id]
                                if (newMargin !== undefined && newMargin !== opp.margin_percentage) {
                                  handleMarginChange(opp, newMargin)
                                }
                              }
                            }}
                            className="w-14 h-6 bg-terminal-dark border-terminal-border text-terminal-text font-mono text-xs px-1"
                            step="0.1"
                          />
                          <span className="text-terminal-muted text-xs">%</span>
                        </div>

                        {(opp as any)._price_updated && (
                          <div className="text-xs text-blue-400 mt-1">
                            Was: {formatCurrency((opp as any)._original_delivered_price || 0)}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Transport Band */}
                    <TableCell className="font-mono text-terminal-text text-xs">
                      <div className="space-y-2">
                        {/* Route Selector */}
                        <div>
                          <div className="text-terminal-muted text-xs mb-1">Route:</div>
                          <Select
                            value={selectedRoutes[opp.id] || opp.selected_route_id || ''}
                            onValueChange={(value) => handleRouteChange(opp, value)}
                            onOpenChange={(open) => {
                              if (open) {
                                fetchRoutesForOpportunity(opp)
                              }
                            }}
                          >
                            <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text font-mono text-xs h-auto py-1">
                              <SelectValue placeholder="Select route" />
                            </SelectTrigger>
                            <SelectContent className="bg-terminal-panel border-terminal-border">
                              {availableRoutes[opp.id]?.length > 0 ? (
                                availableRoutes[opp.id].map((route: any) => (
                                  <SelectItem
                                    key={route.id}
                                    value={route.id}
                                    className="font-mono text-terminal-text hover:bg-terminal-dark text-xs"
                                  >
                                    <div>
                                      <div className="font-semibold text-green-400">
                                        {route.transporters?.name || 'Unknown'}
                                      </div>
                                      <div className="text-terminal-muted text-xs">
                                        {route.duration_days} days
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))
                              ) : (opp as any)._route_info ? (
                                <SelectItem
                                  value={opp.selected_route_id}
                                  className="font-mono text-terminal-text hover:bg-terminal-dark text-xs"
                                >
                                  <div>
                                    <div className="font-semibold text-green-400">
                                      {(opp as any)._route_info.transporters?.name || 'Unknown'}
                                    </div>
                                    <div className="text-terminal-muted text-xs">
                                      {(opp as any)._route_info.duration_days} days
                                    </div>
                                  </div>
                                </SelectItem>
                              ) : (
                                <SelectItem value="none" disabled className="font-mono text-terminal-muted text-xs">
                                  No routes available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Transport Band Selector */}
                        {(opp as any)._route_info || opp.selected_route_id ? (
                          <div>
                            <div className="text-terminal-muted text-xs mb-1">Band:</div>
                            {(opp as any)._available_bands && (opp as any)._available_bands.length > 0 ? (
                              <Select
                                value={selectedBands[opp.id] || opp.selected_transport_band_id || ''}
                                onValueChange={(value) => handleBandChange(opp, value)}
                              >
                                <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text font-mono text-xs h-auto py-1">
                                  <SelectValue placeholder="Select band" />
                                </SelectTrigger>
                                <SelectContent className="bg-terminal-panel border-terminal-border">
                                  {(opp as any)._available_bands.map((band: any) => (
                                    <SelectItem
                                      key={band.id}
                                      value={band.id}
                                      className="font-mono text-terminal-text hover:bg-terminal-dark text-xs"
                                    >
                                      <div>
                                        <div className="font-semibold">
                                          {band.min_pallets}-{band.max_pallets} pallets
                                        </div>
                                        <div className="text-terminal-muted text-xs">
                                          {band.pallet_dimensions || 'Standard'} - €{band.price_per_pallet.toFixed(2)}/pallet
                                        </div>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : opp.selected_transport_band ? (
                              <div className="text-xs">
                                <div className="text-terminal-text">
                                  {opp.selected_transport_band.min_pallets}-{opp.selected_transport_band.max_pallets} pallets
                                </div>
                                <div className="text-terminal-muted">
                                  {opp.selected_transport_band.pallet_dimensions || 'Standard'} - €{opp.selected_transport_band.price_per_pallet.toFixed(2)}/pallet
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-yellow-400">
                                No bands available
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-red-400">
                            Select a route first
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge className={`${statusConfig[opp.status]?.color} text-xs`}>
                        {statusConfig[opp.status]?.label || opp.status}
                      </Badge>
                    </TableCell>

                    {/* Priority */}
                    <TableCell>
                      <Badge className={`${priorityConfig[opp.priority]?.color} text-xs`}>
                        {priorityConfig[opp.priority]?.label || opp.priority}
                      </Badge>
                    </TableCell>

                    {/* Active Toggle */}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(opp.id, opp.is_active)}
                        className="font-mono text-xs"
                      >
                        {opp.is_active ? (
                          <ToggleRight className="h-5 w-5 text-green-400" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-gray-400" />
                        )}
                      </Button>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex gap-2">
                        {(opp as any)._price_updated && (
                          <Button
                            size="sm"
                            onClick={async () => {
                              try {
                                await updateMutation.mutateAsync({
                                  id: opp.id,
                                  updates: {
                                    supplier_price_per_unit: opp.supplier_price_per_unit,
                                    delivered_price_per_unit: opp.delivered_price_per_unit,
                                    supplier_price_id: opp.supplier_price_id
                                  }
                                })
                                toast.success('Price updated successfully')
                              } catch (error) {
                                toast.error('Failed to update price')
                              }
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs"
                          >
                            Accept
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUpdateFromPotential(opp.id)}
                          className="text-green-400 hover:text-green-300 hover:bg-green-900/20 font-mono text-xs"
                          title="Update from current market data"
                        >
                          <RefreshCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteOpportunity(opp.id, opp.hub?.name || '', opp.supplier?.name || '')}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20 font-mono text-xs"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
