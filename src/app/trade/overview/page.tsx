'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  Clock,
  DollarSign
} from 'lucide-react'
import { useOpportunitySummary } from '@/hooks/use-opportunities'
import { QuickQuotePanel } from './components/quick-quote-panel'
import { QuickFeedbackPanel } from './components/quick-feedback-panel'
import { WeatherCropIntel } from './components/weather-crop-intel'
import { ActiveOpportunitiesTerminal } from './components/active-opportunities-terminal'

export default function TradeOverviewTerminal() {
  const { data: summary } = useOpportunitySummary()
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-terminal-dark p-4 space-y-4">
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
        <div className="text-terminal-muted font-mono text-sm">
          {new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          })}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="bg-terminal-panel border-terminal-border">
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

        <Card className="bg-terminal-panel border-terminal-border">
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

        <Card className="bg-terminal-panel border-terminal-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-terminal-muted text-xs font-mono mb-1">CONFIRMED</div>
                <div className="text-3xl font-mono font-bold text-terminal-success">
                  {summary?.confirmed || 0}
                </div>
              </div>
              <TrendingUp className="h-8 w-8 text-terminal-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-terminal-panel border-terminal-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-terminal-muted text-xs font-mono mb-1">EXPIRING</div>
                <div className="text-3xl font-mono font-bold text-terminal-alert">
                  {summary?.expiringSoon || 0}
                </div>
              </div>
              <Clock className="h-8 w-8 text-terminal-alert" />
            </div>
          </CardContent>
        </Card>

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
          <QuickQuotePanel />
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
          <WeatherCropIntel supplierId={selectedSupplier} />
        </div>
      </div>
    </div>
  )
}
