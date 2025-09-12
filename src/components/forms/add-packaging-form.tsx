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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'

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
  const { toast } = useToast()
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

      toast({
        title: 'Success',
        description: 'Packaging option created successfully',
      })

      queryClient.invalidateQueries({ queryKey: ['packaging-options'] })
      onOpenChange(false)
      form.reset()
      
    } catch (error: any) {
      console.error('Error creating packaging:', error)
      toast({
        title: 'Error',
        description: `Failed to create packaging: ${error.message}`,
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
          <DialogTitle>Add New Packaging</DialogTitle>
          <DialogDescription>
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="box">Box</SelectItem>
                      <SelectItem value="bag">Bag</SelectItem>
                      <SelectItem value="container">Container</SelectItem>
                      <SelectItem value="crate">Crate</SelectItem>
                      <SelectItem value="tray">Tray</SelectItem>
                      <SelectItem value="bulk">Bulk</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
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
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
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
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
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
                {isLoading ? 'Creating...' : 'Create Packaging'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}