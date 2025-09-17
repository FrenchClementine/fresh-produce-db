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
} from '@/components/ui/searchable-select'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'

const unitTypeOptions = [
  { value: 'box', label: 'Box' },
  { value: 'bag', label: 'Bag' },
  { value: 'container', label: 'Container' },
  { value: 'crate', label: 'Crate' },
  { value: 'tray', label: 'Tray' },
  { value: 'bulk', label: 'Bulk' },
]

const editPackagingSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  unit_type: z.enum(['box', 'bag', 'container', 'crate', 'tray', 'bulk']),
  description: z.string().optional(),
  deposit_fee: z.string().optional(),
  rent_fee: z.string().optional(),
})

type EditPackagingFormValues = z.infer<typeof editPackagingSchema>

interface EditPackagingFormProps {
  packaging: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditPackagingForm({ packaging, open, onOpenChange }: EditPackagingFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const form = useForm<EditPackagingFormValues>({
    resolver: zodResolver(editPackagingSchema),
    defaultValues: {
      label: packaging?.label || '',
      unit_type: packaging?.unit_type || 'box',
      description: packaging?.description || '',
      deposit_fee: packaging?.deposit_fee?.toString() || '',
      rent_fee: packaging?.rent_fee?.toString() || '',
    },
  })

  // Reset form when packaging changes
  useEffect(() => {
    if (packaging) {
      form.reset({
        label: packaging.label || '',
        unit_type: packaging.unit_type || 'box',
        description: packaging.description || '',
        deposit_fee: packaging.deposit_fee?.toString() || '',
        rent_fee: packaging.rent_fee?.toString() || '',
      })
    }
  }, [packaging, form])

  const onSubmit = async (values: EditPackagingFormValues) => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('packaging_options')
        .update({
          label: values.label,
          unit_type: values.unit_type,
          description: values.description || null,
          deposit_fee: values.deposit_fee ? parseFloat(values.deposit_fee) : null,
          rent_fee: values.rent_fee ? parseFloat(values.rent_fee) : null,
        })
        .eq('id', packaging.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Packaging updated successfully',
      })

      queryClient.invalidateQueries({ queryKey: ['packaging-options'] })
      onOpenChange(false)
      
    } catch (error: any) {
      console.error('Error updating packaging:', error)
      toast({
        title: 'Error',
        description: `Failed to update packaging: ${error.message}`,
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
          <DialogTitle>Edit Packaging</DialogTitle>
          <DialogDescription>
            Update the packaging details
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 15kg Cardboard Box" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unit_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit Type</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={unitTypeOptions}
                      placeholder="Select unit type"
                      searchPlaceholder="Search unit types..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deposit_fee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deposit Fee (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value
                        field.onChange(value === '' ? undefined : parseFloat(value))
                      }}
                      onFocus={(e) => e.target.select()}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rent_fee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rent Fee (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value
                        field.onChange(value === '' ? undefined : parseFloat(value))
                      }}
                      onFocus={(e) => e.target.select()}
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
                {isLoading ? 'Updating...' : 'Update Packaging'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}