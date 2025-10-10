'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CustomerProductRequest } from '@/types/customer-requests'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useCreateOpportunity } from '@/hooks/use-opportunities'
import { useUpdateCustomerRequest } from '@/hooks/use-customer-requests'
import { toast } from 'sonner'
import { CheckCircle, Package, TrendingUp, DollarSign, Truck, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface BuildOpportunityFromRequestModalV2Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  requestId: string
  request: CustomerProductRequest
}

interface PotentialMatch {
  id: string
  supplier: {
    id: string
    name: string
    city: string
    country: string
  }
  supplierPrice?: {
    id: string
    pricePerUnit: number
    currency: string
    deliveryMode: string
    hubId: string
    hubName: string
    validUntil: string
  }
  transportRoute?: {
    id: string
    transporterId: string
    transporterName: string
    originHubId: string
    originHubName: string
    destinationHubId: string
    destinationHubName: string
    durationDays: number
    availableBands: Array<{
      id: string
      price_per_pallet: number
      min_pallets: number
      max_pallets: number
    }>
    unitsPerPallet: number
  }
  status: 'complete' | 'missing_price' | 'missing_transport' | 'missing_both'
}

export function BuildOpportunityFromRequestModalV2({
  open,
  onOpenChange,
  requestId,
  request,
}: BuildOpportunityFromRequestModalV2Props) {
  const router = useRouter()
  const [selectedMatch, setSelectedMatch] = useState<PotentialMatch | null>(null)
  const [selectedBandIndex, setSelectedBandIndex] = useState(0)
  const [marginPercent, setMarginPercent] = useState(15)
  const [offerPrice, setOfferPrice] = useState(0)

  const createOpportunity = useCreateOpportunity()
  const updateRequest = useUpdateCustomerRequest()

  // Fetch potential matches for this specific customer-product combination
  const { data: potentialMatches, isLoading } = useQuery({
    queryKey: ['request-potential-matches', request.customer_id, request.product_id],
    queryFn: async () => {
      // Get supplier prices for this specific product directly
      const { data: supplierPrices, error: pricesError } = await supabase
        .from('current_supplier_prices')
        .select(`
          *,
          suppliers!inner(id, name, city, country, is_active),
          products!inner(id, name)
        `)
        .eq('product_id', request.product_id)
        .eq('suppliers.is_active', true)
        .eq('is_active', true)

      if (pricesError) {
        console.error('Error fetching supplier prices:', pricesError)
        throw pricesError
      }

      console.log('Found supplier prices:', supplierPrices)

      // Get unique suppliers from prices
      const uniqueSupplierIds = [...new Set(supplierPrices?.map((p: any) => p.supplier_id) || [])]

      console.log('Unique supplier IDs:', uniqueSupplierIds)

      // Get transport routes to customer's delivery hub
      let transportRoutes: any[] = []

      // Only fetch routes if we have a delivery hub ID
      if (request.delivery_hub_id) {
        const { data, error: routesError } = await supabase
          .from('transporter_routes')
          .select(`
            id,
            transporter_id,
            origin_hub_id,
            destination_hub_id,
            transport_duration_days,
            transporters!inner(id, name, is_active),
            transporter_route_price_bands(
              id,
              price_per_pallet,
              min_pallets,
              max_pallets
            ),
            origin_hubs:origin_hub_id(id, name),
            destination_hubs:destination_hub_id(id, name)
          `)
          .eq('is_active', true)
          .eq('transporters.is_active', true)
          .eq('destination_hub_id', request.delivery_hub_id)

        if (routesError) throw routesError
        transportRoutes = data || []
      }

      // Build potential matches from supplier prices
      const matches: PotentialMatch[] = []
      const processedSuppliers = new Set()

      for (const price of (supplierPrices || [])) {
        const supplier = price.suppliers

        // Skip if already processed this supplier
        if (processedSuppliers.has(supplier.id)) continue
        processedSuppliers.add(supplier.id)

        // Find best transport route from this supplier's hub to customer's hub
        const transport = transportRoutes?.find((r: any) =>
          r.origin_hub_id === price.hub_id
        )

        // Determine status
        let status: PotentialMatch['status'] = 'complete'
        if (!transport) status = 'missing_transport'

        matches.push({
          id: `${supplier.id}-${request.product_id}`,
          supplier: {
            id: supplier.id,
            name: supplier.name,
            city: supplier.city,
            country: supplier.country,
          },
          supplierPrice: {
            id: price.id,
            pricePerUnit: price.price_per_unit,
            currency: price.currency,
            deliveryMode: price.delivery_mode,
            hubId: price.hub_id,
            hubName: price.hub_name,
            validUntil: price.valid_until,
          },
          transportRoute: transport ? {
            id: transport.id,
            transporterId: transport.transporter_id,
            transporterName: transport.transporters.name,
            originHubId: transport.origin_hub_id,
            originHubName: transport.origin_hubs?.name || '',
            destinationHubId: transport.destination_hub_id,
            destinationHubName: transport.destination_hubs?.name || '',
            durationDays: transport.transport_duration_days,
            availableBands: transport.transporter_route_price_bands || [],
            unitsPerPallet: price.units_per_pallet || 1,
          } : undefined,
          status,
        })
      }

      console.log('Built matches:', matches)

      // Sort: complete first, then by price
      return matches.sort((a, b) => {
        const statusOrder = { complete: 0, missing_transport: 1, missing_price: 2, missing_both: 3 }
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status]
        }
        const aPrice = a.supplierPrice?.pricePerUnit || 999999
        const bPrice = b.supplierPrice?.pricePerUnit || 999999
        return aPrice - bPrice
      })
    },
    enabled: open,
  })

  // Calculate costs when match or band selection changes
  useEffect(() => {
    if (!selectedMatch) return

    const supplierCost = selectedMatch.supplierPrice?.pricePerUnit || 0
    let transportCost = 0

    if (selectedMatch.transportRoute?.availableBands && selectedMatch.transportRoute.availableBands.length > 0) {
      const band = selectedMatch.transportRoute.availableBands[selectedBandIndex]
      if (band && selectedMatch.transportRoute.unitsPerPallet) {
        transportCost = band.price_per_pallet / selectedMatch.transportRoute.unitsPerPallet
      }
    }

    const totalCost = supplierCost + transportCost
    const calculatedOffer = totalCost * (1 + marginPercent / 100)
    setOfferPrice(calculatedOffer)
  }, [selectedMatch, selectedBandIndex, marginPercent])

  const handleCreateOpportunity = async () => {
    if (!selectedMatch) return

    try {
      const supplierCost = selectedMatch.supplierPrice?.pricePerUnit || 0
      let transportCost = 0

      if (selectedMatch.transportRoute?.availableBands && selectedMatch.transportRoute.availableBands.length > 0) {
        const band = selectedMatch.transportRoute.availableBands[selectedBandIndex]
        if (band && selectedMatch.transportRoute.unitsPerPallet) {
          transportCost = band.price_per_pallet / selectedMatch.transportRoute.unitsPerPallet
        }
      }

      const totalCost = supplierCost + transportCost

      // Create opportunity
      const opportunity = await createOpportunity.mutateAsync({
        customer_id: request.customer_id,
        supplier_id: selectedMatch.supplier.id,
        product_packaging_spec_id: (request as any).product_packaging_spec_id || '',
        selected_supplier_id: selectedMatch.supplier.id,
        supplier_price_per_unit: supplierCost,
        transport_cost_per_unit: transportCost,
        estimated_total_cost: totalCost,
        offer_price_per_unit: offerPrice,
        offer_currency: selectedMatch.supplierPrice?.currency || 'EUR',
        valid_till: request.needed_by_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'medium',
        status: 'draft',
        internal_notes: `Created from customer request ${requestId}`,
        customer_requirements: request.notes || '',
      })

      // Update request status
      await updateRequest.mutateAsync({
        id: requestId,
        data: {
          status: 'closed',
        }
      })

      toast.success('Opportunity created successfully!')
      router.push(`/trade/opportunities/${opportunity.id}`)
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error creating opportunity:', error)
      toast.error(error.message || 'Failed to create opportunity')
    }
  }

  const statusConfig = {
    complete: { icon: CheckCircle, color: 'text-green-600', label: 'Complete' },
    missing_price: { icon: AlertTriangle, color: 'text-yellow-600', label: 'Missing Price' },
    missing_transport: { icon: AlertTriangle, color: 'text-orange-600', label: 'Missing Transport' },
    missing_both: { icon: AlertTriangle, color: 'text-red-600', label: 'Missing Both' },
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl bg-terminal-panel border-terminal-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-terminal-text font-mono flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            BUILD OPPORTUNITY
          </DialogTitle>
          <DialogDescription className="text-terminal-muted font-mono">
            Select a supplier and configure pricing for this customer request
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4">
          {/* Left: Supplier List */}
          <div className="col-span-2 space-y-3">
            <div className="text-terminal-text font-mono text-sm font-bold">
              AVAILABLE SUPPLIERS ({potentialMatches?.length || 0})
            </div>

            {isLoading && (
              <div className="text-center py-8 text-terminal-muted font-mono">
                Searching for suppliers...
              </div>
            )}

            {!isLoading && (!potentialMatches || potentialMatches.length === 0) && (
              <div className="text-center py-8">
                <div className="text-terminal-muted font-mono mb-2">No suppliers found</div>
                <div className="text-terminal-muted font-mono text-xs">
                  Use "Find Product/Transport" to add supplier data
                </div>
              </div>
            )}

            {!isLoading && potentialMatches && potentialMatches.length > 0 && (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {potentialMatches.map((match) => {
                  const StatusIcon = statusConfig[match.status].icon
                  const isSelected = selectedMatch?.id === match.id

                  return (
                    <Card
                      key={match.id}
                      className={`bg-terminal-dark border-terminal-border cursor-pointer transition-all ${
                        isSelected ? 'ring-2 ring-terminal-accent' : 'hover:border-terminal-accent/50'
                      }`}
                      onClick={() => setSelectedMatch(match)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-terminal-text font-mono font-bold text-sm">
                                {match.supplier.name}
                              </h3>
                              {isSelected && <CheckCircle className="h-4 w-4 text-terminal-accent" />}
                            </div>
                            <p className="text-terminal-muted text-xs font-mono">
                              {match.supplier.city}, {match.supplier.country}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={`font-mono text-xs ${statusConfig[match.status].color}`}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[match.status].label}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                          <div>
                            <div className="text-terminal-muted">Price</div>
                            <div className="text-terminal-text">
                              {match.supplierPrice
                                ? `€${match.supplierPrice.pricePerUnit.toFixed(2)}/unit`
                                : '-'}
                            </div>
                          </div>
                          <div>
                            <div className="text-terminal-muted">Transport</div>
                            <div className="text-terminal-text">
                              {match.transportRoute
                                ? `${match.transportRoute.transporterName} (${match.transportRoute.durationDays}d)`
                                : '-'}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right: Pricing Panel */}
          <div className="col-span-1">
            {selectedMatch ? (
              <Card className="bg-terminal-dark border-terminal-border sticky top-0">
                <CardHeader>
                  <CardTitle className="text-terminal-text font-mono text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    PRICING
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Supplier Cost */}
                  <div>
                    <div className="text-terminal-muted text-xs font-mono mb-1">Supplier Cost</div>
                    <div className="text-terminal-text font-mono text-lg">
                      €{(selectedMatch.supplierPrice?.pricePerUnit || 0).toFixed(2)}
                    </div>
                  </div>

                  {/* Transport Band Selection */}
                  {selectedMatch.transportRoute?.availableBands && selectedMatch.transportRoute.availableBands.length > 0 && (
                    <div>
                      <div className="text-terminal-muted text-xs font-mono mb-1">Transport Band</div>
                      <Select
                        value={selectedBandIndex.toString()}
                        onValueChange={(v) => setSelectedBandIndex(parseInt(v))}
                      >
                        <SelectTrigger className="bg-terminal-panel border-terminal-border text-terminal-text font-mono text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-terminal-dark border-terminal-border">
                          {selectedMatch.transportRoute.availableBands.map((band, idx) => {
                            const costPerUnit = band.price_per_pallet / (selectedMatch.transportRoute?.unitsPerPallet || 1)
                            return (
                              <SelectItem key={band.id} value={idx.toString()}>
                                €{costPerUnit.toFixed(2)}/u ({band.min_pallets}-{band.max_pallets} pallets)
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Transport Cost */}
                  <div>
                    <div className="text-terminal-muted text-xs font-mono mb-1">Transport Cost</div>
                    <div className="text-terminal-text font-mono">
                      €{(() => {
                        if (!selectedMatch.transportRoute?.availableBands || selectedMatch.transportRoute.availableBands.length === 0) return '0.00'
                        const band = selectedMatch.transportRoute.availableBands[selectedBandIndex]
                        const cost = band.price_per_pallet / (selectedMatch.transportRoute.unitsPerPallet || 1)
                        return cost.toFixed(2)
                      })()}
                    </div>
                  </div>

                  {/* Margin */}
                  <div>
                    <div className="text-terminal-muted text-xs font-mono mb-1">Margin %</div>
                    <Input
                      type="number"
                      value={marginPercent}
                      onChange={(e) => setMarginPercent(parseFloat(e.target.value) || 0)}
                      className="bg-terminal-panel border-terminal-border text-terminal-text font-mono"
                    />
                  </div>

                  {/* Offer Price */}
                  <div>
                    <div className="text-terminal-muted text-xs font-mono mb-1">Offer Price</div>
                    <Input
                      type="number"
                      step="0.01"
                      value={offerPrice.toFixed(2)}
                      onChange={(e) => setOfferPrice(parseFloat(e.target.value) || 0)}
                      className="bg-terminal-panel border-terminal-border text-terminal-text font-mono text-lg font-bold"
                    />
                  </div>

                  <Button
                    onClick={handleCreateOpportunity}
                    disabled={selectedMatch.status !== 'complete' || createOpportunity.isPending}
                    className="w-full bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono"
                  >
                    {createOpportunity.isPending ? 'Creating...' : 'Create Opportunity'}
                  </Button>

                  {selectedMatch.status !== 'complete' && (
                    <div className="text-terminal-warning text-xs font-mono text-center">
                      ⚠️ Missing data - add price/transport first
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-terminal-dark border-terminal-border">
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 text-terminal-muted mx-auto mb-3" />
                  <div className="text-terminal-muted font-mono text-sm">
                    Select a supplier to configure pricing
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
