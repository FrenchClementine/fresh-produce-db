'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { TradePotential } from '@/types/trade-potential'
import { useSupplierHubs } from '@/hooks/use-suppliers'
import { useHubs } from '@/hooks/use-hubs'
import { useTransporterRoutes, useCreateTransporterRoute, useTransporters, useRoutePriceBands } from '@/hooks/use-transporters'
import { useAddSupplierPrice } from '@/hooks/use-trade-potential'
import { useCreateOpportunity } from '@/hooks/use-opportunities'
import { toast } from 'sonner'
import { format, addDays } from 'date-fns'
import { DollarSign, Truck, Package, CheckCircle, AlertCircle, ArrowRight, Calculator, Target } from 'lucide-react'

interface BuildOpportunityModalProps {
  open: boolean
  onClose: () => void
  potential: TradePotential | null
}

const formatCurrency = (amount: number, currency: string = 'EUR') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount)
}

export function BuildOpportunityModal({ open, onClose, potential }: BuildOpportunityModalProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [isProcessing, setIsProcessing] = useState(false)

  // Price form state
  const [pricePerUnit, setPricePerUnit] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [validUntil, setValidUntil] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'))
  const [deliveryMode, setDeliveryMode] = useState('Ex Works')
  const [hubId, setHubId] = useState('')

  // Transport form state
  const [transportRouteId, setTransportRouteId] = useState('')
  const [transporterId, setTransporterId] = useState('')
  const [originHubId, setOriginHubId] = useState('')
  const [destinationHubId, setDestinationHubId] = useState('')
  const [pricePerPallet, setPricePerPallet] = useState('')
  const [transportDuration, setTransportDuration] = useState('')
  const [transportBandId, setTransportBandId] = useState('')
  const [selectedPriceBand, setSelectedPriceBand] = useState('')

  // Opportunity form state
  const [offerPricePerUnit, setOfferPricePerUnit] = useState('')
  const [offerValidUntil, setOfferValidUntil] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'))
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [internalNotes, setInternalNotes] = useState('')
  const [customerRequirements, setCustomerRequirements] = useState('')

  // Hooks
  const { data: supplierHubs } = useSupplierHubs(potential?.supplier.id || '')
  const { data: allHubs } = useHubs()
  const { data: transportRoutes } = useTransporterRoutes()
  const { data: transporters } = useTransporters()
  const { data: routePriceBands } = useRoutePriceBands(potential?.transportRoute?.id)
  const addSupplierPriceMutation = useAddSupplierPrice()
  const addTransportRouteMutation = useCreateTransporterRoute()
  const createOpportunityMutation = useCreateOpportunity()

  const needsPrice = potential?.status === 'missing_price' || potential?.status === 'missing_both'
  const needsTransport = potential?.status === 'missing_transport' || potential?.status === 'missing_both'

  // Initialize form values based on existing data
  useEffect(() => {
    if (!potential) return


    // Initialize price fields if we have existing supplier price
    if (potential.supplierPrice) {
      setPricePerUnit(potential.supplierPrice.pricePerUnit.toString())
      setCurrency(potential.supplierPrice.currency)
      setDeliveryMode(potential.supplierPrice.deliveryMode || 'Ex Works')
      setHubId(potential.supplierPrice.hubId)
      if (potential.supplierPrice.validUntil) {
        setValidUntil(format(new Date(potential.supplierPrice.validUntil), 'yyyy-MM-dd'))
      }
    }

    // Initialize transport fields if we have existing transport route
    if (potential.transportRoute) {
      setTransportRouteId(potential.transportRoute.id)
      setOriginHubId(potential.transportRoute.originHubId)
      setDestinationHubId(potential.transportRoute.destinationHubId)
      setPricePerPallet(potential.transportRoute.pricePerPallet.toString())
      setTransportDuration(potential.transportRoute.durationDays.toString())
      if (potential.transportRoute.transporterId) {
        setTransporterId(potential.transportRoute.transporterId)
      }

      // If missing price but has transport, use origin hub as the supplier hub
      if (!potential.supplierPrice) {
        setHubId(potential.transportRoute.originHubId)
      }
    }

    // If no transport or price but supplier has default hub, use it
    if (!potential.transportRoute && !potential.supplierPrice && potential.supplier.defaultHubId) {
      setHubId(potential.supplier.defaultHubId)
      setOriginHubId(potential.supplier.defaultHubId)
    }
  }, [potential])

  // Calculate costs and margins
  const supplierCost = parseFloat(pricePerUnit) || potential?.supplierPrice?.pricePerUnit || 0

  // Calculate transport cost based on selected price band or existing transport route
  const getTransportCostPerUnit = () => {
    if (selectedPriceBand && routePriceBands) {
      const selectedBand = routePriceBands.find(band => band.id === selectedPriceBand)
      if (selectedBand) {
        // Convert pallet cost to per-unit cost (assuming transport route has unitsPerPallet)
        const unitsPerPallet = potential?.transportRoute?.unitsPerPallet || 1
        return selectedBand.price_per_pallet / unitsPerPallet
      }
    }
    return potential?.transportRoute?.pricePerUnit || 0
  }

  const transportCostPerUnit = getTransportCostPerUnit()
  const totalCost = supplierCost + transportCostPerUnit
  const suggestedPrice = totalCost * 1.15 // 15% margin
  const actualOfferPrice = parseFloat(offerPricePerUnit) || suggestedPrice
  const margin = actualOfferPrice - totalCost
  const marginPercent = totalCost > 0 ? (margin / actualOfferPrice) * 100 : 0

  useEffect(() => {
    if (potential) {
      // Pre-fill with existing data
      if (potential.supplierPrice) {
        setPricePerUnit(potential.supplierPrice.pricePerUnit.toString())
        setCurrency(potential.supplierPrice.currency)
      }
      if (potential.transportRoute) {
        setTransportRouteId(potential.transportRoute.id)
        setPricePerPallet(potential.transportRoute.pricePerPallet.toString())
      }
      // Set suggested offer price
      setOfferPricePerUnit(suggestedPrice.toFixed(2))
    }
  }, [potential, suggestedPrice])

  const handleBuildOpportunity = async () => {
    if (!potential) return

    setIsProcessing(true)
    try {
      // Step 1: Add supplier price if needed
      if (needsPrice) {
        await addSupplierPriceMutation.mutateAsync({
          supplier_id: potential.supplier.id,
          product_packaging_spec_id: potential.product.specId,
          price_per_unit: parseFloat(pricePerUnit),
          currency,
          valid_until: validUntil,
          delivery_mode: deliveryMode,
          hub_id: hubId || undefined,
        })
      }

      // Step 2: Add transport route if needed
      if (needsTransport && transporterId && originHubId && destinationHubId) {
        await addTransportRouteMutation.mutateAsync({
          transporter_id: transporterId,
          origin_hub_id: originHubId,
          destination_hub_id: destinationHubId,
          transport_duration_days: parseInt(transportDuration) || 0,
          fixed_departure_days: [],
          customs_cost_per_shipment: 0,
          is_active: true
        })
      }

      // Step 3: Create opportunity
      await createOpportunityMutation.mutateAsync({
        customer_id: potential.customer.id,
        supplier_id: potential.supplier.id,
        product_packaging_spec_id: potential.product.specId,
        selected_supplier_id: potential.supplier.id,
        supplier_price_per_unit: supplierCost,
        transport_cost_per_unit: transportCostPerUnit,
        estimated_total_cost: totalCost,
        offer_price_per_unit: actualOfferPrice,
        offer_currency: currency,
        valid_till: offerValidUntil,
        status: 'active',
        priority,
        internal_notes: internalNotes,
        customer_requirements: customerRequirements,
      })

      toast.success('Opportunity built successfully!')
      onClose()
    } catch (error) {
      console.error('Error building opportunity:', error)
      toast.error('Failed to build opportunity')
    } finally {
      setIsProcessing(false)
    }
  }

  if (!potential) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Build Opportunity
          </DialogTitle>
          <DialogDescription>
            Complete missing information and create an active opportunity
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="missing" disabled={!needsPrice && !needsTransport}>
              {needsPrice && needsTransport ? 'Price & Transport' : needsPrice ? 'Add Price' : needsTransport ? 'Add Transport' : 'Complete'}
            </TabsTrigger>
            <TabsTrigger value="opportunity">Create Opportunity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Customer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <p className="font-medium">{potential.customer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {potential.customer.city}, {potential.customer.country}
                    </p>
                    {potential.customer.agent && (
                      <p className="text-xs text-muted-foreground">
                        Agent: {potential.customer.agent.name}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Supplier</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <p className="font-medium">{potential.supplier.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {potential.supplier.city}, {potential.supplier.country}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Product</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <p className="font-medium">{potential.product.name}</p>
                    <div className="flex gap-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {potential.product.packagingLabel}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {potential.product.sizeName}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {potential?.transportRoute && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Transport</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <p className="font-medium">{potential.transportRoute.transporterName}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>
                          {allHubs?.find(h => h.id === potential.transportRoute?.originHubId)?.name || potential.transportRoute.originHubId}
                        </span>
                        <ArrowRight className="h-3 w-3" />
                        <span>
                          {allHubs?.find(h => h.id === potential.transportRoute?.destinationHubId)?.name || potential.transportRoute.destinationHubId}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Duration: {potential.transportRoute.durationDays} days
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Current Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {potential.status === 'complete' && (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="mr-1 h-3 w-3" /> Complete
                      </Badge>
                    )}
                    {potential.status === 'missing_price' && (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        <AlertCircle className="mr-1 h-3 w-3" /> Missing Price
                      </Badge>
                    )}
                    {potential.status === 'missing_transport' && (
                      <Badge className="bg-red-100 text-red-800">
                        <AlertCircle className="mr-1 h-3 w-3" /> Missing Transport
                      </Badge>
                    )}
                    {potential.status === 'missing_both' && (
                      <Badge className="bg-gray-100 text-gray-800">
                        <AlertCircle className="mr-1 h-3 w-3" /> Missing Both
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {potential.status !== 'complete' && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-sm">Missing Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    {needsPrice && (
                      <li className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-orange-600" />
                        Supplier price needs to be added
                      </li>
                    )}
                    {needsTransport && (
                      <li className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-orange-600" />
                        Transport route and pricing needed
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="missing" className="space-y-4">
            {needsPrice && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Supplier Price Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">Price per Unit</Label>
                      <Input
                        id="price"
                        type="number"
                        value={pricePerUnit}
                        onChange={(e) => setPricePerUnit(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger id="currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="validUntil">Valid Until</Label>
                      <Input
                        id="validUntil"
                        type="date"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="deliveryMode">Delivery Mode</Label>
                      <Select value={deliveryMode} onValueChange={setDeliveryMode}>
                        <SelectTrigger id="deliveryMode">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Ex Works">Ex Works</SelectItem>
                          <SelectItem value="DELIVERY">Delivery</SelectItem>
                          <SelectItem value="TRANSIT">TRANSIT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="hub">
                        Hub/Location
                        {potential?.transportRoute && !potential?.supplierPrice && (
                          <span className="ml-2 text-xs text-muted-foreground">(from transport route)</span>
                        )}
                      </Label>
                      <Select
                        value={hubId}
                        onValueChange={setHubId}
                        disabled={potential?.transportRoute && !potential?.supplierPrice}
                      >
                        <SelectTrigger id="hub">
                          <SelectValue placeholder="Select hub..." />
                        </SelectTrigger>
                        <SelectContent>
                          {supplierHubs?.map((hub) => (
                            <SelectItem key={hub.id} value={hub.id}>
                              {hub.name} - {hub.city_name}, {hub.country_code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {potential?.transportRoute && !potential?.supplierPrice && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Hub is determined by the existing transport route
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {potential?.transportRoute && needsPrice && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Truck className="h-4 w-4 text-green-600" />
                    Transport Already Configured
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transporter:</span>
                      <span className="font-medium">{potential.transportRoute.transporterName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Route:</span>
                      <span className="font-medium">
                        {allHubs?.find(h => h.id === potential.transportRoute?.originHubId)?.name || potential.transportRoute?.originHubId} →{' '}
                        {allHubs?.find(h => h.id === potential.transportRoute?.destinationHubId)?.name || potential.transportRoute?.destinationHubId}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium">{potential.transportRoute.durationDays} days</span>
                    </div>
                    {potential.transportRoute.pricePerPallet > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cost:</span>
                        <span className="font-medium">{formatCurrency(potential.transportRoute.pricePerPallet)}/pallet</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {needsTransport && !potential?.transportRoute && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Transport Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="transporter">Transporter</Label>
                      <Select value={transporterId} onValueChange={setTransporterId}>
                        <SelectTrigger id="transporter">
                          <SelectValue placeholder="Select transporter..." />
                        </SelectTrigger>
                        <SelectContent>
                          {transporters?.map((transporter) => (
                            <SelectItem key={transporter.id} value={transporter.id}>
                              {transporter.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="originHub">Origin Hub</Label>
                      <Select value={originHubId} onValueChange={setOriginHubId}>
                        <SelectTrigger id="originHub">
                          <SelectValue placeholder="Select origin hub..." />
                        </SelectTrigger>
                        <SelectContent>
                          {allHubs?.map((hub) => (
                            <SelectItem key={hub.id} value={hub.id}>
                              {hub.name} - {hub.city_name}, {hub.country_code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="destinationHub">Destination Hub</Label>
                      <Select value={destinationHubId} onValueChange={setDestinationHubId}>
                        <SelectTrigger id="destinationHub">
                          <SelectValue placeholder="Select destination hub..." />
                        </SelectTrigger>
                        <SelectContent>
                          {allHubs?.map((hub) => (
                            <SelectItem key={hub.id} value={hub.id}>
                              {hub.name} - {hub.city_name}, {hub.country_code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="palletPrice">Price per Pallet</Label>
                      <Input
                        id="palletPrice"
                        type="number"
                        value={pricePerPallet}
                        onChange={(e) => setPricePerPallet(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <Label htmlFor="duration">Duration (days)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={transportDuration}
                        onChange={(e) => setTransportDuration(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="opportunity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Pricing Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Supplier Cost:</span>
                    <span className="font-medium">{formatCurrency(supplierCost, currency)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Transport Cost:</span>
                    <span className="font-medium">{formatCurrency(transportCostPerUnit, currency)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="text-sm font-medium">Total Cost:</span>
                    <span className="font-semibold">{formatCurrency(totalCost, currency)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Suggested Price (15% margin):</span>
                    <span className="text-muted-foreground">{formatCurrency(suggestedPrice, currency)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transport Details Card - Always show when transport exists */}
            {potential?.transportRoute && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Transport Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Transporter:</span>
                      <span className="font-medium">
                        {potential.transportRoute.transporterName || 'Available'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Route:</span>
                      <span className="font-medium text-sm">
                        {`${allHubs?.find(h => h.id === potential.transportRoute?.originHubId)?.name || potential.transportRoute?.originHubId || 'Origin'} → ${allHubs?.find(h => h.id === potential.transportRoute?.destinationHubId)?.name || potential.transportRoute?.destinationHubId || 'Destination'}`}
                      </span>
                    </div>
                    {potential.transportRoute.durationDays > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Duration:</span>
                        <span className="font-medium">
                          {potential.transportRoute.durationDays} days
                        </span>
                      </div>
                    )}
                    {potential.transportRoute.pricePerPallet > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Base Price:</span>
                        <span className="font-medium">
                          {formatCurrency(potential.transportRoute.pricePerPallet)}/pallet
                        </span>
                      </div>
                    )}
                    {potential.transportRoute.availableBands && potential.transportRoute.availableBands.length > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Price Bands:</span>
                        <span className="font-medium">
                          {potential.transportRoute.availableBands.length} available
                        </span>
                      </div>
                    )}
                    {potential.transportRoute.transporterName === 'Same Location' && (
                      <Badge variant="outline" className="text-green-600">
                        No transport needed - Same location
                      </Badge>
                    )}

                      {/* Price Band Selection */}
                      {routePriceBands && routePriceBands.length > 0 && (
                        <div className="pt-2 border-t">
                          <Label htmlFor="priceBand" className="text-sm">Select Price Band</Label>
                          <Select value={selectedPriceBand} onValueChange={setSelectedPriceBand}>
                            <SelectTrigger id="priceBand" className="mt-1">
                              <SelectValue placeholder="Choose price band..." />
                            </SelectTrigger>
                            <SelectContent>
                              {routePriceBands.map((band) => (
                                <SelectItem key={band.id} value={band.id}>
                                  {band.pallet_dimensions} | {band.min_pallets}
                                  {band.max_pallets ? `-${band.max_pallets}` : '+'} pallets |
                                  {formatCurrency(band.price_per_pallet)}/pallet
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedPriceBand && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Selected transport cost will be used in pricing calculation
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                </CardContent>
              </Card>
            )}

            {/* Show transport availability when hasTransportRoute but no explicit route */}
            {!potential?.transportRoute && potential?.hasTransportRoute && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Truck className="h-4 w-4 text-orange-600" />
                    Transport Available
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    <p>Transport solution is available for this trade potential.</p>
                    <p className="mt-1">Configure transport details in the Add Price tab to see specific routes and pricing.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Opportunity Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="offerPrice">Offer Price per Unit</Label>
                    <Input
                      id="offerPrice"
                      type="number"
                      value={offerPricePerUnit}
                      onChange={(e) => setOfferPricePerUnit(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                    />
                    {actualOfferPrice > 0 && (
                      <p className={`text-xs mt-1 ${marginPercent >= 10 ? 'text-green-600' : 'text-orange-600'}`}>
                        Margin: {formatCurrency(margin)} ({marginPercent.toFixed(1)}%)
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="offerValid">Valid Until</Label>
                    <Input
                      id="offerValid"
                      type="date"
                      value={offerValidUntil}
                      onChange={(e) => setOfferValidUntil(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                      <SelectTrigger id="priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="customerReq">Customer Requirements</Label>
                  <Textarea
                    id="customerReq"
                    value={customerRequirements}
                    onChange={(e) => setCustomerRequirements(e.target.value)}
                    placeholder="Any specific requirements from the customer..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Internal Notes</Label>
                  <Textarea
                    id="notes"
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Internal notes about this opportunity..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {activeTab !== 'overview' && (
              <Button
                variant="outline"
                onClick={() => {
                  const tabs = ['overview', 'missing', 'opportunity']
                  const currentIndex = tabs.indexOf(activeTab)
                  if (currentIndex > 0) {
                    setActiveTab(tabs[currentIndex - 1])
                  }
                }}
              >
                Previous
              </Button>
            )}
            {activeTab !== 'opportunity' && (
              <Button
                onClick={() => {
                  const tabs = ['overview', 'missing', 'opportunity']
                  const currentIndex = tabs.indexOf(activeTab)
                  if (currentIndex < tabs.length - 1) {
                    setActiveTab(tabs[currentIndex + 1])
                  }
                }}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {activeTab === 'opportunity' && (
              <Button
                onClick={handleBuildOpportunity}
                disabled={isProcessing || !offerPricePerUnit}
              >
                {isProcessing ? 'Building...' : 'Create Active Opportunity'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}