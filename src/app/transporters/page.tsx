'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TransporterList } from '@/components/transporters/transporter-list'
import { TransporterRoutesList } from '@/components/transporters/transporter-routes-list'
import { RoutePriceBandsList } from '@/components/transporters/route-price-bands-list'

export default function TransportersPage() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Transporter System</h1>
        <p className="text-muted-foreground mt-2">
          Manage third-party logistics providers, their routes, and pricing for internal logistics planning.
        </p>
      </div>

      <Tabs defaultValue="transporters" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transporters">Transporters</TabsTrigger>
          <TabsTrigger value="routes">Routes</TabsTrigger>
          <TabsTrigger value="pricing">Price Bands</TabsTrigger>
        </TabsList>
        
        <TabsContent value="transporters" className="space-y-6">
          <TransporterList />
        </TabsContent>
        
        <TabsContent value="routes" className="space-y-6">
          <TransporterRoutesList />
        </TabsContent>
        
        <TabsContent value="pricing" className="space-y-6">
          <RoutePriceBandsList />
        </TabsContent>
      </Tabs>
    </div>
  )
}