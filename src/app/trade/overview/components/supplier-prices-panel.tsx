'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'
import { useCurrentSupplierPrices, useDeactivateSupplierPrice, useQuickUpdatePrice } from '@/hooks/use-supplier-prices'
import { Trash2, Edit2, Save, X, DollarSign, ChevronsUpDown, Check, ChevronDown, ChevronUp, Package } from 'lucide-react'
import { format } from 'date-fns'
import { useCurrentStaffMember } from '@/hooks/use-staff'
import { useSuppliers } from '@/hooks/use-suppliers'
import { useProducts } from '@/hooks/use-products'
import { cn } from '@/lib/utils'
import { useFlashOnChangeById } from '@/hooks/use-flash-on-change'

export function SupplierPricesPanel() {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [editValidUntil, setEditValidUntil] = useState('')
  const [supplierFilter, setSupplierFilter] = useState<string>('all')
  const [productFilter, setProductFilter] = useState<string>('all')
  const [isHovering, setIsHovering] = useState(false)
  const [productSearchOpen, setProductSearchOpen] = useState(false)
  const [productSearchQuery, setProductSearchQuery] = useState('')
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set())
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const { data: prices, isLoading } = useCurrentSupplierPrices()
  const { data: suppliers } = useSuppliers()
  const { products } = useProducts()
  const deactivatePrice = useDeactivateSupplierPrice()
  const updatePrice = useQuickUpdatePrice()
  const { data: currentStaff } = useCurrentStaffMember()

  // Track which prices have changed
  const flashingIds = useFlashOnChangeById(
    prices?.map(p => ({ id: p.id, price_per_unit: p.price_per_unit })) || [],
    2000,
    'price_per_unit'
  )

  // Filter products for search
  const filteredProducts = useMemo(() => {
    if (!products) return []
    if (!productSearchQuery) return products

    const searchTerm = productSearchQuery.toLowerCase()
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm) ||
      product.category?.toLowerCase().includes(searchTerm)
    )
  }, [products, productSearchQuery])

  // Filter prices
  const filteredPrices = useMemo(() => {
    if (!prices) return []

    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    return prices.filter(price => {
      if (supplierFilter !== 'all' && price.supplier_id !== supplierFilter) {
        return false
      }
      if (productFilter !== 'all' && price.product_id !== productFilter) {
        return false
      }

      // Filter out prices expired for more than 24 hours
      if (price.valid_until) {
        const validUntilDate = new Date(price.valid_until)
        // If expired and expired for more than 24 hours, filter out
        if (validUntilDate < twentyFourHoursAgo) {
          return false
        }
      }

      return true
    })
  }, [prices, supplierFilter, productFilter])

  // Group prices by supplier
  const groupedPrices = useMemo(() => {
    const groups = new Map()

    filteredPrices.forEach(price => {
      if (!price.supplier_id) return

      if (!groups.has(price.supplier_id)) {
        groups.set(price.supplier_id, {
          supplierId: price.supplier_id,
          supplierName: price.supplier_name,
          prices: []
        })
      }

      groups.get(price.supplier_id).prices.push(price)
    })

    return Array.from(groups.values())
  }, [filteredPrices])

  // Toggle supplier expansion
  const toggleSupplierExpansion = (supplierId: string) => {
    setExpandedSuppliers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(supplierId)) {
        newSet.delete(supplierId)
      } else {
        newSet.add(supplierId)
      }
      return newSet
    })
  }

  // Auto-scroll functionality
  useEffect(() => {
    if (!scrollContainerRef.current || isHovering) return

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
  }, [isHovering, filteredPrices])

  const handleEdit = (price: any) => {
    setEditingId(price.id)
    setEditPrice(price.price_per_unit.toString())
    setEditValidUntil(price.valid_until?.split('T')[0] || '')
  }

  const handleSave = async (priceId: string) => {
    await updatePrice.mutateAsync({
      priceId,
      newPrice: parseFloat(editPrice),
      validUntil: new Date(editValidUntil).toISOString(),
      currentUserId: currentStaff?.id
    })
    setEditingId(null)
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditPrice('')
    setEditValidUntil('')
  }

  const handleDelete = async (priceId: string) => {
    if (confirm('Are you sure you want to deactivate this price?')) {
      await deactivatePrice.mutateAsync(priceId)
    }
  }

  if (isLoading) {
    return (
      <Card className="bg-terminal-panel border-terminal-border h-[calc(100vh-16rem)]">
        <CardContent className="pt-6">
          <div className="text-center py-8 text-terminal-muted font-mono">Loading prices...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-terminal-panel border-terminal-border h-[calc(100vh-16rem)]">
      <CardHeader className="border-b border-terminal-border pb-3">
        <CardTitle className="text-terminal-text font-mono text-sm flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-terminal-success" />
          SUPPLIER PRICES
          <Badge variant="secondary" className="bg-terminal-success/20 text-terminal-success border-terminal-success font-mono">
            {filteredPrices.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-terminal-muted text-xs font-mono">SUPPLIER</Label>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="h-8 bg-terminal-dark border-terminal-border text-terminal-text font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-terminal-panel border-terminal-border">
                <SelectItem value="all" className="font-mono text-xs text-terminal-text">All Suppliers</SelectItem>
                {suppliers?.map(supplier => (
                  <SelectItem key={supplier.id} value={supplier.id} className="font-mono text-xs text-terminal-text">
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-terminal-muted text-xs font-mono">PRODUCT</Label>
            <Popover open={productSearchOpen} onOpenChange={(open) => {
              setProductSearchOpen(open)
              if (!open) setProductSearchQuery('')
            }}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={productSearchOpen}
                  className="h-8 w-full justify-between bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono text-xs"
                >
                  {productFilter === 'all'
                    ? 'All Products'
                    : products?.find(p => p.id === productFilter)?.name || 'All Products'}
                  <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] h-[300px] p-0 bg-terminal-panel border-terminal-border">
                <Command className="bg-terminal-panel h-full flex flex-col">
                  <CommandInput
                    placeholder="Search products..."
                    value={productSearchQuery}
                    onValueChange={setProductSearchQuery}
                    className="font-mono text-terminal-text text-xs shrink-0"
                  />
                  <CommandEmpty className="text-terminal-muted font-mono p-4 text-xs">
                    No products found.
                  </CommandEmpty>
                  <CommandGroup className="overflow-y-auto overflow-x-hidden flex-1">
                    <CommandItem
                      value="all"
                      onSelect={() => {
                        setProductFilter('all')
                        setProductSearchOpen(false)
                      }}
                      className="font-mono text-xs text-terminal-text hover:bg-terminal-dark"
                    >
                      <Check
                        className={cn(
                          'mr-2 h-3 w-3 text-terminal-accent',
                          productFilter === 'all' ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      All Products
                    </CommandItem>
                    {filteredProducts.map((product) => (
                      <CommandItem
                        key={product.id}
                        value={product.name}
                        onSelect={() => {
                          setProductFilter(product.id)
                          setProductSearchOpen(false)
                        }}
                        className="font-mono text-xs text-terminal-text hover:bg-terminal-dark"
                      >
                        <Check
                          className={cn(
                            'mr-2 h-3 w-3 text-terminal-accent',
                            productFilter === product.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {product.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Grouped Prices */}
        <div
          ref={scrollContainerRef}
          className="max-h-[calc(100vh-28rem)] overflow-y-auto scroll-smooth divide-y divide-terminal-border border border-terminal-border rounded-md"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {groupedPrices.length === 0 ? (
            <div className="text-center py-8 text-terminal-muted font-mono text-xs">
              No prices found
            </div>
          ) : (
            groupedPrices.map((group) => {
              const isExpanded = expandedSuppliers.has(group.supplierId)
              const uniqueProducts = Array.from(new Set(group.prices.map((p: any) => p.product_name)))
              const hasFlashingItems = group.prices.some((p: any) => flashingIds.has(p.id))

              return (
                <div
                  key={group.supplierId}
                  className={`transition-all duration-500 ${
                    hasFlashingItems
                      ? 'bg-terminal-accent/10 border-l-2 border-terminal-accent shadow-lg shadow-terminal-accent/20'
                      : 'border-l-2 border-transparent'
                  }`}
                >
                  {/* Collapsed Supplier Header */}
                  <div
                    className="p-3 hover:bg-terminal-dark cursor-pointer"
                    onClick={() => toggleSupplierExpansion(group.supplierId)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="h-4 w-4 text-terminal-success" />
                          <span className="text-terminal-text text-sm font-mono font-semibold">
                            {group.supplierName}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-terminal-muted" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-terminal-muted" />
                          )}
                        </div>

                        {!isExpanded && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-3 text-xs font-mono text-terminal-muted">
                              <span>📦 {group.prices.length} Price{group.prices.length > 1 ? 's' : ''}</span>
                            </div>
                            <div className="text-xs font-mono text-terminal-muted">
                              🏷️ {uniqueProducts.length} Product{uniqueProducts.length > 1 ? 's' : ''}: {uniqueProducts.slice(0, 2).join(', ')}{uniqueProducts.length > 2 ? ` +${uniqueProducts.length - 2} more` : ''}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Prices List */}
                  {isExpanded && (
                    <div className="border-t border-terminal-border/50">
                      {group.prices.map((price: any, index: number) => {
                        const isEditing = editingId === price.id
                        const isExpired = price.valid_until && new Date(price.valid_until) < new Date()
                        const isFlashing = flashingIds.has(price.id)

                        return (
                          <div
                            key={price.id}
                            className={`p-3 ml-6 transition-all duration-500 ${
                              index < group.prices.length - 1 ? 'border-b border-terminal-border/30' : ''
                            } ${
                              isFlashing
                                ? 'bg-terminal-accent/5'
                                : 'hover:bg-terminal-dark/50'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="font-mono text-terminal-text text-sm font-semibold">
                                    {price.product_name}
                                  </div>
                                  {isExpired && (
                                    <Badge variant="destructive" className="text-[10px] font-mono h-4">
                                      EXPIRED
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs font-mono text-terminal-muted mb-2">
                                  {price.packaging_label} - {price.size_name}
                                </div>
                                <div className="flex items-center gap-3 text-xs font-mono text-terminal-muted">
                                  <span>📍 {price.hub_name || 'No Hub'}</span>
                                  {price.hub_code && <span className="text-[10px]">({price.hub_code})</span>}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {isEditing ? (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editPrice}
                                      onChange={(e) => setEditPrice(e.target.value)}
                                      onBlur={() => handleSave(price.id)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSave(price.id)
                                        if (e.key === 'Escape') handleCancel()
                                      }}
                                      autoFocus
                                      className="w-20 h-7 text-xs bg-terminal-dark border-terminal-border text-terminal-text font-mono"
                                    />
                                    <span className="text-xs text-terminal-muted font-mono">/{price.sold_by}</span>
                                  </div>
                                ) : (
                                  <div
                                    className="font-semibold cursor-pointer hover:text-terminal-accent transition-colors text-terminal-success font-mono text-sm"
                                    onClick={() => handleEdit(price)}
                                  >
                                    €{price.price_per_unit.toFixed(2)}/{price.sold_by}
                                  </div>
                                )}
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDelete(price.id)
                                  }}
                                  className="h-6 w-6 p-0 bg-terminal-alert hover:bg-red-700 text-white font-mono"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
