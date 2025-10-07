'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package2, TrendingUp, Truck, Plus } from 'lucide-react'
import { CustomerProductRequest } from '@/types/customer-requests'
import { AddSupplierPriceModal } from '@/components/forms/add-supplier-price-modal'
import { AddTransportRouteModal } from '@/components/forms/add-transport-route-modal'
import { BuildOpportunityFromRequestModalV2 } from '@/components/forms/build-opportunity-from-request-modal-v2'

interface RequestActionPanelProps {
  requestId: string
  request: CustomerProductRequest
}

export function RequestActionPanel({ requestId, request }: RequestActionPanelProps) {
  const [showAddPrice, setShowAddPrice] = useState(false)
  const [showAddTransport, setShowAddTransport] = useState(false)
  const [showBuildOpportunity, setShowBuildOpportunity] = useState(false)

  return (
    <>
      <Card className="bg-terminal-panel border-terminal-border">
        <CardHeader>
          <CardTitle className="text-terminal-text font-mono flex items-center gap-2">
            <Package2 className="h-4 w-4" />
            REQUEST ACTIONS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Action Description */}
          <div className="text-terminal-muted font-mono text-sm">
            To fulfill this request, you can either add missing product/transport data or build an opportunity from existing suppliers.
          </div>

          {/* Find Product/Transport Section */}
          <div className="space-y-3">
            <div className="text-terminal-text font-mono text-sm font-bold">
              1. FIND PRODUCT / TRANSPORT
            </div>
            <div className="text-terminal-muted font-mono text-xs mb-3">
              Add supplier prices or transport routes if they don't exist in the system yet.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setShowAddPrice(true)}
                className="bg-terminal-dark border-2 border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono h-24 flex-col gap-2"
              >
                <Plus className="h-6 w-6" />
                <div>Add Supplier Price</div>
              </Button>
              <Button
                onClick={() => setShowAddTransport(true)}
                className="bg-terminal-dark border-2 border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono h-24 flex-col gap-2"
              >
                <Truck className="h-6 w-6" />
                <div>Add Transport Route</div>
              </Button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-terminal-border"></div>

          {/* Build Opportunity Section */}
          <div className="space-y-3">
            <div className="text-terminal-text font-mono text-sm font-bold">
              2. BUILD OPPORTUNITY
            </div>
            <div className="text-terminal-muted font-mono text-xs mb-3">
              Create an opportunity by matching this request with available suppliers and transport.
            </div>
            <Button
              onClick={() => setShowBuildOpportunity(true)}
              className="w-full bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono h-16"
            >
              <TrendingUp className="h-5 w-5 mr-2" />
              Build Opportunity
            </Button>
          </div>

          {/* Info Box */}
          <div className="bg-terminal-dark border border-terminal-border rounded p-3">
            <div className="text-terminal-muted font-mono text-xs">
              💡 TIP: Once an opportunity is created from this request, it will be marked as answered and linked to the opportunity.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <AddSupplierPriceModal
        open={showAddPrice}
        onOpenChange={setShowAddPrice}
        requestContext={request}
      />
      <AddTransportRouteModal
        open={showAddTransport}
        onOpenChange={setShowAddTransport}
        requestContext={request}
      />
      <BuildOpportunityFromRequestModalV2
        open={showBuildOpportunity}
        onOpenChange={setShowBuildOpportunity}
        requestId={requestId}
        request={request}
      />
    </>
  )
}
