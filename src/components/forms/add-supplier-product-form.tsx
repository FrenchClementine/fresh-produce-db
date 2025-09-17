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
  SearchableSelect,
} from '@/components/ui/searchable-select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useProductSpecs } from '@/hooks/use-products'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  const [productSearchQuery, setProductSearchQuery] = useState('')
  const [isProductPopoverOpen, setIsProductPopoverOpen] = useState(false)
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
      recurring_start_day: undefined,
      recurring_end_month: '',
      recurring_end_day: undefined,
    },
  })

  const selectedSeason = form.watch('season')

  const filteredSpecs = productSpecs?.filter(spec => {
    if (!productSearchQuery || productSearchQuery.length === 0) return false

    const searchTerm = productSearchQuery.toLowerCase()
    const productName = spec.products?.name?.toLowerCase() || ''
    const packagingName = spec.packaging_options?.label?.toLowerCase() || ''
    const sizeName = spec.size_options?.name?.toLowerCase() || ''
    const palletName = spec.pallets?.label?.toLowerCase() || ''

    return (
      productName.includes(searchTerm) ||
      packagingName.includes(searchTerm) ||
      sizeName.includes(searchTerm) ||
      palletName.includes(searchTerm)
    )
  }) || []

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
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Product Specifications *</FormLabel>
                  <div className="text-sm text-muted-foreground">
                    Search for product specifications to link with the same availability information
                  </div>

                  {field.value && field.value.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {field.value.map((specId) => {
                        const spec = productSpecs?.find((item) => item.id === specId)
                        return (
                          <div key={specId} className="flex items-center bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm">
                            <span className="max-w-[240px] truncate">
                              {spec ? `${spec.products?.name} - ${spec.packaging_options?.label} (${spec.size_options?.name})` : 'Unknown specification'}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 ml-2"
                              onClick={() => field.onChange(field.value.filter((id) => id !== specId))}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )
                      })}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto px-2 py-1"
                        onClick={() => field.onChange([])}
                      >
                        Clear all
                      </Button>
                    </div>
                  )}

                  <Popover open={isProductPopoverOpen} onOpenChange={(open) => {
                    setIsProductPopoverOpen(open)
                    if (!open) {
                      setProductSearchQuery('')
                    }
                  }}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isProductPopoverOpen}
                          className="w-full justify-between mt-3"
                        >
                          {field.value && field.value.length > 0
                            ? `${field.value.length} selected`
                            : 'Search and select product specifications...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[520px] p-0">
                      <Command>
                        <CommandInput
                          placeholder="Type to search products..."
                          value={productSearchQuery}
                          onValueChange={setProductSearchQuery}
                        />
                        <CommandEmpty>
                          {isLoadingSpecs
                            ? 'Loading product specifications...'
                            : productSearchQuery.length === 0
                              ? 'Type at least one character to search...'
                              : 'No product specifications found.'}
                        </CommandEmpty>
                        {filteredSpecs.length > 0 && (
                          <CommandGroup className="max-h-64 overflow-auto">
                            {filteredSpecs.map((spec) => (
                              <CommandItem
                                key={spec.id}
                                value={`${spec.products?.name} ${spec.packaging_options?.label} ${spec.size_options?.name} ${spec.pallets?.label}`}
                                onSelect={() => {
                                  const isSelected = field.value?.includes(spec.id)
                                  if (isSelected) {
                                    field.onChange(field.value.filter((id) => id !== spec.id))
                                  } else {
                                    field.onChange([...(field.value || []), spec.id])
                                  }
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    field.value?.includes(spec.id) ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">{spec.products?.name}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {spec.packaging_options?.label} ({spec.size_options?.name}) on {spec.pallets?.label}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </Command>
                    </PopoverContent>
                  </Popover>

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
                  <FormControl>
                    <SearchableSelect
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value)
                        // Auto-select months based on season
                        if (value && seasonToMonths[value as keyof typeof seasonToMonths]) {
                          form.setValue('available_months', seasonToMonths[value as keyof typeof seasonToMonths])
                        }
                      }}
                      options={seasonOptions}
                      placeholder="Select season..."
                      searchPlaceholder="Search seasons..."
                    />
                  </FormControl>
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
                        <FormControl>
                          <SearchableSelect
                            value={field.value}
                            onValueChange={field.onChange}
                            options={monthOptions}
                            placeholder="Month"
                            searchPlaceholder="Search months..."
                          />
                        </FormControl>
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
                        <FormControl>
                          <SearchableSelect
                            value={field.value}
                            onValueChange={field.onChange}
                            options={monthOptions}
                            placeholder="Month"
                            searchPlaceholder="Search months..."
                          />
                        </FormControl>
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
