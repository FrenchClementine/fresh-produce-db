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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'

const editCustomerProductSpecSchema = z.object({
  notes: z.string().optional(),
  season: z.enum(['spring', 'summer', 'autumn', 'winter', 'year_round']).optional(),
  available_months: z.array(z.string()).optional(),
  local_production_from_date: z.string().optional(),
  local_production_till_date: z.string().optional(),
  import_period_from_date: z.string().optional(),
  import_period_till_date: z.string().optional(),
})

type EditCustomerProductSpecFormValues = z.infer<typeof editCustomerProductSpecSchema>

interface EditCustomerProductSpecFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerProductSpec: any
}

const seasonOptions = [
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'autumn', label: 'Autumn' },
  { value: 'winter', label: 'Winter' },
  { value: 'year_round', label: 'Year Round' },
]

const monthOptions = [
  { value: 'january', label: 'January' },
  { value: 'february', label: 'February' },
  { value: 'march', label: 'March' },
  { value: 'april', label: 'April' },
  { value: 'may', label: 'May' },
  { value: 'june', label: 'June' },
  { value: 'july', label: 'July' },
  { value: 'august', label: 'August' },
  { value: 'september', label: 'September' },
  { value: 'october', label: 'October' },
  { value: 'november', label: 'November' },
  { value: 'december', label: 'December' },
]

// Season to months mapping
const seasonToMonths = {
  spring: ['march', 'april', 'may'],
  summer: ['may', 'june', 'july', 'august', 'september', 'october'],
  autumn: ['september', 'october', 'november'],
  winter: ['october', 'november', 'december', 'january', 'february', 'march', 'april'],
  year_round: ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'],
}

export function EditCustomerProductSpecForm({ open, onOpenChange, customerProductSpec }: EditCustomerProductSpecFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const form = useForm<EditCustomerProductSpecFormValues>({
    resolver: zodResolver(editCustomerProductSpecSchema),
    defaultValues: {
      notes: '',
      season: undefined,
      available_months: [],
      local_production_from_date: '',
      local_production_till_date: '',
      import_period_from_date: '',
      import_period_till_date: '',
    },
  })

  // Reset form when customerProductSpec changes
  useEffect(() => {
    if (customerProductSpec) {
      form.reset({
        notes: customerProductSpec.notes || '',
        season: customerProductSpec.season || undefined,
        available_months: customerProductSpec.available_months || [],
        local_production_from_date: customerProductSpec.local_production_from_date || '',
        local_production_till_date: customerProductSpec.local_production_till_date || '',
        import_period_from_date: customerProductSpec.import_period_from_date || '',
        import_period_till_date: customerProductSpec.import_period_till_date || '',
      })
    }
  }, [customerProductSpec, form])

  const onSubmit = async (values: EditCustomerProductSpecFormValues) => {
    if (!customerProductSpec) return

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('customer_product_packaging_spec')
        .update({
          notes: values.notes || null,
          season: values.season || null,
          available_months: values.available_months?.length ? values.available_months : null,
          local_production_from_date: values.local_production_from_date || null,
          local_production_till_date: values.local_production_till_date || null,
          import_period_from_date: values.import_period_from_date || null,
          import_period_till_date: values.import_period_till_date || null,
        })
        .eq('id', customerProductSpec.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Product requirement updated successfully',
      })

      queryClient.invalidateQueries({ queryKey: ['customer-product-specs', customerProductSpec.customer_id] })
      onOpenChange(false)

    } catch (error: any) {
      console.error('Error updating product requirement:', error)
      toast({
        title: 'Error',
        description: `Failed to update product requirement: ${error.message}`,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectAllWeekdays = () => {
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    form.setValue('available_months', weekdays)
  }

  const handleClearAllMonths = () => {
    form.setValue('available_months', [])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-terminal-panel border-terminal-border">
        <DialogHeader>
          <DialogTitle className="text-terminal-text font-mono">EDIT PRODUCT REQUIREMENT</DialogTitle>
          <DialogDescription className="text-terminal-muted font-mono">
            Update the product requirement and seasonal preferences.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="season"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-terminal-text font-mono">Season</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value)
                      // Auto-select months based on season
                      if (value && seasonToMonths[value as keyof typeof seasonToMonths]) {
                        form.setValue('available_months', seasonToMonths[value as keyof typeof seasonToMonths])
                      }
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text font-mono">
                        <SelectValue placeholder="Select season" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-terminal-panel border-terminal-border">
                      {seasonOptions.map((season) => (
                        <SelectItem key={season.value} value={season.value} className="font-mono text-terminal-text">
                          {season.label}
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
              name="available_months"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base text-terminal-text font-mono">Available Months</FormLabel>
                    <div className="flex gap-2 mt-2">
                      <Button type="button" variant="outline" size="sm" onClick={handleClearAllMonths} className="bg-terminal-dark border-2 border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono">
                        Clear All
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {monthOptions.map((month) => (
                      <FormField
                        key={month.value}
                        control={form.control}
                        name="available_months"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={month.value}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(month.value)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value || [], month.value])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== month.value
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal text-terminal-text font-mono">
                                {month.label}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="local_production_from_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-terminal-text font-mono">Local Production From</FormLabel>
                    <FormControl>
                      <Input type="date" className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="local_production_till_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-terminal-text font-mono">Local Production Till</FormLabel>
                    <FormControl>
                      <Input type="date" className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="import_period_from_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-terminal-text font-mono">Import Period From</FormLabel>
                    <FormControl>
                      <Input type="date" className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="import_period_till_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-terminal-text font-mono">Import Period Till</FormLabel>
                    <FormControl>
                      <Input type="date" className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-terminal-text font-mono">Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this product requirement..."
                      className="bg-terminal-dark border-terminal-border text-terminal-text font-mono resize-none"
                      {...field}
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
                {isLoading ? 'Updating...' : 'Update Product Requirement'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}