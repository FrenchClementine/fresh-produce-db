'use client'

import { useState } from 'react'
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
import { useAllProductCategories } from '@/hooks/use-products'

// Helper function to format category names
const formatCategoryName = (category: string) => {
  return category.replace('_', ' ').split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}

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
  { value: 'bag', label: 'Bag' },
])

const statusOptions = createSearchableOptions([
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
])

const addProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  category: z.string().min(1, 'Category is required'),
  intended_use: z.enum(['retail', 'process', 'industrial', 'wholesale']),
  sold_by: z.enum(['kg', 'piece', 'box', 'punnet', 'bag']),
  is_active: z.boolean().default(true),
})

type AddProductFormValues = z.infer<typeof addProductSchema>

interface AddProductFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddProductForm({ open, onOpenChange }: AddProductFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { allCategories, isLoading: categoriesLoading } = useAllProductCategories()
  
  // Create category options dynamically
  const categoryOptions = allCategories?.map((category: string) => ({
    value: category,
    label: formatCategoryName(category)
  })) || []

  const form = useForm<AddProductFormValues>({
    resolver: zodResolver(addProductSchema),
    defaultValues: {
      name: '',
      category: 'vegetables',
      intended_use: 'retail',
      sold_by: 'kg',
      is_active: true,
    },
  })

  const onSubmit = async (values: AddProductFormValues) => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('products')
        .insert([{
          name: values.name,
          category: values.category,
          intended_use: values.intended_use,
          sold_by: values.sold_by,
          is_active: values.is_active,
        }])

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Product created successfully',
      })

      queryClient.invalidateQueries({ queryKey: ['products'] })
      onOpenChange(false)
      form.reset()
      
    } catch (error: any) {
      console.error('Error creating product:', error)
      toast({
        title: 'Error',
        description: `Failed to create product: ${error.message}`,
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
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Create a new product for your catalog
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
                  <FormLabel>Intended Use</FormLabel>
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
                  <FormLabel>Sold By</FormLabel>
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
                  <FormLabel>Status</FormLabel>
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
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Product'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}