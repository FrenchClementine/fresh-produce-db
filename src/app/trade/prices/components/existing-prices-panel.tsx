'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useCurrentSupplierPrices, useDeactivateSupplierPrice, useQuickUpdatePrice } from '@/hooks/use-supplier-prices'
import { Trash2, Edit2, Save, X, Package } from 'lucide-react'
import { format } from 'date-fns'
import { useCurrentStaffMember } from '@/hooks/use-staff'

interface ExistingPricesPanelProps {
  supplierId: string
}

export function ExistingPricesPanel({ supplierId }: ExistingPricesPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [editValidUntil, setEditValidUntil] = useState('')

  const { data: prices, isLoading } = useCurrentSupplierPrices(supplierId)
  const deactivatePrice = useDeactivateSupplierPrice()
  const updatePrice = useQuickUpdatePrice()
  const { data: currentStaff } = useCurrentStaffMember()

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
      <Card className="bg-terminal-panel border-terminal-border">
        <CardContent className="pt-6">
          <div className="text-center py-8 text-terminal-muted font-mono">Loading existing prices...</div>
        </CardContent>
      </Card>
    )
  }

  if (!prices || prices.length === 0) {
    return (
      <Card className="bg-terminal-panel border-terminal-border">
        <CardHeader className="border-b border-terminal-border">
          <CardTitle className="flex items-center gap-2 font-mono text-sm text-terminal-text">
            <Package className="h-4 w-4 text-terminal-accent" />
            EXISTING PRICES FOR THIS SUPPLIER
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-terminal-muted font-mono">
            No existing prices found for this supplier
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-terminal-panel border-terminal-border">
      <CardHeader className="border-b border-terminal-border">
        <CardTitle className="flex items-center gap-2 font-mono text-sm text-terminal-text">
          <Package className="h-4 w-4 text-terminal-accent" />
          EXISTING PRICES FOR THIS SUPPLIER
          <Badge variant="secondary" className="bg-terminal-success/20 text-terminal-success border-terminal-success font-mono">
            {prices.length} active price{prices.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="rounded-md border border-terminal-border max-h-96 overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-terminal-panel z-10">
              <TableRow className="border-terminal-border hover:bg-terminal-dark">
                <TableHead className="font-mono text-terminal-muted">PRODUCT</TableHead>
                <TableHead className="font-mono text-terminal-muted">HUB</TableHead>
                <TableHead className="font-mono text-terminal-muted">PRICE/UNIT</TableHead>
                <TableHead className="font-mono text-terminal-muted">DELIVERY</TableHead>
                <TableHead className="font-mono text-terminal-muted">VALID UNTIL</TableHead>
                <TableHead className="font-mono text-terminal-muted">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prices.map((price) => {
                const isEditing = editingId === price.id

                return (
                  <TableRow key={price.id} className="border-terminal-border hover:bg-terminal-dark/50">
                    <TableCell className="font-mono text-terminal-text text-sm">
                      <div className="font-semibold">{price.product_name}</div>
                      <div className="text-xs text-terminal-muted">
                        {price.packaging_label} - {price.size_name}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-terminal-text text-sm">
                      {price.hub_name} ({price.hub_code})
                    </TableCell>
                    <TableCell className="font-mono text-terminal-text text-sm">
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-24 bg-terminal-dark border-terminal-border text-terminal-text font-mono"
                        />
                      ) : (
                        `€${price.price_per_unit.toFixed(2)}`
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs border-terminal-border text-terminal-text">
                        {price.delivery_mode}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-terminal-text text-sm">
                      {isEditing ? (
                        <Input
                          type="date"
                          value={editValidUntil}
                          onChange={(e) => setEditValidUntil(e.target.value)}
                          className="w-36 bg-terminal-dark border-terminal-border text-terminal-text font-mono"
                        />
                      ) : (
                        price.valid_until ? format(new Date(price.valid_until), 'dd MMM yyyy') : '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleSave(price.id)}
                              className="bg-terminal-success hover:bg-green-600 text-white font-mono"
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleCancel}
                              className="bg-terminal-dark border-2 border-terminal-border text-terminal-text hover:bg-terminal-panel font-mono"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleEdit(price)}
                              className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleDelete(price.id)}
                              className="bg-terminal-alert hover:bg-red-700 text-white font-mono"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
