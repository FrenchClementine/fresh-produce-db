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
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useActiveStaff } from '@/hooks/use-staff'

const addCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone_number: z.string().optional(),
  address: z.string().optional(),
  warehouse_address: z.string().optional(),
  city: z.string().optional(),
  zip_code: z.string().optional(),
  country: z.string().optional(),
  delivery_modes: z.array(z.string()).optional(),
  agent_id: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
})

type AddCustomerFormValues = z.infer<typeof addCustomerSchema>

interface AddCustomerFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const deliveryModeOptions = [
  { id: 'Ex Works', label: 'Ex Works' },
  { id: 'DELIVERY', label: 'Delivery' },
  { id: 'TRANSIT', label: 'Transit' },
]

export function AddCustomerForm({ open, onOpenChange }: AddCustomerFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const queryClient = useQueryClient()
  const { activeStaff } = useActiveStaff()

  const form = useForm<AddCustomerFormValues>({
    resolver: zodResolver(addCustomerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone_number: '',
      address: '',
      warehouse_address: '',
      city: '',
      zip_code: '',
      country: '',
      delivery_modes: [],
      agent_id: 'none',
      notes: '',
      is_active: true,
    },
  })

  const onSubmit = async (values: AddCustomerFormValues) => {
    setIsLoading(true)
    try {
      // Clean up empty strings to null for optional fields
      const cleanValues = {
        ...values,
        email: values.email || null,
        phone_number: values.phone_number || null,
        address: values.address || null,
        warehouse_address: values.warehouse_address || null,
        city: values.city || null,
        zip_code: values.zip_code || null,
        country: values.country || null,
        agent_id: values.agent_id === 'none' ? null : values.agent_id,
        notes: values.notes || null,
      }

      const { error } = await supabase
        .from('customers')
        .insert(cleanValues)

      if (error) throw error

      toast.success('Customer added successfully')

      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['active-customers'] })

      form.reset()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error adding customer:', error)
      toast.error(`Failed to add customer: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-terminal-panel border-terminal-border">
        <DialogHeader>
          <DialogTitle className="text-terminal-text font-mono">ADD CUSTOMER</DialogTitle>
          <DialogDescription className="text-terminal-muted font-mono text-sm">
            Add a new customer to manage their product requirements and relationships.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel className="text-terminal-text font-mono">Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter customer name" className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" {...field} />
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
                    <FormLabel className="text-terminal-text font-mono">Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter email address" type="email" className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" {...field} />
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
                    <FormLabel className="text-terminal-text font-mono">Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" {...field} />
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
                    <FormLabel className="text-terminal-text font-mono">Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter address" className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="warehouse_address"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel className="text-terminal-text font-mono">Warehouse Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter warehouse address (if different)" className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" {...field} />
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
                    <FormLabel className="text-terminal-text font-mono">City</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter city" className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" {...field} />
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
                    <FormLabel className="text-terminal-text font-mono">Zip Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter zip code" className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel className="text-terminal-text font-mono">Country</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter country" className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="agent_id"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel className="text-terminal-text font-mono">Assigned Agent</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text font-mono">
                          <SelectValue placeholder="Select an agent" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-terminal-panel border-terminal-border">
                        <SelectItem value="none" className="font-mono text-terminal-text">No agent assigned</SelectItem>
                        {activeStaff?.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id} className="font-mono text-terminal-text">
                            {staff.name} {staff.role && `(${staff.role})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="delivery_modes"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base text-terminal-text font-mono">Delivery Modes</FormLabel>
                    <p className="text-sm text-terminal-muted font-mono">
                      Select the delivery modes this customer supports.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {deliveryModeOptions.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="delivery_modes"
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
                                      ? field.onChange([...(field.value || []), item.id])
                                      : field.onChange(
                                          field.value?.filter((value) => value !== item.id)
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal text-terminal-text font-mono">
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
                  <FormLabel className="text-terminal-text font-mono">Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter any additional notes" className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-terminal-border bg-terminal-dark p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-terminal-text font-mono">Active</FormLabel>
                    <div className="text-sm text-terminal-muted font-mono">
                      Customer is active and can receive orders
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

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="bg-terminal-dark border-2 border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-terminal-accent hover:bg-cyan-600 text-terminal-dark font-mono">
                {isLoading ? 'Adding...' : 'Add Customer'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}