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
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useProducts, usePackagingOptions, usePallets, useSizeOptions } from '@/hooks/use-products'

const editProductPackagingSpecSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  packaging_id: z.string().min(1, 'Packaging is required'),
  pallet_id: z.string().min(1, 'Pallet is required'),
  size_option_id: z.string().min(1, 'Size is required'),
  boxes_per_pallet: z.string().min(1, 'Boxes per pallet is required'),
  weight_per_box: z.string().optional(),
  weight_per_pallet: z.string().optional(),
  weight_unit: z.enum(['kg', 'g', 'ton']),
  pieces_per_box: z.string().optional(),
})

type EditProductPackagingSpecFormValues = z.infer<typeof editProductPackagingSpecSchema>

interface EditProductPackagingSpecFormProps {
  spec: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditProductPackagingSpecForm({ spec, open, onOpenChange }: EditProductPackagingSpecFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const { products } = useProducts()
  const { packagingOptions } = usePackagingOptions()
  const { pallets } = usePallets()
  const { sizeOptions } = useSizeOptions()

  const form = useForm<EditProductPackagingSpecFormValues>({
    resolver: zodResolver(editProductPackagingSpecSchema),
    defaultValues: {
      product_id: spec?.product_id || '',
      packaging_id: spec?.packaging_id || '',
      pallet_id: spec?.pallet_id || '',
      size_option_id: spec?.size_option_id || '',
      boxes_per_pallet: spec?.boxes_per_pallet?.toString() || '',
      weight_per_box: spec?.weight_per_box?.toString() || '',
      weight_per_pallet: spec?.weight_per_pallet?.toString() || '',
      weight_unit: spec?.weight_unit || 'kg',
      pieces_per_box: spec?.pieces_per_box?.toString() || '',
    },
  })

  // Reset form when spec changes
  useEffect(() => {
    if (spec) {
      form.reset({
        product_id: spec.product_id || '',
        packaging_id: spec.packaging_id || '',
        pallet_id: spec.pallet_id || '',
        size_option_id: spec.size_option_id || '',
        boxes_per_pallet: spec.boxes_per_pallet?.toString() || '',
        weight_per_box: spec.weight_per_box?.toString() || '',
        weight_per_pallet: spec.weight_per_pallet?.toString() || '',
        weight_unit: spec.weight_unit || 'kg',
        pieces_per_box: spec.pieces_per_box?.toString() || '',
      })
    }
  }, [spec, form])

  // Auto-calculate weight per pallet
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'boxes_per_pallet' || name === 'weight_per_box') {
        const boxes = parseFloat(value.boxes_per_pallet || '0')
        const weightPerBox = parseFloat(value.weight_per_box || '0')
        
        if (boxes > 0 && weightPerBox > 0) {
          const totalWeight = (boxes * weightPerBox).toFixed(2)
          form.setValue('weight_per_pallet', totalWeight)
        }
      }
    })
    
    return () => subscription.unsubscribe()
  }, [form])

  const onSubmit = async (values: EditProductPackagingSpecFormValues) => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('product_packaging_specs')
        .update({
          product_id: values.product_id,
          packaging_id: values.packaging_id,
          pallet_id: values.pallet_id,
          size_option_id: values.size_option_id,
          boxes_per_pallet: parseInt(values.boxes_per_pallet),
          weight_per_box: values.weight_per_box ? parseFloat(values.weight_per_box) : null,
          weight_per_pallet: values.weight_per_pallet ? parseFloat(values.weight_per_pallet) : null,
          weight_unit: values.weight_unit,
          pieces_per_box: values.pieces_per_box ? parseInt(values.pieces_per_box) : null,
        })
        .eq('id', spec.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Product packaging specification updated successfully',
      })

      queryClient.invalidateQueries({ queryKey: ['product-specs'] })
      onOpenChange(false)
      
    } catch (error: any) {
      console.error('Error updating product packaging spec:', error)
      toast({
        title: 'Error',
        description: `Failed to update specification: ${error.message}`,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product Packaging Specification</DialogTitle>
          <DialogDescription>
            Update the packaging details and specifications for this product
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="product_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products?.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} ({product.category})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="packaging_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Packaging Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select packaging" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {packagingOptions?.map((packaging) => (
                          <SelectItem key={packaging.id} value={packaging.id}>
                            {packaging.label} ({packaging.unit_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pallet_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pallet Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select pallet" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {pallets?.map((pallet) => (
                          <SelectItem key={pallet.id} value={pallet.id}>
                            {pallet.label} {pallet.dimensions_cm && `(${pallet.dimensions_cm})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="size_option_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Size Option *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sizeOptions?.map((size) => (
                          <SelectItem key={size.id} value={size.id}>
                            {size.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Packaging Specifications</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="boxes_per_pallet"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Boxes per Pallet *</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="48" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pieces_per_box"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pieces per Box (Optional)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="24" {...field} />
                      </FormControl>
                      <FormDescription>
                        Leave empty if not applicable
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="weight_per_box"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Weight per Box (Optional)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="15.5" {...field} />
                      </FormControl>
                      <FormDescription>
                        Leave empty if not applicable
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="weight_per_pallet"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Weight per Pallet</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          placeholder="Auto-calculated" 
                          {...field}
                          disabled={!!(form.watch('boxes_per_pallet') && form.watch('weight_per_box'))}
                        />
                      </FormControl>
                      <FormDescription>
                        Auto-calculated from boxes × weight per box
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="weight_unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight Unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select weight unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="kg">Kg</SelectItem>
                        <SelectItem value="g">Grams</SelectItem>
                        <SelectItem value="ton">Ton</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Updating...' : 'Update Specification'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}