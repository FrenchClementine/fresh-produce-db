'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CustomerProductRequest } from '@/types/customer-requests'
import { useSupplierPricesForMatching } from '@/hooks/use-supplier-matching'
import { useCreateOpportunity } from '@/hooks/use-opportunities'
import { useUpdateCustomerRequest } from '@/hooks/use-customer-requests'
import { toast } from 'sonner'
import { CheckCircle, Package, TrendingUp, DollarSign } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface BuildOpportunityFromRequestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requestId: string
  request: CustomerProductRequest
}

export function BuildOpportunityFromRequestModal({
  open,
  onOpenChange,
  requestId,
  request,
}: BuildOpportunityFromRequestModalProps) {
  const router = useRouter()
  const [selectedMatch, setSelectedMatch] = useState<any>(null)
  const [isCreating, setIsCreating] = useState(false)

  const { data: potentialMatches, isLoading } = useSupplierPricesForMatching(
    request.product_id,
    request.delivery_mode,
    request.delivery_hub_id,
    open
  )

  const createOpportunity = useCreateOpportunity()
  const updateRequest = useUpdateCustomerRequest()

  const calculateMatchScore = (supplierPrice: any) => {
    let score = 0
    let matches = {
      price: false,
      logistics: false,
      packaging: false
    }

    // Price match (within 10% of target)
    if (request.target_price_per_unit && supplierPrice.price_per_unit) {
      const priceDiff = Math.abs(supplierPrice.price_per_unit - request.target_price_per_unit)
      const percentDiff = (priceDiff / request.target_price_per_unit) * 100
      if (percentDiff <= 10) {
        score += 40
        matches.price = true
      } else if (percentDiff <= 20) {
        score += 20
      }
    }

    // Logistics match (delivery mode)
    if (supplierPrice.delivery_mode === request.delivery_mode) {
      score += 30
      matches.logistics = true
    }

    // Packaging match
    if (supplierPrice.packaging_id === request.packaging_type_id) {
      score += 30
      matches.packaging = true
    }

    return { score, matches }
  }

  const handleCreateOpportunity = async (supplierPrice: any) => {
    setIsCreating(true)
    try {
      // Calculate offer price (supplier price + 15% margin)
      const offerPrice = supplierPrice.price_per_unit * 1.15

      // Create opportunity
      const opportunity = await createOpportunity.mutateAsync({
        customer_id: request.customer_id,
        supplier_id: supplierPrice.supplier_id,
        product_packaging_spec_id: supplierPrice.supplier_product_packaging_spec_id,
        selected_supplier_id: supplierPrice.supplier_id,
        supplier_price_per_unit: supplierPrice.price_per_unit,
        transport_cost_per_unit: 0, // Will be calculated later if needed
        estimated_total_cost: supplierPrice.price_per_unit,
        offer_price_per_unit: offerPrice,
        offer_currency: supplierPrice.currency || 'EUR',
        valid_till: request.needed_by_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'medium',
        status: 'draft',
        internal_notes: `Created from customer request ${requestId}`,
        customer_requirements: request.notes || '',
      })

      // Update request status to answered
      await updateRequest.mutateAsync({
        id: requestId,
        data: {
          status: 'closed',
        }
      })

      toast.success('Opportunity created successfully!')

      // Navigate to the new opportunity
      router.push(`/trade/opportunities/${opportunity.id}`)

      onOpenChange(false)
    } catch (error: any) {
      console.error('Error creating opportunity:', error)
      toast.error(error.message || 'Failed to create opportunity')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-terminal-panel border-terminal-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-terminal-text font-mono flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            BUILD OPPORTUNITY
          </DialogTitle>
          <DialogDescription className="text-terminal-muted font-mono">
            Select a supplier to create an opportunity for this customer request
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Request Summary */}
          <Card className="bg-terminal-dark border-terminal-border">
            <CardHeader>
              <CardTitle className="text-terminal-text font-mono text-sm flex items-center gap-2">
                <Package className="h-4 w-4" />
                REQUEST SUMMARY
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm font-mono">
              <div>
                <span className="text-terminal-muted">Customer:</span>
                <span className="text-terminal-text ml-2">{request.customers?.name}</span>
              </div>
              <div>
                <span className="text-terminal-muted">Product:</span>
                <span className="text-terminal-text ml-2">{request.products?.name}</span>
              </div>
              <div>
                <span className="text-terminal-muted">Quantity:</span>
                <span className="text-terminal-text ml-2">
                  {request.quantity_needed} {request.quantity_unit}
                </span>
              </div>
              {request.target_price_per_unit && (
                <div>
                  <span className="text-terminal-muted">Target Price:</span>
                  <span className="text-terminal-text ml-2">
                    €{request.target_price_per_unit.toFixed(2)}/unit
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supplier Matches */}
          <div className="space-y-3">
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
                <div className="text-terminal-muted font-mono mb-2">No matching suppliers found</div>
                <div className="text-terminal-muted font-mono text-xs">
                  Try adding a supplier price first
                </div>
              </div>
            )}

            {!isLoading && potentialMatches && potentialMatches.length > 0 && (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {potentialMatches.map((match: any) => {
                  const { score, matches } = calculateMatchScore(match)

                  return (
                    <Card
                      key={match.id}
                      className={`bg-terminal-dark border-terminal-border cursor-pointer transition-all ${
                        selectedMatch?.id === match.id
                          ? 'ring-2 ring-terminal-accent'
                          : 'hover:border-terminal-accent/50'
                      }`}
                      onClick={() => setSelectedMatch(match)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-terminal-text font-mono font-bold">
                              {match.suppliers?.name}
                            </h3>
                            <p className="text-terminal-muted text-sm font-mono">
                              {match.suppliers?.city}, {match.suppliers?.country}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={`font-mono ${
                                score >= 80
                                  ? 'bg-green-500/20 text-green-500 border-green-500/50'
                                  : score >= 50
                                  ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50'
                                  : 'bg-red-500/20 text-red-500 border-red-500/50'
                              } border`}
                            >
                              {score}% MATCH
                            </Badge>
                            {selectedMatch?.id === match.id && (
                              <CheckCircle className="h-5 w-5 text-terminal-accent" />
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-sm font-mono">
                          <div>
                            <div className="text-terminal-muted text-xs mb-1">Price</div>
                            <div className="text-terminal-text flex items-center gap-2">
                              €{match.price_per_unit?.toFixed(2)}/{match.sold_by}
                              {matches.price && <CheckCircle className="h-3 w-3 text-green-500" />}
                            </div>
                          </div>

                          <div>
                            <div className="text-terminal-muted text-xs mb-1">Delivery</div>
                            <div className="text-terminal-text flex items-center gap-2">
                              {match.delivery_mode === 'DELIVERY' ? 'DDP' : 'Ex Works'}
                              {matches.logistics && <CheckCircle className="h-3 w-3 text-green-500" />}
                            </div>
                          </div>

                          {match.packaging_options && (
                            <div>
                              <div className="text-terminal-muted text-xs mb-1">Packaging</div>
                              <div className="text-terminal-text flex items-center gap-2">
                                {match.packaging_options.label}
                                {matches.packaging && <CheckCircle className="h-3 w-3 text-green-500" />}
                              </div>
                            </div>
                          )}
                        </div>

                        {match.available_from && (
                          <div className="mt-2 text-xs font-mono text-terminal-muted">
                            Available from: {new Date(match.available_from).toLocaleDateString()}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-terminal-border">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-terminal-border text-terminal-text hover:bg-terminal-dark font-mono"
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedMatch && handleCreateOpportunity(selectedMatch)}
              disabled={!selectedMatch || isCreating}
              className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              {isCreating ? 'Creating...' : 'Create Opportunity'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
