'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, MoreHorizontal, Eye, CheckCircle, AlertCircle, XCircle, MinusCircle } from 'lucide-react'
import { useTradePotential, useAddSupplierPrice } from '@/hooks/use-trade-potential'
import { useHubs } from '@/hooks/use-hubs'
import { useSupplierHubs } from '@/hooks/use-suppliers'
import React from 'react'
import { TradePotential, PotentialStatus, NewSupplierPrice } from '@/types/trade-potential'
// Simple currency formatter
const formatCurrency = (amount: number, currency: string = 'EUR') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
import { toast } from 'sonner'

export default function TradePotentialPage() {
  const [statusFilter, setStatusFilter] = useState<PotentialStatus>('all')
  const [selectedPotential, setSelectedPotential] = useState<TradePotential | null>(null)
  const [addPriceOpen, setAddPriceOpen] = useState(false)

  const { data, isLoading, error } = useTradePotential(statusFilter)
  const addPriceMutation = useAddSupplierPrice()

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

  const { potentials, summary } = data || { potentials: [], summary: { total: 0, complete: 0, missingPrice: 0, missingTransport: 0, missingBoth: 0, completionRate: 0 } }

  const statusConfig = {
    complete: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'Complete' },
    missing_price: { icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', label: 'Missing Price' },
    missing_transport: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Missing Transport' },
    missing_both: { icon: MinusCircle, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200', label: 'Missing Both' }
  }

  const handleAddPrice = async (priceData: NewSupplierPrice) => {
    try {
      await addPriceMutation.mutateAsync(priceData)
      toast.success('Price added successfully!')
      setAddPriceOpen(false)
      setSelectedPotential(null)
    } catch (error) {
      console.error('Failed to add price:', error)
      toast.error('Failed to add price')
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-6 page-transition">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trade Potential</h1>
        <p className="text-muted-foreground">
          All possible customer-supplier connections and missing links
        </p>
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

      {/* Status Filters */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('all')}
          size="sm"
        >
          All ({summary.total})
        </Button>
        <Button
          variant={statusFilter === 'complete' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('complete')}
          size="sm"
          className="text-green-600 border-green-200 hover:bg-green-50"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Complete ({summary.complete})
        </Button>
        <Button
          variant={statusFilter === 'missing_price' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('missing_price')}
          size="sm"
          className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          Missing Price ({summary.missingPrice})
        </Button>
        <Button
          variant={statusFilter === 'missing_transport' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('missing_transport')}
          size="sm"
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Missing Transport ({summary.missingTransport})
        </Button>
        <Button
          variant={statusFilter === 'missing_both' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('missing_both')}
          size="sm"
          className="text-gray-600 border-gray-200 hover:bg-gray-50"
        >
          <MinusCircle className="h-4 w-4 mr-2" />
          Missing Both ({summary.missingBoth})
        </Button>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <CardTitle>Trade Potential Connections</CardTitle>
          <CardDescription>
            Showing {potentials.length} potential connections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Transport</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {potentials.map((potential) => {
                const config = statusConfig[potential.status]
                const Icon = config.icon

                return (
                  <TableRow key={potential.id} className={config.bg}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{potential.customer.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {potential.customer.city}, {potential.customer.country}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Agent: {potential.customer.agent.name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{potential.product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {potential.product.packagingLabel} | {potential.product.sizeName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {potential.product.category}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{potential.supplier.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {potential.supplier.city}, {potential.supplier.country}
                        </div>
                        {potential.supplier.defaultHubName && (
                          <div className="text-xs text-muted-foreground">
                            Hub: {potential.supplier.defaultHubName}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${config.color} border-current`}>
                        <Icon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {potential.hasSupplierPrice ? (
                        <div>
                          <div className="font-medium text-green-600">
                            {formatCurrency(potential.supplierPrice!.pricePerUnit)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {potential.supplierPrice!.deliveryMode}
                          </div>
                        </div>
                      ) : potential.logisticsSolution === 'SAME_LOCATION' ? (
                        <div className="text-green-600 font-medium text-sm">
                          Same Location - No Pricing Needed
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPotential(potential)
                            setAddPriceOpen(true)
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Price
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      {potential.hasTransportRoute ? (
                        <div className="text-green-600 font-medium">Available</div>
                      ) : (
                        <Button size="sm" variant="outline">
                          <Plus className="h-3 w-3 mr-1" />
                          Add Route
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {potential.status === 'complete' && (
                            <DropdownMenuItem>
                              Create Opportunity
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Price Modal */}
      <AddPriceModal
        open={addPriceOpen}
        onOpenChange={setAddPriceOpen}
        potential={selectedPotential}
        onSubmit={handleAddPrice}
        isLoading={addPriceMutation.isPending}
      />
    </div>
  )
}

function AddPriceModal({
  open,
  onOpenChange,
  potential,
  onSubmit,
  isLoading
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  potential: TradePotential | null
  onSubmit: (data: NewSupplierPrice) => Promise<void>
  isLoading: boolean
}) {
  const { data: hubs } = useHubs()
  const { data: supplierHubs = [] } = useSupplierHubs(potential?.supplier.id || '')
  const [selectedDeliveryMode, setSelectedDeliveryMode] = useState('')
  const [formData, setFormData] = useState({
    price_per_unit: '',
    currency: 'EUR',
    delivery_mode: '',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    hub_id: '',
    min_order_quantity: '',
    notes: ''
  })

  // Get available delivery modes for this supplier
  const availableDeliveryModes = React.useMemo(() => {
    if (!supplierHubs.length) return []
    const allModes = [...new Set(supplierHubs.flatMap(hub => hub.delivery_modes))]
    return allModes
  }, [supplierHubs])

  // Get available hubs for selected delivery mode
  const availableHubs = React.useMemo(() => {
    if (!selectedDeliveryMode || !supplierHubs.length) return []

    if (selectedDeliveryMode === 'Ex Works') {
      return supplierHubs.filter(hub => hub.delivery_modes.includes('Ex Works'))
    } else if (selectedDeliveryMode === 'DELIVERY') {
      return supplierHubs.filter(hub => hub.delivery_modes.includes('DELIVERY'))
    } else {
      return supplierHubs.filter(hub => hub.delivery_modes.includes(selectedDeliveryMode))
    }
  }, [selectedDeliveryMode, supplierHubs])

  // Auto-select hub if only one available
  React.useEffect(() => {
    if (availableHubs.length === 1 && formData.hub_id !== availableHubs[0].id) {
      setFormData(prev => ({ ...prev, hub_id: availableHubs[0].id }))
    } else if (availableHubs.length === 0 && formData.hub_id !== '') {
      setFormData(prev => ({ ...prev, hub_id: '' }))
    }
  }, [availableHubs, formData.hub_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!potential) return

    if (!formData.price_per_unit || !formData.valid_until || !selectedDeliveryMode || !formData.hub_id) {
      toast.error('Please fill in all required fields')
      return
    }

    const priceData: NewSupplierPrice = {
      supplier_id: potential.supplier.id,
      product_packaging_spec_id: potential.product.specId,
      hub_id: formData.hub_id,
      price_per_unit: parseFloat(formData.price_per_unit),
      currency: formData.currency,
      delivery_mode: selectedDeliveryMode as any,
      valid_until: new Date(formData.valid_until).toISOString(),
      min_order_quantity: formData.min_order_quantity ? parseInt(formData.min_order_quantity) : undefined,
      is_active: true
    }

    await onSubmit(priceData)

    // Reset form
    setFormData({
      price_per_unit: '',
      currency: 'EUR',
      delivery_mode: '',
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: '',
      hub_id: '',
      min_order_quantity: '',
      notes: ''
    })
    setSelectedDeliveryMode('')
  }

  if (!potential) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Supplier Price</DialogTitle>
          <DialogDescription>
            Add pricing for {potential.supplier.name} - {potential.product.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Price per {potential.product.soldBy} *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price_per_unit}
                onChange={(e) => setFormData(prev => ({ ...prev, price_per_unit: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="delivery_mode">Delivery Mode *</Label>
            <Select value={selectedDeliveryMode} onValueChange={(value) => {
              setSelectedDeliveryMode(value)
              setFormData(prev => ({ ...prev, delivery_mode: value, hub_id: '' }))
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select delivery mode" />
              </SelectTrigger>
              <SelectContent>
                {availableDeliveryModes.map(mode => (
                  <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedDeliveryMode && (
            <div>
              <Label htmlFor="hub">Hub Location *</Label>
              <Select value={formData.hub_id} onValueChange={(value) => setFormData(prev => ({ ...prev, hub_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select hub location" />
                </SelectTrigger>
                <SelectContent>
                  {availableHubs.map(hub => (
                    <SelectItem key={hub.id} value={hub.id}>
                      {hub.hub_name} ({hub.hub_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="valid_from">Valid From</Label>
              <Input
                id="valid_from"
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="valid_until">Valid Until *</Label>
              <Input
                id="valid_until"
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="min_order">Minimum Order Quantity (optional)</Label>
            <Input
              id="min_order"
              type="number"
              value={formData.min_order_quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, min_order_quantity: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              placeholder="Optional notes about this price..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Price
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}