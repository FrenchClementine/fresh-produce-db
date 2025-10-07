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
import { toast } from 'sonner'
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

      toast.success('Pallet created successfully')

      queryClient.invalidateQueries({ queryKey: ['pallets'] })
      onOpenChange(false)
      form.reset()

    } catch (error: any) {
      console.error('Error creating pallet:', error)
      toast.error(`Failed to create pallet: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-terminal-panel border-terminal-border">
        <DialogHeader>
          <DialogTitle className="text-terminal-text font-mono">ADD NEW PALLET</DialogTitle>
          <DialogDescription className="text-terminal-muted font-mono">
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
                  <FormLabel className="text-terminal-text font-mono">Label</FormLabel>
                  <FormControl>
                    <Input className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" placeholder="e.g. EUR Pallet" {...field} />
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
                  <FormLabel className="text-terminal-text font-mono">Dimensions (cm) - Optional</FormLabel>
                  <FormControl>
                    <Input className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" placeholder="e.g. 120x80x15" {...field} />
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
                  <FormLabel className="text-terminal-text font-mono">Brutto Weight (kg) - Optional</FormLabel>
                  <FormControl>
                    <Input
                      className="bg-terminal-dark border-terminal-border text-terminal-text font-mono"
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
                  <FormLabel className="text-terminal-text font-mono">Pallets per Truck - Optional</FormLabel>
                  <FormControl>
                    <Input
                      className="bg-terminal-dark border-terminal-border text-terminal-text font-mono"
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
                  <FormLabel className="text-terminal-text font-mono">Deposit Fee (€) - Optional</FormLabel>
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
                {isLoading ? 'Creating...' : 'Create Pallet'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}