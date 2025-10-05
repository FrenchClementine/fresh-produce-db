'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  TrendingUp,
  Building2,
  MapPin,
  Package,
  Euro,
  Clock,
  Plus,
  Edit,
  Eye,
  Calendar,
  Copy,
  History,
  Truck
} from 'lucide-react'
import { toast } from 'sonner'
import { useSuppliers, useSupplierProducts, useSupplierHubs } from '@/hooks/use-suppliers'
import { useCurrentSupplierPrices, useCreateSupplierPrice, useQuickUpdatePrice } from '@/hooks/use-supplier-prices'
import { useCurrentStaffMember } from '@/hooks/use-staff'
import { supabase } from '@/lib/supabase'

export default function InputPricesPage() {
  // Helper function to get expiry status
  const getExpiryStatus = (validUntil: string) => {
    const now = new Date()
    const expiryDate = new Date(validUntil)
    const timeDiff = expiryDate.getTime() - now.getTime()
    const hoursDiff = timeDiff / (1000 * 3600)

    if (hoursDiff < 0) return 'expired'
    if (hoursDiff <= 24) return 'expiring-soon'
    return 'valid'
  }

  // Helper function to get status styles
  const getExpiryStyles = (status: string) => {
    switch (status) {
      case 'expired':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'expiring-soon':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      default:
        return ''
    }
  }

  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('')
  const [selectedDeliveryMode, setSelectedDeliveryMode] = useState('')
  const [selectedHub, setSelectedHub] = useState('')
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false)
  const [previousPriceId, setPreviousPriceId] = useState<string | null>(null)
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null)
  const [inlineEditData, setInlineEditData] = useState<{ price: string; validUntil: string }>({
    price: '',
    validUntil: ''
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('')
  const [priceData, setPriceData] = useState({
    price: '',
    deliveryMode: '',
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: '',
    notes: ''
  })

  // Fetch real data
  const { data: suppliers = [] } = useSuppliers()
  const { data: supplierHubs = [] } = useSupplierHubs(selectedSupplier)
  const { data: currentStaff } = useCurrentStaffMember()

  // Get available delivery modes for selected product
  const availableDeliveryModes = React.useMemo(() => {
    if (!selectedProduct || !supplierHubs.length) return []

    const allModes = [...new Set(supplierHubs.flatMap(hub => hub.delivery_modes))]
    return allModes
  }, [selectedProduct, supplierHubs])

  // Get available hubs for selected delivery mode
  const availableHubs = React.useMemo(() => {
    if (!selectedDeliveryMode || !supplierHubs.length) return []

    if (selectedDeliveryMode === 'Ex Works') {
      // For Ex Works, only show hubs where supplier can offer Ex Works
      return supplierHubs.filter(hub => hub.delivery_modes.includes('Ex Works'))
    } else if (selectedDeliveryMode === 'DELIVERY') {
      // For Delivery, show destination hubs from logistics capabilities
      return supplierHubs.filter(hub => hub.delivery_modes.includes('DELIVERY'))
    } else {
      return supplierHubs.filter(hub => hub.delivery_modes.includes(selectedDeliveryMode))
    }
  }, [selectedDeliveryMode, supplierHubs])

  // Auto-select hub if only one available
  React.useEffect(() => {
    if (availableHubs.length === 1) {
      setSelectedHub(availableHubs[0].id)
    } else if (availableHubs.length === 0) {
      setSelectedHub('')
    }
  }, [availableHubs])
  const { data: supplierProducts = [], isLoading: productsLoading, error: productsError } = useSupplierProducts(selectedSupplier)
  const { data: allCurrentPrices = [] } = useCurrentSupplierPrices() // Get all prices, not just for selected supplier
  const createPriceMutation = useCreateSupplierPrice()
  const quickUpdateMutation = useQuickUpdatePrice()

  // Filter prices based on search query and supplier filter
  const filteredPrices = React.useMemo(() => {
    return allCurrentPrices.filter(price => {
      const matchesSearch = !searchQuery ||
        price.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        price.packaging_label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        price.size_name.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesSupplier = !selectedSupplierFilter || selectedSupplierFilter === 'all' ||
        price.supplier_id === selectedSupplierFilter

      return matchesSearch && matchesSupplier
    })
  }, [allCurrentPrices, searchQuery, selectedSupplierFilter])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSupplier || !selectedProduct || !selectedDeliveryMode || !priceData.price || !priceData.validUntil) {
      toast.error('Please fill in all required fields')
      return
    }

    // For delivery mode, we need a hub selection (auto-selected if only one)
    if (selectedDeliveryMode === 'Delivery' && !selectedHub) {
      toast.error('Please select a hub for delivery mode')
      return
    }

    // Get the hub ID based on delivery mode
    let hubId = selectedHub
    if (!hubId) {
      if (selectedDeliveryMode === 'Ex Works') {
        const exWorksHubs = availableHubs.filter(h => h.delivery_modes.includes('Ex Works'))
        if (exWorksHubs.length > 0) {
          hubId = exWorksHubs[0].id
        } else {
          toast.error('No Ex Works hub available for this supplier')
          return
        }
      } else if (selectedDeliveryMode === 'DELIVERY') {
        toast.error('Please select a destination hub for delivery')
        return
      }
    }

    try {
      if (isUpdatingPrice && previousPriceId) {
        // Quick update existing price
        await quickUpdateMutation.mutateAsync({
          priceId: previousPriceId,
          newPrice: parseFloat(priceData.price),
          validUntil: new Date(priceData.validUntil).toISOString(),
          notes: priceData.notes,
          currentUserId: currentStaff?.id || null
        })
        toast.success('Price updated successfully! Previous price archived.')
      } else {
        // Create new price entry
        await createPriceMutation.mutateAsync({
          supplier_id: selectedSupplier,
          supplier_product_packaging_spec_id: selectedProduct,
          hub_id: hubId || availableHubs[0]?.id,
          price_per_unit: parseFloat(priceData.price),
          currency: 'EUR',
          delivery_mode: selectedDeliveryMode as any,
          valid_from: new Date(priceData.validFrom).toISOString(),
          valid_until: new Date(priceData.validUntil).toISOString(),
          is_active: true,
          created_by_staff_id: currentStaff?.id || null,
          notes: priceData.notes
        })
        toast.success('New price saved successfully!')
      }

      // Reset form
      setPriceData({
        price: '',
        deliveryMode: '',
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: '',
        notes: ''
      })
      setSelectedProduct('')
      setSelectedDeliveryMode('')
      setSelectedHub('')
      setIsUpdatingPrice(false)
      setPreviousPriceId(null)
    } catch (error) {
      toast.error('Failed to save price')
    }
  }

  const handleQuickUpdate = (price: any) => {
    // Pre-fill form with existing data
    setSelectedProduct(price.supplier_product_packaging_spec_id)
    setSelectedDeliveryMode(price.delivery_mode.toLowerCase().replace(' ', '_'))
    setPriceData({
      price: price.price_per_unit.toString(),
      deliveryMode: price.delivery_mode,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: '',
      notes: 'Price update'
    })
    setIsUpdatingPrice(true)
    setPreviousPriceId(price.id)
    toast.info('Form pre-filled. Update price and validity period.')
  }

  const handleInlineEdit = (price: any) => {
    setEditingPriceId(price.id)
    setInlineEditData({
      price: price.price_per_unit.toString(),
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Default 24 hours
    })
  }

  const handleInlineSave = async (price: any) => {
    if (!inlineEditData.price || !inlineEditData.validUntil) {
      toast.error('Please fill in price and validity date')
      return
    }

    try {
      await quickUpdateMutation.mutateAsync({
        priceId: price.id,
        newPrice: parseFloat(inlineEditData.price),
        validUntil: new Date(inlineEditData.validUntil).toISOString(),
        notes: 'Quick inline update',
        currentUserId: currentStaff?.id || null
      })
      toast.success(`Price updated: €${inlineEditData.price} until ${inlineEditData.validUntil}`)
      setEditingPriceId(null)
      setInlineEditData({ price: '', validUntil: '' })
    } catch (error) {
      toast.error('Failed to update price')
    }
  }

  const handleInlineCancel = () => {
    setEditingPriceId(null)
    setInlineEditData({ price: '', validUntil: '' })
  }

  const handleCancelUpdate = () => {
    setIsUpdatingPrice(false)
    setPreviousPriceId(null)
    setPriceData({
      price: '',
      deliveryMode: '',
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: '',
      notes: ''
    })
    setSelectedProduct('')
  }

  const setValidityPeriod = (hours: number) => {
    const now = new Date()
    const future = new Date(now.getTime() + hours * 60 * 60 * 1000)
    setPriceData(prev => ({ ...prev, validUntil: future.toISOString().split('T')[0] }))
  }

  return (
    <div className="space-y-6 page-transition">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Input Prices</h1>
        <p className="text-muted-foreground">
          Enter supplier pricing with delivery modes and validity periods
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Enter New Price
            </CardTitle>
            <CardDescription>
              Select supplier, hub, and product to enter pricing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Update Mode Indicator */}
              {isUpdatingPrice && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Copy className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Updating existing price</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelUpdate}
                  >
                    Cancel Update
                  </Button>
                </div>
              )}

              {/* Supplier Selection */}
              <div className="space-y-2">
                <Label>Supplier *</Label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier} disabled={isUpdatingPrice}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {supplier.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Product Selection */}
              {selectedSupplier && (
                <div className="space-y-2">
                  <Label>Product *</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct} disabled={isUpdatingPrice || productsLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder={productsLoading ? "Loading products..." : "Select product"} />
                    </SelectTrigger>
                    <SelectContent>
                      {productsLoading ? (
                        <SelectItem value="_loading" disabled>
                          Loading products...
                        </SelectItem>
                      ) : productsError ? (
                        <SelectItem value="_error" disabled>
                          Error loading products
                        </SelectItem>
                      ) : supplierProducts.length === 0 ? (
                        <SelectItem value="_empty" disabled>
                          No products found for this supplier
                        </SelectItem>
                      ) : (
                        supplierProducts.map(product => {
                          const spec = Array.isArray(product.product_packaging_specs) ? product.product_packaging_specs[0] : product.product_packaging_specs
                          const productData = Array.isArray((spec as any)?.products) ? (spec as any).products[0] : (spec as any)?.products
                          const packageData = Array.isArray((spec as any)?.packaging_options) ? (spec as any).packaging_options[0] : (spec as any)?.packaging_options
                          const sizeData = Array.isArray((spec as any)?.size_options) ? (spec as any).size_options[0] : (spec as any)?.size_options

                          const productName = productData?.name || 'Unknown Product'
                          const packageLabel = packageData?.label || 'Unknown Package'
                          const sizeName = sizeData?.name || 'Unknown Size'

                          return (
                            <SelectItem key={product.id} value={product.id}>
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                <span>{productName} - {packageLabel} - {sizeName}</span>
                              </div>
                            </SelectItem>
                          )
                        })
                      )}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => toast.info('Add new product capability coming soon')}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Product to Supplier
                  </Button>
                </div>
              )}

              {/* Delivery Mode Selection */}
              {selectedProduct && availableDeliveryModes.length > 0 && (
                <div className="space-y-2">
                  <Label>Delivery Mode *</Label>
                  <Select value={selectedDeliveryMode} onValueChange={setSelectedDeliveryMode} disabled={isUpdatingPrice}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select delivery mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDeliveryModes.map(mode => (
                        <SelectItem key={mode} value={mode}>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {mode}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Hub Selection */}
              {selectedDeliveryMode && availableHubs.length > 1 && (
                <div className="space-y-2">
                  <Label>{selectedDeliveryMode === 'Ex Works' ? 'Origin Location' : 'Destination Location'} *</Label>
                  <Select value={selectedHub} onValueChange={setSelectedHub} disabled={isUpdatingPrice}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableHubs.map(hub => (
                        <SelectItem key={hub.id} value={hub.id}>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {hub.name} ({hub.hub_code})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Auto-selected hub indicator */}
              {selectedDeliveryMode && availableHubs.length === 1 && (
                <div className="space-y-2">
                  <Label>{selectedDeliveryMode === 'Ex Works' ? 'Origin Location' : 'Destination Location'}</Label>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center gap-2 text-green-700">
                      <MapPin className="h-4 w-4" />
                      <span className="font-medium">{availableHubs[0].name} ({availableHubs[0].hub_code})</span>
                      <Badge variant="secondary" className="ml-2">Auto-selected</Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Price Details */}
              {selectedProduct && selectedDeliveryMode && (selectedHub || availableHubs.length === 1) && (
                <>
                  <Separator />

                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Price per {(supplierProducts.find(p => p.id === selectedProduct)?.product_packaging_specs as any)?.[0]?.products?.sold_by || 'Unit'} *</Label>
                        <div className="relative">
                          <Euro className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="2.50"
                            className="pl-10"
                            value={priceData.price}
                            onChange={(e) => setPriceData(prev => ({ ...prev, price: e.target.value }))}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Delivery Mode *</Label>
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <div className="flex items-center gap-2 text-blue-700">
                            <Truck className="h-4 w-4" />
                            <span className="font-medium">{selectedDeliveryMode}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Valid From</Label>
                        <Input
                          type="date"
                          value={priceData.validFrom}
                          onChange={(e) => setPriceData(prev => ({ ...prev, validFrom: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Valid Until *</Label>
                        <Input
                          type="date"
                          value={priceData.validUntil}
                          onChange={(e) => setPriceData(prev => ({ ...prev, validUntil: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    {/* Quick Validity Buttons */}
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setValidityPeriod(24)}
                      >
                        <Clock className="mr-1 h-3 w-3" />
                        24 Hours
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setValidityPeriod(72)}
                      >
                        <Clock className="mr-1 h-3 w-3" />
                        3 Days
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setValidityPeriod(168)}
                      >
                        <Clock className="mr-1 h-3 w-3" />
                        1 Week
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <textarea
                        className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder="Optional notes about this price..."
                        value={priceData.notes}
                        onChange={(e) => setPriceData(prev => ({ ...prev, notes: e.target.value }))}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    {isUpdatingPrice ? 'Update Price' : 'Save New Price'}
                  </Button>
                </>
              )}
            </form>
          </CardContent>
        </Card>

        {/* All Current Prices with Search */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-green-600" />
                  All Current Prices
                </CardTitle>
                <CardDescription>
                  Search and view all active prices across suppliers
                </CardDescription>
              </div>
              <Badge variant="secondary">{filteredPrices.length} prices</Badge>
            </div>

            {/* Search and Filter Controls */}
            <div className="flex gap-4 mt-4">
              <div className="flex-1">
                <Label htmlFor="search">Search Products</Label>
                <Input
                  id="search"
                  placeholder="Search by product name, packaging, or size..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="w-64">
                <Label htmlFor="supplier-filter">Filter by Supplier</Label>
                <Select value={selectedSupplierFilter} onValueChange={setSelectedSupplierFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All suppliers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All suppliers</SelectItem>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grower</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Price per {filteredPrices[0]?.sold_by || 'Unit'}</TableHead>
                    <TableHead>{filteredPrices[0]?.sold_by === 'kg' ? 'Kg' : filteredPrices[0]?.sold_by === 'box' ? 'Boxes' : 'Units'} per Pallet</TableHead>
                    <TableHead>Hub</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrices.map(price => {
                    const expiryStatus = getExpiryStatus(price.valid_until)
                    const expiryStyles = getExpiryStyles(expiryStatus)

                    return (
                    <TableRow
                      key={price.id}
                      className={expiryStyles ? `${expiryStyles} border` : ''}
                    >
                      {/* Grower */}
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <div>
                            <div>{price.supplier_name}</div>
                            {(price.suppliers as any)?.staff && (
                              <div className="text-sm text-blue-600 font-medium mt-1">
                                Agent: {(price.suppliers as any).staff.name}
                                {(price.suppliers as any).staff.role && ` (${(price.suppliers as any).staff.role})`}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Product */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{price.product_name}</div>
                            <div className="text-xs text-gray-500">{price.packaging_label} - {price.size_name}</div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Price per sold_by */}
                      <TableCell>
                        {editingPriceId === price.id ? (
                          <div className="flex items-center gap-1">
                            <Euro className="h-3 w-3 text-gray-400" />
                            <Input
                              type="number"
                              step="0.01"
                              value={inlineEditData.price}
                              onChange={(e) => setInlineEditData(prev => ({ ...prev, price: e.target.value }))}
                              className="h-7 w-20 text-sm"
                              autoFocus
                            />
                          </div>
                        ) : (
                          `€${price.price_per_unit.toFixed(2)}`
                        )}
                      </TableCell>

                      {/* Units per Pallet */}
                      <TableCell>
                        <span className="text-sm">
                          {price.units_per_pallet ?
                            `${price.units_per_pallet} ${price.sold_by === 'kg' ? 'kg' : price.sold_by === 'box' ? 'boxes' : 'units'}`
                            : 'N/A'}
                        </span>
                      </TableCell>

                      {/* Hub */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="text-sm">{price.hub_name} ({price.hub_code})</span>
                        </div>
                      </TableCell>

                      {/* Mode */}
                      <TableCell>
                        <Badge variant="outline">{price.delivery_mode}</Badge>
                      </TableCell>

                      {/* Expires */}
                      <TableCell>
                        {editingPriceId === price.id ? (
                          <Input
                            type="date"
                            value={inlineEditData.validUntil}
                            onChange={(e) => setInlineEditData(prev => ({ ...prev, validUntil: e.target.value }))}
                            className="h-7 w-32 text-sm"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            {expiryStatus === 'expired' && (
                              <div className="w-2 h-2 bg-red-500 rounded-full" title="Expired" />
                            )}
                            {expiryStatus === 'expiring-soon' && (
                              <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Expiring within 24 hours" />
                            )}
                            <span className={expiryStatus === 'expired' ? 'text-red-600 font-medium' : expiryStatus === 'expiring-soon' ? 'text-yellow-600 font-medium' : ''}>
                              {new Date(price.valid_until).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </TableCell>

                      {/* Actions - Inline edit only */}
                      <TableCell className="space-x-1">
                        {editingPriceId === price.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleInlineSave(price)}
                              className="text-green-600 hover:text-green-700"
                            >
                              ✓
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleInlineCancel}
                              className="text-red-600 hover:text-red-700"
                            >
                              ✗
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleInlineEdit(price)}
                              title="Edit price and expiry"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toast.info('Price history feature coming soon')}
                              title="View history"
                            >
                              <History className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {filteredPrices.length === 0 && (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Prices Found</h3>
                  <p className="text-gray-500 mb-4">
                    {searchQuery || selectedSupplierFilter ?
                      'No prices match your search criteria.' :
                      'No active prices available yet.'}
                  </p>
                  {(searchQuery || selectedSupplierFilter) && (
                    <div className="flex gap-2 justify-center">
                      <Button
                        variant="outline"
                        onClick={() => setSearchQuery('')}
                        disabled={!searchQuery}
                      >
                        Clear Search
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedSupplierFilter('')}
                        disabled={!selectedSupplierFilter}
                      >
                        Clear Filter
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
      </div>
    </div>
  )
}