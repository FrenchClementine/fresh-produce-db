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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { useHubs } from '@/hooks/use-products'
import { useDistanceAdvisory } from '@/hooks/use-distance-advisory'
import { DistanceAdvisory } from '@/components/distance-advisory'
import { useNearestHubs } from '@/hooks/use-nearest-hubs'
import { NearestHubsSuggestion } from '@/components/nearest-hubs-suggestion'

const addCustomerLogisticsSchema = z.object({
  mode: z.enum(['Ex Works', 'DELIVERY', 'TRANSIT']),
  hub_id: z.string().min(1, 'Hub is required'),
  typical_lead_time_days: z.number().optional(),
  fixed_operational_days: z.array(z.string()).optional(),
  preferred_delivery_time: z.string().optional(),
  special_requirements: z.string().optional(),
  notes: z.string().optional(),
})

type AddCustomerLogisticsFormValues = z.infer<typeof addCustomerLogisticsSchema>

interface AddCustomerLogisticsFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: string
}

const deliveryModes = [
  { id: 'Ex Works', label: 'Ex Works (Customer pickup)' },
  { id: 'DELIVERY', label: 'Delivery' },
  { id: 'TRANSIT', label: 'Transit' },
]

const daysOfWeek = [
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
  { id: 'saturday', label: 'Saturday' },
  { id: 'sunday', label: 'Sunday' },
]

export function AddCustomerLogisticsForm({ open, onOpenChange, customerId }: AddCustomerLogisticsFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { hubs } = useHubs()

  // Fetch customer data for distance calculations
  const { data: customer } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, city, country')
        .eq('id', customerId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!customerId && open
  })

  // Distance advisory for hub selection
  const distanceAdvisory = useDistanceAdvisory()

  // Nearest hubs suggestion
  const nearestHubs = useNearestHubs()

  const form = useForm<AddCustomerLogisticsFormValues>({
    resolver: zodResolver(addCustomerLogisticsSchema),
    defaultValues: {
      mode: 'DELIVERY',
      hub_id: '',
      typical_lead_time_days: undefined,
      fixed_operational_days: [],
      preferred_delivery_time: '',
      special_requirements: '',
      notes: '',
    },
  })

  const selectedMode = form.watch('mode')
  const selectedHubId = form.watch('hub_id')

  // Calculate distance to selected hub when changed
  useEffect(() => {
    if (customer?.city && customer?.country && selectedHubId) {
      distanceAdvisory.calculateDistance(
        customer.city,
        customer.country,
        selectedHubId
      )
    } else {
      distanceAdvisory.clearDistance()
    }
  }, [customer?.city, customer?.country, selectedHubId]) // Removed distanceAdvisory from deps

  // Find nearest hubs for delivery mode
  useEffect(() => {
    if (customer?.city && customer?.country && selectedMode === 'DELIVERY') {
      nearestHubs.findNearestHubs(customer.city, customer.country, 'customer')
    } else {
      nearestHubs.clearHubs()
    }
  }, [customer?.city, customer?.country, selectedMode]) // Removed nearestHubs from deps

  // Handle hub selection from nearest hubs suggestion
  const handleSelectHub = (hubId: string) => {
    form.setValue('hub_id', hubId)
    setIsPopoverOpen(false)
    setSearchQuery('')
  }

  const onSubmit = async (values: AddCustomerLogisticsFormValues) => {
    setIsLoading(true)
    try {
      const cleanValues = {
        customer_id: customerId,
        mode: values.mode,
        origin_hub_id: values.hub_id, // Always required - it's the hub where goods originate
        destination_hub_id: values.mode === 'DELIVERY' || values.mode === 'TRANSIT' ? values.hub_id : null,
        typical_lead_time_days: values.typical_lead_time_days || null,
        fixed_operational_days: values.fixed_operational_days?.length ? values.fixed_operational_days : null,
        preferred_delivery_time: values.preferred_delivery_time || null,
        special_requirements: values.special_requirements || null,
        notes: values.notes || null,
      }

      const { error } = await supabase
        .from('customer_logistics_capabilities')
        .insert(cleanValues)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Logistics preference added successfully',
      })

      queryClient.invalidateQueries({ queryKey: ['customer-logistics', customerId] })
      form.reset()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error adding logistics preference:', error)
      toast({
        title: 'Error',
        description: `Failed to add logistics preference: ${error.message}`,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Logistics Preference</DialogTitle>
          <DialogDescription>
            Add a hub delivery/pickup preference for this customer.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Mode</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select delivery mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {deliveryModes.map((mode) => (
                        <SelectItem key={mode.id} value={mode.id}>
                          {mode.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nearest Hubs Suggestion for Delivery Mode */}
            {customer && selectedMode === 'DELIVERY' && (
              <NearestHubsSuggestion
                hubs={nearestHubs.nearestHubs}
                isLoading={nearestHubs.isLoading}
                error={nearestHubs.error}
                entityName={customer.name}
                onSelectHub={handleSelectHub}
                className="mb-4"
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="hub_id"
                render={({ field }) => {
                  const selectedHub = hubs?.find(h => h.id === field.value)
                  const filteredHubs = hubs?.filter(hub => {
                    if (!hub.is_active) return false
                    if (!searchQuery || searchQuery.length === 0) return false

                    const searchTerm = searchQuery.toLowerCase()
                    const hubName = hub.name?.toLowerCase() || ''
                    const hubCode = hub.hub_code?.toLowerCase() || ''
                    const hubLocation = hub.location?.toLowerCase() || ''

                    return hubName.includes(searchTerm) ||
                           hubCode.includes(searchTerm) ||
                           hubLocation.includes(searchTerm)
                  }) || []

                  return (
                    <FormItem className="col-span-2">
                      <FormLabel>
                        {selectedMode === 'Ex Works' ? 'Pickup Hub (Our Location)' : selectedMode === 'DELIVERY' ? 'Our Hub (Origin)' : 'Hub'}
                      </FormLabel>
                      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={isPopoverOpen}
                              className="w-full justify-between"
                            >
                              {selectedHub
                                ? `${selectedHub.name} (${selectedHub.hub_code})`
                                : `Select hub...`
                              }
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                          <Command>
                            <CommandInput
                              placeholder="Type to search hubs..."
                              value={searchQuery}
                              onValueChange={setSearchQuery}
                            />
                            <CommandEmpty>
                              {searchQuery.length === 0
                                ? "Type at least one character to search..."
                                : "No hubs found."
                              }
                            </CommandEmpty>
                            {filteredHubs.length > 0 && (
                              <CommandGroup className="max-h-64 overflow-auto">
                                {filteredHubs.map((hub) => (
                                  <CommandItem
                                    key={hub.id}
                                    value={`${hub.name} ${hub.hub_code} ${hub.location || ''}`}
                                    onSelect={() => {
                                      field.onChange(hub.id)
                                      setIsPopoverOpen(false)
                                      setSearchQuery('')
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === hub.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-medium">{hub.name} ({hub.hub_code})</span>
                                      {hub.location && (
                                        <span className="text-sm text-muted-foreground">{hub.location}</span>
                                      )}
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
                  )
                }}
              />

              {/* Distance Advisory for Hub */}
              {customer && selectedHubId && (
                <div className="col-span-2">
                  <DistanceAdvisory
                    distanceInfo={distanceAdvisory.distanceInfo}
                    isCalculating={distanceAdvisory.isCalculating}
                    error={distanceAdvisory.error}
                    entityType="customer"
                    entityName={customer.name}
                    hubName={hubs?.find(h => h.id === selectedHubId)?.name || 'Selected Hub'}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="typical_lead_time_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Time (Days)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter lead time in days"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferred_delivery_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Delivery Time</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Morning, Afternoon, Evening" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="fixed_operational_days"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Operational Days</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Select the days when this logistics option is available.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
                        form.setValue('fixed_operational_days', weekdays)
                      }}
                    >
                      Select All Weekdays
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {daysOfWeek.map((day) => (
                      <FormField
                        key={day.id}
                        control={form.control}
                        name="fixed_operational_days"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={day.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(day.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...(field.value || []), day.id])
                                      : field.onChange(
                                          field.value?.filter((value) => value !== day.id)
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                {day.label}
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
              name="special_requirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Requirements</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Refrigerated truck required, Forklift access needed" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes about this logistics preference" {...field} />
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
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Adding...' : 'Add Logistics Preference'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}