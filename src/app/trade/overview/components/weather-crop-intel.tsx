'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PriceTrendsWidget } from './price-trends-widget'

interface WeatherCropIntelProps {
  supplierId: string | null
  onSupplierChange: (supplierId: string) => void
}

export function WeatherCropIntel({ supplierId, onSupplierChange }: WeatherCropIntelProps) {

  return (
    <Card className="bg-terminal-panel border-terminal-border h-[calc(50vh-8rem)] flex flex-col">
      <CardHeader className="border-b border-terminal-border pb-3 flex-shrink-0">
        <CardTitle className="text-terminal-text font-mono text-sm">
          PRICE TRENDS
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex-1 overflow-hidden">
        <PriceTrendsWidget />
      </CardContent>
    </Card>
  )
}
