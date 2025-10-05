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
import { CheckCircle, AlertCircle, XCircle, MinusCircle, Check, X, Eye } from 'lucide-react'
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
    complete: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'Complete' },
    missing_price: { icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', label: 'Missing Price' },
    missing_transport: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Missing Transport' },
    missing_both: { icon: MinusCircle, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200', label: 'Missing Both' }
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Potential</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Complete</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.complete}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missing Price</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{summary.missingPrice}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missing Transport</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.missingTransport}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missing Both</CardTitle>
            <MinusCircle className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{summary.missingBoth}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.completionRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <Label htmlFor="status-filter">Status Filter</Label>
            <Select value={statusFilter} onValueChange={(value: PotentialStatus) => setStatusFilter(value)}>
              <SelectTrigger id="status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="complete">Complete Only</SelectItem>
                <SelectItem value="missing_price">Missing Price</SelectItem>
                <SelectItem value="missing_transport">Missing Transport</SelectItem>
                <SelectItem value="missing_both">Missing Both</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="customer-filter">Customer</Label>
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger id="customer-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customers?.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="supplier-filter">Supplier</Label>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger id="supplier-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers?.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="agent-filter">Agent</Label>
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger id="agent-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {activeStaff?.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
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
              onCheckedChange={setShowOpportunityFilter}
            />
            <Label htmlFor="opportunity-filter" className="text-sm">Hide converted</Label>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Trade Potential ({filteredPotentials.length} results)</CardTitle>
              <CardDescription>
                Customer → Supplier product matches with quick opportunity creation
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Transport</TableHead>
                  <TableHead>Product Cost</TableHead>
                  <TableHead>Transport Cost</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Margin %</TableHead>
                  <TableHead>Offer Price</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead className="text-right">Quick Actions</TableHead>
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

                  return (
                    <TableRow key={potential.id} className={hasOpportunity ? 'bg-blue-50' : ''}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{potential.customer.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {potential.customer.city}, {potential.customer.country}
                          </div>
                          {potential.customer.agent && (
                            <Badge variant="outline" className="text-xs">
                              {potential.customer.agent.name}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{potential.supplier.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {potential.supplier.city}, {potential.supplier.country}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{potential.product.name}</div>
                          <div className="flex gap-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">{potential.product.packagingLabel}</Badge>
                            <Badge variant="outline" className="text-xs">{potential.product.sizeName}</Badge>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <StatusIcon className={`h-4 w-4 ${statusColor}`} />
                          <span className="text-sm">{statusConfig[potential.status]?.label}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        {potential.transportRoute ? (
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-blue-600">
                              {potential.transportRoute.transporterName}
                            </div>
                            {potential.transportRoute.durationDays > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {potential.transportRoute.durationDays} days
                              </div>
                            )}
                            {hasBands && potential.status === 'complete' && !hasOpportunity && (
                              <Select
                                value={pricing.selectedBandIndex.toString()}
                                onValueChange={(value) => updateTransportBand(potential, parseInt(value))}
                              >
                                <SelectTrigger className="h-7 text-xs w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {potential.transportRoute.availableBands.map((band, index) => (
                                    <SelectItem key={index} value={index.toString()}>
                                      {band.min_pallets}-{band.max_pallets} pallets: {formatCurrency(band.price_per_pallet)}/pallet
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No transport</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {potential.supplierPrice ? (
                          <div className="font-medium">
                            {formatCurrency(productCost)}
                            {potential.product.soldBy && (
                              <span className="text-xs text-muted-foreground">/{potential.product.soldBy}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No price</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {transportCost > 0 ? (
                          <div className="font-medium text-blue-600">
                            {formatCurrency(transportCost)}
                            {potential.product.soldBy && (
                              <span className="text-xs text-muted-foreground">/{potential.product.soldBy}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-green-600">Free</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="font-semibold">
                          {formatCurrency(totalCost)}
                          {potential.product.soldBy && (
                            <span className="text-xs text-muted-foreground">/{potential.product.soldBy}</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        {potential.status === 'complete' && !hasOpportunity ? (
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={pricing.marginPercent.toFixed(1)}
                            onChange={(e) => updateMargin(potential.id, totalCost, parseFloat(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            className="w-20 h-8 text-sm"
                          />
                        ) : hasOpportunity && potential.opportunity?.offerPrice && totalCost > 0 ? (
                          <div className="text-sm font-medium">
                            {(((potential.opportunity.offerPrice - totalCost) / totalCost) * 100).toFixed(1)}%
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {potential.status === 'complete' && !hasOpportunity ? (
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={pricing.offerPrice.toFixed(2)}
                            onChange={(e) => updateOfferPrice(potential.id, totalCost, parseFloat(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            className="w-24 h-8 text-sm"
                          />
                        ) : hasOpportunity && potential.opportunity?.offerPrice ? (
                          <div className="font-medium text-green-600">
                            {formatCurrency(potential.opportunity.offerPrice)}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {potential.status === 'complete' ? (
                          hasOpportunity && potential.opportunity?.offerPrice ? (
                            <div className={cn(
                              "font-medium",
                              (potential.opportunity.offerPrice - totalCost) > 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {formatCurrency(potential.opportunity.offerPrice - totalCost)}
                            </div>
                          ) : (
                            <div className={cn(
                              "font-medium",
                              profit > 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {formatCurrency(profit)}
                            </div>
                          )
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {hasOpportunity ? (
                            <>
                              <Badge variant="secondary" className="text-xs">
                                {potential.opportunity?.status}
                              </Badge>
                              <Button size="sm" variant="outline" asChild>
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
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Create
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleExcludePotential(potential)}
                                disabled={excludePotentialMutation.isPending}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleExcludePotential(potential)}
                              disabled={excludePotentialMutation.isPending}
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
