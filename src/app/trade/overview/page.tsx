'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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
  Printer,
  BarChart3
} from 'lucide-react'
import { PSContainer, PSGrid, PSCard, PSCardHeader, PSPageHeader } from '@/components/layout'
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
    <PSContainer>
      {/* Weather Ticker */}
      <PSCard className="mb-2 lg:mb-3 py-1.5 lg:py-2">
        <div className="flex items-center">
          <div className="overflow-hidden flex-1">
            <WeatherTicker />
          </div>
        </div>
      </PSCard>

      {/* Page Header */}
      <div className="flex items-center justify-between mb-3 lg:mb-4 pb-2 lg:pb-3 border-b border-terminal-border">
        <div className="flex items-center gap-2 lg:gap-3">
          <BarChart3 className="h-6 w-6 lg:h-7 lg:w-7 text-terminal-accent flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg lg:text-xl font-semibold text-terminal-text tracking-tight font-mono">Trade Overview</h1>
            <p className="text-xs lg:text-sm text-terminal-muted mt-0.5 hidden sm:block font-mono">Real-time view of your fresh produce operations</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 lg:gap-2 flex-shrink-0">
          <Badge className="bg-terminal-accent text-terminal-dark text-[10px] lg:text-xs px-1.5 lg:px-2 py-0.5">
            LIVE
          </Badge>
          <div className="hidden sm:flex items-center gap-1 lg:gap-1.5 text-terminal-muted text-sm">
            <Clock className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
            <span className="text-[10px] lg:text-xs font-mono">
              {currentTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap items-center gap-1.5 lg:gap-2 mb-3 lg:mb-4">
        <Button
          onClick={() => router.push('/trade/prices')}
          variant="outline"
          size="sm"
          className="h-7 lg:h-8 text-[11px] lg:text-xs px-2 lg:px-3 bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono"
        >
          <DollarSign className="h-3 w-3 lg:h-3.5 lg:w-3.5 mr-1 lg:mr-1.5" />
          <span className="hidden sm:inline">Input </span>Prices
        </Button>

        <Button
          onClick={() => router.push('/trade/requests')}
          variant="outline"
          size="sm"
          className="h-7 lg:h-8 text-[11px] lg:text-xs px-2 lg:px-3 bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono"
        >
          <Package className="h-3 w-3 lg:h-3.5 lg:w-3.5 mr-1 lg:mr-1.5" />
          <span className="hidden sm:inline">Customer </span>Request
        </Button>

        <Button
          onClick={() => router.push('/trade/potential')}
          variant="outline"
          size="sm"
          className="h-7 lg:h-8 text-[11px] lg:text-xs px-2 lg:px-3 bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono"
        >
          <TrendingUp className="h-3 w-3 lg:h-3.5 lg:w-3.5 mr-1 lg:mr-1.5" />
          <span className="hidden sm:inline">Product </span>Potential
        </Button>

        <Button
          onClick={() => router.push('/trade/overview/print-report')}
          size="sm"
          className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark h-7 lg:h-8 text-[11px] lg:text-xs px-2 lg:px-3 font-mono"
        >
          <Printer className="h-3 w-3 lg:h-3.5 lg:w-3.5 mr-1 lg:mr-1.5" />
          Print<span className="hidden sm:inline"> Prices</span>
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-3 mb-3 lg:mb-4 auto-rows-fr">
        <PSCard className="min-w-0">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex-1 min-w-0">
              <div className="text-terminal-muted text-[8px] lg:text-[9px] uppercase tracking-wide font-medium mb-0.5 font-mono">Active Customers</div>
              <div className="text-lg lg:text-xl font-bold text-terminal-text leading-none font-mono">
                {opportunityStats.uniqueCustomers}
              </div>
              <div className="text-terminal-muted text-[9px] lg:text-[10px] mt-0.5 lg:mt-1 truncate font-mono">
                {opportunityStats.totalOpportunities} opps
              </div>
            </div>
            <Activity className="h-5 w-5 lg:h-6 lg:w-6 text-terminal-accent flex-shrink-0" />
          </div>
        </PSCard>

        <PSCard className="min-w-0">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex-1 min-w-0">
              <div className="text-terminal-muted text-[8px] lg:text-[9px] uppercase tracking-wide font-medium mb-0.5 font-mono">Active Suppliers</div>
              <div className="text-lg lg:text-xl font-bold text-terminal-text leading-none font-mono">
                {supplierStats.uniqueSuppliers}
              </div>
              <div className="text-terminal-muted text-[9px] lg:text-[10px] mt-0.5 lg:mt-1 truncate font-mono">
                {supplierStats.totalPrices} prices
              </div>
            </div>
            <Building2 className="h-5 w-5 lg:h-6 lg:w-6 text-terminal-accent flex-shrink-0" />
          </div>
        </PSCard>

        <PSCard className="min-w-0 col-span-2 sm:col-span-2 lg:col-span-1">
          <WeatherForecastCycle />
        </PSCard>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-3 xl:gap-4 auto-rows-fr">
        {/* Left Column - Supplier Prices */}
        <div className="min-w-0 space-y-2 lg:space-y-3">
          <SupplierPricesPanel />
        </div>

        {/* Middle Column - Active Opportunities */}
        <div className="min-w-0">
          <ActiveOpportunitiesTerminal
            onSupplierSelect={(supplierId) => setSelectedSupplier(supplierId)}
          />
        </div>

        {/* Right Column - Weather & Crop Intelligence + Product Images */}
        <div className="min-w-0 space-y-2 lg:space-y-3">
          <WeatherCropIntel
            supplierId={selectedSupplier}
            onSupplierChange={(id) => setSelectedSupplier(id)}
          />
          <ProductImagesCarousel />
        </div>
      </div>
    </PSContainer>
  )
}
