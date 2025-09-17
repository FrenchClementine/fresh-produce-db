'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormDescription,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import {
  useTransporterRoute,
  useCreateTransporterRoute,
  useUpdateTransporterRoute,
  useTransporters
} from '@/hooks/use-transporters'
import { useHubs } from '@/hooks/use-products'
import { HubForm } from './hub-form'
import { LocationHubSelector } from './location-hub-selector'
import { toast } from 'sonner'

const routeSchema = z.object({
  transporter_id: z.string().min(1, 'Transporter is required'),
  origin_hub_id: z.string().min(1, 'Origin hub is required'),
  destination_hub_id: z.string().min(1, 'Destination hub is required'),
  transport_duration_days: z.number().min(1, 'Duration must be at least 1 day'),
  fixed_departure_days: z.array(z.string()).optional(),
  customs_cost_per_shipment: z.number().min(0, 'Must be 0 or greater'),
  customs_description: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean(),
}).refine((data) => data.origin_hub_id !== data.destination_hub_id, {
  message: "Origin and destination hubs must be different",
  path: ["destination_hub_id"],
})

type TransporterRouteFormData = z.infer<typeof routeSchema>

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
]

interface TransporterRouteFormProps {
  routeId?: string
  onSuccess: (routeId?: string) => void
  onCancel: () => void
}

export function TransporterRouteForm({ routeId, onSuccess, onCancel }: TransporterRouteFormProps) {
  const [showOriginHubForm, setShowOriginHubForm] = useState(false)
  const [showDestinationHubForm, setShowDestinationHubForm] = useState(false)
  const [newHubLocation, setNewHubLocation] = useState<string>('')
  const [newHubCoordinates, setNewHubCoordinates] = useState<{ latitude: number; longitude: number } | null>(null)
  const [newHubType, setNewHubType] = useState<'origin' | 'destination' | null>(null)
  
  const { data: route, isLoading: routeLoading } = useTransporterRoute(routeId)
  const { data: transporters, isLoading: transportersLoading } = useTransporters()
  const { hubs, isLoading: hubsLoading, error: hubsError } = useHubs()
  const createRoute = useCreateTransporterRoute()
  const updateRoute = useUpdateTransporterRoute()

  const form = useForm<TransporterRouteFormData>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      transporter_id: '',
      origin_hub_id: '',
      destination_hub_id: '',
      transport_duration_days: undefined,
      fixed_departure_days: [],
      customs_cost_per_shipment: undefined,
      customs_description: '',
      notes: '',
      is_active: true,
    },
  })

  // Reset form when route data is loaded
  useEffect(() => {
    if (route) {
      form.reset({
        transporter_id: route.transporter_id,
        origin_hub_id: route.origin_hub_id,
        destination_hub_id: route.destination_hub_id,
        transport_duration_days: route.transport_duration_days,
        fixed_departure_days: route.fixed_departure_days || [],
        customs_cost_per_shipment: route.customs_cost_per_shipment,
        customs_description: route.customs_description || '',
        notes: route.notes || '',
        is_active: route.is_active,
      })
    }
  }, [route, form])

  const handleCreateHubFromLocation = (location: string, coordinates: { latitude: number; longitude: number }, type: 'origin' | 'destination') => {
    setNewHubLocation(location)
    setNewHubCoordinates(coordinates)
    setNewHubType(type)

    if (type === 'origin') {
      setShowOriginHubForm(true)
    } else {
      setShowDestinationHubForm(true)
    }
  }

  const onSubmit = async (data: TransporterRouteFormData) => {
    try {
      const submitData = {
        ...data,
        fixed_departure_days: data.fixed_departure_days?.length ? data.fixed_departure_days : null,
        customs_description: data.customs_description || null,
        notes: data.notes || null,
      }

      if (routeId) {
        await updateRoute.mutateAsync({ id: routeId, ...submitData })
        onSuccess()
      } else {
        const result = await createRoute.mutateAsync(submitData)
        onSuccess(result.id)
      }
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const isLoading = routeLoading || transportersLoading || hubsLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="transporter_id"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Transporter *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a transporter" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {transporters?.filter(t => t.is_active).map((transporter) => (
                      <SelectItem key={transporter.id} value={transporter.id}>
                        {transporter.name}
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
            name="origin_hub_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Origin Hub *</FormLabel>
                <FormControl>
                  <LocationHubSelector
                    value={field.value}
                    onChange={(value) => {
                      if (value === 'create-new') {
                        setShowOriginHubForm(true)
                      } else {
                        field.onChange(value)
                      }
                    }}
                    placeholder="Select origin hub or find by location"
                    label="Origin Hub"
                    onCreateHub={(location, coordinates) =>
                      handleCreateHubFromLocation(location, coordinates, 'origin')
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="destination_hub_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Destination Hub *</FormLabel>
                <FormControl>
                  <LocationHubSelector
                    value={field.value}
                    onChange={(value) => {
                      if (value === 'create-new') {
                        setShowDestinationHubForm(true)
                      } else {
                        field.onChange(value)
                      }
                    }}
                    placeholder="Select destination hub or find by location"
                    label="Destination Hub"
                    onCreateHub={(location, coordinates) =>
                      handleCreateHubFromLocation(location, coordinates, 'destination')
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="transport_duration_days"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Transit Days *</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1"
                    placeholder="2"
                    value={field.value || ''}
                    onChange={(e) => {
                      const value = e.target.value
                      field.onChange(value === '' ? undefined : parseInt(value))
                    }}
                    onFocus={(e) => e.target.select()}
                  />
                </FormControl>
                <FormDescription>
                  Number of days for transportation
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="customs_cost_per_shipment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customs Cost (€)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    min="0"
                    placeholder="250.00"
                    value={field.value || ''}
                    onChange={(e) => {
                      const value = e.target.value
                      field.onChange(value === '' ? undefined : parseFloat(value))
                    }}
                    onFocus={(e) => e.target.select()}
                  />
                </FormControl>
                <FormDescription>
                  Fixed cost per shipment for customs
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="customs_description"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Customs Description</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    placeholder="EU customs clearance required"
                  />
                </FormControl>
                <FormDescription>
                  Optional description of customs requirements
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fixed_departure_days"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Fixed Departure Days</FormLabel>
                <FormDescription>
                  Select the days of the week when this route operates
                </FormDescription>
                <div className="flex gap-2 mb-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
                      field.onChange(weekdays)
                    }}
                  >
                    Select All Weekdays
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => field.onChange([])}
                  >
                    Clear All
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <FormField
                      key={day.value}
                      control={form.control}
                      name="fixed_departure_days"
                      render={({ field }) => {
                        const isChecked = field.value?.includes(day.value) || false
                        return (
                          <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  const current = field.value || []
                                  if (checked) {
                                    field.onChange([...current, day.value])
                                  } else {
                                    field.onChange(current.filter(d => d !== day.value))
                                  }
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
            name="notes"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    placeholder="Additional information about this route..."
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Active</FormLabel>
                  <FormDescription>
                    Inactive routes are hidden from route planning
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={createRoute.isPending || updateRoute.isPending}
          >
            {createRoute.isPending || updateRoute.isPending ? 'Saving...' : 
             routeId ? 'Update Route' : 'Create Route'}
          </Button>
        </div>
      </form>
    </Form>

    {/* Origin Hub Creation Dialog */}
    <Dialog open={showOriginHubForm} onOpenChange={setShowOriginHubForm}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Origin Hub</DialogTitle>
          <DialogDescription>
            Create a new hub to use as the origin for this route
          </DialogDescription>
        </DialogHeader>
        <HubForm
          onSuccess={(hubId) => {
            form.setValue('origin_hub_id', hubId)
            setShowOriginHubForm(false)
            setNewHubLocation('')
            setNewHubCoordinates(null)
            setNewHubType(null)
            toast.success('Origin hub created successfully')
          }}
          onCancel={() => {
            setShowOriginHubForm(false)
            setNewHubLocation('')
            setNewHubCoordinates(null)
            setNewHubType(null)
          }}
          prefilledData={
            newHubType === 'origin' && newHubLocation && newHubCoordinates
              ? { location: newHubLocation, coordinates: newHubCoordinates }
              : undefined
          }
        />
      </DialogContent>
    </Dialog>

    {/* Destination Hub Creation Dialog */}
    <Dialog open={showDestinationHubForm} onOpenChange={setShowDestinationHubForm}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Destination Hub</DialogTitle>
          <DialogDescription>
            Create a new hub to use as the destination for this route
          </DialogDescription>
        </DialogHeader>
        <HubForm
          onSuccess={(hubId) => {
            form.setValue('destination_hub_id', hubId)
            setShowDestinationHubForm(false)
            setNewHubLocation('')
            setNewHubCoordinates(null)
            setNewHubType(null)
            toast.success('Destination hub created successfully')
          }}
          onCancel={() => {
            setShowDestinationHubForm(false)
            setNewHubLocation('')
            setNewHubCoordinates(null)
            setNewHubType(null)
          }}
          prefilledData={
            newHubType === 'destination' && newHubLocation && newHubCoordinates
              ? { location: newHubLocation, coordinates: newHubCoordinates }
              : undefined
          }
        />
      </DialogContent>
    </Dialog>
  </>
  )
}