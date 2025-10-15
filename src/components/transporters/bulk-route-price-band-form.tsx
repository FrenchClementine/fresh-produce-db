'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Plus, Minus } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { 
  useRoutePriceBands, 
  useCreateRoutePriceBand, 
  useTransporterRoutes 
} from '@/hooks/use-transporters'
import { TransporterRouteForm } from './transporter-route-form'
import { toast } from 'sonner'

const priceBandSchema = z.object({
  min_pallets: z.number().min(1, 'Minimum pallets must be at least 1'),
  max_pallets: z.number().optional(),
  price_per_pallet: z.number().min(0.01, 'Price must be greater than 0'),
}).refine((data) => {
  if (data.max_pallets !== undefined) {
    return data.max_pallets >= data.min_pallets
  }
  return true
}, {
  message: "Maximum pallets must be greater than or equal to minimum pallets",
  path: ["max_pallets"],
})

const bulkPriceBandSchema = z.object({
  transporter_route_id: z.string().min(1, 'Route is required'),
  pallet_dimensions: z.enum(['120x80', '120x100'], {
    required_error: 'Pallet dimensions are required',
  }),
  use_preset_tiers: z.boolean().default(false),
  price_bands: z.array(priceBandSchema).min(1, 'At least one price band is required'),
})

type BulkRoutePriceBandFormData = z.infer<typeof bulkPriceBandSchema>

interface BulkRoutePriceBandFormProps {
  routeId?: string
  onSuccess: () => void
  onCancel: () => void
}

// Preset pricing tiers
const getPresetTiers = (palletDimensions: '120x80' | '120x100') => {
  if (palletDimensions === '120x80') {
    return [
      { min_pallets: 1, max_pallets: 15, price_per_pallet: 60, label: 'Groupage (1-15 pallets)' },
      { min_pallets: 16, max_pallets: 32, price_per_pallet: 45, label: 'Part Load (16-32 pallets)' },
      { min_pallets: 33, max_pallets: 33, price_per_pallet: 40, label: 'Full Truck (33 pallets)' },
    ]
  } else {
    return [
      { min_pallets: 1, max_pallets: 12, price_per_pallet: 65, label: 'Groupage (1-12 pallets)' },
      { min_pallets: 13, max_pallets: 25, price_per_pallet: 50, label: 'Part Load (13-25 pallets)' },
      { min_pallets: 26, max_pallets: 26, price_per_pallet: 45, label: 'Full Truck (26 pallets)' },
    ]
  }
}

export function BulkRoutePriceBandForm({ routeId, onSuccess, onCancel }: BulkRoutePriceBandFormProps) {
  const [showRouteForm, setShowRouteForm] = useState(false)
  const [newRouteId, setNewRouteId] = useState<string | null>(null)
  
  const { data: routes, isLoading: routesLoading, refetch: refetchRoutes } = useTransporterRoutes()
  const createPriceBand = useCreateRoutePriceBand()

  const form = useForm<BulkRoutePriceBandFormData>({
    resolver: zodResolver(bulkPriceBandSchema),
    defaultValues: {
      transporter_route_id: routeId || newRouteId || '',
      pallet_dimensions: '120x100',
      use_preset_tiers: true,
      price_bands: getPresetTiers('120x100'),
    },
  })

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'price_bands',
  })

  const usePresetTiers = form.watch('use_preset_tiers')
  const palletDimensions = form.watch('pallet_dimensions')

  // Update price bands when preset toggle or pallet dimensions change
  useEffect(() => {
    if (usePresetTiers) {
      const presets = getPresetTiers(palletDimensions)
      replace(presets)
    }
  }, [usePresetTiers, palletDimensions, replace])

  // Update route when new route is created
  useEffect(() => {
    if (newRouteId) {
      form.setValue('transporter_route_id', newRouteId)
    }
  }, [newRouteId, form])

  const handleRouteCreated = async () => {
    await refetchRoutes()
    setShowRouteForm(false)
    toast.success('Route created successfully. You can now set pricing.')
  }

  const addCustomBand = () => {
    append({
      min_pallets: 1,
      max_pallets: undefined,
      price_per_pallet: 50,
    })
  }

  const onSubmit = async (data: BulkRoutePriceBandFormData) => {
    try {
      // Create all price bands
      const promises = data.price_bands.map(band => 
        createPriceBand.mutateAsync({
          transporter_route_id: data.transporter_route_id,
          pallet_dimensions: data.pallet_dimensions,
          min_pallets: band.min_pallets,
          max_pallets: band.max_pallets || undefined,
          price_per_pallet: band.price_per_pallet,
        })
      )

      await Promise.all(promises)
      toast.success(`Successfully created ${data.price_bands.length} price bands`)
      onSuccess()
    } catch (error) {
      console.error('Bulk creation error:', error)
      toast.error('Failed to create some price bands. Please check and try again.')
    }
  }

  if (routesLoading) {
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
              name="transporter_route_id"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel className="text-terminal-text font-mono">Route *</FormLabel>
                  <div className="flex gap-2">
                    <Select 
                      onValueChange={(value) => {
                        if (value === 'create-new') {
                          setShowRouteForm(true)
                        } else {
                          field.onChange(value)
                        }
                      }} 
                      value={field.value} 
                      disabled={!!routeId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a route or create new" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="create-new" className="text-primary">
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Create New Route
                          </div>
                        </SelectItem>
                        {(routes?.length ?? 0) > 0 && (
                          <div className="border-t my-1" />
                        )}
                        {routes?.filter(r => r.is_active).map((route) => (
                          <SelectItem key={route.id} value={route.id}>
                            {route.transporters.name}: {route.origin_hub.name} → {route.destination_hub.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pallet_dimensions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-terminal-text font-mono">Pallet Dimensions *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select dimensions" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="120x80">120x80 cm (Euro Pallet)</SelectItem>
                      <SelectItem value="120x100">120x100 cm (UK Standard)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="use_preset_tiers"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-terminal-border bg-terminal-dark/30 p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base text-terminal-text font-mono">Use Preset Tiers</FormLabel>
                    <FormDescription className="text-terminal-muted font-mono text-xs">
                      Use standard pricing tiers (Groupage, Part Load, Full Truck)
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Price Bands</h4>
              {!usePresetTiers && (
                <Button type="button" variant="outline" size="sm" onClick={addCustomBand}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Band
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-3 items-end p-4 border border-terminal-border rounded-lg bg-terminal-dark/30">
                  <div className="col-span-3">
                    <label className="text-xs font-medium text-terminal-muted mb-1 block font-mono">
                      Min Pallets *
                    </label>
                    <Input
                      type="number"
                      min="1"
                      {...form.register(`price_bands.${index}.min_pallets`, { valueAsNumber: true })}
                      disabled={usePresetTiers}
                      className={usePresetTiers ? 'bg-terminal-dark border-terminal-border text-terminal-text font-mono' : 'bg-terminal-dark border-terminal-border text-terminal-text font-mono'}
                    />
                  </div>

                  <div className="col-span-3">
                    <label className="text-xs font-medium text-terminal-muted mb-1 block font-mono">
                      Max Pallets
                    </label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Unlimited"
                      {...form.register(`price_bands.${index}.max_pallets`, {
                        valueAsNumber: true,
                        setValueAs: v => v === '' || v === undefined ? undefined : parseInt(v)
                      })}
                      disabled={usePresetTiers}
                      className={usePresetTiers ? 'bg-terminal-dark border-terminal-border text-terminal-text font-mono placeholder:text-terminal-muted' : 'bg-terminal-dark border-terminal-border text-terminal-text font-mono placeholder:text-terminal-muted'}
                    />
                  </div>

                  <div className="col-span-4">
                    <label className="text-xs font-medium text-terminal-muted mb-1 block font-mono">
                      Price per Pallet (€) *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      {...form.register(`price_bands.${index}.price_per_pallet`, { valueAsNumber: true })}
                      className="bg-terminal-dark border-terminal-border text-terminal-text font-mono"
                    />
                  </div>
                  
                  {!usePresetTiers && (
                    <div className="col-span-2 flex justify-end">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {usePresetTiers && (
                    <div className="col-span-2">
                      <span className="text-xs text-terminal-muted font-mono">
                        {palletDimensions === '120x80'
                          ? index === 0 ? 'Groupage' : index === 1 ? 'Part Load' : 'Full Truck'
                          : index === 0 ? 'Groupage' : index === 1 ? 'Part Load' : 'Full Truck'
                        }
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 p-4 bg-terminal-panel border border-terminal-border rounded-lg">
            <h4 className="text-sm font-medium text-terminal-text font-mono">Price Band Guidelines:</h4>
            <div className="grid grid-cols-2 gap-4 text-xs text-terminal-text font-mono">
              <div>
                <strong className="text-terminal-accent">120x80cm (Euro Pallet):</strong>
                <div className="mt-1 space-y-1">
                  <div>• Groupage: 1-15 pallets</div>
                  <div>• Part Load: 16-32 pallets</div>
                  <div>• Full Truck: 33 pallets</div>
                </div>
              </div>
              <div>
                <strong className="text-terminal-accent">120x100cm (UK Standard):</strong>
                <div className="mt-1 space-y-1">
                  <div>• Groupage: 1-12 pallets</div>
                  <div>• Part Load: 13-25 pallets</div>
                  <div>• Full Truck: 26 pallets</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createPriceBand.isPending}
            >
              {createPriceBand.isPending ? 'Creating...' : `Create ${fields.length} Price Bands`}
            </Button>
          </div>
        </form>
      </Form>

      {/* Create Route Dialog */}
      <Dialog open={showRouteForm} onOpenChange={setShowRouteForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Route</DialogTitle>
            <DialogDescription>
              Create a new transportation route before setting pricing
            </DialogDescription>
          </DialogHeader>
          <TransporterRouteForm
            onSuccess={(routeId) => {
              setNewRouteId(routeId || null)
              form.setValue('transporter_route_id', routeId || '')
              handleRouteCreated()
            }}
            onCancel={() => setShowRouteForm(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}