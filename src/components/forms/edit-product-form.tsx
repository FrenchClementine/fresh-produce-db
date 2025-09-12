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

const editProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  category: z.enum(['tomatoes', 'lettuce', 'babyleaf', 'citrus', 'greenhouse_crop', 'mushroom', 'grapes', 'carrots', 'potatoes', 'onions', 'fruit', 'vegetables']),
  intended_use: z.enum(['retail', 'process', 'industrial', 'wholesale']),
  sold_by: z.enum(['kg', 'piece', 'box', 'punnet']),
  is_active: z.boolean(),
})

type EditProductFormValues = z.infer<typeof editProductSchema>

interface EditProductFormProps {
  product: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditProductForm({ product, open, onOpenChange }: EditProductFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const form = useForm<EditProductFormValues>({
    resolver: zodResolver(editProductSchema),
    defaultValues: {
      name: product?.name || '',
      category: product?.category || 'vegetables',
      intended_use: product?.intended_use || 'retail',
      sold_by: product?.sold_by || 'kg',
      is_active: product?.is_active || true,
    },
  })

  // Reset form when product changes
  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name || '',
        category: product.category || 'vegetables',
        intended_use: product.intended_use || 'retail',
        sold_by: product.sold_by || 'kg',
        is_active: product.is_active || true,
      })
    }
  }, [product, form])

  const onSubmit = async (values: EditProductFormValues) => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('products')
        .update({
          name: values.name,
          category: values.category,
          intended_use: values.intended_use,
          sold_by: values.sold_by,
          is_active: values.is_active,
        })
        .eq('id', product.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Product updated successfully',
      })

      queryClient.invalidateQueries({ queryKey: ['products'] })
      onOpenChange(false)
      
    } catch (error: any) {
      console.error('Error updating product:', error)
      toast({
        title: 'Error',
        description: `Failed to update product: ${error.message}`,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update the product details
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Cherry Tomatoes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="tomatoes">Tomatoes</SelectItem>
                      <SelectItem value="lettuce">Lettuce</SelectItem>
                      <SelectItem value="babyleaf">Baby Leaf</SelectItem>
                      <SelectItem value="citrus">Citrus</SelectItem>
                      <SelectItem value="greenhouse_crop">Greenhouse Crop</SelectItem>
                      <SelectItem value="mushroom">Mushroom</SelectItem>
                      <SelectItem value="grapes">Grapes</SelectItem>
                      <SelectItem value="carrots">Carrots</SelectItem>
                      <SelectItem value="potatoes">Potatoes</SelectItem>
                      <SelectItem value="onions">Onions</SelectItem>
                      <SelectItem value="fruit">Fruit</SelectItem>
                      <SelectItem value="vegetables">Vegetables</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="intended_use"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Intended Use</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select intended use" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="process">Process</SelectItem>
                      <SelectItem value="industrial">Industrial</SelectItem>
                      <SelectItem value="wholesale">Wholesale</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sold_by"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sold By</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sold by unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="kg">Kg</SelectItem>
                      <SelectItem value="piece">Piece</SelectItem>
                      <SelectItem value="box">Box</SelectItem>
                      <SelectItem value="punnet">Punnet</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={(value) => field.onChange(value === 'true')} value={field.value.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                {isLoading ? 'Updating...' : 'Update Product'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}