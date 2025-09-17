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
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'

const addPalletSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  dimensions_cm: z.string().optional(),
  brutto_weight: z.string().optional(),
  pallets_per_truck: z.string().optional(),
  deposit_fee: z.string().optional(),
})

type AddPalletFormValues = z.infer<typeof addPalletSchema>

interface AddPalletFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddPalletForm({ open, onOpenChange }: AddPalletFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const form = useForm<AddPalletFormValues>({
    resolver: zodResolver(addPalletSchema),
    defaultValues: {
      label: '',
      dimensions_cm: '',
      brutto_weight: '',
      pallets_per_truck: '',
      deposit_fee: '',
    },
  })

  const onSubmit = async (values: AddPalletFormValues) => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('pallets')
        .insert([{
          label: values.label,
          dimensions_cm: values.dimensions_cm || null,
          brutto_weight: values.brutto_weight ? parseFloat(values.brutto_weight) : null,
          pallets_per_truck: values.pallets_per_truck ? parseInt(values.pallets_per_truck) : null,
          deposit_fee: values.deposit_fee ? parseFloat(values.deposit_fee) : null,
        }])

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Pallet created successfully',
      })

      queryClient.invalidateQueries({ queryKey: ['pallets'] })
      onOpenChange(false)
      form.reset()
      
    } catch (error: any) {
      console.error('Error creating pallet:', error)
      toast({
        title: 'Error',
        description: `Failed to create pallet: ${error.message}`,
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
          <DialogTitle>Add New Pallet</DialogTitle>
          <DialogDescription>
            Create a new pallet type
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
                    <Input placeholder="e.g. EUR Pallet" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dimensions_cm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dimensions (cm) - Optional</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 120x80x15" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="brutto_weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brutto Weight (kg) - Optional</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="25.0"
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
              name="pallets_per_truck"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pallets per Truck - Optional</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="33"
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value
                        field.onChange(value === '' ? undefined : parseInt(value))
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
              name="deposit_fee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deposit Fee (€) - Optional</FormLabel>
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
                {isLoading ? 'Creating...' : 'Create Pallet'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}