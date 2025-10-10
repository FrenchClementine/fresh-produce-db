'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Check, X, TrendingUp, Package2, Sparkles } from 'lucide-react'
import { useSupplierPricesForMatching } from '@/hooks/use-supplier-matching'
import { useCreateSupplierMatch, useUpdateCustomerRequest } from '@/hooks/use-customer-requests'
import { CustomerProductRequest } from '@/types/customer-requests'
import { useRouter } from 'next/navigation'

interface SupplierMatchingPanelProps {
  requestId: string
  request: CustomerProductRequest
}

export function SupplierMatchingPanel({ requestId, request }: SupplierMatchingPanelProps) {
  const router = useRouter()
  const [isSearching, setIsSearching] = useState(false)
  const { data: potentialMatches, refetch: searchMatches } = useSupplierPricesForMatching(
    request.product_id,
    request.delivery_mode,
    request.delivery_hub_id,
    isSearching
  )
  const createMatch = useCreateSupplierMatch()
  const updateRequest = useUpdateCustomerRequest()

  const handleSearch = async () => {
    setIsSearching(true)
    await searchMatches()
  }

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

  const handleCreateMatch = async (supplierPrice: any) => {
    const { score, matches } = calculateMatchScore(supplierPrice)

    await createMatch.mutateAsync({
      request_id: requestId,
      supplier_id: supplierPrice.supplier_id,
      supplier_price_id: supplierPrice.id,
      match_score: score,
      price_match: matches.price,
      quality_match: true, // Default to true, can be manually adjusted
      certification_match: true, // Default to true, can be manually adjusted
      logistics_match: matches.logistics,
      quote_sent: false
    })

    // Update request status
    await updateRequest.mutateAsync({
      id: requestId,
      data: {
        status: 'matched'
      }
    })
  }

  const handleCreateOpportunity = async (supplierPrice: any) => {
    // Create match first
    await handleCreateMatch(supplierPrice)

    // Navigate to opportunity creation
    router.push(`/trade/opportunities/create?requestId=${requestId}&supplierId=${supplierPrice.supplier_id}`)
  }

  return (
    <Card className="bg-terminal-panel border-terminal-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-terminal-text font-mono flex items-center gap-2">
            <Package2 className="h-4 w-4" />
            SUPPLIER MATCHING
          </CardTitle>
          <Button
            onClick={handleSearch}
            disabled={isSearching || potentialMatches !== undefined}
            className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono"
          >
            <Search className="h-4 w-4 mr-2" />
            {isSearching ? 'Searching...' : potentialMatches ? 'Search Complete' : 'Find Matches'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!potentialMatches && !isSearching && (
          <div className="text-center py-12">
            <Sparkles className="h-12 w-12 text-terminal-muted mx-auto mb-4" />
            <p className="text-terminal-muted font-mono">
              Click "Find Matches" to search for potential suppliers
            </p>
          </div>
        )}

        {isSearching && (
          <div className="text-center py-12">
            <div className="text-terminal-text font-mono">Searching for matches...</div>
          </div>
        )}

        {potentialMatches && potentialMatches.length === 0 && (
          <div className="text-center py-12">
            <p className="text-terminal-muted font-mono">No matching suppliers found</p>
          </div>
        )}

        {potentialMatches && potentialMatches.length > 0 && (
          <div className="space-y-4">
            {potentialMatches.map((match: any) => {
              const { score, matches } = calculateMatchScore(match)

              return (
                <Card key={match.id} className="bg-terminal-dark border-terminal-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-terminal-text font-mono font-bold">
                          {match.suppliers?.name}
                        </h3>
                        <p className="text-terminal-muted text-sm font-mono">
                          {match.suppliers?.city}, {match.suppliers?.country}
                        </p>
                      </div>
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
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-terminal-muted text-xs font-mono mb-1">Price</div>
                        <div className="text-terminal-text font-mono flex items-center gap-2">
                          €{match.price_per_unit?.toFixed(2)}/{match.sold_by}
                          {matches.price && <Check className="h-4 w-4 text-green-500" />}
                        </div>
                      </div>

                      <div>
                        <div className="text-terminal-muted text-xs font-mono mb-1">Delivery</div>
                        <div className="text-terminal-text font-mono flex items-center gap-2">
                          {match.delivery_mode === 'DELIVERY' ? 'DDP' : 'Ex Works'}
                          {matches.logistics && <Check className="h-4 w-4 text-green-500" />}
                        </div>
                      </div>

                      {match.packaging_options && (
                        <div>
                          <div className="text-terminal-muted text-xs font-mono mb-1">Packaging</div>
                          <div className="text-terminal-text font-mono flex items-center gap-2">
                            {match.packaging_options.label}
                            {matches.packaging && <Check className="h-4 w-4 text-green-500" />}
                          </div>
                        </div>
                      )}

                      {match.available_from && (
                        <div>
                          <div className="text-terminal-muted text-xs font-mono mb-1">Available</div>
                          <div className="text-terminal-text font-mono">
                            {new Date(match.available_from).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleCreateMatch(match)}
                        variant="outline"
                        className="border-terminal-border text-terminal-text hover:bg-terminal-panel font-mono flex-1"
                        disabled={createMatch.isPending}
                      >
                        Save Match
                      </Button>
                      <Button
                        onClick={() => handleCreateOpportunity(match)}
                        className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono flex-1"
                        disabled={createMatch.isPending}
                      >
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Create Opportunity
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
