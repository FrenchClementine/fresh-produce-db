'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  useRoutePriceBands, 
  useCreateRoutePriceBand, 
  useUpdateRoutePriceBand,
  useTransporterRoutes 
} from '@/hooks/use-transporters'
import { TransporterRouteForm } from './transporter-route-form'
import { toast } from 'sonner'

const priceBandSchema = z.object({
  transporter_route_id: z.string().min(1, 'Route is required'),
  pallet_dimensions: z.enum(['120x80', '120x100'], {
    required_error: 'Pallet dimensions are required',
  }),
  min_pallets: z.number().min(1, 'Minimum pallets must be at least 1'),
  max_pallets: z.number().optional(),
  price_per_pallet: z.number().min(0.01, 'Price must be greater than 0'),
  valid_till: z.string().optional(),
}).refine((data) => {
  if (data.max_pallets !== undefined) {
    return data.max_pallets >= data.min_pallets
  }
  return true
}, {
  message: "Maximum pallets must be greater than or equal to minimum pallets",
  path: ["max_pallets"],
})

type RoutePriceBandFormData = z.infer<typeof priceBandSchema>

interface RoutePriceBandFormProps {
  priceBandId?: string
  routeId?: string // Pre-select route if coming from route management
  onSuccess: () => void
  onCancel: () => void
}

export function RoutePriceBandForm({ priceBandId, routeId, onSuccess, onCancel }: RoutePriceBandFormProps) {
  const [showRouteForm, setShowRouteForm] = useState(false)
  const [newRouteId, setNewRouteId] = useState<string | null>(null)
  const [pricingMode, setPricingMode] = useState<'per_pallet' | 'full_truck'>('per_pallet')
  const [fullTruckPrice, setFullTruckPrice] = useState<number | undefined>(undefined)
  const [open, setOpen] = useState(false)
  
  const { data: priceBands } = useRoutePriceBands()
  const { data: routes, isLoading: routesLoading, refetch: refetchRoutes } = useTransporterRoutes()
  const createPriceBand = useCreateRoutePriceBand()
  const updatePriceBand = useUpdateRoutePriceBand()

  // Find the current price band if editing
  const currentPriceBand = priceBands?.find(pb => pb.id === priceBandId)

  const form = useForm<RoutePriceBandFormData>({
    resolver: zodResolver(priceBandSchema),
    defaultValues: {
      transporter_route_id: routeId || newRouteId || '',
      pallet_dimensions: '120x100',
      min_pallets: 1,
      max_pallets: undefined,
      price_per_pallet: 0,
      valid_till: undefined,
    },
    values: currentPriceBand ? {
      transporter_route_id: currentPriceBand.transporter_route_id,
      pallet_dimensions: currentPriceBand.pallet_dimensions,
      min_pallets: currentPriceBand.min_pallets,
      max_pallets: currentPriceBand.max_pallets || undefined,
      price_per_pallet: currentPriceBand.price_per_pallet || 0,
      valid_till: currentPriceBand.valid_till || undefined,
    } : newRouteId ? {
      transporter_route_id: newRouteId,
      pallet_dimensions: '120x100',
      min_pallets: 1,
      max_pallets: undefined,
      price_per_pallet: 0,
      valid_till: undefined,
    } : undefined,
  })

  // Handle full truck pricing calculations
  useEffect(() => {
    if (pricingMode === 'full_truck' && fullTruckPrice && fullTruckPrice > 0) {
      const palletDimensions = form.watch('pallet_dimensions')
      const maxPallets = palletDimensions === '120x80' ? 33 : 26
      const pricePerPallet = fullTruckPrice / maxPallets
      
      form.setValue('min_pallets', maxPallets)
      form.setValue('max_pallets', maxPallets)
      form.setValue('price_per_pallet', pricePerPallet)
    }
  }, [pricingMode, fullTruckPrice, form])

  // Reset pricing when switching modes
  useEffect(() => {
    if (pricingMode === 'per_pallet') {
      form.setValue('min_pallets', 1)
      form.setValue('max_pallets', undefined)
      form.setValue('price_per_pallet', 0)
    }
  }, [pricingMode, form])
  
  const handleRouteCreated = async () => {
    await refetchRoutes()
    setShowRouteForm(false)
    toast.success('Route created successfully. You can now set pricing.')
  }

  const onSubmit = async (data: RoutePriceBandFormData) => {
    try {
      const submitData = {
        ...data,
        max_pallets: data.max_pallets || undefined,
      }

      if (priceBandId) {
        await updatePriceBand.mutateAsync({ id: priceBandId, ...submitData })
      } else {
        await createPriceBand.mutateAsync(submitData)
      }
      
      onSuccess()
    } catch (error) {
      console.error('Form submission error:', error)
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
                <FormLabel>Route *</FormLabel>
                <div className="flex gap-2">
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={open}
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={!!routeId}
                        >
                          {field.value
                            ? routes?.find((route) => route.id === field.value)
                              ? `${routes.find((route) => route.id === field.value)?.transporters.name}: ${routes.find((route) => route.id === field.value)?.origin_hub.name} → ${routes.find((route) => route.id === field.value)?.destination_hub.name}`
                              : "Select a route or create new"
                            : "Select a route or create new"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search routes..." />
                        <CommandList>
                          <CommandEmpty>No routes found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="create-new"
                              onSelect={() => {
                                setShowRouteForm(true)
                                setOpen(false)
                              }}
                              className="text-primary"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Create New Route
                            </CommandItem>
                            {routes?.filter(r => r.is_active).map((route) => (
                              <CommandItem
                                key={route.id}
                                value={`${route.transporters.name}: ${route.origin_hub.name} → ${route.destination_hub.name}`}
                                onSelect={() => {
                                  field.onChange(route.id)
                                  setOpen(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === route.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {route.transporters.name}: {route.origin_hub.name} → {route.destination_hub.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
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
            name="pallet_dimensions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pallet Dimensions *</FormLabel>
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

          {/* Pricing Mode Selector */}
          <div className="col-span-2">
            <label className="text-sm font-medium mb-3 block">Pricing Method</label>
            <div className="flex gap-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="pricing_mode"
                  value="per_pallet"
                  checked={pricingMode === 'per_pallet'}
                  onChange={(e) => setPricingMode(e.target.value as 'per_pallet' | 'full_truck')}
                  className="w-4 h-4"
                />
                <span className="text-sm">Per Pallet Pricing</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="pricing_mode"
                  value="full_truck"
                  checked={pricingMode === 'full_truck'}
                  onChange={(e) => setPricingMode(e.target.value as 'per_pallet' | 'full_truck')}
                  className="w-4 h-4"
                />
                <span className="text-sm">Full Truck Pricing</span>
              </label>
            </div>
          </div>

          {pricingMode === 'full_truck' && (
            <div className="col-span-2">
              <label className="text-sm font-medium mb-2 block">Full Truck Price (€) *</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="1500.00"
                value={fullTruckPrice || ''}
                onChange={(e) => {
                  const value = e.target.value
                  setFullTruckPrice(value === '' ? undefined : parseFloat(value))
                }}
                onFocus={(e) => e.target.select()}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {form.watch('pallet_dimensions') === '120x80' 
                  ? 'Will be divided by 33 pallets (Euro Pallet full truck)'
                  : 'Will be divided by 26 pallets (UK Standard full truck)'
                }
              </p>
            </div>
          )}

          <FormField
            control={form.control}
            name="price_per_pallet"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price per Pallet (€) *</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    min="0.01"
                    placeholder="45.00"
                    value={field.value || ''}
                    onChange={(e) => {
                      const value = e.target.value
                      field.onChange(value === '' ? undefined : parseFloat(value))
                    }}
                    onFocus={(e) => e.target.select()}
                    disabled={pricingMode === 'full_truck'}
                    className={pricingMode === 'full_truck' ? 'bg-muted' : ''}
                  />
                </FormControl>
                {pricingMode === 'full_truck' && (
                  <FormDescription>
                    Automatically calculated from full truck price
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="min_pallets"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minimum Pallets *</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1"
                    placeholder="1"
                    value={field.value || ''}
                    onChange={(e) => {
                      const value = e.target.value
                      field.onChange(value === '' ? undefined : parseInt(value))
                    }}
                    onFocus={(e) => e.target.select()}
                    disabled={pricingMode === 'full_truck'}
                    className={pricingMode === 'full_truck' ? 'bg-muted' : ''}
                  />
                </FormControl>
                <FormDescription>
                  {pricingMode === 'full_truck' 
                    ? 'Set to full truck capacity' 
                    : 'Minimum quantity for this price tier'
                  }
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="max_pallets"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maximum Pallets</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    placeholder="15 (leave empty for unlimited)"
                    value={field.value || ''}
                    onChange={(e) => {
                      const value = e.target.value
                      field.onChange(value === '' ? undefined : parseInt(value))
                    }}
                    onFocus={(e) => e.target.select()}
                    disabled={pricingMode === 'full_truck'}
                    className={pricingMode === 'full_truck' ? 'bg-muted' : ''}
                  />
                </FormControl>
                <FormDescription>
                  {pricingMode === 'full_truck'
                    ? 'Set to full truck capacity'
                    : 'Maximum quantity for this tier (optional)'
                  }
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="valid_till"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Valid Until</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={field.value || ''}
                    onChange={field.onChange}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </FormControl>
                <FormDescription>
                  Date until which this price band is valid (optional)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium">Price Band Guidelines:</h4>
          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>
              <strong>120x80cm (Euro Pallet):</strong>
              <div className="mt-1 space-y-1">
                <div>• Groupage: 1-15 pallets</div>
                <div>• Part Load: 16-32 pallets</div>
                <div>• Full Truck: 33 pallets</div>
              </div>
            </div>
            <div>
              <strong>120x100cm (UK Standard):</strong>
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
            disabled={createPriceBand.isPending || updatePriceBand.isPending}
          >
            {createPriceBand.isPending || updatePriceBand.isPending ? 'Saving...' : 
             priceBandId ? 'Update Price Band' : 'Create Price Band'}
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