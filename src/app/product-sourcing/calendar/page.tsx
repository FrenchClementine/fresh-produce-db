import { ProductCalendarWidget } from '@/components/product-calendar-widget'

export default function ProductSourcingCalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Product Availability Calendar</h1>
        <p className="text-muted-foreground">
          Visualise seasonal availability by country and connect with matching suppliers.
        </p>
      </div>
      <ProductCalendarWidget />
    </div>
  )
}
