'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Zap, DollarSign, Package, TrendingUp, Printer } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PrintPricesModal } from './print-prices-modal'

export function QuickAccessPanel() {
  const router = useRouter()
  const [showPrintModal, setShowPrintModal] = useState(false)

  return (
    <>
      <Card className="bg-terminal-panel border-terminal-border">
        <CardHeader className="border-b border-terminal-border pb-3">
          <CardTitle className="text-terminal-text font-mono text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-terminal-accent" />
            QUICK ACCESS
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <Button
            onClick={() => router.push('/trade/prices')}
            className="w-full bg-terminal-dark border-2 border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono justify-start h-14 text-sm transition-all"
          >
            <DollarSign className="h-5 w-5 mr-3" />
            Input Prices
          </Button>

          <Button
            onClick={() => router.push('/trade/requests')}
            className="w-full bg-terminal-dark border-2 border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono justify-start h-14 text-sm transition-all"
          >
            <Package className="h-5 w-5 mr-3" />
            Customer Request
          </Button>

          <Button
            onClick={() => router.push('/trade/potential')}
            className="w-full bg-terminal-dark border-2 border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono justify-start h-14 text-sm transition-all"
          >
            <TrendingUp className="h-5 w-5 mr-3" />
            Product Potential
          </Button>

          <div className="pt-2 border-t border-terminal-border">
            <Button
              onClick={() => setShowPrintModal(true)}
              className="w-full bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono h-14 text-sm font-bold"
            >
              <Printer className="h-5 w-5 mr-3" />
              Print Prices
            </Button>
          </div>
        </CardContent>
      </Card>

      <PrintPricesModal
        open={showPrintModal}
        onOpenChange={setShowPrintModal}
      />
    </>
  )
}
