'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Copy, Package, Euro, CheckCircle2, AlertCircle } from 'lucide-react'
import { useState } from 'react'

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              📝 Price Entries
              {validEntries.length > 0 && (
                <Badge variant="secondary">{validEntries.length} item{validEntries.length !== 1 ? 's' : ''}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Add multiple products and prices in one go
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddRow}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Row
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onAddMultipleRows(5)}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add 5 Rows
            </Button>
            {entries.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClearAll}
                className="text-red-600 hover:text-red-700"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">#</TableHead>
                <TableHead className="min-w-[250px]">Product *</TableHead>
                <TableHead className="w-[120px]">Price *</TableHead>
                <TableHead className="w-[100px]">Units/Pallet</TableHead>
                <TableHead className="w-[150px]">Hub</TableHead>
                <TableHead className="w-[120px]">Valid Until</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Package className="h-8 w-8" />
                      <p>No entries yet. Click "Add Row" to start.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry, index) => (
                  <TableRow key={entry.id} className={!entry.isValid && entry.product_packaging_spec_id ? 'bg-red-50' : ''}>
                    {/* Row Number */}
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {index + 1}
                    </TableCell>

                    {/* Product */}
                    <TableCell>
                      <div className="space-y-1">
                        <Select
                          value={entry.product_packaging_spec_id}
                          onValueChange={(value) => onUpdateEntry(entry.id, 'product_packaging_spec_id', value)}
                        >
                          <SelectTrigger className={entry.errors.product ? 'border-red-500' : ''}>
                            <SelectValue placeholder="Select product..." />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map(product => (
                              <SelectItem key={product.id} value={product.id}>
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4" />
                                  <span className="text-sm">{getProductLabel(product.id)}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {entry.errors.product && (
                          <p className="text-xs text-red-600">{entry.errors.product}</p>
                        )}
                        {entry.isValid && entry.product_packaging_spec_id && (
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Valid</span>
                          </div>
                        )}
                        {!entry.product_packaging_spec_id && (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
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
                          <Euro className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className={`pl-8 ${entry.errors.price ? 'border-red-500' : ''}`}
                            value={entry.price_per_unit}
                            onChange={(e) => onUpdateEntry(entry.id, 'price_per_unit', e.target.value)}
                          />
                        </div>
                        {entry.errors.price && (
                          <p className="text-xs text-red-600">{entry.errors.price}</p>
                        )}
                      </div>
                    </TableCell>

                    {/* Units per Pallet */}
                    <TableCell>
                      <Input
                        type="number"
                        placeholder="Auto"
                        className="text-sm"
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
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">
                            <span className="text-muted-foreground">Use Default</span>
                          </SelectItem>
                          {hubs.map(hub => (
                            <SelectItem key={hub.id} value={hub.id}>
                              {hub.name} ({hub.hub_code})
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
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Default" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Same as Default</SelectItem>
                          <SelectItem value="1">+1 Day</SelectItem>
                          <SelectItem value="3">+3 Days</SelectItem>
                          <SelectItem value="7">+7 Days</SelectItem>
                          <SelectItem value="14">+14 Days</SelectItem>
                          <SelectItem value="30">+30 Days</SelectItem>
                          <SelectItem value="custom">Custom...</SelectItem>
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
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteEntry(entry.id)}
                          className="text-red-600 hover:text-red-700"
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
          <div className="mt-4 flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">Validation:</span>
            {validEntries.length > 0 && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>{validEntries.length} valid</span>
              </div>
            )}
            {emptyEntries.length > 0 && (
              <div className="flex items-center gap-1 text-gray-400">
                <AlertCircle className="h-4 w-4" />
                <span>{emptyEntries.length} empty</span>
              </div>
            )}
            {entries.some(e => !e.isValid && e.product_packaging_spec_id) && (
              <div className="flex items-center gap-1 text-red-600">
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
