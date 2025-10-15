'use client'

import { useState } from 'react'
import { BulkEntryMode } from './components/bulk-entry-mode'
import { ManagePricesMode } from './components/manage-prices-mode'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DollarSign } from 'lucide-react'

export default function InputPricesPage() {
  const [activeTab, setActiveTab] = useState('add')
  const [selectedSupplierFromManage, setSelectedSupplierFromManage] = useState<string | null>(null)

  const handleAddNewFromManage = (supplierId?: string) => {
    if (supplierId) {
      setSelectedSupplierFromManage(supplierId)
    }
    setActiveTab('add')
  }

  return (
    <div className="min-h-screen bg-terminal-dark px-2 py-4 space-y-4">
      {/* Terminal Header */}
      <div className="flex items-center justify-between border-b border-terminal-border pb-4">
        <div className="flex items-center gap-4">
          <DollarSign className="h-8 w-8 text-terminal-accent" />
          <div>
            <h1 className="text-2xl font-mono font-bold text-terminal-text tracking-wider">
              INPUT PRICES TERMINAL
            </h1>
            <p className="text-terminal-muted font-mono text-sm">
              Bulk supplier pricing entry with delivery modes & validity
            </p>
          </div>
        </div>
        <Badge className="bg-terminal-success text-terminal-dark font-mono">
          LIVE
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-terminal-panel border border-terminal-border">
          <TabsTrigger
            value="add"
            className="font-mono data-[state=active]:bg-terminal-accent data-[state=active]:text-terminal-dark text-terminal-text"
          >
            Add New Prices
          </TabsTrigger>
          <TabsTrigger
            value="manage"
            className="font-mono data-[state=active]:bg-terminal-accent data-[state=active]:text-terminal-dark text-terminal-text"
          >
            Manage Existing Prices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="add" className="mt-4">
          <BulkEntryMode initialSupplierId={selectedSupplierFromManage} />
        </TabsContent>

        <TabsContent value="manage" className="mt-4">
          <ManagePricesMode onAddNew={handleAddNewFromManage} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
