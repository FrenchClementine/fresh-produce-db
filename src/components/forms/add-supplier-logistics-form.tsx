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
import { useHubs } from '@/hooks/use-products'
import { Plus } from 'lucide-react'

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
  
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { hubs } = useHubs()

  const form = useForm<AddLogisticsFormValues>({
    resolver: zodResolver(addLogisticsSchema),
    defaultValues: {
      origin_hub_id: '',
      destination_hub_id: '',
      mode: undefined,
      typical_lead_time_days: 1,
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

  const handleSelectAllDays = () => {
    const allDays = daysOfWeek.map(day => day.id)
    form.setValue('fixed_operational_days', allDays)
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
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="origin_hub_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origin Hub *</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select origin hub" />
                          </SelectTrigger>
                          <SelectContent>
                            {hubs?.map((hub) => (
                              <SelectItem key={hub.id} value={hub.id}>
                                {hub.name} ({hub.hub_code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
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
                      <FormControl>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          disabled={isExWorks}
                        >
                          <SelectTrigger className={isExWorks ? "opacity-50" : ""}>
                            <SelectValue placeholder={isExWorks ? "N/A for Ex Works" : "Select destination hub"} />
                          </SelectTrigger>
                          <SelectContent>
                            {hubs?.filter(hub => hub.id !== form.watch('origin_hub_id')).map((hub) => (
                              <SelectItem key={hub.id} value={hub.id}>
                                {hub.name} ({hub.hub_code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Mode *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select delivery mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {deliveryModes.map((mode) => (
                          <SelectItem key={mode.value} value={mode.value}>
                            {mode.label}
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
                name="typical_lead_time_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Time (Days) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="e.g. 2"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                      <Button type="button" variant="outline" size="sm" onClick={handleSelectAllDays}>
                        Select All
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