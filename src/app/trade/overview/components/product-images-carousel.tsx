'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { useCurrentSupplierPrices } from '@/hooks/use-supplier-prices'
import { Image as ImageIcon } from 'lucide-react'

export function ProductImagesCarousel() {
  const { data: prices } = useCurrentSupplierPrices()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [fadeIn, setFadeIn] = useState(true)

  // Get all prices that have images, flatten the image arrays
  const pricesWithImages = prices
    ?.filter(price => price.image_urls && price.image_urls.length > 0)
    .flatMap(price =>
      price.image_urls!.map(imageUrl => ({
        imageUrl,
        supplierName: price.supplier_name,
        productName: price.product_name,
        packagingLabel: price.packaging_label,
        sizeName: price.size_name
      }))
    ) || []

  // Auto-rotate images every 8 seconds
  useEffect(() => {
    if (pricesWithImages.length === 0) return

    const interval = setInterval(() => {
      setFadeIn(false)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % pricesWithImages.length)
        setFadeIn(true)
      }, 300)
    }, 8000)

    return () => clearInterval(interval)
  }, [pricesWithImages.length])

  if (pricesWithImages.length === 0) {
    return (
      <Card className="bg-terminal-panel border-terminal-border h-[calc(50vh-8rem)]">
        <CardContent className="p-4 h-full flex flex-col items-center justify-center">
          <ImageIcon className="h-16 w-16 text-terminal-muted mb-4" />
          <p className="text-terminal-muted font-mono text-sm text-center">
            No product images available
          </p>
          <p className="text-terminal-muted font-mono text-xs mt-2 text-center">
            Upload images in Manage Prices
          </p>
        </CardContent>
      </Card>
    )
  }

  const currentItem = pricesWithImages[currentIndex]

  return (
    <Card className="bg-terminal-panel border-terminal-border h-[calc(50vh-8rem)]">
      <CardContent className="p-0 h-full flex flex-col">
        {/* Image Display Area */}
        <div className="flex-1 relative bg-terminal-dark rounded-t-lg overflow-hidden">
          <div
            className="absolute inset-0 transition-opacity duration-300"
            style={{ opacity: fadeIn ? 1 : 0 }}
          >
            <img
              src={currentItem.imageUrl}
              alt={`${currentItem.productName} - ${currentItem.supplierName}`}
              className="w-full h-full object-contain p-4"
            />
          </div>

          {/* Image counter badge */}
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded">
            <span className="text-xs font-mono text-white">
              {currentIndex + 1} / {pricesWithImages.length}
            </span>
          </div>
        </div>

        {/* Product Info Footer */}
        <div className="bg-terminal-panel border-t border-terminal-border p-3">
          <div
            className="transition-opacity duration-300"
            style={{ opacity: fadeIn ? 1 : 0 }}
          >
            <div className="text-sm font-mono font-semibold text-terminal-text mb-1">
              {currentItem.productName}
            </div>
            <div className="text-xs font-mono text-terminal-muted">
              {currentItem.supplierName}
            </div>
            <div className="text-xs font-mono text-terminal-accent mt-1">
              {currentItem.packagingLabel} • {currentItem.sizeName}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
