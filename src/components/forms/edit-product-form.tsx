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
  SearchableSelect,
  createSearchableOptions,
} from '@/components/ui/searchable-select'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'

const categoryOptions = createSearchableOptions([
  { value: 'tomatoes', label: 'Tomatoes' },
  { value: 'lettuce', label: 'Lettuce' },
  { value: 'babyleaf', label: 'Baby Leaf' },
  { value: 'citrus', label: 'Citrus' },
  { value: 'greenhouse_crop', label: 'Greenhouse Crop' },
  { value: 'mushroom', label: 'Mushroom' },
  { value: 'grapes', label: 'Grapes' },
  { value: 'carrots', label: 'Carrots' },
  { value: 'potatoes', label: 'Potatoes' },
  { value: 'onions', label: 'Onions' },
  { value: 'fruit', label: 'Fruit' },
  { value: 'vegetables', label: 'Vegetables' },
])

const intendedUseOptions = createSearchableOptions([
  { value: 'retail', label: 'Retail' },
  { value: 'process', label: 'Process' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'wholesale', label: 'Wholesale' },
])

const soldByOptions = createSearchableOptions([
  { value: 'kg', label: 'Kg' },
  { value: 'piece', label: 'Piece' },
  { value: 'box', label: 'Box' },
  { value: 'punnet', label: 'Punnet' },
])

const statusOptions = createSearchableOptions([
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
])

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
      <DialogContent className="max-w-md bg-terminal-panel border-terminal-border">
        <DialogHeader>
          <DialogTitle className="text-terminal-text font-mono">EDIT PRODUCT</DialogTitle>
          <DialogDescription className="text-terminal-muted font-mono">
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
                  <FormLabel className="text-terminal-text font-mono">Product Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Cherry Tomatoes" {...field} className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" />
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
                  <FormLabel className="text-terminal-text font-mono">Category</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={categoryOptions}
                      placeholder="Select category"
                      searchPlaceholder="Search categories..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="intended_use"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-terminal-text font-mono">Intended Use</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={intendedUseOptions}
                      placeholder="Select intended use"
                      searchPlaceholder="Search intended use..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sold_by"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-terminal-text font-mono">Sold By</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={soldByOptions}
                      placeholder="Select sold by unit"
                      searchPlaceholder="Search units..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-terminal-text font-mono">Status</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={field.value.toString()}
                      onValueChange={(value) => field.onChange(value === 'true')}
                      options={statusOptions}
                      placeholder="Select status"
                      searchPlaceholder="Search status..."
                    />
                  </FormControl>
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
                className="bg-terminal-dark border-2 border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-terminal-accent hover:bg-cyan-600 text-terminal-dark font-mono">
                {isLoading ? 'Updating...' : 'Update Product'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}