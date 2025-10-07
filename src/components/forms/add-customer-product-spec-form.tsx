'use client'

import React, { useState } from 'react'
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useProductSpecs } from '@/hooks/use-products'

const addCustomerProductSpecSchema = z.object({
  product_packaging_spec_ids: z.array(z.string()).min(1, 'At least one product specification is required'),
  notes: z.string().optional(),
  season: z.enum(['spring', 'summer', 'autumn', 'winter', 'year_round']).optional(),
  local_production_from_date: z.string().optional(),
  local_production_till_date: z.string().optional(),
  import_period_from_date: z.string().optional(),
  import_period_till_date: z.string().optional(),
})

type AddCustomerProductSpecFormValues = z.infer<typeof addCustomerProductSpecSchema>

interface AddCustomerProductSpecFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: string
}

export function AddCustomerProductSpecForm({ open, onOpenChange, customerId }: AddCustomerProductSpecFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { productSpecs } = useProductSpecs()

  const form = useForm<AddCustomerProductSpecFormValues>({
    resolver: zodResolver(addCustomerProductSpecSchema),
    defaultValues: {
      product_packaging_spec_ids: [],
      notes: '',
      season: undefined,
      local_production_from_date: '',
      local_production_till_date: '',
      import_period_from_date: '',
      import_period_till_date: '',
    },
  })

  const filteredSpecs = productSpecs?.filter(spec => {
    if (!searchQuery || searchQuery.length === 0) return false

    const searchTerm = searchQuery.toLowerCase()
    const productName = spec.products?.name?.toLowerCase() || ''
    const packagingName = spec.packaging_options?.label?.toLowerCase() || ''
    const sizeName = spec.size_options?.name?.toLowerCase() || ''
    const palletName = spec.pallets?.label?.toLowerCase() || ''

    return productName.includes(searchTerm) ||
           packagingName.includes(searchTerm) ||
           sizeName.includes(searchTerm) ||
           palletName.includes(searchTerm)
  }) || []

  // Helper function to calculate opposite period
  const calculateOppositePeriod = (fromDate: string, toDate: string): { from: string; to: string } => {
    if (!fromDate || !toDate) return { from: '', to: '' }

    const from = new Date(fromDate)
    const to = new Date(toDate)

    // Calculate the day after the end date
    const oppositeFrom = new Date(to)
    oppositeFrom.setDate(oppositeFrom.getDate() + 1)

    // Calculate the day before the start date
    const oppositeTo = new Date(from)
    oppositeTo.setDate(oppositeTo.getDate() - 1)

    // If the opposite period would span across years, handle it properly
    if (oppositeFrom > oppositeTo) {
      // This means we need to wrap around the year
      // Set opposite end to end of year, opposite start to beginning of year
      const endOfYear = new Date(from.getFullYear(), 11, 31) // December 31st
      const startOfYear = new Date(to.getFullYear(), 0, 1) // January 1st

      return {
        from: startOfYear.toISOString().split('T')[0],
        to: oppositeTo.toISOString().split('T')[0]
      }
    }

    return {
      from: oppositeFrom.toISOString().split('T')[0],
      to: oppositeTo.toISOString().split('T')[0]
    }
  }

  // Watch for changes in local production dates
  const localFromDate = form.watch('local_production_from_date')
  const localToDate = form.watch('local_production_till_date')
  const importFromDate = form.watch('import_period_from_date')
  const importToDate = form.watch('import_period_till_date')

  // Auto-fill import period when local period changes
  React.useEffect(() => {
    if (localFromDate && localToDate && (!importFromDate || !importToDate)) {
      const opposite = calculateOppositePeriod(localFromDate, localToDate)
      if (opposite.from && opposite.to) {
        form.setValue('import_period_from_date', opposite.from)
        form.setValue('import_period_till_date', opposite.to)
      }
    }
  }, [localFromDate, localToDate, importFromDate, importToDate, form])

  // Auto-fill local period when import period changes
  React.useEffect(() => {
    if (importFromDate && importToDate && (!localFromDate || !localToDate)) {
      const opposite = calculateOppositePeriod(importFromDate, importToDate)
      if (opposite.from && opposite.to) {
        form.setValue('local_production_from_date', opposite.from)
        form.setValue('local_production_till_date', opposite.to)
      }
    }
  }, [importFromDate, importToDate, localFromDate, localToDate, form])

  const onSubmit = async (values: AddCustomerProductSpecFormValues) => {
    setIsLoading(true)
    try {
      // Create multiple records, one for each selected product spec
      const records = values.product_packaging_spec_ids.map(specId => ({
        customer_id: customerId,
        product_packaging_spec_id: specId,
        notes: values.notes || null,
        season: values.season || null,
        local_production_from_date: values.local_production_from_date || null,
        local_production_till_date: values.local_production_till_date || null,
        import_period_from_date: values.import_period_from_date || null,
        import_period_till_date: values.import_period_till_date || null,
      }))

      const { error } = await supabase
        .from('customer_product_packaging_spec')
        .insert(records)

      if (error) throw error

      toast({
        title: 'Success',
        description: `${records.length} product requirement${records.length > 1 ? 's' : ''} added successfully`,
      })

      queryClient.invalidateQueries({ queryKey: ['customer-product-specs', customerId] })
      form.reset()
      setSearchQuery('')
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error adding product requirements:', error)
      toast({
        title: 'Error',
        description: `Failed to add product requirements: ${error.message}`,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-terminal-panel border-terminal-border">
        <DialogHeader>
          <DialogTitle className="font-mono text-terminal-text">Add Product Requirement</DialogTitle>
          <DialogDescription className="font-mono text-terminal-muted">
            Add a new product requirement with seasonal preferences for this customer.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="product_packaging_spec_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-terminal-text">Product Specifications</FormLabel>
                  <div className="space-y-2">
                    {/* Selected items display */}
                    {field.value && field.value.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {field.value.map((specId) => {
                          const spec = productSpecs?.find(s => s.id === specId)
                          return (
                            <div key={specId} className="flex items-center bg-terminal-dark border border-terminal-border text-terminal-text px-2 py-1 rounded-md text-sm font-mono">
                              <span className="max-w-[200px] truncate">
                                {spec ? `${spec.products?.name} - ${spec.packaging_options?.label} (${spec.size_options?.name})` : 'Unknown'}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 ml-2 hover:bg-terminal-panel text-terminal-text"
                                onClick={() => {
                                  const newValue = field.value.filter(id => id !== specId)
                                  field.onChange(newValue)
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Search and select */}
                    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={isPopoverOpen}
                            className="w-full justify-between bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono"
                          >
                            {field.value && field.value.length > 0
                              ? `${field.value.length} selected`
                              : "Search and select product specifications..."
                            }
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[500px] p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder="Type to search products..."
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {searchQuery.length === 0
                                ? "Type at least one character to search..."
                                : "No products found."
                              }
                            </CommandEmpty>
                            {filteredSpecs.length > 0 && (
                              <CommandGroup>
                                {filteredSpecs.map((spec) => (
                                  <CommandItem
                                    key={spec.id}
                                    value={`${spec.products?.name} ${spec.packaging_options?.label} ${spec.size_options?.name} ${spec.pallets?.label}`}
                                    onSelect={() => {
                                      const isSelected = field.value?.includes(spec.id)
                                      if (isSelected) {
                                        field.onChange(field.value.filter(id => id !== spec.id))
                                      } else {
                                        field.onChange([...(field.value || []), spec.id])
                                      }
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value?.includes(spec.id) ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-medium font-mono text-terminal-text">{spec.products?.name}</span>
                                      <span className="text-sm text-terminal-muted font-mono">
                                        {spec.packaging_options?.label} ({spec.size_options?.name}) on {spec.pallets?.label}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
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
                  <FormLabel className="font-mono text-terminal-text">Season</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text font-mono">
                        <SelectValue placeholder="Select season (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-terminal-panel border-terminal-border">
                      <SelectItem value="spring" className="font-mono text-terminal-text">Spring</SelectItem>
                      <SelectItem value="summer" className="font-mono text-terminal-text">Summer</SelectItem>
                      <SelectItem value="autumn" className="font-mono text-terminal-text">Autumn</SelectItem>
                      <SelectItem value="winter" className="font-mono text-terminal-text">Winter</SelectItem>
                      <SelectItem value="year_round" className="font-mono text-terminal-text">Year Round</SelectItem>
                    </SelectContent>
                  </Select>
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
                    <FormLabel className="font-mono text-terminal-text">Local Production From</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" />
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
                    <FormLabel className="font-mono text-terminal-text">Local Production Till</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" />
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
                    <FormLabel className="font-mono text-terminal-text">Import Period From</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" />
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
                    <FormLabel className="font-mono text-terminal-text">Import Period Till</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" />
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
                  <FormLabel className="font-mono text-terminal-text">Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes about this product requirement" {...field} className="bg-terminal-dark border-terminal-border text-terminal-text font-mono placeholder:text-terminal-muted" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono">
                {isLoading ? 'Adding...' : 'Add Product Requirement'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}