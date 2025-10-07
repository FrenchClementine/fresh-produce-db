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
} from '@/components/ui/searchable-select'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

const unitTypeOptions = [
  { value: 'box', label: 'Box' },
  { value: 'bag', label: 'Bag' },
  { value: 'container', label: 'Container' },
  { value: 'crate', label: 'Crate' },
  { value: 'tray', label: 'Tray' },
  { value: 'bulk', label: 'Bulk' },
]

const addPackagingSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  unit_type: z.enum(['box', 'bag', 'container', 'crate', 'tray', 'bulk']),
  description: z.string().optional(),
  deposit_fee: z.string().optional(),
  rent_fee: z.string().optional(),
})

type AddPackagingFormValues = z.infer<typeof addPackagingSchema>

interface AddPackagingFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddPackagingForm({ open, onOpenChange }: AddPackagingFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<AddPackagingFormValues>({
    resolver: zodResolver(addPackagingSchema),
    defaultValues: {
      label: '',
      unit_type: 'box',
      description: '',
      deposit_fee: '',
      rent_fee: '',
    },
  })

  const onSubmit = async (values: AddPackagingFormValues) => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('packaging_options')
        .insert([{
          label: values.label,
          unit_type: values.unit_type,
          description: values.description || null,
          deposit_fee: values.deposit_fee ? parseFloat(values.deposit_fee) : null,
          rent_fee: values.rent_fee ? parseFloat(values.rent_fee) : null,
        }])

      if (error) throw error

      toast.success('Packaging option created successfully')

      queryClient.invalidateQueries({ queryKey: ['packaging-options'] })
      onOpenChange(false)
      form.reset()

    } catch (error: any) {
      console.error('Error creating packaging:', error)
      toast.error(`Failed to create packaging: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-terminal-panel border-terminal-border">
        <DialogHeader>
          <DialogTitle className="text-terminal-text font-mono">ADD NEW PACKAGING</DialogTitle>
          <DialogDescription className="text-terminal-muted font-mono">
            Create a new packaging option
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-terminal-text font-mono">Label</FormLabel>
                  <FormControl>
                    <Input className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" placeholder="e.g. 15kg Cardboard Box" {...field} />
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
                  <FormLabel className="text-terminal-text font-mono">Unit Type</FormLabel>
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
                  <FormLabel className="text-terminal-text font-mono">Description (Optional)</FormLabel>
                  <FormControl>
                    <Input className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" placeholder="Optional description" {...field} />
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
                  <FormLabel className="text-terminal-text font-mono">Deposit Fee (€)</FormLabel>
                  <FormControl>
                    <Input
                      className="bg-terminal-dark border-terminal-border text-terminal-text font-mono"
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
                  <FormLabel className="text-terminal-text font-mono">Rent Fee (€)</FormLabel>
                  <FormControl>
                    <Input
                      className="bg-terminal-dark border-terminal-border text-terminal-text font-mono"
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
                className="bg-terminal-dark border-2 border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-terminal-accent hover:bg-cyan-600 text-terminal-dark font-mono">
                {isLoading ? 'Creating...' : 'Create Packaging'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}