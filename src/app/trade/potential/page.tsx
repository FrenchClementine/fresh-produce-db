'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'
import { Loader2, Plus, Eye, CheckCircle, AlertCircle, XCircle, MinusCircle, Target, ExternalLink, Check, ChevronsUpDown, Ban, RefreshCw } from 'lucide-react'
import { useTradePotential } from '@/hooks/use-trade-potential'
import { useExcludePotential, extractExclusionData } from '@/hooks/use-excluded-potentials'
import { useHubs } from '@/hooks/use-hubs'
import { useSupplierHubs, useSuppliers } from '@/hooks/use-suppliers'
import { useCustomers } from '@/hooks/use-customers'
import { useActiveStaff } from '@/hooks/use-staff'
import React from 'react'
import { TradePotential, PotentialStatus } from '@/types/trade-potential'
import { CreateOpportunityModal } from '@/components/forms/create-opportunity-form'
import { BuildOpportunityModal } from '@/components/forms/build-opportunity-modal'
import { toast } from 'sonner'
import Link from 'next/link'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

// Simple currency formatter
const formatCurrency = (amount: number, currency: string = 'EUR') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount)
}

export default function TradePotentialPage() {
  const [statusFilter, setStatusFilter] = useState<PotentialStatus>('all')
  const [selectedPotential, setSelectedPotential] = useState<TradePotential | null>(null)
  const [buildOpportunityOpen, setBuildOpportunityOpen] = useState(false)
  const [createOpportunityOpen, setCreateOpportunityOpen] = useState(false)
  const [showOpportunityFilter, setShowOpportunityFilter] = useState(false)
  const [customerFilter, setCustomerFilter] = useState<string>('all')
  const [supplierFilter, setSupplierFilter] = useState<string>('all')
  const [agentFilter, setAgentFilter] = useState<string>('all')
  const [customerOpen, setCustomerOpen] = useState(false)
  const [supplierOpen, setSupplierOpen] = useState(false)
  const [agentOpen, setAgentOpen] = useState(false)

  const { data, isLoading, error } = useTradePotential(statusFilter)
  const { customers } = useCustomers()
  const { data: suppliers } = useSuppliers()
  const { activeStaff } = useActiveStaff()
  const excludePotentialMutation = useExcludePotential()

  // Helper functions to get display labels
  const getCustomerLabel = (id: string) => {
    if (id === 'all') return 'All Customers'
    return customers?.find(c => c.id === id)?.name || 'Select customer...'
  }

  const getSupplierLabel = (id: string) => {
    if (id === 'all') return 'All Suppliers'
    return suppliers?.find(s => s.id === id)?.name || 'Select supplier...'
  }

  const getAgentLabel = (id: string) => {
    if (id === 'all') return 'All Agents'
    return activeStaff?.find(s => s.id === id)?.name || 'Select agent...'
  }

  // Helper function to get price comparison data
  const getAlternativeSuppliers = (currentPotential: TradePotential, allPotentials: TradePotential[]) => {
    // Find other potentials for the same customer and product
    const alternatives = allPotentials.filter(potential =>
      potential.customer.id === currentPotential.customer.id &&
      potential.product.specId === currentPotential.product.specId &&
      potential.supplier.id !== currentPotential.supplier.id &&
      potential.supplierPrice && // Must have a price to compare
      potential.status === 'complete' // Must be complete to be a viable alternative
    )

    // Find if there's an active opportunity for this customer-product combination
    const activeOpportunity = allPotentials.find(potential =>
      potential.customer.id === currentPotential.customer.id &&
      potential.product.specId === currentPotential.product.specId &&
      potential.hasOpportunity &&
      potential.opportunity?.isActive
    )

    return {
      alternatives: alternatives.sort((a, b) =>
        (a.supplierPrice?.pricePerUnit || 0) - (b.supplierPrice?.pricePerUnit || 0)
      ),
      activeOpportunity
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading trade potential...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Failed to load trade potential data</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { potentials, summary } = data || {
    potentials: [],
    summary: {
      total: 0,
      complete: 0,
      missingPrice: 0,
      missingTransport: 0,
      missingBoth: 0,
      completionRate: 0
    }
  }

  // Filter potentials based on all filters
  const filteredPotentials = potentials.filter(potential => {
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

  const handleBuildOpportunity = (potential: TradePotential) => {
    setSelectedPotential(potential)
    setBuildOpportunityOpen(true)
  }

  const handleCreateOpportunity = (potential: TradePotential) => {
    setSelectedPotential(potential)
    setCreateOpportunityOpen(true)
  }

  const handleExcludePotential = (potential: TradePotential) => {
    const exclusionData = extractExclusionData(potential, 'business_decision', 'Marked as non-viable from potential list')
    excludePotentialMutation.mutate(exclusionData)
  }

  const handleSwitchSupplier = (currentOpportunity: TradePotential, newSupplier: TradePotential) => {
    // TODO: Implement switch supplier logic
    // This would involve updating the opportunity to use the new supplier's pricing and logistics
    console.log('Switch supplier from', currentOpportunity.supplier.name, 'to', newSupplier.supplier.name)
    toast.success(`Switched to ${newSupplier.supplier.name} (${formatCurrency(Math.abs((newSupplier.supplierPrice?.pricePerUnit || 0) - (currentOpportunity.supplierPrice?.pricePerUnit || 0)))} saved)`)
  }

  const getOpportunityStatusBadge = (potential: TradePotential) => {
    if (!potential.opportunity) return null

    const isExpired = potential.opportunity.validTill && new Date(potential.opportunity.validTill) < new Date()
    const statusColors = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-blue-100 text-blue-800',
      negotiating: 'bg-yellow-100 text-yellow-800',
      offered: 'bg-purple-100 text-purple-800',
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-green-100 text-green-800',
    }

    return (
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-blue-600" />
        <Badge className={statusColors[potential.opportunity.status]}>
          {potential.opportunity.status}
        </Badge>
        {!potential.opportunity.isActive && (
          <Badge variant="secondary" className="text-xs">
            Inactive
          </Badge>
        )}
        {isExpired && (
          <Badge variant="destructive" className="text-xs">
            Expired
          </Badge>
        )}
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6 page-transition">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trade Potential</h1>
          <p className="text-muted-foreground">
            All possible customer-supplier connections and their opportunity status
          </p>
        </div>
        <Button asChild>
          <Link href="/trade/trader">
            <ExternalLink className="mr-2 h-4 w-4" />
            View Opportunities
          </Link>
        </Button>
      </div>

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
                All possible customer-supplier-product combinations
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
                  <TableHead>Opportunity</TableHead>
                  <TableHead>Pricing</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPotentials.map((potential) => {
                  const StatusIcon = statusConfig[potential.status]?.icon || MinusCircle
                  const statusColor = statusConfig[potential.status]?.color || 'text-gray-600'

                  return (
                    <TableRow key={potential.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{potential.customer.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {potential.customer.city}, {potential.customer.country}
                          </div>
                          {potential.customer.agent && (
                            <Badge variant="outline" className="text-xs">
                              Agent: {potential.customer.agent.name}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{potential.supplier.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {potential.supplier.city}, {potential.supplier.country}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{potential.product.name}</div>
                          <div className="flex gap-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">{potential.product.category}</Badge>
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
                        {potential.hasOpportunity ? (
                          <div className="space-y-2">
                            {getOpportunityStatusBadge(potential)}
                            {potential.opportunity?.assignedAgentName && (
                              <div className="text-xs text-muted-foreground">
                                Assigned: {potential.opportunity.assignedAgentName}
                              </div>
                            )}
                            {potential.opportunity?.validTill && (
                              <div className="text-xs text-muted-foreground">
                                Valid until: {format(new Date(potential.opportunity.validTill), 'MMM dd, yyyy')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No opportunity</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          {potential.supplierPrice ? (
                            <div className="text-sm">
                              <span className="font-medium">Cost: </span>
                              {formatCurrency(potential.supplierPrice.pricePerUnit)}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">Cost: </span>
                              No price set
                            </div>
                          )}
                          {potential.opportunity?.offerPrice && potential.opportunity.isActive && (
                            <div className="text-sm">
                              <span className="font-medium text-green-600">Offer: </span>
                              {formatCurrency(potential.opportunity.offerPrice, potential.opportunity.offerCurrency)}
                            </div>
                          )}
                          {(() => {
                            const { alternatives, activeOpportunity } = getAlternativeSuppliers(potential, potentials)

                            // Show alternative pricing if there's an active opportunity and this is an alternative supplier
                            if (activeOpportunity && !potential.hasOpportunity && potential.supplierPrice && activeOpportunity.supplierPrice) {
                              const priceDiff = potential.supplierPrice.pricePerUnit - activeOpportunity.supplierPrice.pricePerUnit
                              const isLowerPrice = priceDiff < 0
                              return (
                                <div className="text-xs">
                                  <span className="text-muted-foreground">vs Active: </span>
                                  <span className={isLowerPrice ? 'text-green-600 font-medium' : 'text-red-600'}>
                                    {isLowerPrice ? '-' : '+'}{formatCurrency(Math.abs(priceDiff))}
                                  </span>
                                  {isLowerPrice && <span className="text-green-600 ml-1">cheaper</span>}
                                </div>
                              )
                            }

                            // Show if there are cheaper alternatives when this one has the active opportunity
                            if (potential.hasOpportunity && potential.opportunity?.isActive && alternatives.length > 0) {
                              const cheapestAlternative = alternatives[0]
                              if (cheapestAlternative.supplierPrice && potential.supplierPrice) {
                                const priceDiff = cheapestAlternative.supplierPrice.pricePerUnit - potential.supplierPrice.pricePerUnit
                                if (priceDiff < 0) {
                                  return (
                                    <div className="text-xs text-orange-600">
                                      <span className="font-medium">Alternative: </span>
                                      {formatCurrency(Math.abs(priceDiff))} cheaper available
                                    </div>
                                  )
                                }
                              }
                            }

                            return null
                          })()}
                          {potential.transportRoute && (
                            <div className="space-y-1">
                              <div className="text-xs">
                                <span className="font-medium">Transport: </span>
                                <span className={potential.transportRoute.transporterName === 'Same Location' ? 'text-green-600' : 'text-blue-600'}>
                                  {potential.transportRoute.transporterName}
                                </span>
                                {potential.transportRoute.pricePerPallet > 0 && (
                                  <span className="text-muted-foreground">
                                    {' '}({formatCurrency(potential.transportRoute.pricePerPallet)}/pallet)
                                  </span>
                                )}
                              </div>
                              {potential.transportRoute.transporterName !== 'Same Location' && (
                                <div className="text-xs text-muted-foreground">
                                  {potential.transportRoute.durationDays} days
                                </div>
                              )}
                            </div>
                          )}
                          {!potential.transportRoute && potential.hasTransportRoute && (
                            <div className="text-xs text-orange-600">
                              <span className="font-medium">Transport: </span>
                              Available (needs configuration)
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {potential.hasOpportunity ? (
                            <>
                              <Button size="sm" variant="outline" asChild>
                                <Link href={`/trade/opportunities/${potential.opportunity?.id}`}>
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Link>
                              </Button>
                              {(() => {
                                const { alternatives } = getAlternativeSuppliers(potential, potentials)
                                const cheapestAlternative = alternatives[0]

                                // Show switch supplier button if this opportunity has cheaper alternatives
                                if (potential.opportunity?.isActive && cheapestAlternative &&
                                    cheapestAlternative.supplierPrice && potential.supplierPrice &&
                                    cheapestAlternative.supplierPrice.pricePerUnit < potential.supplierPrice.pricePerUnit) {
                                  return (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSwitchSupplier(potential, cheapestAlternative)}
                                    >
                                      <RefreshCw className="h-4 w-4 mr-1" />
                                      Switch Supplier
                                    </Button>
                                  )
                                }
                                return null
                              })()}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleExcludePotential(potential)}
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                Mark as Non-viable
                              </Button>
                            </>
                          ) : potential.status === 'complete' ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleCreateOpportunity(potential)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Create Opportunity
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleExcludePotential(potential)}
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                Mark as Non-viable
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleBuildOpportunity(potential)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Build Opportunity
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleExcludePotential(potential)}
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                Mark as Non-viable
                              </Button>
                            </>
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

      {/* Create Opportunity Modal */}
      <CreateOpportunityModal
        open={createOpportunityOpen}
        onOpenChange={setCreateOpportunityOpen}
        potential={selectedPotential}
      />

      {/* Build Opportunity Modal */}
      <BuildOpportunityModal
        open={buildOpportunityOpen}
        onClose={() => setBuildOpportunityOpen(false)}
        potential={selectedPotential}
      />
    </div>
  )
}