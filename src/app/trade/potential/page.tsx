'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { useTradePotential } from '@/hooks/use-trade-potential'
import { PotentialStatus } from '@/types/trade-potential'
import Link from 'next/link'

// Import existing table mode content (we'll extract it to a component)
import TradePotentialTableMode from './components/table-mode'

export default function TradePotentialPage() {
  const [statusFilter, setStatusFilter] = useState<PotentialStatus>('all')
  const [showOpportunityFilter, setShowOpportunityFilter] = useState(false)

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
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading trade potential...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-red-600">
          <p>Error loading trade potential</p>
          <Button onClick={() => refetch()} className="mt-4">Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 page-transition">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trade Potential</h1>
          <p className="text-muted-foreground">
            Customer → Supplier product matches and their opportunity status
          </p>
        </div>
        <Button asChild>
          <Link href="/trade/opportunities">
            View Opportunities
          </Link>
        </Button>
      </div>

      <TradePotentialTableMode
        potentials={filteredData}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        showOpportunityFilter={showOpportunityFilter}
        setShowOpportunityFilter={setShowOpportunityFilter}
        onRefresh={refetch}
      />
    </div>
  )
}
