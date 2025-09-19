'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Truck } from 'lucide-react'
import { MyTransporterList } from '@/components/transporters/my-transporter-list'
import { MyTransporterRoutesList } from '@/components/transporters/my-transporter-routes-list'
import { MyRoutePriceBandsList } from '@/components/transporters/my-route-price-bands-list'
import { useCurrentStaffMember } from '@/hooks/use-staff'

export default function MyTransportersPage() {
  const { data: currentStaff } = useCurrentStaffMember()

  if (!currentStaff) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Truck className="h-8 w-8" />
            My Transporter System
          </h1>
          <p className="text-muted-foreground mt-2">
            You must be logged in as a staff member to view your transporters.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Truck className="h-8 w-8" />
          My Transporter System
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your assigned transporters, routes, and pricing for logistics planning.
        </p>
      </div>

      <Tabs defaultValue="transporters" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transporters">My Transporters</TabsTrigger>
          <TabsTrigger value="routes">My Routes</TabsTrigger>
          <TabsTrigger value="pricing">My Price Bands</TabsTrigger>
        </TabsList>

        <TabsContent value="transporters" className="space-y-6">
          <MyTransporterList />
        </TabsContent>

        <TabsContent value="routes" className="space-y-6">
          <MyTransporterRoutesList />
        </TabsContent>

        <TabsContent value="pricing" className="space-y-6">
          <MyRoutePriceBandsList />
        </TabsContent>
      </Tabs>
    </div>
  )
}