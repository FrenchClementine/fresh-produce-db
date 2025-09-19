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
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useAllHubs } from '@/hooks/use-hubs'

const editLogisticsSchema = z.object({
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

type EditLogisticsFormValues = z.infer<typeof editLogisticsSchema>

interface EditSupplierLogisticsFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplierId: string
  logisticsCapability: any
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

export function EditSupplierLogisticsForm({ 
  open, 
  onOpenChange, 
  supplierId, 
  logisticsCapability 
}: EditSupplierLogisticsFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { data: hubs } = useAllHubs()

  const form = useForm<EditLogisticsFormValues>({
    resolver: zodResolver(editLogisticsSchema),
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
  const isExWorks = selectedMode === 'Ex Works'

  // Clear destination hub when Ex Works is selected
  useEffect(() => {
    if (isExWorks) {
      form.setValue('destination_hub_id', '')
    }
  }, [isExWorks, form])

  // Reset form when logisticsCapability changes
  useEffect(() => {
    if (logisticsCapability) {
      form.reset({
        origin_hub_id: logisticsCapability.origin_hub_id || '',
        destination_hub_id: logisticsCapability.destination_hub_id || '',
        mode: logisticsCapability.mode,
        typical_lead_time_days: logisticsCapability.typical_lead_time_days || 1,
        fixed_operational_days: logisticsCapability.fixed_operational_days || [],
        notes: logisticsCapability.notes || '',
      })
    }
  }, [logisticsCapability, form])

  const onSubmit = async (values: EditLogisticsFormValues) => {
    if (!logisticsCapability) return
    
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('supplier_logistics_capabilities')
        .update({
          origin_hub_id: values.origin_hub_id,
          destination_hub_id: values.destination_hub_id || null,
          mode: values.mode,
          typical_lead_time_days: values.typical_lead_time_days,
          fixed_operational_days: values.fixed_operational_days || [],
          notes: values.notes || null,
        })
        .eq('id', logisticsCapability.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Logistics capability updated successfully',
      })

      queryClient.invalidateQueries({ queryKey: ['supplier-logistics', supplierId] })
      onOpenChange(false)
      
    } catch (error: any) {
      console.error('Error updating logistics capability:', error)
      toast({
        title: 'Error',
        description: `Failed to update logistics capability: ${error.message}`,
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
          <DialogTitle>Edit Logistics Capability</DialogTitle>
          <DialogDescription>
            Update the delivery route and capability settings
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="origin_hub_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origin Hub *</FormLabel>
                    <SearchableSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={hubs?.map((hub) => ({
                        value: hub.id,
                        label: `${hub.name} (${hub.hub_code})`,
                      })) || []}
                      placeholder="Select origin hub"
                      searchPlaceholder="Search hubs..."
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="destination_hub_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Destination Hub {!isExWorks && '*'}
                      {isExWorks && <span className="text-sm text-muted-foreground ml-1">(Not needed for Ex Works)</span>}
                    </FormLabel>
                    <div className={isExWorks ? "opacity-50" : ""}>
                      <SearchableSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        options={hubs?.filter(hub => hub.id !== form.watch('origin_hub_id')).map((hub) => ({
                          value: hub.id,
                          label: `${hub.name} (${hub.hub_code})`,
                        })) || []}
                        placeholder={isExWorks ? "N/A for Ex Works" : "Select destination hub"}
                        searchPlaceholder="Search hubs..."
                        disabled={isExWorks}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                {isLoading ? 'Updating...' : 'Update Logistics Capability'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}