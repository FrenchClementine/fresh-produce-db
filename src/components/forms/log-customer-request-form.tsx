'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useCreateCustomerRequest } from '@/hooks/use-customer-requests'
import { useCustomers } from '@/hooks/use-customers'
import { useProducts, usePackagingOptions } from '@/hooks/use-products'
import { useHubs } from '@/hooks/use-hubs'
import { useCurrentStaffMember } from '@/hooks/use-staff'
import { useCertifications } from '@/hooks/use-certifications'
import { CreateCustomerRequestData, RequestFrequency } from '@/types/customer-requests'

const formSchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  product_id: z.string().min(1, 'Product is required'),
  variety: z.string().optional(),
  packaging_type_id: z.string().optional(),
  units_per_package: z.coerce.number().optional(),
  packages_per_pallet: z.coerce.number().optional(),
  certifications: z.array(z.string()).optional(),
  target_price_per_unit: z.coerce.number().optional(),
  target_currency: z.string().default('EUR'),
  delivery_mode: z.enum(['DELIVERY', 'EX_WORKS']),
  delivery_hub_id: z.string().optional(),
  needed_by_date: z.string().optional(),
  availability_window_start: z.string().optional(),
  availability_window_end: z.string().optional(),
  quantity_needed: z.coerce.number().optional(),
  quantity_unit: z.enum(['units', 'pallets', 'packages']).default('units'),
  frequency: z.enum(['one-time', 'weekly', 'monthly', 'seasonal']).optional(),
  notes: z.string().optional()
})

type FormData = z.infer<typeof formSchema>

interface LogCustomerRequestFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LogCustomerRequestForm({ open, onOpenChange }: LogCustomerRequestFormProps) {
  const { customers } = useCustomers()
  const { products } = useProducts()
  const { packagingOptions } = usePackagingOptions()
  const { certifications } = useCertifications()
  const { data: hubs } = useHubs()
  const { data: currentStaff } = useCurrentStaffMember()
  const createRequest = useCreateCustomerRequest()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      target_currency: 'EUR',
      delivery_mode: 'DELIVERY',
      quantity_unit: 'units'
    }
  })

  const onSubmit = async (data: FormData) => {
    if (!currentStaff?.id) {
      console.error('No current staff member found')
      return
    }

    // Check if all key fields are filled to determine if request should be marked as closed
    const isComplete = !!(
      data.customer_id &&
      data.product_id &&
      data.packaging_type_id &&
      data.units_per_package &&
      data.packages_per_pallet &&
      data.target_price_per_unit &&
      data.delivery_mode &&
      data.quantity_needed &&
      data.needed_by_date
    )

    const requestData: CreateCustomerRequestData & { staff_id: string; status?: 'open' | 'closed' } = {
      ...data,
      staff_id: currentStaff.id,
      status: isComplete ? 'closed' : 'open'
    }

    await createRequest.mutateAsync(requestData)
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-terminal-panel border-terminal-border">
        <DialogHeader>
          <DialogTitle className="text-terminal-text font-mono">
            LOG CUSTOMER REQUEST
          </DialogTitle>
          <DialogDescription className="text-terminal-muted font-mono">
            Record a new customer product request to track and match with suppliers
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Customer & Product */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-terminal-text font-mono">Customer *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text">
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers?.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
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
                name="product_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-terminal-text font-mono">Product *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text">
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products?.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
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
              name="variety"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-terminal-text font-mono">Variety</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Iceberg, Romaine"
                      className="bg-terminal-dark border-terminal-border text-terminal-text"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Packaging */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="packaging_type_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-terminal-text font-mono">Packaging Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {packagingOptions?.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.label}
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
                name="units_per_package"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-terminal-text font-mono">Units/Package</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="e.g., 12"
                        className="bg-terminal-dark border-terminal-border text-terminal-text"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="packages_per_pallet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-terminal-text font-mono">Packages/Pallet</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="e.g., 80"
                        className="bg-terminal-dark border-terminal-border text-terminal-text"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Certifications */}
            <FormField
              control={form.control}
              name="certifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-terminal-text font-mono">Certifications</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      const current = field.value || []
                      if (!current.includes(value)) {
                        field.onChange([...current, value])
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text">
                        <SelectValue placeholder="Select certifications" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {certifications?.map((cert) => (
                        <SelectItem key={cert.id} value={cert.id}>
                          {cert.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.value && field.value.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {field.value.map((certId) => {
                        const cert = certifications?.find(c => c.id === certId)
                        return cert ? (
                          <div
                            key={certId}
                            className="bg-terminal-dark border border-terminal-border px-2 py-1 rounded text-sm flex items-center gap-2"
                          >
                            <span>{cert.name}</span>
                            <button
                              type="button"
                              onClick={() => field.onChange(field.value?.filter(id => id !== certId))}
                              className="text-terminal-muted hover:text-terminal-text"
                            >
                              ×
                            </button>
                          </div>
                        ) : null
                      })}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Pricing & Logistics */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="target_price_per_unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-terminal-text font-mono">Target Price</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        placeholder="e.g., 1.50"
                        className="bg-terminal-dark border-terminal-border text-terminal-text"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="delivery_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-terminal-text font-mono">Delivery Mode *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DELIVERY">Delivery (DDP)</SelectItem>
                        <SelectItem value="EX_WORKS">Ex Works</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="delivery_hub_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-terminal-text font-mono">Delivery Hub</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text">
                          <SelectValue placeholder="Select hub" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {hubs?.map((hub) => (
                          <SelectItem key={hub.id} value={hub.id}>
                            {hub.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Timing */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="needed_by_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-terminal-text font-mono">Needed By</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        className="bg-terminal-dark border-terminal-border text-terminal-text"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="availability_window_start"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-terminal-text font-mono">Window Start</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        className="bg-terminal-dark border-terminal-border text-terminal-text"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="availability_window_end"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-terminal-text font-mono">Window End</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        className="bg-terminal-dark border-terminal-border text-terminal-text"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Quantity & Frequency */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="quantity_needed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-terminal-text font-mono">Quantity</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="e.g., 5"
                        className="bg-terminal-dark border-terminal-border text-terminal-text"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity_unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-terminal-text font-mono">Unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="units">Units</SelectItem>
                        <SelectItem value="pallets">Pallets</SelectItem>
                        <SelectItem value="packages">Packages</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-terminal-text font-mono">Frequency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="one-time">One-time</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="seasonal">Seasonal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-terminal-text font-mono">Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Additional details about the request..."
                      className="bg-terminal-dark border-terminal-border text-terminal-text font-mono min-h-[80px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-terminal-border text-terminal-muted hover:bg-terminal-dark font-mono"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createRequest.isPending}
                className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono"
              >
                {createRequest.isPending ? 'Creating...' : 'Log Request'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
