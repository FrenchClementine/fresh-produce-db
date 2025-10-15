'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TransporterListTerminal } from '@/components/transporters/transporter-list-terminal'
import { BulkRouteEntryTable } from '@/components/transporters/bulk-route-entry-table'
import { TransporterRoutesList } from '@/components/transporters/transporter-routes-list'
import { RoutePriceBandsList } from '@/components/transporters/route-price-bands-list'
import { Truck } from 'lucide-react'

export default function TransportersPage() {
  return (
    <div className="min-h-screen bg-terminal-dark px-2 py-4 space-y-4">
      {/* Header */}
      <div className="border-b border-terminal-border pb-4">
        <h1 className="text-2xl font-mono font-bold text-terminal-text tracking-wider flex items-center gap-3">
          <Truck className="h-6 w-6 text-terminal-accent" />
          TRANSPORTER SYSTEM
          <Badge className="bg-terminal-success text-terminal-dark font-mono">
            LIVE
          </Badge>
        </h1>
        <p className="text-terminal-muted font-mono text-sm mt-2">
          Manage third-party logistics providers, their routes, and pricing for internal logistics planning.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="transporters" className="space-y-4">
        <TabsList className="bg-terminal-panel border border-terminal-border">
          <TabsTrigger
            value="transporters"
            className="font-mono text-xs data-[state=active]:bg-terminal-accent data-[state=active]:text-terminal-dark data-[state=active]:font-bold"
          >
            TRANSPORTERS
          </TabsTrigger>
          <TabsTrigger
            value="bulk-entry"
            className="font-mono text-xs data-[state=active]:bg-terminal-accent data-[state=active]:text-terminal-dark data-[state=active]:font-bold"
          >
            BULK ENTRY
          </TabsTrigger>
          <TabsTrigger
            value="routes"
            className="font-mono text-xs data-[state=active]:bg-terminal-accent data-[state=active]:text-terminal-dark data-[state=active]:font-bold"
          >
            ROUTES
          </TabsTrigger>
          <TabsTrigger
            value="pricing"
            className="font-mono text-xs data-[state=active]:bg-terminal-accent data-[state=active]:text-terminal-dark data-[state=active]:font-bold"
          >
            PRICE BANDS
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transporters">
          <TransporterListTerminal />
        </TabsContent>

        <TabsContent value="bulk-entry">
          <BulkRouteEntryTable />
        </TabsContent>

        <TabsContent value="routes">
          <TransporterRoutesList />
        </TabsContent>

        <TabsContent value="pricing">
          <RoutePriceBandsList />
        </TabsContent>
      </Tabs>
    </div>
  )
}