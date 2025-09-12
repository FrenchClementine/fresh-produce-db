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
import { useProductSpecs } from '@/hooks/use-products'

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
  winter: ['december', 'january', 'february'],
  year_round: ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'],
}

// Season to recurring dates mapping (typical harvest seasons)
const seasonToRecurring = {
  spring: { 
    start: { month: 'march', day: 1 },
    end: { month: 'may', day: 31 }
  },
  summer: { 
    start: { month: 'may', day: 1 },
    end: { month: 'october', day: 31 }
  },
  autumn: { 
    start: { month: 'september', day: 1 },
    end: { month: 'november', day: 30 }
  },
  winter: { 
    start: { month: 'december', day: 1 },
    end: { month: 'february', day: 28 }
  },
  year_round: { 
    start: { month: 'january', day: 1 },
    end: { month: 'december', day: 31 }
  },
}

const addSupplierProductSchema = z.object({
  product_packaging_spec_ids: z.array(z.string()).min(1, 'At least one product specification is required'),
  notes: z.string().optional(),
  season: z.string().optional(),
  available_months: z.array(z.string()).optional(),
  available_from_date: z.string().optional(),
  available_till_date: z.string().optional(),
  recurring_start_month: z.string().optional(),
  recurring_start_day: z.number().min(1).max(31),
  recurring_end_month: z.string().optional(),
  recurring_end_day: z.number().min(1).max(31),
})

type AddSupplierProductFormValues = z.infer<typeof addSupplierProductSchema>

interface AddSupplierProductFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplierId: string
}

export function AddSupplierProductForm({ open, onOpenChange, supplierId }: AddSupplierProductFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { productSpecs, isLoading: isLoadingSpecs } = useProductSpecs()

  const form = useForm<AddSupplierProductFormValues>({
    resolver: zodResolver(addSupplierProductSchema),
    defaultValues: {
      product_packaging_spec_ids: [],
      notes: '',
      season: '',
      available_months: [],
      available_from_date: '',
      available_till_date: '',
      recurring_start_month: '',
      recurring_start_day: 1,
      recurring_end_month: '',
      recurring_end_day: 1,
    },
  })

  const selectedSeason = form.watch('season')

  // Auto-populate fields when season is selected
  useEffect(() => {
    if (selectedSeason && seasonToMonths[selectedSeason as keyof typeof seasonToMonths]) {
      const months = seasonToMonths[selectedSeason as keyof typeof seasonToMonths]
      const recurring = seasonToRecurring[selectedSeason as keyof typeof seasonToRecurring]
      
      // Set available months
      form.setValue('available_months', months)
      
      // Set recurring dates
      if (recurring) {
        form.setValue('recurring_start_month', recurring.start.month)
        form.setValue('recurring_start_day', recurring.start.day)
        form.setValue('recurring_end_month', recurring.end.month)
        form.setValue('recurring_end_day', recurring.end.day)
      }

      // Set recurring seasonal pattern dates (using a generic year like 2024 for the pattern)
      const patternYear = 2024 // Use a standard year for the recurring pattern
      
      if (recurring) {
        let startYear = patternYear
        let endYear = patternYear
        
        // Handle winter season that spans across years in the pattern
        if (selectedSeason === 'winter') {
          endYear = patternYear + 1
        }
        
        const startDate = new Date(startYear, getMonthNumber(recurring.start.month) - 1, recurring.start.day)
        const endDate = new Date(endYear, getMonthNumber(recurring.end.month) - 1, recurring.end.day)
        
        form.setValue('available_from_date', startDate.toISOString().split('T')[0])
        form.setValue('available_till_date', endDate.toISOString().split('T')[0])
      }
    }
  }, [selectedSeason, form])

  // Helper function to convert month name to number
  const getMonthNumber = (monthName: string): number => {
    const monthMap: { [key: string]: number } = {
      january: 1, february: 2, march: 3, april: 4,
      may: 5, june: 6, july: 7, august: 8,
      september: 9, october: 10, november: 11, december: 12
    }
    return monthMap[monthName] || 1
  }

  const onSubmit = async (values: AddSupplierProductFormValues) => {
    setIsLoading(true)
    try {
      // Create an array of entries for bulk insertion
      const entries = values.product_packaging_spec_ids.map(productSpecId => ({
        supplier_id: supplierId,
        product_packaging_spec_id: productSpecId,
        notes: values.notes || null,
        season: values.season || null,
        available_months: values.available_months?.length ? values.available_months : null,
        available_from_date: values.available_from_date || null,
        available_till_date: values.available_till_date || null,
        recurring_start_month: values.recurring_start_month || null,
        recurring_start_day: values.recurring_start_day || null,
        recurring_end_month: values.recurring_end_month || null,
        recurring_end_day: values.recurring_end_day || null,
      }))

      const { error } = await supabase
        .from('supplier_product_packaging_spec')
        .insert(entries)

      if (error) throw error

      toast({
        title: 'Success',
        description: `${values.product_packaging_spec_ids.length} product${values.product_packaging_spec_ids.length > 1 ? 's' : ''} linked to supplier successfully`,
      })

      queryClient.invalidateQueries({ queryKey: ['supplier-products'] })
      onOpenChange(false)
      form.reset()
      
    } catch (error: any) {
      console.error('Error linking products to supplier:', error)
      
      // Handle duplicate key error specifically
      if (error.code === '23505') {
        toast({
          title: 'Some Products Already Linked',
          description: 'One or more product specifications are already linked to this supplier. Only new products were added.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Error',
          description: `Failed to link products: ${error.message}`,
          variant: 'destructive',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Link Products to Supplier</DialogTitle>
          <DialogDescription>
            Add one or more product specifications to this supplier with the same availability information
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="product_packaging_spec_ids"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Product Specifications *</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Select one or more product specifications to link with the same availability information
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const allIds = productSpecs?.map((spec: any) => spec.id) || []
                          form.setValue('product_packaging_spec_ids', allIds)
                        }}
                      >
                        Select All
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => form.setValue('product_packaging_spec_ids', [])}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-3 max-h-80 overflow-y-auto border rounded-lg p-3">
                    {productSpecs?.map((spec: any) => (
                      <FormField
                        key={spec.id}
                        control={form.control}
                        name="product_packaging_spec_ids"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={spec.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(spec.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value || [], spec.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== spec.id
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal leading-5">
                                {spec.products?.name || 'Unknown Product'} - {spec.packaging_options?.label} - {spec.size_options?.name}
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

            <FormField
              control={form.control}
              name="season"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Season</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select season..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {seasonOptions.map((season) => (
                        <SelectItem key={season.value} value={season.value}>
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
                    <FormLabel className="text-base">Available Months</FormLabel>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
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
                              <FormLabel className="text-sm font-normal">
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
                name="available_from_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available From Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <div className="text-xs text-muted-foreground">
                      Seasonal pattern date (repeats annually)
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="available_till_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available Till Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <div className="text-xs text-muted-foreground">
                      Seasonal pattern date (repeats annually)
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <FormLabel>Recurring Start</FormLabel>
                <div className="flex gap-2">
                  <FormField
                    control={form.control}
                    name="recurring_start_month"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Month" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {monthOptions.map((month) => (
                              <SelectItem key={month.value} value={month.value}>
                                {month.label}
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
                    name="recurring_start_day"
                    render={({ field }) => (
                      <FormItem className="w-20">
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="31"
                            placeholder="Day"
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <FormLabel>Recurring End</FormLabel>
                <div className="flex gap-2">
                  <FormField
                    control={form.control}
                    name="recurring_end_month"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Month" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {monthOptions.map((month) => (
                              <SelectItem key={month.value} value={month.value}>
                                {month.label}
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
                    name="recurring_end_day"
                    render={({ field }) => (
                      <FormItem className="w-20">
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="31"
                            placeholder="Day"
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes about this product offering..." 
                      className="resize-none" 
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
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Linking...' : 'Link Products'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}