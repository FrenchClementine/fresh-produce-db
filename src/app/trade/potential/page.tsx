'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { useTradePotential } from '@/hooks/use-trade-potential'
import { PotentialStatus } from '@/types/trade-potential'
import { TrendingUp, RefreshCw } from 'lucide-react'
import Link from 'next/link'

// Import existing table mode content (we'll extract it to a component)
import TradePotentialTableMode from './components/table-mode'

export default function TradePotentialPage() {
  const [statusFilter, setStatusFilter] = useState<PotentialStatus>('all')
  const [showOpportunityFilter, setShowOpportunityFilter] = useState(false)
  const [customerFilter, setCustomerFilter] = useState<string>('all')
  const [supplierFilter, setSupplierFilter] = useState<string>('all')
  const [agentFilter, setAgentFilter] = useState<string>('all')

  const { data, isLoading, error, refetch } = useTradePotential(statusFilter)

  // Filter out items with opportunities if toggle is on
  const filteredData = useMemo(() => {
    if (!data?.potentials) return []
    if (showOpportunityFilter) {
      return data.potentials.filter(p => !p.hasOpportunity)
    }
    return data.potentials
  }, [data, showOpportunityFilter])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-terminal-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terminal-accent mx-auto mb-4"></div>
          <p className="text-terminal-muted font-mono">Loading trade potential...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-terminal-dark flex items-center justify-center">
        <div className="text-center">
          <p className="text-terminal-alert font-mono mb-4">Error loading trade potential</p>
          <Button onClick={() => refetch()} className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-terminal-dark px-2 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-terminal-border pb-4 px-2">
        <div className="flex items-center gap-4">
          <TrendingUp className="h-8 w-8 text-terminal-accent" />
          <div>
            <h1 className="text-2xl font-mono font-bold text-terminal-text tracking-wider">
              TRADE POTENTIAL
            </h1>
            <p className="text-terminal-muted font-mono text-sm">
              Customer → Supplier product matches and their opportunity status
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => refetch()}
            disabled={isLoading}
            variant="outline"
            className="bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Calculating...' : 'Recalculate All'}
          </Button>
          <Button asChild className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono">
            <Link href="/trade/opportunity">
              View Opportunities
            </Link>
          </Button>
        </div>
      </div>

      <TradePotentialTableMode
        potentials={filteredData}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        showOpportunityFilter={showOpportunityFilter}
        setShowOpportunityFilter={setShowOpportunityFilter}
        customerFilter={customerFilter}
        setCustomerFilter={setCustomerFilter}
        supplierFilter={supplierFilter}
        setSupplierFilter={setSupplierFilter}
        agentFilter={agentFilter}
        setAgentFilter={setAgentFilter}
        onRefresh={refetch}
      />
    </div>
  )
}
