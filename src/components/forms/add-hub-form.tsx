'use client'

import { useState } from 'react'
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
import { toast } from 'sonner'
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

const addHubSchema = z.object({
  name: z.string().min(1, 'Hub name is required'),
  hub_code: z.string().min(1, 'Hub code is required'),
  country_code: z.string().optional(),
  city_name: z.string().optional(),
  region: z.string().optional(),
  can_transship: z.boolean(),
  transship_handling_time_hours: z.number().min(0).optional(),
  transship_cost_per_pallet: z.number().min(0).optional(),
})

type AddHubFormValues = z.infer<typeof addHubSchema>

interface AddHubFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddHubForm({ open, onOpenChange }: AddHubFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<AddHubFormValues>({
    resolver: zodResolver(addHubSchema),
    defaultValues: {
      name: '',
      hub_code: '',
      country_code: '',
      city_name: '',
      region: '',
      can_transship: false,
      transship_handling_time_hours: 0,
      transship_cost_per_pallet: 0,
    },
  })

  const onSubmit = async (values: AddHubFormValues) => {
    setIsLoading(true)
    try {
      // Prepare hub data
      let hubData = {
        name: values.name,
        hub_code: values.hub_code,
        country_code: values.country_code || null,
        city_name: values.city_name || null,
        region: values.region || null,
        can_transship: values.can_transship,
        transship_handling_time_hours: values.transship_handling_time_hours || null,
        transship_cost_per_pallet: values.transship_cost_per_pallet || null,
      }

      // Try to geocode if we have city and country
      let hasCoordinates = false;
      if (values.city_name && values.country_code) {
        console.log(`Geocoding hub location: ${values.city_name}, ${values.country_code}`)

        try {
          const geoResult = await geocodeWithNominatim(values.city_name, values.country_code)

          if (geoResult.success && geoResult.coordinates) {
            // Add only the essential coordinate fields
            (hubData as any).latitude = geoResult.coordinates.latitude;
            (hubData as any).longitude = geoResult.coordinates.longitude;
            (hubData as any).coordinates_last_updated = new Date().toISOString();
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
        .insert([hubData])

      if (error) throw error

      toast.success(
        hasCoordinates
          ? 'Hub created successfully with coordinates'
          : 'Hub created successfully'
      )

      queryClient.invalidateQueries({ queryKey: ['hubs'] })
      onOpenChange(false)
      form.reset()

    } catch (error: any) {
      console.error('Error creating hub:', error)
      toast.error(`Failed to create hub: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-terminal-panel border-terminal-border">
        <DialogHeader>
          <DialogTitle className="text-terminal-text font-mono">ADD NEW HUB</DialogTitle>
          <DialogDescription className="text-terminal-muted font-mono">
            Create a new logistics hub
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-terminal-text font-mono">Hub Name</FormLabel>
                  <FormControl>
                    <Input className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" placeholder="e.g. Amsterdam Distribution Center" {...field} />
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
                  <FormLabel className="text-terminal-text font-mono">Hub Code</FormLabel>
                  <FormControl>
                    <Input className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" placeholder="e.g. AMS-001" {...field} />
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
                  <FormLabel className="text-terminal-text font-mono">Country Code (Optional)</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      options={countryCodeOptions}
                      placeholder="Select country code"
                      searchPlaceholder="Search countries..."
                    />
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
                  <FormLabel className="text-terminal-text font-mono">City Name (Optional)</FormLabel>
                  <FormControl>
                    <Input className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" placeholder="e.g. Amsterdam" {...field} />
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
                  <FormLabel className="text-terminal-text font-mono">Region (Optional)</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      options={regionOptions}
                      placeholder="Select region"
                      searchPlaceholder="Search regions..."
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
                className="bg-terminal-dark border-2 border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-terminal-accent hover:bg-cyan-600 text-terminal-dark font-mono">
                {isLoading ? 'Creating...' : 'Create Hub'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}