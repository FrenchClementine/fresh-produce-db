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
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'

const editPalletSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  dimensions_cm: z.string().optional(),
  brutto_weight: z.string().optional(),
  pallets_per_truck: z.string().optional(),
  deposit_fee: z.string().optional(),
})

type EditPalletFormValues = z.infer<typeof editPalletSchema>

interface EditPalletFormProps {
  pallet: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditPalletForm({ pallet, open, onOpenChange }: EditPalletFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const form = useForm<EditPalletFormValues>({
    resolver: zodResolver(editPalletSchema),
    defaultValues: {
      label: pallet?.label || '',
      dimensions_cm: pallet?.dimensions_cm || '',
      brutto_weight: pallet?.brutto_weight?.toString() || '',
      pallets_per_truck: pallet?.pallets_per_truck?.toString() || '',
      deposit_fee: pallet?.deposit_fee?.toString() || '',
    },
  })

  // Reset form when pallet changes
  useEffect(() => {
    if (pallet) {
      form.reset({
        label: pallet.label || '',
        dimensions_cm: pallet.dimensions_cm || '',
        brutto_weight: pallet.brutto_weight?.toString() || '',
        pallets_per_truck: pallet.pallets_per_truck?.toString() || '',
        deposit_fee: pallet.deposit_fee?.toString() || '',
      })
    }
  }, [pallet, form])

  const onSubmit = async (values: EditPalletFormValues) => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('pallets')
        .update({
          label: values.label,
          dimensions_cm: values.dimensions_cm || null,
          brutto_weight: values.brutto_weight ? parseFloat(values.brutto_weight) : null,
          pallets_per_truck: values.pallets_per_truck ? parseInt(values.pallets_per_truck) : null,
          deposit_fee: values.deposit_fee ? parseFloat(values.deposit_fee) : null,
        })
        .eq('id', pallet.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Pallet updated successfully',
      })

      queryClient.invalidateQueries({ queryKey: ['pallets'] })
      onOpenChange(false)
      
    } catch (error: any) {
      console.error('Error updating pallet:', error)
      toast({
        title: 'Error',
        description: `Failed to update pallet: ${error.message}`,
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
          <DialogTitle className="text-terminal-text font-mono">EDIT PALLET</DialogTitle>
          <DialogDescription className="text-terminal-muted font-mono">
            Update the pallet details
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
                    <Input placeholder="e.g. EUR Pallet" {...field} className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" />
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
                  <FormLabel className="text-terminal-text font-mono">Dimensions (cm)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 120x80x15" {...field} className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" />
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
                  <FormLabel className="text-terminal-text font-mono">Brutto Weight (kg)</FormLabel>
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
                      className="bg-terminal-dark border-terminal-border text-terminal-text font-mono"
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
                  <FormLabel className="text-terminal-text font-mono">Pallets per Truck</FormLabel>
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
                      className="bg-terminal-dark border-terminal-border text-terminal-text font-mono"
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
                  <FormLabel className="text-terminal-text font-mono">Deposit Fee (€)</FormLabel>
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
                      className="bg-terminal-dark border-terminal-border text-terminal-text font-mono"
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
                {isLoading ? 'Updating...' : 'Update Pallet'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}