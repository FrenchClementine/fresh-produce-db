'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useCustomers } from '@/hooks/use-products'
import { useSuppliers } from '@/hooks/use-products'
import { useProductPackagingSpecs } from '@/hooks/use-product-packaging-specs'
import { useSupplierHubs } from '@/hooks/use-suppliers'
import { useHubs } from '@/hooks/use-hubs'
import { useTransporters, useTransporterRoutes } from '@/hooks/use-transporters'
import { useCreateOpportunity } from '@/hooks/use-opportunities'
import { toast } from 'sonner'
import { format, addDays } from 'date-fns'
import { Target, User, Truck, Package, DollarSign, Calculator } from 'lucide-react'

interface CreateOpportunityFromScratchFormProps {
  open: boolean
  onClose: () => void
}

const formatCurrency = (amount: number, currency: string = 'EUR') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount)
}

export function CreateOpportunityFromScratchForm({ open, onClose }: CreateOpportunityFromScratchFormProps) {
  const [activeTab, setActiveTab] = useState('parties')
  const [isProcessing, setIsProcessing] = useState(false)

  // Step 1: Parties
  const [customerId, setCustomerId] = useState('')
  const [supplierId, setSupplierId] = useState('')

  // Step 2: Product
  const [productPackagingSpecId, setProductPackagingSpecId] = useState('')

  // Step 3: Pricing
  const [supplierPricePerUnit, setSupplierPricePerUnit] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [deliveryMode, setDeliveryMode] = useState('EX_WORKS')
  const [hubId, setHubId] = useState('')

  // Step 4: Transport
  const [transportCostPerUnit, setTransportCostPerUnit] = useState('')
  const [transportRouteId, setTransportRouteId] = useState('')
  const [selectedTransporterId, setSelectedTransporterId] = useState('')
  const [supplierDeliveryMode, setSupplierDeliveryMode] = useState('')

  // Step 5: Offer
  const [offerPricePerUnit, setOfferPricePerUnit] = useState('')
  const [offerValidUntil, setOfferValidUntil] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'))
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [status, setStatus] = useState<'draft' | 'active' | 'negotiating' | 'offered'>('active')
  const [internalNotes, setInternalNotes] = useState('')
  const [customerRequirements, setCustomerRequirements] = useState('')

  // Hooks
  const { customers } = useCustomers()
  const { suppliers } = useSuppliers()
  const { data: productSpecs } = useProductPackagingSpecs()
  const { data: supplierHubs } = useSupplierHubs(supplierId)
  const { data: allHubs } = useHubs()
  const { data: transporters } = useTransporters()
  const { data: transportRoutes } = useTransporterRoutes()
  const createOpportunityMutation = useCreateOpportunity()

  // Calculate costs
  const supplierCost = parseFloat(supplierPricePerUnit) || 0
  const transportCost = parseFloat(transportCostPerUnit) || 0
  const totalCost = supplierCost + transportCost
  const suggestedPrice = totalCost * 1.15 // 15% margin
  const actualOfferPrice = parseFloat(offerPricePerUnit) || suggestedPrice
  const margin = actualOfferPrice - totalCost
  const marginPercent = totalCost > 0 ? (margin / actualOfferPrice) * 100 : 0

  const handleCreate = async () => {
    if (!customerId || !supplierId || !productPackagingSpecId) {
      toast.error('Please select customer, supplier, and product')
      return
    }

    if (!offerPricePerUnit) {
      toast.error('Please enter an offer price')
      return
    }

    setIsProcessing(true)
    try {
      await createOpportunityMutation.mutateAsync({
        customer_id: customerId,
        supplier_id: supplierId,
        product_packaging_spec_id: productPackagingSpecId,
        selected_supplier_id: supplierId,
        supplier_price_per_unit: supplierCost,
        transport_cost_per_unit: transportCost,
        estimated_total_cost: totalCost,
        offer_price_per_unit: actualOfferPrice,
        offer_currency: currency,
        valid_till: offerValidUntil,
        status,
        priority,
        internal_notes: internalNotes,
        customer_requirements: customerRequirements,
        supplier_delivery_mode: supplierDeliveryMode || deliveryMode,
        selected_transporter_id: selectedTransporterId || undefined,
      })

      toast.success('Opportunity created successfully!')
      onClose()

      // Reset form
      setActiveTab('parties')
      setCustomerId('')
      setSupplierId('')
      setProductPackagingSpecId('')
      setSupplierPricePerUnit('')
      setTransportCostPerUnit('')
      setOfferPricePerUnit('')
      setInternalNotes('')
      setCustomerRequirements('')
    } catch (error) {
      console.error('Error creating opportunity:', error)
      toast.error('Failed to create opportunity')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-terminal-panel border-terminal-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-terminal-text">
            <Target className="h-5 w-5 text-terminal-accent" />
            Create New Opportunity
          </DialogTitle>
          <DialogDescription className="font-mono text-terminal-muted">
            Manually create an opportunity from scratch
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 bg-terminal-dark">
            <TabsTrigger value="parties" className="font-mono text-xs">Customer & Supplier</TabsTrigger>
            <TabsTrigger value="product" className="font-mono text-xs">Product</TabsTrigger>
            <TabsTrigger value="pricing" className="font-mono text-xs">Pricing</TabsTrigger>
            <TabsTrigger value="transport" className="font-mono text-xs">Transport</TabsTrigger>
            <TabsTrigger value="offer" className="font-mono text-xs">Offer Details</TabsTrigger>
          </TabsList>

          {/* Step 1: Customer & Supplier */}
          <TabsContent value="parties" className="space-y-4">
            <Card className="bg-terminal-dark border-terminal-border">
              <CardHeader className="border-b border-terminal-border">
                <CardTitle className="text-sm font-mono text-terminal-text flex items-center gap-2">
                  <User className="h-4 w-4 text-terminal-accent" />
                  SELECT CUSTOMER
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <Label htmlFor="customer" className="font-mono text-terminal-muted text-xs">Customer</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger id="customer" className="bg-terminal-panel border-terminal-border text-terminal-text font-mono">
                    <SelectValue placeholder="Select customer..." />
                  </SelectTrigger>
                  <SelectContent className="bg-terminal-panel border-terminal-border">
                    {customers?.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id} className="font-mono text-terminal-text">
                        {customer.name} - {customer.city}, {customer.country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card className="bg-terminal-dark border-terminal-border">
              <CardHeader className="border-b border-terminal-border">
                <CardTitle className="text-sm font-mono text-terminal-text flex items-center gap-2">
                  <Truck className="h-4 w-4 text-terminal-accent" />
                  SELECT SUPPLIER
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <Label htmlFor="supplier" className="font-mono text-terminal-muted text-xs">Supplier</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger id="supplier" className="bg-terminal-panel border-terminal-border text-terminal-text font-mono">
                    <SelectValue placeholder="Select supplier..." />
                  </SelectTrigger>
                  <SelectContent className="bg-terminal-panel border-terminal-border">
                    {suppliers?.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id} className="font-mono text-terminal-text">
                        {supplier.name} - {supplier.city}, {supplier.country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 2: Product */}
          <TabsContent value="product" className="space-y-4">
            <Card className="bg-terminal-dark border-terminal-border">
              <CardHeader className="border-b border-terminal-border">
                <CardTitle className="text-sm font-mono text-terminal-text flex items-center gap-2">
                  <Package className="h-4 w-4 text-terminal-accent" />
                  SELECT PRODUCT
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <Label htmlFor="product" className="font-mono text-terminal-muted text-xs">Product Packaging Specification</Label>
                <Select value={productPackagingSpecId} onValueChange={setProductPackagingSpecId}>
                  <SelectTrigger id="product" className="bg-terminal-panel border-terminal-border text-terminal-text font-mono">
                    <SelectValue placeholder="Select product specification..." />
                  </SelectTrigger>
                  <SelectContent className="bg-terminal-panel border-terminal-border">
                    {productSpecs?.map((spec) => (
                      <SelectItem key={spec.id} value={spec.id} className="font-mono text-terminal-text">
                        {spec.products.name} - {spec.packaging_options.label} - {spec.size_options.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 3: Pricing */}
          <TabsContent value="pricing" className="space-y-4">
            <Card className="bg-terminal-dark border-terminal-border">
              <CardHeader className="border-b border-terminal-border">
                <CardTitle className="text-sm font-mono text-terminal-text flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-terminal-accent" />
                  SUPPLIER PRICING
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="supplierPrice" className="font-mono text-terminal-muted text-xs">Price per Unit</Label>
                    <Input
                      id="supplierPrice"
                      type="number"
                      value={supplierPricePerUnit}
                      onChange={(e) => setSupplierPricePerUnit(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      className="bg-terminal-panel border-terminal-border text-terminal-text font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="currency" className="font-mono text-terminal-muted text-xs">Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger id="currency" className="bg-terminal-panel border-terminal-border text-terminal-text font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-terminal-panel border-terminal-border">
                        <SelectItem value="EUR" className="font-mono text-terminal-text">EUR</SelectItem>
                        <SelectItem value="USD" className="font-mono text-terminal-text">USD</SelectItem>
                        <SelectItem value="GBP" className="font-mono text-terminal-text">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="deliveryMode" className="font-mono text-terminal-muted text-xs">Delivery Mode</Label>
                    <Select value={deliveryMode} onValueChange={setDeliveryMode}>
                      <SelectTrigger id="deliveryMode" className="bg-terminal-panel border-terminal-border text-terminal-text font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-terminal-panel border-terminal-border">
                        <SelectItem value="EX_WORKS" className="font-mono text-terminal-text">Ex Works</SelectItem>
                        <SelectItem value="FOB" className="font-mono text-terminal-text">FOB</SelectItem>
                        <SelectItem value="CIF" className="font-mono text-terminal-text">CIF</SelectItem>
                        <SelectItem value="DAP" className="font-mono text-terminal-text">DAP</SelectItem>
                        <SelectItem value="DELIVERY" className="font-mono text-terminal-text">Delivery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="hub" className="font-mono text-terminal-muted text-xs">Hub/Location (Optional)</Label>
                    <Select value={hubId} onValueChange={setHubId}>
                      <SelectTrigger id="hub" className="bg-terminal-panel border-terminal-border text-terminal-text font-mono">
                        <SelectValue placeholder="Select hub..." />
                      </SelectTrigger>
                      <SelectContent className="bg-terminal-panel border-terminal-border">
                        {supplierHubs?.map((hub) => (
                          <SelectItem key={hub.id} value={hub.id} className="font-mono text-terminal-text">
                            {hub.name} - {hub.city_name}, {hub.country_code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 4: Transport */}
          <TabsContent value="transport" className="space-y-4">
            <Card className="bg-terminal-dark border-terminal-border">
              <CardHeader className="border-b border-terminal-border">
                <CardTitle className="text-sm font-mono text-terminal-text flex items-center gap-2">
                  <Truck className="h-4 w-4 text-terminal-accent" />
                  TRANSPORT COSTS
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div>
                  <Label htmlFor="transportCost" className="font-mono text-terminal-muted text-xs">Transport Cost per Unit</Label>
                  <Input
                    id="transportCost"
                    type="number"
                    value={transportCostPerUnit}
                    onChange={(e) => setTransportCostPerUnit(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    className="bg-terminal-panel border-terminal-border text-terminal-text font-mono"
                  />
                  <p className="text-xs text-terminal-muted font-mono mt-1">Enter the transport cost per unit (optional)</p>
                </div>

                <div>
                  <Label htmlFor="transporter" className="font-mono text-terminal-muted text-xs">Transporter (Optional)</Label>
                  <Select value={selectedTransporterId} onValueChange={setSelectedTransporterId}>
                    <SelectTrigger id="transporter" className="bg-terminal-panel border-terminal-border text-terminal-text font-mono">
                      <SelectValue placeholder="Select transporter..." />
                    </SelectTrigger>
                    <SelectContent className="bg-terminal-panel border-terminal-border">
                      {transporters?.map((transporter) => (
                        <SelectItem key={transporter.id} value={transporter.id} className="font-mono text-terminal-text">
                          {transporter.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 5: Offer Details */}
          <TabsContent value="offer" className="space-y-4">
            <Card className="bg-terminal-dark border-terminal-border">
              <CardHeader className="border-b border-terminal-border">
                <CardTitle className="text-sm font-mono text-terminal-text flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-terminal-accent" />
                  PRICING SUMMARY
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-mono text-terminal-muted">Supplier Cost:</span>
                    <span className="font-mono text-terminal-text">{formatCurrency(supplierCost, currency)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-mono text-terminal-muted">Transport Cost:</span>
                    <span className="font-mono text-terminal-text">{formatCurrency(transportCost, currency)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-terminal-border pt-2">
                    <span className="text-sm font-mono font-medium text-terminal-text">Total Cost:</span>
                    <span className="font-mono font-semibold text-terminal-text">{formatCurrency(totalCost, currency)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-mono text-terminal-muted">Suggested Price (15% margin):</span>
                    <span className="font-mono text-terminal-success">{formatCurrency(suggestedPrice, currency)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-terminal-dark border-terminal-border">
              <CardHeader className="border-b border-terminal-border">
                <CardTitle className="text-sm font-mono text-terminal-text">OPPORTUNITY DETAILS</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="offerPrice" className="font-mono text-terminal-muted text-xs">Offer Price per Unit *</Label>
                    <Input
                      id="offerPrice"
                      type="number"
                      value={offerPricePerUnit}
                      onChange={(e) => setOfferPricePerUnit(e.target.value)}
                      placeholder={suggestedPrice.toFixed(2)}
                      step="0.01"
                      className="bg-terminal-panel border-terminal-border text-terminal-text font-mono"
                    />
                    {actualOfferPrice > 0 && (
                      <p className={`text-xs mt-1 font-mono ${marginPercent >= 10 ? 'text-terminal-success' : 'text-terminal-warning'}`}>
                        Margin: {formatCurrency(margin)} ({marginPercent.toFixed(1)}%)
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="validUntil" className="font-mono text-terminal-muted text-xs">Valid Until</Label>
                    <Input
                      id="validUntil"
                      type="date"
                      value={offerValidUntil}
                      onChange={(e) => setOfferValidUntil(e.target.value)}
                      className="bg-terminal-panel border-terminal-border text-terminal-text font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority" className="font-mono text-terminal-muted text-xs">Priority</Label>
                    <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                      <SelectTrigger id="priority" className="bg-terminal-panel border-terminal-border text-terminal-text font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-terminal-panel border-terminal-border">
                        <SelectItem value="low" className="font-mono text-terminal-text">Low</SelectItem>
                        <SelectItem value="medium" className="font-mono text-terminal-text">Medium</SelectItem>
                        <SelectItem value="high" className="font-mono text-terminal-text">High</SelectItem>
                        <SelectItem value="urgent" className="font-mono text-terminal-text">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status" className="font-mono text-terminal-muted text-xs">Status</Label>
                    <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                      <SelectTrigger id="status" className="bg-terminal-panel border-terminal-border text-terminal-text font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-terminal-panel border-terminal-border">
                        <SelectItem value="draft" className="font-mono text-terminal-text">Draft</SelectItem>
                        <SelectItem value="active" className="font-mono text-terminal-text">Active</SelectItem>
                        <SelectItem value="negotiating" className="font-mono text-terminal-text">Negotiating</SelectItem>
                        <SelectItem value="offered" className="font-mono text-terminal-text">Offered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="customerReq" className="font-mono text-terminal-muted text-xs">Customer Requirements</Label>
                  <Textarea
                    id="customerReq"
                    value={customerRequirements}
                    onChange={(e) => setCustomerRequirements(e.target.value)}
                    placeholder="Any specific requirements from the customer..."
                    rows={2}
                    className="bg-terminal-panel border-terminal-border text-terminal-text font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="notes" className="font-mono text-terminal-muted text-xs">Internal Notes</Label>
                  <Textarea
                    id="notes"
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Internal notes about this opportunity..."
                    rows={2}
                    className="bg-terminal-panel border-terminal-border text-terminal-text font-mono"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isProcessing || !customerId || !supplierId || !productPackagingSpecId || !offerPricePerUnit}
            className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono"
          >
            {isProcessing ? 'Creating...' : 'Create Opportunity'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
