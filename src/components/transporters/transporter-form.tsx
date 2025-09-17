'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useTransporter, useCreateTransporter, useUpdateTransporter } from '@/hooks/use-transporters'
import { useActiveStaff } from '@/hooks/use-staff'

const transporterSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone_number: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  zip_code: z.string().optional(),
  country: z.string().optional(),
  diesel_surcharge_percentage: z.number().min(0, 'Must be 0 or greater').max(100, 'Cannot exceed 100%'),
  agent_id: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean(),
})

type TransporterFormData = z.infer<typeof transporterSchema>

interface TransporterFormProps {
  transporterId?: string
  onSuccess: () => void
  onCancel: () => void
}

export function TransporterForm({ transporterId, onSuccess, onCancel }: TransporterFormProps) {
  const { data: transporter, isLoading } = useTransporter(transporterId)
  const createTransporter = useCreateTransporter()
  const updateTransporter = useUpdateTransporter()
  const { activeStaff, isLoading: staffLoading } = useActiveStaff()

  const form = useForm<TransporterFormData>({
    resolver: zodResolver(transporterSchema),
    defaultValues: {
      name: '',
      email: '',
      phone_number: '',
      address: '',
      city: '',
      zip_code: '',
      country: '',
      diesel_surcharge_percentage: undefined,
      agent_id: 'none',
      notes: '',
      is_active: true,
    },
    values: transporter ? {
      name: transporter.name,
      email: transporter.email || '',
      phone_number: transporter.phone_number || '',
      address: transporter.address || '',
      city: transporter.city || '',
      zip_code: transporter.zip_code || '',
      country: transporter.country || '',
      diesel_surcharge_percentage: transporter.diesel_surcharge_percentage,
      agent_id: transporter.agent_id || 'none',
      notes: transporter.notes || '',
      is_active: transporter.is_active,
    } : undefined,
  })

  const onSubmit = async (data: TransporterFormData) => {
    try {
      const submitData = {
        ...data,
        email: data.email || undefined,
        phone_number: data.phone_number || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        zip_code: data.zip_code || undefined,
        country: data.country || undefined,
        agent_id: data.agent_id === 'none' ? undefined : data.agent_id,
        notes: data.notes || undefined,
      }

      if (transporterId) {
        await updateTransporter.mutateAsync({ id: transporterId, ...submitData })
      } else {
        await createTransporter.mutateAsync(submitData)
      }
      
      onSuccess()
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
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
                <FormLabel>Company Name *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="European Express Logistics" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder="contact@company.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="+31 20 123 4567" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="123 Logistics Street" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="city"
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
            name="zip_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Zip Code</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="1012 AB" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Netherlands" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="diesel_surcharge_percentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Diesel Surcharge (%)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="15.50"
                    value={field.value || ''}
                    onChange={(e) => {
                      const value = e.target.value
                      field.onChange(value === '' ? undefined : parseFloat(value))
                    }}
                    onFocus={(e) => e.target.select()}
                  />
                </FormControl>
                <FormDescription>
                  Percentage applied to all route prices
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="agent_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assigned Agent</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an agent" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No agent assigned</SelectItem>
                    {staffLoading ? (
                      <SelectItem value="loading" disabled>Loading agents...</SelectItem>
                    ) : (
                      activeStaff?.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.name} {staff.role && `(${staff.role})`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
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
                    placeholder="Additional information about this transporter..."
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
                    Inactive transporters are hidden from route planning
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
            disabled={createTransporter.isPending || updateTransporter.isPending}
          >
            {createTransporter.isPending || updateTransporter.isPending ? 'Saving...' : 
             transporterId ? 'Update Transporter' : 'Create Transporter'}
          </Button>
        </div>
      </form>
    </Form>
  )
}