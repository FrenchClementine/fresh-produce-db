import { ProductCalendarWidget } from '@/components/product-calendar-widget'
import { Badge } from '@/components/ui/badge'
import { Calendar } from 'lucide-react'

export default function ProductSourcingCalendarPage() {
  return (
    <div className="min-h-screen bg-terminal-dark p-4 space-y-4">
      {/* Terminal Header */}
      <div className="flex items-center justify-between border-b border-terminal-border pb-4">
        <div className="flex items-center gap-4">
          <Calendar className="h-8 w-8 text-terminal-accent" />
          <div>
            <h1 className="text-2xl font-mono font-bold text-terminal-text tracking-wider">
              PRODUCT AVAILABILITY CALENDAR
            </h1>
            <p className="text-terminal-muted font-mono text-sm">
              Visualise seasonal availability by country and connect with matching suppliers
            </p>
          </div>
        </div>
        <Badge className="bg-terminal-success text-terminal-dark font-mono">
          LIVE
        </Badge>
      </div>

      <ProductCalendarWidget />
    </div>
  )
}
