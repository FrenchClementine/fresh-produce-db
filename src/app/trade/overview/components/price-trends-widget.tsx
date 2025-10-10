'use client'

import { usePriceTrends, ProductPriceTrend } from '@/hooks/use-price-trends'
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useState, useEffect, useRef } from 'react'
import { useFlashOnChangeById } from '@/hooks/use-flash-on-change'

// Simple currency formatter
const formatCurrency = (amount: number, currency: string = 'EUR') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Category emojis
const categoryEmojis: Record<string, string> = {
  tomatoes: '🍅',
  lettuce: '🥬',
  babyleaf: '🌿',
  citrus: '🍊',
  greenhouse_crop: '🏠',
  mushroom: '🍄',
  grapes: '🍇',
  carrots: '🥕',
  potatoes: '🥔',
  onions: '🧅',
  fruit: '🍎',
  vegetables: '🥒',
  pears: '🍐',
}

// Simple sparkline component
function Sparkline({ data }: { data: Array<{ date: string; avg_price: number }> }) {
  if (data.length < 2) return <span className="text-terminal-muted font-mono text-xs">─────</span>

  const prices = data.map(d => d.avg_price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min

  if (range === 0) return <span className="text-terminal-muted font-mono text-xs">─────</span>

  // Create a simple ASCII sparkline
  const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█']
  const sparkline = prices.slice(-7).map(price => {
    const normalized = (price - min) / range
    const index = Math.floor(normalized * (chars.length - 1))
    return chars[index]
  }).join('')

  return <span className="font-mono text-terminal-accent text-sm">{sparkline}</span>
}

function TrendBadge({ trend }: { trend: ProductPriceTrend }) {
  const { trend: direction, trend_percentage } = trend

  if (direction === 'up') {
    return (
      <Badge variant="outline" className="bg-terminal-success/20 text-terminal-success border-terminal-success font-mono text-xs">
        <TrendingUp className="h-3 w-3 mr-1" />
        +{trend_percentage.toFixed(1)}%
      </Badge>
    )
  }

  if (direction === 'down') {
    return (
      <Badge variant="outline" className="bg-terminal-alert/20 text-terminal-alert border-terminal-alert font-mono text-xs">
        <TrendingDown className="h-3 w-3 mr-1" />
        {trend_percentage.toFixed(1)}%
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="bg-terminal-dark text-terminal-muted border-terminal-border font-mono text-xs">
      <Minus className="h-3 w-3 mr-1" />
      {trend_percentage.toFixed(1)}%
    </Badge>
  )
}

export function PriceTrendsWidget() {
  const { data: trends, isLoading, error } = usePriceTrends()
  const [isHovering, setIsHovering] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Track which items have changed
  const flashingIds = useFlashOnChangeById(
    trends?.map(t => ({ id: t.product_id, current_avg_price: t.current_avg_price })) || [],
    2000,
    'current_avg_price'
  )

  // Auto-scroll functionality
  useEffect(() => {
    if (!scrollContainerRef.current || isHovering || !trends || trends.length === 0) return

    const container = scrollContainerRef.current
    let scrollAmount = 0
    const scrollSpeed = 0.5 // pixels per interval

    const interval = setInterval(() => {
      if (container.scrollTop + container.clientHeight >= container.scrollHeight) {
        // Reset to top when reaching bottom
        container.scrollTop = 0
        scrollAmount = 0
      } else {
        scrollAmount += scrollSpeed
        container.scrollTop = scrollAmount
      }
    }, 30) // Update every 30ms for smooth scrolling

    return () => clearInterval(interval)
  }, [isHovering, trends])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-terminal-accent" />
        <span className="ml-2 text-terminal-muted font-mono">Loading price trends...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-terminal-alert font-mono">
        Error loading price trends
      </div>
    )
  }

  if (!trends || trends.length === 0) {
    return (
      <div className="text-center py-8 text-terminal-muted font-mono">
        No price data available for the last 10 days
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-terminal-border">
        <h3 className="text-sm font-mono text-terminal-text font-semibold">
          Product Price Trends (10 Days)
        </h3>
        <span className="text-xs text-terminal-muted font-mono">
          {trends.length} products
        </span>
      </div>

      {/* Table */}
      <div
        ref={scrollContainerRef}
        className="space-y-1 max-h-[400px] overflow-y-auto scroll-smooth"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {trends.map((trend) => {
          const emoji = categoryEmojis[trend.product_category.toLowerCase()] || '📦'
          const isFlashing = flashingIds.has(trend.product_id)

          return (
            <div
              key={trend.product_id}
              className={`grid grid-cols-4 gap-4 items-center py-2 px-3 hover:bg-terminal-dark/50 rounded border transition-all duration-500 ${
                isFlashing
                  ? 'border-terminal-accent bg-terminal-accent/10 shadow-lg shadow-terminal-accent/20'
                  : 'border-transparent hover:border-terminal-border'
              }`}
            >
              {/* Product Name */}
              <div className="flex items-center gap-2">
                <span className="text-lg">{emoji}</span>
                <div>
                  <div className="font-mono text-terminal-text text-sm font-medium">
                    {trend.product_name}
                  </div>
                  <div className="text-xs text-terminal-muted font-mono capitalize">
                    {trend.product_category}
                  </div>
                </div>
              </div>

              {/* Current Price */}
              <div className="text-right">
                <div className="font-mono text-terminal-text font-semibold">
                  {formatCurrency(trend.current_avg_price, trend.currency)}
                </div>
                <div className="text-xs text-terminal-muted font-mono">
                  per {trend.sold_by}
                </div>
              </div>

              {/* Trend */}
              <div className="flex justify-center">
                <TrendBadge trend={trend} />
              </div>

              {/* Sparkline */}
              <div className="flex justify-end">
                <Sparkline data={trend.price_history} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer info */}
      <div className="pt-2 border-t border-terminal-border">
        <p className="text-xs text-terminal-muted font-mono">
          Average prices across all packaging specifications for each product
        </p>
      </div>
    </div>
  )
}
