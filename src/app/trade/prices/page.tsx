'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrendingUp, Package2, Upload } from 'lucide-react'
import { BulkEntryMode } from './components/bulk-entry-mode'

export default function InputPricesPage() {
  const [activeTab, setActiveTab] = useState('bulk')

  return (
    <div className="space-y-6 page-transition">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Input Prices</h1>
        <p className="text-muted-foreground">
          Enter supplier pricing with delivery modes and validity periods
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="quick" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Quick Entry
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Package2 className="h-4 w-4" />
            Bulk Entry
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quick" className="space-y-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Entry Mode</h3>
            <p className="text-gray-500 mb-4">
              Single price entry form (existing functionality will be moved here)
            </p>
          </div>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-6">
          <BulkEntryMode />
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">CSV/Excel Import</h3>
            <p className="text-gray-500 mb-4">
              Import multiple prices from CSV or Excel file (coming soon)
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
