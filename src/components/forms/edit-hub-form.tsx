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
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  SearchableSelect,
  createSearchableOptions,
} from '@/components/ui/searchable-select'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import { geocodeWithNominatim } from '@/lib/nominatim-geocoding'

// Common country codes for hubs
const countryCodeOptions = createSearchableOptions([
  { value: '', label: 'No Country Code' },
  { value: 'NL', label: 'NL - Netherlands' },
  { value: 'DE', label: 'DE - Germany' },
  { value: 'FR', label: 'FR - France' },
  { value: 'BE', label: 'BE - Belgium' },
  { value: 'ES', label: 'ES - Spain' },
  { value: 'IT', label: 'IT - Italy' },
  { value: 'GB', label: 'GB - United Kingdom' },
  { value: 'US', label: 'US - United States' },
  { value: 'CA', label: 'CA - Canada' },
  { value: 'AU', label: 'AU - Australia' },
])

// Common regions/states
const regionOptions = createSearchableOptions([
  { value: '', label: 'No Region' },
  { value: 'North Holland', label: 'North Holland' },
  { value: 'South Holland', label: 'South Holland' },
  { value: 'Bavaria', label: 'Bavaria' },
  { value: 'Île-de-France', label: 'Île-de-France' },
  { value: 'Flanders', label: 'Flanders' },
  { value: 'Catalonia', label: 'Catalonia' },
  { value: 'Lombardy', label: 'Lombardy' },
  { value: 'California', label: 'California' },
  { value: 'Texas', label: 'Texas' },
  { value: 'Ontario', label: 'Ontario' },
  { value: 'New South Wales', label: 'New South Wales' },
])

const editHubSchema = z.object({
  name: z.string().min(1, 'Hub name is required'),
  hub_code: z.string().min(1, 'Hub code is required'),
  country_code: z.string().optional(),
  city_name: z.string().optional(),
  region: z.string().optional(),
  is_active: z.boolean(),
  can_transship: z.boolean(),
  transship_handling_time_hours: z.number().min(0).optional(),
  transship_cost_per_pallet: z.number().min(0).optional(),
})

type EditHubFormValues = z.infer<typeof editHubSchema>

interface EditHubFormProps {
  hub: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditHubForm({ hub, open, onOpenChange }: EditHubFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const form = useForm<EditHubFormValues>({
    resolver: zodResolver(editHubSchema),
    defaultValues: {
      name: hub?.name || '',
      hub_code: hub?.hub_code || '',
      country_code: hub?.country_code || '',
      city_name: hub?.city_name || '',
      region: hub?.region || '',
      is_active: hub?.is_active ?? true,
      can_transship: hub?.can_transship ?? false,
      transship_handling_time_hours: hub?.transship_handling_time_hours || 0,
      transship_cost_per_pallet: hub?.transship_cost_per_pallet || 0,
    },
  })

  // Reset form when hub changes
  useEffect(() => {
    if (hub) {
      form.reset({
        name: hub.name || '',
        hub_code: hub.hub_code || '',
        country_code: hub.country_code || '',
        city_name: hub.city_name || '',
        region: hub.region || '',
        is_active: hub.is_active ?? true,
        can_transship: hub.can_transship ?? false,
        transship_handling_time_hours: hub.transship_handling_time_hours || 0,
        transship_cost_per_pallet: hub.transship_cost_per_pallet || 0,
      })
    }
  }, [hub, form])

  const onSubmit = async (values: EditHubFormValues) => {
    setIsLoading(true)
    try {
      // Prepare update data
      let updateData = {
        name: values.name,
        hub_code: values.hub_code,
        country_code: values.country_code || null,
        city_name: values.city_name || null,
        region: values.region || null,
        is_active: values.is_active,
        can_transship: values.can_transship,
        transship_handling_time_hours: values.transship_handling_time_hours || null,
        transship_cost_per_pallet: values.transship_cost_per_pallet || null,
      }

      // Check if location has changed and needs re-geocoding
      const locationChanged = (
        values.city_name !== hub.city_name ||
        values.country_code !== hub.country_code
      )

      // Try to geocode if we have city and country, and either:
      // 1. Location has changed, or
      // 2. Hub doesn't have coordinates yet
      let hasCoordinates = false;
      if (values.city_name && values.country_code &&
          (locationChanged || !hub.latitude || !hub.longitude)) {

        console.log(`Geocoding hub location: ${values.city_name}, ${values.country_code}`)

        try {
          const geoResult = await geocodeWithNominatim(values.city_name, values.country_code)

          if (geoResult.success && geoResult.coordinates) {
            // Add only the essential coordinate fields
            (updateData as any).latitude = geoResult.coordinates.latitude;
            (updateData as any).longitude = geoResult.coordinates.longitude;
            (updateData as any).coordinates_last_updated = new Date().toISOString();
            hasCoordinates = true;

            console.log(`Successfully geocoded hub: ${geoResult.coordinates.latitude}, ${geoResult.coordinates.longitude}`)
          } else {
            console.warn(`Failed to geocode hub location: ${values.city_name}, ${values.country_code}`)
          }
        } catch (geoError) {
          console.warn(`Geocoding error for hub:`, geoError)
        }
      }

      const { error } = await supabase
        .from('hubs')
        .update(updateData)
        .eq('id', hub.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: hasCoordinates
          ? 'Hub updated successfully with coordinates'
          : 'Hub updated successfully',
      })

      queryClient.invalidateQueries({ queryKey: ['hubs'] })
      onOpenChange(false)

    } catch (error: any) {
      console.error('Error updating hub:', error)
      toast({
        title: 'Error',
        description: `Failed to update hub: ${error.message}`,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Hub</DialogTitle>
          <DialogDescription>
            Update the hub details
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hub Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Amsterdam Distribution Center" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hub_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hub Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. AMS-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="country_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country Code (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. NL, DE, FR" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Amsterdam" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. North Holland, Bavaria" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Enable or disable this hub
                    </div>
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

            {/* Transshipment Capabilities Section */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-4">Transshipment Capabilities</h3>

              <FormField
                control={form.control}
                name="can_transship"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Can Handle Transshipment</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Enable if this hub can handle multi-hop transport (cross-docking, consolidation)
                      </div>
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

              {form.watch('can_transship') && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <FormField
                    control={form.control}
                    name="transship_handling_time_hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Handling Time (Hours)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder="e.g. 4"
                            value={field.value || ''}
                            onChange={(e) => {
                              const value = e.target.value
                              field.onChange(value === '' ? 0 : parseFloat(value))
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="transship_cost_per_pallet"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Handling Cost (€/pallet)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="e.g. 15.00"
                            value={field.value || ''}
                            onChange={(e) => {
                              const value = e.target.value
                              field.onChange(value === '' ? 0 : parseFloat(value))
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

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
                {isLoading ? 'Updating...' : 'Update Hub'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}