'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSuppliers } from '@/hooks/use-suppliers'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PriceTrendsWidget } from './price-trends-widget'

interface WeatherCropIntelProps {
  supplierId: string | null
  onSupplierChange: (supplierId: string) => void
}

export function WeatherCropIntel({ supplierId, onSupplierChange }: WeatherCropIntelProps) {
  const { data: suppliers } = useSuppliers()
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(supplierId)

  // Update local state when prop changes
  useEffect(() => {
    if (supplierId) {
      setSelectedSupplierId(supplierId)
    }
  }, [supplierId])

  return (
    <Card className="bg-terminal-panel border-terminal-border h-[calc(100vh-16rem)] flex flex-col">
      <CardHeader className="border-b border-terminal-border pb-3 flex-shrink-0">
        <CardTitle className="text-terminal-text font-mono text-sm">
          PRICE TRENDS
        </CardTitle>
        <div className="mt-2">
          <Select
            value={selectedSupplierId || ''}
            onValueChange={(value) => {
              setSelectedSupplierId(value)
              onSupplierChange(value)
            }}
          >
            <SelectTrigger className="w-full bg-terminal-dark border-terminal-border text-terminal-text font-mono text-xs">
              <SelectValue placeholder="Select supplier..." />
            </SelectTrigger>
            <SelectContent className="bg-terminal-dark border-terminal-border">
              {suppliers?.map(s => (
                <SelectItem key={s.id} value={s.id} className="font-mono text-terminal-text text-xs">
                  {s.name} - {s.city}, {s.country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-1 overflow-hidden">
        <PriceTrendsWidget />
      </CardContent>
    </Card>
  )
}
