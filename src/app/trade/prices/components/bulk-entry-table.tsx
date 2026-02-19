'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Copy, Package, Euro, CheckCircle2, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { ProductCombobox } from './product-combobox'

export interface BulkPriceEntry {
  id: string
  product_packaging_spec_id: string
  price_per_unit: string
  units_per_pallet: string
  hub_id: string
  delivery_mode: string
  valid_until: string

  // Validation
  isValid: boolean
  errors: {
    product?: string
    price?: string
    hub?: string
    validity?: string
  }
}

interface BulkEntryTableProps {
  entries: BulkPriceEntry[]
  products: any[]
  hubs: any[]
  deliveryModes: string[]
  batchConfig: any
  onUpdateEntry: (id: string, field: string, value: string) => void
  onDeleteEntry: (id: string) => void
  onDuplicateEntry: (id: string) => void
  onAddRow: () => void
  onAddMultipleRows: (count: number) => void
  onClearAll: () => void
}

export function BulkEntryTable({
  entries,
  products,
  hubs,
  deliveryModes,
  batchConfig,
  onUpdateEntry,
  onDeleteEntry,
  onDuplicateEntry,
  onAddRow,
  onAddMultipleRows,
  onClearAll
}: BulkEntryTableProps) {
  const validEntries = entries.filter(e => e.isValid && e.product_packaging_spec_id)
  const emptyEntries = entries.filter(e => !e.product_packaging_spec_id)

  const getProductLabel = (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (!product) return 'Select product...'

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

  const getHubLabel = (hubId: string) => {
    if (!hubId) return 'Default'
    const hub = hubs.find(h => h.id === hubId)
    return hub ? `${hub.name} (${hub.hub_code})` : 'Default'
  }

  const getValidityLabel = (validUntil: string) => {
    if (!validUntil) return 'Default'
    const date = new Date(validUntil)
    const defaultDate = new Date(batchConfig.default_valid_until)

    if (date.getTime() === defaultDate.getTime()) return 'Same'

    const today = new Date()
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    return `+${diffDays}d`
  }

  return (
    <Card className="bg-terminal-panel border-terminal-border">
      <CardHeader className="border-b border-terminal-border">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 font-mono text-sm text-terminal-text">
              <Package className="h-4 w-4 text-terminal-accent" />
              PRICE ENTRIES
              {validEntries.length > 0 && (
                <Badge variant="secondary" className="bg-terminal-success/20 text-terminal-success border-terminal-success font-mono">
                  {validEntries.length} item{validEntries.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="font-mono text-xs text-terminal-muted">
              Add multiple products and prices in one go
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={onAddRow}
              className="bg-terminal-dark border-2 border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Row
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => onAddMultipleRows(5)}
              className="bg-terminal-dark border-2 border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add 5 Rows
            </Button>
            {entries.length > 0 && (
              <Button
                type="button"
                size="sm"
                onClick={onClearAll}
                className="bg-red-600/20 border-2 border-red-600 text-red-400 hover:bg-red-600/30 hover:border-red-500 font-mono"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="rounded-md border border-terminal-border">
          <Table>
            <TableHeader>
              <TableRow className="border-terminal-border hover:bg-terminal-dark">
                <TableHead className="w-[40px] font-mono text-terminal-muted">#</TableHead>
                <TableHead className="min-w-[250px] font-mono text-terminal-muted">Product *</TableHead>
                <TableHead className="w-[140px] font-mono text-terminal-muted">Price *</TableHead>
                <TableHead className="w-[100px] font-mono text-terminal-muted">Units/Pallet</TableHead>
                <TableHead className="w-[150px] font-mono text-terminal-muted">Hub</TableHead>
                <TableHead className="w-[130px] font-mono text-terminal-muted">Delivery Mode</TableHead>
                <TableHead className="w-[120px] font-mono text-terminal-muted">Valid Until</TableHead>
                <TableHead className="w-[100px] font-mono text-terminal-muted">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow className="border-terminal-border">
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2 text-terminal-muted font-mono">
                      <Package className="h-8 w-8 text-terminal-accent" />
                      <p>No entries yet. Click "Add Row" to start.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry, index) => (
                  <TableRow key={entry.id} className={!entry.isValid && entry.product_packaging_spec_id ? 'bg-terminal-alert/10 border-terminal-border' : 'border-terminal-border'}>
                    {/* Row Number */}
                    <TableCell className="text-center text-sm text-terminal-muted font-mono">
                      {index + 1}
                    </TableCell>

                    {/* Product */}
                    <TableCell>
                      <div className="space-y-1">
                        <ProductCombobox
                          products={products}
                          value={entry.product_packaging_spec_id}
                          onChange={(value) => onUpdateEntry(entry.id, 'product_packaging_spec_id', value)}
                          hasError={!!entry.errors.product}
                          placeholder="Select product..."
                        />
                        {entry.errors.product && (
                          <p className="text-xs text-terminal-alert font-mono">{entry.errors.product}</p>
                        )}
                        {entry.isValid && entry.product_packaging_spec_id && (
                          <div className="flex items-center gap-1 text-xs text-terminal-success font-mono">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Valid</span>
                          </div>
                        )}
                        {!entry.product_packaging_spec_id && (
                          <div className="flex items-center gap-1 text-xs text-terminal-muted font-mono">
                            <AlertCircle className="h-3 w-3" />
                            <span>Empty row</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Price */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="relative">
                          <Euro className="absolute left-3 top-3.5 h-5 w-5 text-terminal-accent" />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className={`pl-10 h-12 text-lg bg-terminal-dark text-terminal-text font-mono font-semibold ${entry.errors.price ? 'border-terminal-alert border-2' : 'border-terminal-border border-2'} focus:border-terminal-accent focus:ring-2 focus:ring-terminal-accent/20`}
                            value={entry.price_per_unit}
                            onChange={(e) => onUpdateEntry(entry.id, 'price_per_unit', e.target.value)}
                          />
                        </div>
                        {entry.errors.price && (
                          <p className="text-xs text-terminal-alert font-mono">{entry.errors.price}</p>
                        )}
                      </div>
                    </TableCell>

                    {/* Units per Pallet */}
                    <TableCell>
                      <Input
                        type="number"
                        placeholder="Auto"
                        className="h-12 text-sm bg-terminal-dark border-terminal-border border-2 text-terminal-text font-mono"
                        value={entry.units_per_pallet}
                        onChange={(e) => onUpdateEntry(entry.id, 'units_per_pallet', e.target.value)}
                      />
                    </TableCell>

                    {/* Hub */}
                    <TableCell>
                      <Select
                        value={entry.hub_id || 'default'}
                        onValueChange={(value) => onUpdateEntry(entry.id, 'hub_id', value === 'default' ? '' : value)}
                      >
                        <SelectTrigger className="h-12 text-sm bg-terminal-dark border-terminal-border border-2 text-terminal-text font-mono">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-terminal-panel border-terminal-border">
                          <SelectItem value="default" className="font-mono text-terminal-text">
                            <span className="text-terminal-muted">Use Default</span>
                          </SelectItem>
                          {hubs.map(hub => (
                            <SelectItem key={hub.id} value={hub.id} className="font-mono text-terminal-text">
                              {hub.name} ({hub.hub_code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* Delivery Mode */}
                    <TableCell>
                      <Select
                        value={entry.delivery_mode || 'default'}
                        onValueChange={(value) => onUpdateEntry(entry.id, 'delivery_mode', value === 'default' ? '' : value)}
                      >
                        <SelectTrigger className="h-12 text-sm bg-terminal-dark border-terminal-border border-2 text-terminal-text font-mono">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-terminal-panel border-terminal-border">
                          <SelectItem value="default" className="font-mono text-terminal-text">
                            <span className="text-terminal-muted">Use Default</span>
                          </SelectItem>
                          {deliveryModes.map(mode => (
                            <SelectItem key={mode} value={mode} className="font-mono text-terminal-text">
                              {mode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* Valid Until */}
                    <TableCell>
                      <Select
                        value={entry.valid_until || 'default'}
                        onValueChange={(value) => {
                          if (value === 'default') {
                            onUpdateEntry(entry.id, 'valid_until', '')
                          } else if (value === 'custom') {
                            // Keep current value for custom input
                          } else {
                            // Quick date presets
                            const days = parseInt(value)
                            const date = new Date()
                            date.setDate(date.getDate() + days)
                            onUpdateEntry(entry.id, 'valid_until', date.toISOString().split('T')[0])
                          }
                        }}
                      >
                        <SelectTrigger className="h-12 text-sm bg-terminal-dark border-terminal-border border-2 text-terminal-text font-mono">
                          <SelectValue placeholder="Default" />
                        </SelectTrigger>
                        <SelectContent className="bg-terminal-panel border-terminal-border">
                          <SelectItem value="default" className="font-mono text-terminal-text">Same as Default</SelectItem>
                          <SelectItem value="1" className="font-mono text-terminal-text">+1 Day</SelectItem>
                          <SelectItem value="3" className="font-mono text-terminal-text">+3 Days</SelectItem>
                          <SelectItem value="7" className="font-mono text-terminal-text">+7 Days</SelectItem>
                          <SelectItem value="14" className="font-mono text-terminal-text">+14 Days</SelectItem>
                          <SelectItem value="30" className="font-mono text-terminal-text">+30 Days</SelectItem>
                          <SelectItem value="custom" className="font-mono text-terminal-text">Custom...</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onDuplicateEntry(entry.id)}
                          title="Duplicate row"
                          disabled={!entry.product_packaging_spec_id}
                          className="text-terminal-text hover:bg-terminal-dark hover:text-terminal-accent"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteEntry(entry.id)}
                          className="text-terminal-alert hover:bg-terminal-dark hover:text-terminal-alert"
                          title="Delete row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Validation Summary */}
        {entries.length > 0 && (
          <div className="mt-4 flex items-center gap-4 text-sm font-mono">
            <span className="text-terminal-muted">VALIDATION:</span>
            {validEntries.length > 0 && (
              <div className="flex items-center gap-1 text-terminal-success">
                <CheckCircle2 className="h-4 w-4" />
                <span>{validEntries.length} valid</span>
              </div>
            )}
            {emptyEntries.length > 0 && (
              <div className="flex items-center gap-1 text-terminal-muted">
                <AlertCircle className="h-4 w-4" />
                <span>{emptyEntries.length} empty</span>
              </div>
            )}
            {entries.some(e => !e.isValid && e.product_packaging_spec_id) && (
              <div className="flex items-center gap-1 text-terminal-alert">
                <AlertCircle className="h-4 w-4" />
                <span>{entries.filter(e => !e.isValid && e.product_packaging_spec_id).length} with errors</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
