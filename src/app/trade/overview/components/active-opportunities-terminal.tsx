'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useOpportunities } from '@/hooks/use-opportunities'
import { Activity } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ActiveOpportunitiesTerminalProps {
  onSupplierSelect: (supplierId: string) => void
}

export function ActiveOpportunitiesTerminal({ onSupplierSelect }: ActiveOpportunitiesTerminalProps) {
  const { data: opportunities } = useOpportunities('all', 'all', true)

  const activeOpps = opportunities?.slice(0, 15) || []

  return (
    <Card className="bg-terminal-panel border-terminal-border h-[calc(100vh-16rem)]">
      <CardHeader className="border-b border-terminal-border pb-3">
        <CardTitle className="text-terminal-text font-mono text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-terminal-success" />
          ACTIVE OPPORTUNITIES
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-full">
          <div className="divide-y divide-terminal-border">
            {activeOpps.map((opp) => {
              const statusColors = {
                draft: 'text-terminal-muted',
                active: 'text-terminal-accent',
                negotiating: 'text-terminal-warning',
                offered: 'text-terminal-warning',
                confirmed: 'text-terminal-success',
                cancelled: 'text-terminal-alert',
                completed: 'text-terminal-success'
              }

              return (
                <div
                  key={opp.id}
                  className="p-3 hover:bg-terminal-dark cursor-pointer transition-colors"
                  onClick={() => opp.supplier?.id && onSupplierSelect(opp.supplier.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="text-terminal-text text-sm font-mono font-semibold">
                        {opp.customer?.name}
                      </div>
                      <div className="text-terminal-muted text-xs font-mono">
                        {opp.supplier?.name}
                      </div>
                    </div>
                    <Badge className={`${statusColors[opp.status]} bg-transparent border-0 font-mono text-xs`}>
                      {opp.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="text-terminal-text text-xs font-mono mb-1">
                    {opp.product_packaging_specs?.products.name}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-terminal-success text-sm font-mono font-bold">
                        €{opp.offer_price_per_unit?.toFixed(2)}/{opp.product_packaging_specs?.products.sold_by}
                      </span>
                      <Badge variant="outline" className={`text-xs font-mono ${
                        opp.supplier_price?.delivery_mode === 'DELIVERY'
                          ? 'border-terminal-success text-terminal-success'
                          : 'border-terminal-accent text-terminal-accent'
                      }`}>
                        {opp.supplier_price?.delivery_mode === 'DELIVERY' ? 'DDP' : 'EXW'}
                      </Badge>
                    </div>
                    {opp.feedback_status && (
                      <span className="text-terminal-muted text-xs font-mono">
                        {opp.feedback_status}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
