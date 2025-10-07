'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  Clock,
  DollarSign,
  Building2
} from 'lucide-react'
import { useOpportunitySummary } from '@/hooks/use-opportunities'
import { useCurrentSupplierPrices } from '@/hooks/use-supplier-prices'
import { QuickAccessPanel } from './components/quick-access-panel'
import { QuickFeedbackPanel } from './components/quick-feedback-panel'
import { WeatherCropIntel } from './components/weather-crop-intel'
import { ActiveOpportunitiesTerminal } from './components/active-opportunities-terminal'
import { WeatherTicker } from './components/weather-ticker'

export default function TradeOverviewTerminal() {
  const router = useRouter()
  const { data: summary } = useOpportunitySummary()
  const { data: supplierPrices } = useCurrentSupplierPrices()
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-terminal-dark p-4 space-y-4">
      {/* Growing Regions Weather Ticker */}
      <div className="bg-terminal-panel border border-terminal-border rounded overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="overflow-hidden flex-1">
            <WeatherTicker />
          </div>
        </div>
      </div>

      {/* Terminal Header */}
      <div className="flex items-center justify-between border-b border-terminal-border pb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-mono font-bold text-terminal-text tracking-wider">
            TRADE OVERVIEW TERMINAL
          </h1>
          <Badge className="bg-terminal-success text-terminal-dark font-mono">
            LIVE
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-terminal-muted font-mono text-sm">
            {new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            })}
          </div>
          <Button
            onClick={() => router.push('/admin-dashboard')}
            className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono"
          >
            <Building2 className="mr-2 h-4 w-4" />
            Admin Dashboard
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-4">
        <Card className="bg-terminal-panel border-terminal-border w-64">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-terminal-muted text-xs font-mono mb-1">OPPORTUNITIES</div>
                <div className="text-3xl font-mono font-bold text-terminal-text">
                  {summary?.total || 0}
                </div>
              </div>
              <Activity className="h-8 w-8 text-terminal-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-terminal-panel border-terminal-border w-64">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-terminal-muted text-xs font-mono mb-1">OFFERED</div>
                <div className="text-3xl font-mono font-bold text-terminal-warning">
                  {summary?.offered || 0}
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-terminal-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-terminal-panel border-terminal-border flex-1">
          <CardContent className="p-4 overflow-hidden">
            <div className="text-terminal-muted text-xs font-mono mb-2">LIVE SUPPLIER PRICES</div>
            <div className="overflow-hidden">
              <div className="animate-scroll-fast whitespace-nowrap text-terminal-text font-mono text-sm">
                {supplierPrices && supplierPrices.length > 0 ? (
                  <>
                    {supplierPrices.slice(0, 20).map((price, i) => (
                      <span key={i}>
                        {price.product_name} €{price.price_per_unit?.toFixed(2)}/{price.sold_by} {price.delivery_mode === 'DELIVERY' ? '🚚' : '📦'} {price.hub_code} ({price.supplier_name}) •{' '}
                      </span>
                    ))}
                    {supplierPrices.slice(0, 20).map((price, i) => (
                      <span key={`dup-${i}`}>
                        {price.product_name} €{price.price_per_unit?.toFixed(2)}/{price.sold_by} {price.delivery_mode === 'DELIVERY' ? '🚚' : '📦'} {price.hub_code} ({price.supplier_name}) •{' '}
                      </span>
                    ))}
                  </>
                ) : (
                  <>
                    Loading supplier prices... •{' '}
                    Loading supplier prices... •{' '}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Remove remaining cards */}
      <div className="hidden">
        <Card className="bg-terminal-panel border-terminal-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-terminal-muted text-xs font-mono mb-1">URGENT</div>
                <div className="text-3xl font-mono font-bold text-terminal-alert">
                  {summary?.byPriority?.urgent || 0}
                </div>
              </div>
              <AlertTriangle className="h-8 w-8 text-terminal-alert" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Left Column - Quick Actions */}
        <div className="col-span-1 space-y-4">
          <QuickAccessPanel />
          <QuickFeedbackPanel />
        </div>

        {/* Middle Column - Active Opportunities */}
        <div className="col-span-1">
          <ActiveOpportunitiesTerminal
            onSupplierSelect={(supplierId) => setSelectedSupplier(supplierId)}
          />
        </div>

        {/* Right Column - Weather & Crop Intelligence */}
        <div className="col-span-1">
          <WeatherCropIntel
            supplierId={selectedSupplier}
            onSupplierChange={(id) => setSelectedSupplier(id)}
          />
        </div>
      </div>
    </div>
  )
}
