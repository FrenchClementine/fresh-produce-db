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
import { CheckCircle, AlertCircle, XCircle, MinusCircle, Check, X, Eye, CheckSquare, Square } from 'lucide-react'
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
  onRefresh: () => void
}

interface PricingState {
  [key: string]: {
    marginPercent: number
    offerPrice: number
    isEditing: boolean
    selectedBandIndex: number
  }
}

export default function TradePotentialTableMode({
  potentials: data,
  statusFilter,
  setStatusFilter,
  showOpportunityFilter,
  setShowOpportunityFilter,
  onRefresh
}: TradePotentialTableModeProps) {
  const [customerFilter, setCustomerFilter] = useState<string>('all')
  const [supplierFilter, setSupplierFilter] = useState<string>('all')
  const [agentFilter, setAgentFilter] = useState<string>('all')
  const [pricingState, setPricingState] = useState<PricingState>({})
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkMargin, setBulkMargin] = useState<number>(10)
  const [autoSelectEnabled, setAutoSelectEnabled] = useState<boolean>(true)

  const { customers } = useCustomers()
  const { data: suppliers } = useSuppliers()
  const { activeStaff } = useActiveStaff()
  const queryClient = useQueryClient()
  const excludePotentialMutation = useExcludePotential()
  const createOpportunityMutation = useCreateOpportunity()

  // Get transport cost per unit for a selected band
  const getTransportCostPerUnit = (potential: TradePotential, bandIndex: number = 0) => {
    const route = potential.transportRoute
    if (!route || !route.availableBands || route.availableBands.length === 0) {
      return route?.pricePerUnit || 0
    }

    const band = route.availableBands[bandIndex]
    if (!band || !route.unitsPerPallet || route.unitsPerPallet === 0) {
      return 0
    }

    return band.price_per_pallet / route.unitsPerPallet
  }

  // Initialize pricing state for a potential
  const getPricingState = (potential: TradePotential) => {
    if (pricingState[potential.id]) {
      return pricingState[potential.id]
    }

    const cost = potential.supplierPrice?.pricePerUnit || 0
    const transportCost = getTransportCostPerUnit(potential, 0)
    const totalCost = cost + transportCost
    const defaultMargin = 10 // 10% default margin
    const offerPrice = totalCost * (1 + defaultMargin / 100)

    return {
      marginPercent: defaultMargin,
      offerPrice: offerPrice,
      isEditing: false,
      selectedBandIndex: 0
    }
  }

  // Update margin percentage
  const updateMargin = (potentialId: string, totalCost: number, newMargin: number) => {
    const offerPrice = totalCost * (1 + newMargin / 100)
    const currentState = pricingState[potentialId] || { selectedBandIndex: 0 }
    setPricingState(prev => ({
      ...prev,
      [potentialId]: {
        marginPercent: newMargin,
        offerPrice: offerPrice,
        isEditing: true,
        selectedBandIndex: currentState.selectedBandIndex
      }
    }))
  }

  // Update offer price
  const updateOfferPrice = (potentialId: string, totalCost: number, newOfferPrice: number) => {
    const margin = totalCost > 0 ? ((newOfferPrice - totalCost) / totalCost) * 100 : 0
    const currentState = pricingState[potentialId] || { selectedBandIndex: 0 }
    setPricingState(prev => ({
      ...prev,
      [potentialId]: {
        marginPercent: margin,
        offerPrice: newOfferPrice,
        isEditing: true,
        selectedBandIndex: currentState.selectedBandIndex
      }
    }))
  }

  // Update selected transport band
  const updateTransportBand = (potential: TradePotential, bandIndex: number) => {
    const cost = potential.supplierPrice?.pricePerUnit || 0
    const transportCost = getTransportCostPerUnit(potential, bandIndex)
    const totalCost = cost + transportCost
    const currentState = pricingState[potential.id] || { marginPercent: 10, isEditing: false }
    const offerPrice = totalCost * (1 + currentState.marginPercent / 100)

    setPricingState(prev => ({
      ...prev,
      [potential.id]: {
        marginPercent: currentState.marginPercent,
        offerPrice: offerPrice,
        isEditing: true,
        selectedBandIndex: bandIndex
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

  const handleFilterChange = (type: 'customer' | 'supplier' | 'agent' | 'status', value: string | PotentialStatus) => {
    // Re-enable auto-select when filters change
    setAutoSelectEnabled(true)
    switch (type) {
      case 'customer':
        setCustomerFilter(value as string)
        break
      case 'supplier':
        setSupplierFilter(value as string)
        break
      case 'agent':
        setAgentFilter(value as string)
        break
      case 'status':
        setStatusFilter(value as PotentialStatus)
        break
    }
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
        const currentState = pricingState[id] || { selectedBandIndex: 0 }
        const transportCost = getTransportCostPerUnit(potential, currentState.selectedBandIndex)
        const totalCost = productCost + transportCost
        const offerPrice = totalCost * (1 + bulkMargin / 100)

        updates[id] = {
          marginPercent: bulkMargin,
          offerPrice: offerPrice,
          isEditing: true,
          selectedBandIndex: currentState.selectedBandIndex
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
    let errorCount = 0

    for (const id of Array.from(selectedIds)) {
      const potential = data.find(p => p.id === id)
      if (!potential) continue

      const pricing = getPricingState(potential)

      try {
        await createOpportunityMutation.mutateAsync({
          customer_id: potential.customer.id,
          supplier_id: potential.supplier.id,
          product_packaging_spec_id: potential.product.specId,
          offer_price_per_unit: pricing.offerPrice,
          offer_currency: potential.supplierPrice?.currency || 'EUR',
          status: 'draft',
          priority: 'medium',
          supplier_price_id: potential.supplierPrice?.id,
          assigned_to: potential.customer.agent?.id
        })
        successCount++
      } catch (error) {
        console.error(`Failed to create opportunity for ${potential.id}:`, error)
        errorCount++
      }
    }

    if (successCount > 0) {
      toast.success(`Created ${successCount} opportunities`)
      setSelectedIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['trade-potential'] })
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

    try {
      await createOpportunityMutation.mutateAsync({
        customer_id: potential.customer.id,
        supplier_id: potential.supplier.id,
        product_packaging_spec_id: potential.product.specId,
        offer_price_per_unit: pricing.offerPrice,
        offer_currency: potential.supplierPrice?.currency || 'EUR',
        status: 'draft',
        priority: 'medium',
        supplier_price_id: potential.supplierPrice?.id,
        assigned_to: potential.customer.agent?.id
      })

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
            <Select value={statusFilter} onValueChange={(value: PotentialStatus) => handleFilterChange('status', value)}>
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
            <Select value={customerFilter} onValueChange={(value) => handleFilterChange('customer', value)}>
              <SelectTrigger id="customer-filter" className="bg-terminal-dark border-terminal-border text-terminal-text font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-terminal-panel border-terminal-border">
                <SelectItem value="all" className="font-mono text-terminal-text">All Customers</SelectItem>
                {customers?.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id} className="font-mono text-terminal-text">
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="supplier-filter" className="font-mono text-terminal-muted text-xs uppercase">Supplier</Label>
            <Select value={supplierFilter} onValueChange={(value) => handleFilterChange('supplier', value)}>
              <SelectTrigger id="supplier-filter" className="bg-terminal-dark border-terminal-border text-terminal-text font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-terminal-panel border-terminal-border">
                <SelectItem value="all" className="font-mono text-terminal-text">All Suppliers</SelectItem>
                {suppliers?.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id} className="font-mono text-terminal-text">
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <div className="flex items-center space-x-2">
            <Switch
              id="opportunity-filter"
              checked={showOpportunityFilter}
              onCheckedChange={handleOpportunityFilterChange}
            />
            <Label htmlFor="opportunity-filter" className="font-mono text-terminal-muted text-sm">Hide converted</Label>
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
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.size === filteredSelectablePotentials.length && filteredSelectablePotentials.length > 0}
                      onCheckedChange={toggleSelectAll}
                      disabled={filteredSelectablePotentials.length === 0}
                      className="border-terminal-border data-[state=checked]:bg-terminal-accent data-[state=checked]:text-terminal-dark"
                    />
                  </TableHead>
                  <TableHead className="font-mono text-terminal-muted uppercase">Customer</TableHead>
                  <TableHead className="font-mono text-terminal-muted uppercase">Supplier</TableHead>
                  <TableHead className="font-mono text-terminal-muted uppercase">Product</TableHead>
                  <TableHead className="font-mono text-terminal-muted uppercase">Status</TableHead>
                  <TableHead className="font-mono text-terminal-muted uppercase">Price Delivered To</TableHead>
                  <TableHead className="font-mono text-terminal-muted uppercase">Transport</TableHead>
                  <TableHead className="font-mono text-terminal-muted uppercase">Product Cost</TableHead>
                  <TableHead className="font-mono text-terminal-muted uppercase">Transport Cost</TableHead>
                  <TableHead className="font-mono text-terminal-muted uppercase">Total Cost</TableHead>
                  <TableHead className="font-mono text-terminal-muted uppercase">Margin %</TableHead>
                  <TableHead className="font-mono text-terminal-muted uppercase">Offer Price</TableHead>
                  <TableHead className="font-mono text-terminal-muted uppercase">Profit</TableHead>
                  <TableHead className="font-mono text-terminal-muted uppercase text-right">Quick Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPotentials.map((potential) => {
                  const StatusIcon = statusConfig[potential.status]?.icon || MinusCircle
                  const statusColor = statusConfig[potential.status]?.color || 'text-gray-600'
                  const pricing = getPricingState(potential)
                  const productCost = potential.supplierPrice?.pricePerUnit || 0
                  const transportCost = getTransportCostPerUnit(potential, pricing.selectedBandIndex)
                  const totalCost = productCost + transportCost
                  const profit = pricing.offerPrice - totalCost
                  const hasOpportunity = potential.hasOpportunity
                  const hasBands = potential.transportRoute?.availableBands && potential.transportRoute.availableBands.length > 0
                  const isSelectable = potential.status === 'complete' && !hasOpportunity
                  const isSelected = selectedIds.has(potential.id)

                  return (
                    <TableRow key={potential.id} className={cn(
                      "border-terminal-border hover:bg-terminal-dark/50",
                      hasOpportunity ? 'bg-blue-900/20' : '',
                      isSelected ? 'bg-terminal-accent/5 border-l-4 border-l-terminal-accent' : ''
                    )}>
                      <TableCell>
                        {isSelectable ? (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(potential.id)}
                            className="border-terminal-border data-[state=checked]:bg-terminal-accent data-[state=checked]:text-terminal-dark"
                          />
                        ) : (
                          <div className="w-5" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-terminal-text">
                        <div className="space-y-1">
                          <div className="font-medium">{potential.customer.name}</div>
                          <div className="text-xs text-terminal-muted">
                            {potential.customer.city}, {potential.customer.country}
                          </div>
                          {potential.customer.agent && (
                            <Badge variant="outline" className="text-xs font-mono border-terminal-border text-terminal-muted">
                              {potential.customer.agent.name}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="font-mono text-terminal-text">
                        <div className="space-y-1">
                          <div className="font-medium">{potential.supplier.name}</div>
                          <div className="text-xs text-terminal-muted">
                            {potential.supplier.city}, {potential.supplier.country}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="font-mono text-terminal-text">
                        <div className="space-y-1">
                          <div className="font-medium">{potential.product.name}</div>
                          <div className="flex gap-1 flex-wrap">
                            <Badge variant="outline" className="text-xs font-mono border-terminal-border text-terminal-muted">{potential.product.packagingLabel}</Badge>
                            <Badge variant="outline" className="text-xs font-mono border-terminal-border text-terminal-muted">{potential.product.sizeName}</Badge>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge className={cn("font-mono font-bold", statusConfig[potential.status]?.bg)}>
                          {statusConfig[potential.status]?.label}
                        </Badge>
                      </TableCell>

                      <TableCell className="font-mono text-terminal-text">
                        {potential.supplierPrice ? (
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {potential.supplierPrice.hubName}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-terminal-muted">No price</span>
                        )}
                      </TableCell>

                      <TableCell className="font-mono text-terminal-text">
                        {potential.transportRoute ? (
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-blue-400">
                              {potential.transportRoute.transporterName}
                            </div>
                            {potential.transportRoute.durationDays > 0 && (
                              <div className="text-xs text-terminal-muted">
                                {potential.transportRoute.durationDays} days
                              </div>
                            )}
                            {hasBands && potential.status === 'complete' && !hasOpportunity && (
                              <Select
                                value={pricing.selectedBandIndex.toString()}
                                onValueChange={(value) => updateTransportBand(potential, parseInt(value))}
                              >
                                <SelectTrigger className="h-7 text-xs w-full bg-terminal-dark border-terminal-border text-terminal-text font-mono">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-terminal-panel border-terminal-border">
                                  {potential.transportRoute?.availableBands?.map((band, index) => (
                                    <SelectItem key={index} value={index.toString()} className="font-mono text-terminal-text">
                                      {band.min_pallets}-{band.max_pallets} pallets: {formatCurrency(band.price_per_pallet)}/pallet
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-terminal-muted">No transport</span>
                        )}
                      </TableCell>

                      <TableCell className="font-mono text-terminal-text">
                        {potential.supplierPrice ? (
                          <div className="font-medium">
                            {formatCurrency(productCost)}
                            {potential.product.soldBy && (
                              <span className="text-xs text-terminal-muted">/{potential.product.soldBy}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-terminal-muted">No price</span>
                        )}
                      </TableCell>

                      <TableCell className="font-mono text-terminal-text">
                        {transportCost > 0 ? (
                          <div className="font-medium text-blue-400">
                            {formatCurrency(transportCost)}
                            {potential.product.soldBy && (
                              <span className="text-xs text-terminal-muted">/{potential.product.soldBy}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-terminal-success">Free</span>
                        )}
                      </TableCell>

                      <TableCell className="font-mono text-terminal-text">
                        <div className="font-semibold">
                          {formatCurrency(totalCost)}
                          {potential.product.soldBy && (
                            <span className="text-xs text-terminal-muted">/{potential.product.soldBy}</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="font-mono text-terminal-text">
                        {potential.status === 'complete' && !hasOpportunity ? (
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={pricing.marginPercent.toFixed(1)}
                            onChange={(e) => updateMargin(potential.id, totalCost, parseFloat(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            className="w-20 h-8 text-sm bg-terminal-dark border-terminal-border text-terminal-text font-mono"
                          />
                        ) : hasOpportunity && potential.opportunity?.offerPrice && totalCost > 0 ? (
                          <div className="text-sm font-medium">
                            {(((potential.opportunity.offerPrice - totalCost) / totalCost) * 100).toFixed(1)}%
                          </div>
                        ) : (
                          <span className="text-sm text-terminal-muted">-</span>
                        )}
                      </TableCell>

                      <TableCell className="font-mono text-terminal-text">
                        {potential.status === 'complete' && !hasOpportunity ? (
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={pricing.offerPrice.toFixed(2)}
                            onChange={(e) => updateOfferPrice(potential.id, totalCost, parseFloat(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            className="w-24 h-8 text-sm bg-terminal-dark border-terminal-border text-terminal-text font-mono"
                          />
                        ) : hasOpportunity && potential.opportunity?.offerPrice ? (
                          <div className="font-medium text-terminal-success">
                            {formatCurrency(potential.opportunity.offerPrice)}
                          </div>
                        ) : (
                          <span className="text-sm text-terminal-muted">-</span>
                        )}
                      </TableCell>

                      <TableCell className="font-mono text-terminal-text">
                        {potential.status === 'complete' ? (
                          hasOpportunity && potential.opportunity?.offerPrice ? (
                            <div className={cn(
                              "font-medium",
                              (potential.opportunity.offerPrice - totalCost) > 0 ? "text-terminal-success" : "text-red-400"
                            )}>
                              {formatCurrency(potential.opportunity.offerPrice - totalCost)}
                            </div>
                          ) : (
                            <div className={cn(
                              "font-medium",
                              profit > 0 ? "text-terminal-success" : "text-red-400"
                            )}>
                              {formatCurrency(profit)}
                            </div>
                          )
                        ) : (
                          <span className="text-sm text-terminal-muted">-</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {hasOpportunity ? (
                            <>
                              <Badge variant="secondary" className="text-xs font-mono bg-terminal-dark border-terminal-border text-terminal-text">
                                {potential.opportunity?.status}
                              </Badge>
                              <Button size="sm" asChild className="bg-blue-600 text-white hover:bg-blue-700 font-mono">
                                <Link href={`/trade/opportunities/${potential.opportunity?.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                            </>
                          ) : potential.status === 'complete' ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleQuickCreate(potential)}
                                disabled={createOpportunityMutation.isPending}
                                className="bg-terminal-success text-white hover:bg-green-600 font-mono"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Create
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleExcludePotential(potential)}
                                disabled={excludePotentialMutation.isPending}
                                className="bg-red-600 text-white hover:bg-red-700 font-mono"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleExcludePotential(potential)}
                              disabled={excludePotentialMutation.isPending}
                              className="bg-red-600 text-white hover:bg-red-700 font-mono"
                            >
                              <X className="h-4 w-4" />
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
