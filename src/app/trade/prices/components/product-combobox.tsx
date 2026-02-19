'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Package, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface ProductComboboxProps {
  products: any[]
  value: string
  onChange: (value: string) => void
  hasError?: boolean
  placeholder?: string
  onProductCreated?: () => void
}

export function ProductCombobox({
  products,
  value,
  onChange,
  hasError = false,
  placeholder = 'Select product...',
  onProductCreated
}: ProductComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [showQuickAdd, setShowQuickAdd] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')

  const getProductLabel = (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return placeholder

    const spec = Array.isArray(product.product_packaging_specs)
      ? product.product_packaging_specs[0]
      : product.product_packaging_specs
    const productData = Array.isArray((spec as any)?.products)
      ? (spec as any).products[0]
      : (spec as any)?.products
    const packageData = Array.isArray((spec as any)?.packaging_options)
      ? (spec as any).packaging_options[0]
      : (spec as any)?.packaging_options
    const sizeData = Array.isArray((spec as any)?.size_options)
      ? (spec as any).size_options[0]
      : (spec as any)?.size_options

    return `${productData?.name} - ${packageData?.label} - ${sizeData?.name}`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between bg-terminal-dark text-terminal-text font-mono',
            hasError ? 'border-terminal-alert' : 'border-terminal-border',
            !value && 'text-terminal-muted'
          )}
        >
          {value ? getProductLabel(value) : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 bg-terminal-panel border-terminal-border" align="start">
        <Command className="bg-terminal-panel">
          <CommandInput placeholder="Search products..." className="font-mono" />
          <CommandEmpty className="py-6 text-center text-sm font-mono text-terminal-muted">
            No product found.
          </CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-auto">
            {products.map((product) => {
              const label = getProductLabel(product.id)
              return (
                <CommandItem
                  key={product.id}
                  value={label}
                  onSelect={() => {
                    onChange(product.id)
                    setOpen(false)
                  }}
                  className="font-mono text-terminal-text hover:bg-terminal-dark cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === product.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <Package className="mr-2 h-4 w-4 text-terminal-accent" />
                  <span className="text-sm">{label}</span>
                </CommandItem>
              )
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
