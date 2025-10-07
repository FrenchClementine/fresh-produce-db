'use client'

import { use } from 'react'
import { useCustomerRequest } from '@/hooks/use-customer-requests'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Package, Building2, MapPin, Calendar, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { RequestActionPanel } from '@/components/request-action-panel'

interface RequestDetailPageProps {
  params: Promise<{ id: string }>
}

export default function RequestDetailPage({ params }: RequestDetailPageProps) {
  const { id } = use(params)
  const { data: request, isLoading } = useCustomerRequest(id)

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-terminal-text font-mono">Loading...</div>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="p-6">
        <div className="text-terminal-text font-mono">Request not found</div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50'
      case 'matched': return 'bg-blue-500/20 text-blue-500 border-blue-500/50'
      case 'quoted': return 'bg-purple-500/20 text-purple-500 border-purple-500/50'
      case 'closed': return 'bg-green-500/20 text-green-500 border-green-500/50'
      default: return 'bg-terminal-muted/20 text-terminal-muted border-terminal-muted/50'
    }
  }

  return (
    <div className="min-h-screen bg-terminal-dark p-6">
      {/* Header */}
      <div className="mb-6">
        <Link href="/trade/requests">
          <Button variant="ghost" className="text-terminal-text hover:bg-terminal-panel font-mono mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Requests
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-terminal-text font-mono mb-2">
              CUSTOMER REQUEST #{id.slice(0, 8).toUpperCase()}
            </h1>
            <p className="text-terminal-muted font-mono">
              Created {format(new Date(request.created_at), 'dd MMM yyyy HH:mm')}
            </p>
          </div>
          <Badge className={`${getStatusColor(request.status)} font-mono border`}>
            {request.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Request Details */}
        <div className="col-span-1 space-y-6">
          <Card className="bg-terminal-panel border-terminal-border">
            <CardHeader>
              <CardTitle className="text-terminal-text font-mono flex items-center gap-2">
                <Package className="h-4 w-4" />
                REQUEST DETAILS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-terminal-muted text-sm font-mono mb-1">Customer</div>
                <div className="text-terminal-text font-mono">{request.customers?.name}</div>
              </div>

              <div>
                <div className="text-terminal-muted text-sm font-mono mb-1">Product</div>
                <div className="text-terminal-text font-mono">
                  {request.products?.name}
                  {request.variety && (
                    <span className="text-terminal-muted ml-2">({request.variety})</span>
                  )}
                </div>
              </div>

              {request.quantity_needed && (
                <div>
                  <div className="text-terminal-muted text-sm font-mono mb-1">Quantity</div>
                  <div className="text-terminal-text font-mono">
                    {request.quantity_needed} {request.quantity_unit || 'units'}
                  </div>
                </div>
              )}

              {request.packaging_options && (
                <div>
                  <div className="text-terminal-muted text-sm font-mono mb-1">Packaging</div>
                  <div className="text-terminal-text font-mono">{request.packaging_options.label}</div>
                </div>
              )}

              {request.delivery_mode && (
                <div>
                  <div className="text-terminal-muted text-sm font-mono mb-1">Delivery Mode</div>
                  <div className="text-terminal-text font-mono">
                    {request.delivery_mode === 'DELIVERY' ? 'DDP' : 'Ex Works'}
                  </div>
                </div>
              )}

              {request.delivery_hub_id && request.hubs && (
                <div>
                  <div className="text-terminal-muted text-sm font-mono mb-1">Delivery Hub</div>
                  <div className="text-terminal-text font-mono">{request.hubs.name}</div>
                </div>
              )}

              {request.needed_by_date && (
                <div>
                  <div className="text-terminal-muted text-sm font-mono mb-1">Needed By</div>
                  <div className="text-terminal-text font-mono">
                    {format(new Date(request.needed_by_date), 'dd MMM yyyy')}
                  </div>
                </div>
              )}

              {request.target_price_per_unit && (
                <div>
                  <div className="text-terminal-muted text-sm font-mono mb-1">Target Price</div>
                  <div className="text-terminal-text font-mono">
                    €{request.target_price_per_unit.toFixed(2)}/unit
                  </div>
                </div>
              )}

              {request.notes && (
                <div>
                  <div className="text-terminal-muted text-sm font-mono mb-1">Notes</div>
                  <div className="text-terminal-text font-mono text-sm">{request.notes}</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-terminal-panel border-terminal-border">
            <CardHeader>
              <CardTitle className="text-terminal-text font-mono flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                MATCH PROGRESS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-terminal-muted font-mono text-sm">Suppliers Checked</span>
                <span className="text-terminal-text font-mono">{request.suppliers_checked}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-terminal-muted font-mono text-sm">Potential Matches</span>
                <span className="text-terminal-text font-mono">{request.potential_matches}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-terminal-muted font-mono text-sm">Quotes Sent</span>
                <span className="text-terminal-text font-mono">{request.quotes_sent}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Request Action Panel */}
        <div className="col-span-2">
          <RequestActionPanel requestId={id} request={request} />
        </div>
      </div>
    </div>
  )
}
