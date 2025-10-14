'use client'

import { useState, useEffect, useMemo } from 'react'
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
  Building2,
  Package,
  Printer
} from 'lucide-react'
import { useOpportunitySummary, useOpportunitiesRealtime, useOpportunities } from '@/hooks/use-opportunities'
import { useCurrentSupplierPrices, useSupplierPricesRealtime } from '@/hooks/use-supplier-prices'
import { usePriceTrendsRealtime } from '@/hooks/use-price-trends'
import { useCustomerRequests } from '@/hooks/use-customer-requests'
import { SupplierPricesPanel } from './components/supplier-prices-panel'
import { WeatherCropIntel } from './components/weather-crop-intel'
import { ActiveOpportunitiesTerminal } from './components/active-opportunities-terminal'
import { WeatherTicker } from './components/weather-ticker'
import { WeatherForecastCycle } from './components/weather-forecast-cycle'
import { ProductImagesCarousel } from './components/product-images-carousel'

export default function TradeOverviewTerminal() {
  const router = useRouter()
  const { data: summary } = useOpportunitySummary()
  const { data: opportunities } = useOpportunities('all', 'all', true)
  const { data: supplierPrices } = useCurrentSupplierPrices()
  const { data: activeRequests } = useCustomerRequests({ status: 'open' })
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Calculate unique customers and total opportunities
  const opportunityStats = useMemo(() => {
    if (!opportunities || opportunities.length === 0) {
      return { uniqueCustomers: 0, totalOpportunities: 0 }
    }

    const uniqueCustomerIds = new Set(
      opportunities
        .filter(opp => opp.customer_id)
        .map(opp => opp.customer_id)
    )

    return {
      uniqueCustomers: uniqueCustomerIds.size,
      totalOpportunities: opportunities.length
    }
  }, [opportunities])

  // Calculate active suppliers and total prices
  const supplierStats = useMemo(() => {
    if (!supplierPrices || supplierPrices.length === 0) {
      return { uniqueSuppliers: 0, totalPrices: 0 }
    }

    const uniqueSupplierIds = new Set(supplierPrices.map(p => p.supplier_id))
    return {
      uniqueSuppliers: uniqueSupplierIds.size,
      totalPrices: supplierPrices.length
    }
  }, [supplierPrices])

  // Enable realtime subscriptions
  useSupplierPricesRealtime()
  useOpportunitiesRealtime()
  usePriceTrendsRealtime()

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

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

          {/* Quick Access Buttons */}
          <div className="flex items-center gap-2 ml-4">
            <Button
              onClick={() => router.push('/trade/prices')}
              variant="outline"
              size="sm"
              className="bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Input Prices
            </Button>

            <Button
              onClick={() => router.push('/trade/requests')}
              variant="outline"
              size="sm"
              className="bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono"
            >
              <Package className="h-4 w-4 mr-2" />
              Customer Request
            </Button>

            <Button
              onClick={() => router.push('/trade/potential')}
              variant="outline"
              size="sm"
              className="bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Product Potential
            </Button>

            <Button
              onClick={() => router.push('/trade/overview/print-report')}
              size="sm"
              className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Prices
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-terminal-muted font-mono text-sm">
            <Clock className="h-4 w-4" />
            {currentTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            })}
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-4 items-stretch">
        <Card className="bg-terminal-panel border-terminal-border w-64">
          <CardContent className="p-4 h-full flex items-center">
            <div className="flex items-center justify-between w-full">
              <div>
                <div className="text-terminal-muted text-xs font-mono mb-1">Active Customers</div>
                <div className="text-3xl font-mono font-bold text-terminal-text">
                  {opportunityStats.uniqueCustomers}
                </div>
                <div className="text-terminal-muted text-xs font-mono mt-1">
                  {opportunityStats.totalOpportunities} opportunities
                </div>
              </div>
              <Activity className="h-8 w-8 text-terminal-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-terminal-panel border-terminal-border w-64">
          <CardContent className="p-4 h-full flex items-center">
            <div className="flex items-center justify-between w-full">
              <div>
                <div className="text-terminal-muted text-xs font-mono mb-1">Active Suppliers</div>
                <div className="text-3xl font-mono font-bold text-terminal-success">
                  {supplierStats.uniqueSuppliers}
                </div>
                <div className="text-terminal-muted text-xs font-mono mt-1">
                  {supplierStats.totalPrices} prices
                </div>
              </div>
              <Building2 className="h-8 w-8 text-terminal-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-terminal-panel border-terminal-border flex-1">
          <CardContent className="p-4 h-full flex items-center">
            <WeatherForecastCycle />
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
        {/* Left Column - Supplier Prices */}
        <div className="col-span-1 space-y-4">
          <SupplierPricesPanel />
        </div>

        {/* Middle Column - Active Opportunities */}
        <div className="col-span-1">
          <ActiveOpportunitiesTerminal
            onSupplierSelect={(supplierId) => setSelectedSupplier(supplierId)}
          />
        </div>

        {/* Right Column - Weather & Crop Intelligence + Product Images */}
        <div className="col-span-1 space-y-4">
          <WeatherCropIntel
            supplierId={selectedSupplier}
            onSupplierChange={(id) => setSelectedSupplier(id)}
          />
          <ProductImagesCarousel />
        </div>
      </div>
    </div>
  )
}
