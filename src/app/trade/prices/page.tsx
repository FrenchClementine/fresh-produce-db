'use client'

import { BulkEntryMode } from './components/bulk-entry-mode'

export default function InputPricesPage() {
  return (
    <div className="space-y-6 page-transition">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Input Prices</h1>
        <p className="text-muted-foreground">
          Enter supplier pricing with delivery modes and validity periods
        </p>
      </div>

      <BulkEntryMode />
    </div>
  )
}
