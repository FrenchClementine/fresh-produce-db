'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCustomers } from '@/hooks/use-customers'
import { useSuppliers } from '@/hooks/use-suppliers'
import { useProducts } from '@/hooks/use-products'
import { useCreateOpportunity } from '@/hooks/use-opportunities'
import { FileText, Send } from 'lucide-react'
import { toast } from 'sonner'

export function QuickQuotePanel() {
  const [customerId, setCustomerId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [productSpecId, setProductSpecId] = useState('')
  const [offerPrice, setOfferPrice] = useState('')
  const [margin, setMargin] = useState('15')

  const { customers } = useCustomers()
  const { data: suppliers } = useSuppliers()
  const { data: products } = useProducts()
  const createOpportunity = useCreateOpportunity()

  const handleSendQuote = async () => {
    if (!customerId || !supplierId || !productSpecId || !offerPrice) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      await createOpportunity.mutateAsync({
        customer_id: customerId,
        supplier_id: supplierId,
        product_packaging_spec_id: productSpecId,
        offer_price_per_unit: parseFloat(offerPrice),
        offer_currency: 'EUR',
        status: 'offered',
        priority: 'medium'
      })

      toast.success('Quote sent successfully!')
      // Reset form
      setCustomerId('')
      setSupplierId('')
      setProductSpecId('')
      setOfferPrice('')
      setMargin('15')
    } catch (error) {
      toast.error('Failed to send quote')
    }
  }

  return (
    <Card className="bg-terminal-panel border-terminal-border">
      <CardHeader className="border-b border-terminal-border pb-3">
        <CardTitle className="text-terminal-text font-mono text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-terminal-accent" />
          QUICK QUOTE
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <Label className="text-terminal-muted text-xs font-mono">CUSTOMER</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text">
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent className="bg-terminal-panel border-terminal-border">
              {customers?.map((customer) => (
                <SelectItem key={customer.id} value={customer.id} className="text-terminal-text">
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-terminal-muted text-xs font-mono">SUPPLIER</Label>
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text">
              <SelectValue placeholder="Select supplier" />
            </SelectTrigger>
            <SelectContent className="bg-terminal-panel border-terminal-border">
              {suppliers?.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id} className="text-terminal-text">
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-terminal-muted text-xs font-mono">PRODUCT</Label>
          <Select value={productSpecId} onValueChange={setProductSpecId}>
            <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text">
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent className="bg-terminal-panel border-terminal-border">
              {products?.map((product) => (
                <SelectItem key={product.id} value={product.id} className="text-terminal-text">
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label className="text-terminal-muted text-xs font-mono">PRICE (€/unit)</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={offerPrice}
              onChange={(e) => setOfferPrice(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="bg-terminal-dark border-terminal-border text-terminal-text font-mono"
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-terminal-muted text-xs font-mono">MARGIN %</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="bg-terminal-dark border-terminal-border text-terminal-text font-mono"
              placeholder="15"
            />
          </div>
        </div>

        <Button
          onClick={handleSendQuote}
          disabled={createOpportunity.isPending}
          className="w-full bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono"
        >
          <Send className="h-4 w-4 mr-2" />
          SEND QUOTE
        </Button>
      </CardContent>
    </Card>
  )
}
