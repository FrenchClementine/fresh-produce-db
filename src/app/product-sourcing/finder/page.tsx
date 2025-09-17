import { ProductFinderWidget } from '@/components/product-finder-widget'

export default function ProductSourcingFinderPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Product Finder</h1>
        <p className="text-muted-foreground">
          Search for active suppliers and packaging options tailored to customer delivery needs.
        </p>
      </div>
      <ProductFinderWidget />
    </div>
  )
}
