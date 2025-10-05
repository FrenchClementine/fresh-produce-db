'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
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
import { SearchableSelect } from '@/components/ui/searchable-select'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { useAllHubs, type Hub } from '@/hooks/use-hubs'
import { useDistanceAdvisory } from '@/hooks/use-distance-advisory'
import { DistanceAdvisory } from '@/components/distance-advisory'
import { useNearestHubs } from '@/hooks/use-nearest-hubs'
import { NearestHubsSuggestion } from '@/components/nearest-hubs-suggestion'
import { Plus, ChevronsUpDown, Check } from 'lucide-react'

const addLogisticsSchema = z.object({
  origin_hub_id: z.string().min(1, 'Origin hub is required'),
  destination_hub_id: z.string().optional(),
  mode: z.enum(['Ex Works', 'DELIVERY', 'TRANSIT'], {
    required_error: 'Delivery mode is required',
  }),
  typical_lead_time_days: z.number().min(1, 'Lead time must be at least 1 day'),
  fixed_operational_days: z.array(z.string()).optional(),
  notes: z.string().optional(),
}).refine((data) => {
  // Ex Works doesn't need destination hub
  if (data.mode === 'Ex Works') {
    return true
  }
  // DELIVERY and TRANSIT require destination hub
  return data.destination_hub_id && data.destination_hub_id.length > 0
}, {
  message: "Destination hub is required for DELIVERY and TRANSIT modes",
  path: ["destination_hub_id"],
}).refine((data) => {
  // Only check origin != destination when both exist
  if (!data.destination_hub_id) return true
  return data.origin_hub_id !== data.destination_hub_id
}, {
  message: "Origin and destination hubs must be different",
  path: ["destination_hub_id"],
})

type AddLogisticsFormValues = z.infer<typeof addLogisticsSchema>

interface AddSupplierLogisticsFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplierId: string
}

const deliveryModes = [
  { value: 'Ex Works', label: 'Ex Works' },
  { value: 'DELIVERY', label: 'Delivery' },
  { value: 'TRANSIT', label: 'Transit' },
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

export function AddSupplierLogisticsForm({ open, onOpenChange, supplierId }: AddSupplierLogisticsFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isCreatingHub, setIsCreatingHub] = useState(false)
  const [newHubData, setNewHubData] = useState({ name: '', hub_code: '', country_code: '', city_name: '', region: '' })
  const [showCreateHub, setShowCreateHub] = useState(false)
  const [hubType, setHubType] = useState<'origin' | 'destination' | null>(null)
  const [originSearchQuery, setOriginSearchQuery] = useState('')
  const [destinationSearchQuery, setDestinationSearchQuery] = useState('')
  const [originPopoverOpen, setOriginPopoverOpen] = useState(false)
  const [destinationPopoverOpen, setDestinationPopoverOpen] = useState(false)

  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { data: hubs } = useAllHubs()

  // Fetch supplier data for distance calculations
  const { data: supplier } = useQuery({
    queryKey: ['supplier', supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, city, country')
        .eq('id', supplierId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!supplierId && open
  })

  // Distance advisory for origin hub
  const originDistanceAdvisory = useDistanceAdvisory()
  // Distance advisory for destination hub (for non-Ex Works)
  const destinationDistanceAdvisory = useDistanceAdvisory()
  // Nearest hubs for Ex Works (fast database lookup)
  const nearestHubs = useNearestHubs()

  const form = useForm<AddLogisticsFormValues>({
    resolver: zodResolver(addLogisticsSchema),
    defaultValues: {
      origin_hub_id: '',
      destination_hub_id: '',
      mode: undefined,
      typical_lead_time_days: undefined,
      fixed_operational_days: [],
      notes: '',
    },
  })

  const selectedMode = form.watch('mode')
  const selectedOriginHubId = form.watch('origin_hub_id')
  const selectedDestinationHubId = form.watch('destination_hub_id')
  const isExWorks = selectedMode === 'Ex Works'

  const formatHubLabel = useCallback((hub: Hub) => {
    const parts: string[] = [hub.name]
    if (hub.hub_code) parts.push(`(${hub.hub_code})`)
    const locationParts = [hub.city_name, hub.country_code].filter(Boolean).join(', ')
    return locationParts ? `${parts.join(' ')} • ${locationParts}` : parts.join(' ')
  }, [])

  const filterHubs = useCallback((query: string) => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return (hubs || []) as Hub[]
    return ((hubs || []) as Hub[]).filter((hub) => {
      const values = [hub.name, hub.hub_code, hub.city_name, hub.country_code]
        .filter(Boolean)
        .map((value) => value!.toLowerCase())
      return values.some((value) => value.includes(trimmed))
    })
  }, [hubs])

  const selectedOriginHub = (hubs || []).find((h) => h.id === selectedOriginHubId)
  const selectedDestinationHub = (hubs || []).find((h) => h.id === selectedDestinationHubId)
  const filteredOriginHubs = useMemo(() => filterHubs(originSearchQuery), [filterHubs, originSearchQuery])
  const filteredDestinationHubs = useMemo(() => filterHubs(destinationSearchQuery), [filterHubs, destinationSearchQuery])

  const availableDestinationHubs = useMemo(() => filteredDestinationHubs.filter((hub) => hub.id !== selectedOriginHubId), [filteredDestinationHubs, selectedOriginHubId])

  useEffect(() => {
    if (!open) {
      setOriginPopoverOpen(false)
      setDestinationPopoverOpen(false)
      setOriginSearchQuery('')
      setDestinationSearchQuery('')
    }
  }, [open])

  // Clear destination hub when Ex Works is selected
  useEffect(() => {
    if (isExWorks) {
      form.setValue('destination_hub_id', '')
      destinationDistanceAdvisory.clearDistance()
    }
  }, [isExWorks, form]) // Removed destinationDistanceAdvisory from deps

  // Calculate distance to origin hub when selected
  useEffect(() => {
    if (supplier?.city && supplier?.country && selectedOriginHubId) {
      originDistanceAdvisory.calculateDistance(
        supplier.city,
        supplier.country,
        selectedOriginHubId
      )
    } else {
      originDistanceAdvisory.clearDistance()
    }
  }, [supplier?.city, supplier?.country, selectedOriginHubId]) // Removed originDistanceAdvisory from deps

  // Calculate distance to destination hub when selected (and not Ex Works)
  useEffect(() => {
    if (!isExWorks && supplier?.city && supplier?.country && selectedDestinationHubId) {
      destinationDistanceAdvisory.calculateDistance(
        supplier.city,
        supplier.country,
        selectedDestinationHubId
      )
    } else {
      destinationDistanceAdvisory.clearDistance()
    }
  }, [isExWorks, supplier?.city, supplier?.country, selectedDestinationHubId]) // Removed destinationDistanceAdvisory from deps

  // Find nearest hubs for Ex Works mode (using fast database lookup)
  useEffect(() => {
    if (isExWorks && supplier?.city && supplier?.country && !selectedOriginHubId) {
      nearestHubs.findNearestHubs(supplier.city, supplier.country, 'supplier')
    } else {
      nearestHubs.clearHubs()
    }
  }, [isExWorks, supplier?.city, supplier?.country, selectedOriginHubId])

  const handleSelectNearestHub = (hubId: string) => {
    form.setValue('origin_hub_id', hubId)
    nearestHubs.clearHubs()
  }

  const handleCreateHub = async () => {
    if (!newHubData.name || !newHubData.hub_code) {
      toast({
        title: 'Error',
        description: 'Hub name and code are required',
        variant: 'destructive',
      })
      return
    }

    setIsCreatingHub(true)
    try {
      const { data, error } = await supabase
        .from('hubs')
        .insert([{
          name: newHubData.name,
          hub_code: newHubData.hub_code,
          country_code: newHubData.country_code || null,
          city_name: newHubData.city_name || null,
          region: newHubData.region || null,
          is_active: true,
        }])
        .select()
        .single()

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Hub created successfully',
      })

      // Update the form with the new hub
      if (hubType === 'origin') {
        form.setValue('origin_hub_id', data.id)
      } else if (hubType === 'destination') {
        form.setValue('destination_hub_id', data.id)
      }

      // Reset create hub form
      setNewHubData({ name: '', hub_code: '', country_code: '', city_name: '', region: '' })
      setShowCreateHub(false)
      setHubType(null)

      // Refresh hubs data
      queryClient.invalidateQueries({ queryKey: ['all-hubs'] })
      queryClient.invalidateQueries({ queryKey: ['hubs'] })
      
    } catch (error: any) {
      console.error('Error creating hub:', error)
      toast({
        title: 'Error',
        description: `Failed to create hub: ${error.message}`,
        variant: 'destructive',
      })
    } finally {
      setIsCreatingHub(false)
    }
  }

  const onSubmit = async (values: AddLogisticsFormValues) => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('supplier_logistics_capabilities')
        .insert([{
          supplier_id: supplierId,
          origin_hub_id: values.origin_hub_id,
          destination_hub_id: values.destination_hub_id || null,
          mode: values.mode,
          typical_lead_time_days: values.typical_lead_time_days,
          fixed_operational_days: values.fixed_operational_days || [],
          notes: values.notes || null,
        }])

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Logistics capability added successfully',
      })

      queryClient.invalidateQueries({ queryKey: ['supplier-logistics', supplierId] })
      onOpenChange(false)
      form.reset()
      
    } catch (error: any) {
      console.error('Error adding logistics capability:', error)
      toast({
        title: 'Error',
        description: `Failed to add logistics capability: ${error.message}`,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectAllWeekdays = () => {
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    form.setValue('fixed_operational_days', weekdays)
  }

  const handleClearAllDays = () => {
    form.setValue('fixed_operational_days', [])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Logistics Capability</DialogTitle>
          <DialogDescription>
            Configure a new delivery route and capability for this supplier
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Delivery Mode Selection - First */}
            <FormField
              control={form.control}
              name="mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Mode *</FormLabel>
                  <SearchableSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    options={deliveryModes.map((mode) => ({
                      value: mode.value,
                      label: mode.label,
                    }))}
                    placeholder="Select delivery mode"
                    searchPlaceholder="Search delivery modes..."
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nearest Hub Suggestions for Ex Works (before hub selection) */}
            {isExWorks && supplier && (
              <NearestHubsSuggestion
                hubs={nearestHubs.nearestHubs}
                isLoading={nearestHubs.isLoading}
                error={nearestHubs.error}
                entityName={supplier.name}
                onSelectHub={handleSelectNearestHub}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="origin_hub_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origin Hub *</FormLabel>
                    <div className="flex gap-2">
                      <Popover
                        open={originPopoverOpen}
                        onOpenChange={(open) => {
                          setOriginPopoverOpen(open)
                          if (!open) setOriginSearchQuery('')
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={originPopoverOpen}
                            className="w-full justify-between"
                          >
                            {selectedOriginHub ? formatHubLabel(selectedOriginHub) : 'Select origin hub'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                          <Command>
                            <CommandInput
                              placeholder="Search hubs..."
                              value={originSearchQuery}
                              onValueChange={setOriginSearchQuery}
                            />
                            <CommandList>
                              <CommandEmpty>No hubs found.</CommandEmpty>
                              <CommandGroup className="max-h-72 overflow-y-auto overflow-x-hidden">
                                {filteredOriginHubs.map((hub) => (
                                  <CommandItem
                                    key={hub.id}
                                    value={`${hub.name ?? ''} ${hub.hub_code ?? ''} ${hub.city_name ?? ''}`}
                                    onSelect={() => {
                                      field.onChange(hub.id)
                                      setOriginPopoverOpen(false)
                                      setOriginSearchQuery('')
                                    }}
                                  >
                                    <Check
                                      className={field.value === hub.id ? 'mr-2 h-4 w-4 opacity-100' : 'mr-2 h-4 w-4 opacity-0'}
                                    />
                                    {formatHubLabel(hub)}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setHubType('origin')
                          setShowCreateHub(true)
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Distance Advisory for Origin Hub */}
              {supplier && selectedOriginHubId && (
                <div className="col-span-2">
                  <DistanceAdvisory
                    distanceInfo={originDistanceAdvisory.distanceInfo}
                    isCalculating={originDistanceAdvisory.isCalculating}
                    error={originDistanceAdvisory.error}
                    entityType="supplier"
                    entityName={supplier.name}
                    hubName={hubs?.find(h => h.id === selectedOriginHubId)?.name || 'Selected Hub'}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="destination_hub_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Destination Hub {!isExWorks && '*'}
                      {isExWorks && <span className="text-sm text-muted-foreground ml-1">(Not needed for Ex Works)</span>}
                    </FormLabel>
                    <div className="flex gap-2">
                      <Popover
                        open={!isExWorks && destinationPopoverOpen}
                        onOpenChange={(open) => {
                          if (isExWorks) return
                          setDestinationPopoverOpen(open)
                          if (!open) setDestinationSearchQuery('')
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={!isExWorks && destinationPopoverOpen}
                            className={isExWorks ? 'w-full justify-between opacity-50 cursor-not-allowed' : 'w-full justify-between'}
                            disabled={isExWorks}
                          >
                            {selectedDestinationHub ? formatHubLabel(selectedDestinationHub) : isExWorks ? 'N/A for Ex Works' : 'Select destination hub'}
                            {!isExWorks && <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                          </Button>
                        </PopoverTrigger>
                        {!isExWorks && (
                          <PopoverContent className="w-[400px] p-0">
                            <Command>
                              <CommandInput
                                placeholder="Search hubs..."
                                value={destinationSearchQuery}
                                onValueChange={setDestinationSearchQuery}
                              />
                              <CommandList>
                                <CommandEmpty>No hubs found.</CommandEmpty>
                                <CommandGroup className="max-h-72 overflow-y-auto overflow-x-hidden">
                                  {availableDestinationHubs.map((hub) => (
                                    <CommandItem
                                      key={hub.id}
                                      value={`${hub.name ?? ''} ${hub.hub_code ?? ''} ${hub.city_name ?? ''}`}
                                      onSelect={() => {
                                        field.onChange(hub.id)
                                        setDestinationPopoverOpen(false)
                                        setDestinationSearchQuery('')
                                      }}
                                    >
                                      <Check
                                        className={field.value === hub.id ? 'mr-2 h-4 w-4 opacity-100' : 'mr-2 h-4 w-4 opacity-0'}
                                      />
                                      {formatHubLabel(hub)}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        )}
                      </Popover>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isExWorks}
                        onClick={() => {
                          setHubType('destination')
                          setShowCreateHub(true)
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Distance Advisory for Destination Hub */}
              {!isExWorks && supplier && selectedDestinationHubId && (
                <div className="col-span-2">
                  <DistanceAdvisory
                    distanceInfo={destinationDistanceAdvisory.distanceInfo}
                    isCalculating={destinationDistanceAdvisory.isCalculating}
                    error={destinationDistanceAdvisory.error}
                    entityType="supplier"
                    entityName={supplier.name}
                    hubName={hubs?.find(h => h.id === selectedDestinationHubId)?.name || 'Selected Hub'}
                  />
                </div>
              )}
            </div>

            {showCreateHub && (
              <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Create New Hub</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowCreateHub(false)
                      setHubType(null)
                      setNewHubData({ name: '', hub_code: '', country_code: '', city_name: '', region: '' })
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Hub Name *</label>
                    <Input
                      value={newHubData.name}
                      onChange={(e) => setNewHubData({ ...newHubData, name: e.target.value })}
                      placeholder="e.g. Amsterdam Distribution Center"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Hub Code *</label>
                    <Input
                      value={newHubData.hub_code}
                      onChange={(e) => setNewHubData({ ...newHubData, hub_code: e.target.value })}
                      placeholder="e.g. AMS-01"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">City</label>
                    <Input
                      value={newHubData.city_name}
                      onChange={(e) => setNewHubData({ ...newHubData, city_name: e.target.value })}
                      placeholder="e.g. Amsterdam"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Country Code</label>
                    <Input
                      value={newHubData.country_code}
                      onChange={(e) => setNewHubData({ ...newHubData, country_code: e.target.value })}
                      placeholder="e.g. NL"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Region</label>
                  <Input
                    value={newHubData.region}
                    onChange={(e) => setNewHubData({ ...newHubData, region: e.target.value })}
                    placeholder="e.g. North Holland"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleCreateHub}
                  disabled={isCreatingHub}
                  className="w-full"
                >
                  {isCreatingHub ? 'Creating Hub...' : 'Create Hub'}
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="typical_lead_time_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Time (Days) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="e.g. 2"
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

            <FormField
              control={form.control}
              name="fixed_operational_days"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Operational Days (Optional)</FormLabel>
                    <div className="flex gap-2 mt-2">
                      <Button type="button" variant="outline" size="sm" onClick={handleSelectAllWeekdays}>
                        Select All Weekdays
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={handleClearAllDays}>
                        Clear All
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {daysOfWeek.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="fixed_operational_days"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={item.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value || [], item.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== item.id
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                {item.label}
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes about this logistics capability..." 
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
                {isLoading ? 'Adding...' : 'Add Logistics Capability'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}