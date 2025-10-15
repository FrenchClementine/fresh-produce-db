import { ProductFinderWidget } from '@/components/product-finder-widget'

export default function ProductSourcingFinderPage() {
  return (
    <div className="min-h-screen bg-[#1a1d29] px-2 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Product Finder</h1>
          <p className="text-gray-400">
            Search for active suppliers and packaging options tailored to customer delivery needs.
          </p>
        </div>
        <ProductFinderWidget />
      </div>
    </div>
  )
}
