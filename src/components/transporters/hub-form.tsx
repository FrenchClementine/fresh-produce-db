'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { useCreateHub } from '@/hooks/use-products'

const hubSchema = z.object({
  name: z.string().min(1, 'Hub name is required'),
  hub_code: z.string().min(2, 'Hub code must be at least 2 characters').max(10, 'Hub code must be less than 10 characters'),
  country_code: z.string().min(2, 'Country code is required').max(3, 'Country code must be 2-3 characters'),
  city_name: z.string().optional(),
  region: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  is_active: z.boolean(),
})

type HubFormData = z.infer<typeof hubSchema>

interface HubFormProps {
  onSuccess: (hubId: string) => void
  onCancel: () => void
  prefilledData?: {
    location?: string
    coordinates?: { latitude: number; longitude: number }
  }
}

export function HubForm({ onSuccess, onCancel, prefilledData }: HubFormProps) {
  const createHub = useCreateHub()

  // Parse location if provided (e.g., "Kapellen, BE")
  const parsedLocation = prefilledData?.location ? (() => {
    const parts = prefilledData.location.split(',').map(p => p.trim())
    if (parts.length >= 2) {
      const cityName = parts[0]
      const countryCode = parts[parts.length - 1]
      const region = parts.length > 2 ? parts.slice(1, -1).join(', ') : ''
      return { cityName, countryCode, region }
    }
    return { cityName: prefilledData.location, countryCode: '', region: '' }
  })() : { cityName: '', countryCode: '', region: '' }

  const form = useForm<HubFormData>({
    resolver: zodResolver(hubSchema),
    defaultValues: {
      name: parsedLocation.cityName ? `${parsedLocation.cityName} Hub` : '',
      hub_code: '',
      country_code: parsedLocation.countryCode || '',
      city_name: parsedLocation.cityName || '',
      region: parsedLocation.region || '',
      latitude: prefilledData?.coordinates?.latitude,
      longitude: prefilledData?.coordinates?.longitude,
      is_active: true,
    },
  })

  const onSubmit = async (data: HubFormData) => {
    try {
      const result = await createHub.mutateAsync(data)
      onSuccess(result.id)
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Hub Name *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Amsterdam Distribution Center" />
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
                <FormLabel>Hub Code *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="AMS" maxLength={10} />
                </FormControl>
                <FormDescription>
                  Short unique code (2-10 characters)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="country_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country Code *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="NL" maxLength={3} />
                </FormControl>
                <FormDescription>
                  ISO country code (2-3 characters)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="city_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Amsterdam" />
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
                <FormLabel>Region</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="North Holland" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="latitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Latitude</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.0001"
                    placeholder="51.2194"
                    value={field.value || ''}
                    onChange={(e) => {
                      const value = e.target.value
                      field.onChange(value === '' ? undefined : parseFloat(value))
                    }}
                  />
                </FormControl>
                <FormDescription>
                  {prefilledData?.coordinates ? 'Auto-filled from location search' : 'Optional coordinate for precise location'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="longitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Longitude</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.0001"
                    placeholder="4.4025"
                    value={field.value || ''}
                    onChange={(e) => {
                      const value = e.target.value
                      field.onChange(value === '' ? undefined : parseFloat(value))
                    }}
                  />
                </FormControl>
                <FormDescription>
                  {prefilledData?.coordinates ? 'Auto-filled from location search' : 'Optional coordinate for precise location'}
                </FormDescription>
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
                    Inactive hubs are hidden from route planning
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
            disabled={createHub.isPending}
          >
            {createHub.isPending ? 'Creating...' : 'Create Hub'}
          </Button>
        </div>
      </form>
    </Form>
  )
}