'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useSuppliers, useSupplierProducts, useSupplierHubs } from '@/hooks/use-suppliers'
import { useCurrentStaffMember } from '@/hooks/use-staff'
import { CustomerProductRequest } from '@/types/customer-requests'
import { SearchableSelect } from '@/components/ui/searchable-select'

const formSchema = z.object({
  supplier_id: z.string().min(1, 'Supplier is required'),
  supplier_product_packaging_spec_id: z.string().min(1, 'Product is required'),
  hub_id: z.string().min(1, 'Hub is required'),
  price_per_unit: z.string().min(1, 'Price is required'),
  currency: z.string().default('EUR'),
  delivery_mode: z.enum(['DELIVERY', 'Ex Works', 'TRANSIT']),
  valid_from: z.string().min(1, 'Valid from date is required'),
  valid_until: z.string().min(1, 'Valid until date is required'),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface AddSupplierPriceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requestContext?: CustomerProductRequest
}

export function AddSupplierPriceModal({
  open,
  onOpenChange,
  requestContext,
}: AddSupplierPriceModalProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { data: suppliers = [] } = useSuppliers()
  const { data: currentStaff } = useCurrentStaffMember()

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')

  const { data: supplierProducts = [] } = useSupplierProducts(selectedSupplierId)
  const { data: supplierHubs = [] } = useSupplierHubs(selectedSupplierId)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supplier_id: '',
      supplier_product_packaging_spec_id: '',
      hub_id: '',
      price_per_unit: '',
      currency: 'EUR',
      delivery_mode: requestContext?.delivery_mode || 'DELIVERY',
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: '',
      notes: '',
    },
  })

  // Pre-fill from request context
  useEffect(() => {
    if (requestContext && open) {
      form.setValue('delivery_mode', requestContext.delivery_mode)
      if (requestContext.delivery_hub_id) {
        form.setValue('hub_id', requestContext.delivery_hub_id)
      }
      if (requestContext.target_price_per_unit) {
        form.setValue('price_per_unit', requestContext.target_price_per_unit.toString())
      }
      if (requestContext.needed_by_date) {
        form.setValue('valid_until', requestContext.needed_by_date)
      }
      if (requestContext.notes) {
        form.setValue('notes', `Customer request: ${requestContext.notes}`)
      }
    }
  }, [requestContext, open, form])

  // Update selected supplier
  const handleSupplierChange = (value: string) => {
    setSelectedSupplierId(value)
    form.setValue('supplier_id', value)
    // Reset dependent fields
    form.setValue('supplier_product_packaging_spec_id', '')
    form.setValue('hub_id', '')
  }

  const onSubmit = async (data: FormData) => {
    try {
      const { error } = await supabase.from('supplier_prices').insert({
        supplier_id: data.supplier_id,
        supplier_product_packaging_spec_id: data.supplier_product_packaging_spec_id,
        hub_id: data.hub_id,
        price_per_unit: parseFloat(data.price_per_unit),
        currency: data.currency,
        delivery_mode: data.delivery_mode,
        valid_from: new Date(data.valid_from).toISOString(),
        valid_until: new Date(data.valid_until).toISOString(),
        is_active: true,
        created_by_staff_id: currentStaff?.id || null,
        notes: data.notes || null,
      })

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Supplier price added successfully',
      })

      queryClient.invalidateQueries({ queryKey: ['supplier-prices'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-matching'] })

      form.reset()
      setSelectedSupplierId('')
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error adding supplier price:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to add supplier price',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-terminal-panel border-terminal-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-terminal-text font-mono">
            ADD SUPPLIER PRICE
          </DialogTitle>
          <DialogDescription className="text-terminal-muted font-mono">
            Add a new supplier price {requestContext ? 'for this customer request' : ''}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Supplier Selection */}
            <FormField
              control={form.control}
              name="supplier_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-terminal-text font-mono">Supplier *</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={field.value}
                      onValueChange={handleSupplierChange}
                      options={suppliers.map((s) => ({
                        value: s.id,
                        label: `${s.name} (${s.city}, ${s.country})`,
                      }))}
                      placeholder="Select supplier..."
                      searchPlaceholder="Search suppliers..."
                      className="bg-terminal-dark border-terminal-border text-terminal-text"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Product Selection */}
            <FormField
              control={form.control}
              name="supplier_product_packaging_spec_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-terminal-text font-mono">Product *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!selectedSupplierId}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text">
                        <SelectValue placeholder="Select product..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-terminal-dark border-terminal-border max-h-[300px]">
                      {supplierProducts.map((product) => {
                        const spec = Array.isArray(product.product_packaging_specs)
                          ? product.product_packaging_specs[0]
                          : product.product_packaging_specs
                        const productName = (spec as any)?.products?.name || 'Unknown Product'
                        const packaging = (spec as any)?.packaging_options?.label || ''

                        return (
                          <SelectItem key={product.id} value={product.id}>
                            {productName} - {packaging}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Hub Selection */}
              <FormField
                control={form.control}
                name="hub_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-terminal-text font-mono">Hub *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!selectedSupplierId}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text">
                          <SelectValue placeholder="Select hub..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-terminal-dark border-terminal-border">
                        {supplierHubs.map((hub) => (
                          <SelectItem key={hub.id} value={hub.id}>
                            {hub.name} ({hub.country})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Delivery Mode */}
              <FormField
                control={form.control}
                name="delivery_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-terminal-text font-mono">Delivery Mode *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-terminal-dark border-terminal-border">
                        <SelectItem value="Ex Works">Ex Works</SelectItem>
                        <SelectItem value="DELIVERY">DDP (Delivered Duty Paid)</SelectItem>
                        <SelectItem value="TRANSIT">TRANSIT</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Price */}
              <FormField
                control={form.control}
                name="price_per_unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-terminal-text font-mono">Price per Unit (€) *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="bg-terminal-dark border-terminal-border text-terminal-text"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Currency */}
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-terminal-text font-mono">Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-terminal-dark border-terminal-border">
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Valid From */}
              <FormField
                control={form.control}
                name="valid_from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-terminal-text font-mono">Valid From *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        className="bg-terminal-dark border-terminal-border text-terminal-text"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Valid Until */}
              <FormField
                control={form.control}
                name="valid_until"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-terminal-text font-mono">Valid Until *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        className="bg-terminal-dark border-terminal-border text-terminal-text"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-terminal-text font-mono">Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      placeholder="Additional notes..."
                      className="bg-terminal-dark border-terminal-border text-terminal-text resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-terminal-border text-terminal-text hover:bg-terminal-dark font-mono"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono"
              >
                Add Price
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
