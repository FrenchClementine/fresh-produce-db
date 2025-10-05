'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { TradePotential } from '@/types/trade-potential'
import { CreateOpportunityData } from '@/types/opportunities'
import { useCreateOpportunity } from '@/hooks/use-opportunities'
import { useSuppliers } from '@/hooks/use-suppliers'
import { useTransporters } from '@/hooks/use-transporters'
import { useStaff } from '@/hooks/use-staff'
import { cn } from '@/lib/utils'

const createOpportunitySchema = z.object({
  offer_price_per_unit: z.number().min(0.01, 'Offer price must be greater than 0'),
  offer_currency: z.string().default('EUR'),
  selected_supplier_id: z.string().optional(),
  selected_transport_band_id: z.string().optional(),
  valid_till: z.date().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['draft', 'active']).default('draft'),
  assigned_to: z.string().optional(),
  internal_notes: z.string().optional(),
  customer_requirements: z.string().optional(),
})

type CreateOpportunityFormData = z.infer<typeof createOpportunitySchema>

interface CreateOpportunityModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  potential: TradePotential | null
}

// Simple currency formatter
const formatCurrency = (amount: number, currency: string = 'EUR') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount)
}

export function CreateOpportunityModal({ open, onOpenChange, potential }: CreateOpportunityModalProps) {
  const [date, setDate] = useState<Date>()
  const [selectedTransportBand, setSelectedTransportBand] = useState<string>('')
  const createMutation = useCreateOpportunity()

  // Fetch related data
  const { data: suppliers } = useSuppliers()
  const { data: transporters } = useTransporters()
  const { staff } = useStaff()

  const form = useForm<CreateOpportunityFormData>({
    resolver: zodResolver(createOpportunitySchema),
    defaultValues: {
      offer_price_per_unit: undefined,
      offer_currency: 'EUR',
      priority: 'medium',
      status: 'draft',
    },
  })

  // Reset form when potential changes to pick up new defaults
  React.useEffect(() => {
    if (potential) {
      // Auto-select first transport band if available
      const firstBandId = potential.transportRoute?.availableBands?.[0]?.id

      form.reset({
        offer_price_per_unit: undefined,
        offer_currency: 'EUR',
        priority: 'medium',
        status: 'draft',
        assigned_to: potential.customer.agent.id || undefined,
        valid_till: potential.supplierPrice?.validUntil ? new Date(potential.supplierPrice.validUntil) : undefined,
        selected_transport_band_id: firstBandId || undefined,
      })
      setDate(potential.supplierPrice?.validUntil ? new Date(potential.supplierPrice.validUntil) : undefined)

      // Also update the local state for transport band selection
      if (firstBandId) {
        setSelectedTransportBand(firstBandId)
      }
    }
  }, [potential, form])

  if (!potential) return null

  // Calculate estimated cost with selected transport band
  const supplierCost = potential.supplierPrice?.pricePerUnit || 0

  // Get transport cost from selected band or default to first available
  let transportCost = 0
  if (potential.transportRoute?.availableBands && potential.transportRoute.availableBands.length > 0) {
    const selectedBand = potential.transportRoute.availableBands.find(
      band => band.id === selectedTransportBand
    ) || potential.transportRoute.availableBands[0] // Default to first band

    if (selectedBand && potential.transportRoute.unitsPerPallet > 0) {
      transportCost = selectedBand.price_per_pallet / potential.transportRoute.unitsPerPallet
    }
  } else {
    // Fallback to default transport cost
    transportCost = potential.transportRoute?.pricePerUnit || 0
  }

  const estimatedTotalCost = supplierCost + transportCost

  // Filter suppliers that can supply this product
  const availableSuppliers = suppliers?.filter(supplier =>
    supplier.id === potential.supplier.id ||
    // Add logic here to find other suppliers who can supply the same product
    false
  ) || []

  const onSubmit = async (data: CreateOpportunityFormData) => {
    if (!potential) return

    // Get the selected transport band or use default
    const selectedBand = potential.transportRoute?.availableBands?.find(
      band => band.id === data.selected_transport_band_id
    ) || potential.transportRoute?.availableBands?.[0]

    const finalTransportCostPerPallet = selectedBand?.price_per_pallet || potential.transportRoute?.pricePerPallet || 0
    const finalTransportCostPerUnit = potential.transportRoute?.unitsPerPallet
      ? finalTransportCostPerPallet / potential.transportRoute.unitsPerPallet
      : transportCost

    const opportunityData: CreateOpportunityData = {
      customer_id: potential.customer.id,
      supplier_id: potential.supplier.id,
      product_packaging_spec_id: potential.product.specId,
      selected_supplier_id: data.selected_supplier_id || potential.supplier.id,
      selected_transporter_id: potential.transportRoute?.transporterId || undefined, // Use pre-selected transporter ID from trade potential
      selected_route_id: potential.transportRoute?.id && potential.transportRoute.id !== 'supplier-transport' ? potential.transportRoute.id : undefined, // Use the route from trade potential
      selected_transport_band_id: data.selected_transport_band_id,
      supplier_price_id: potential.supplierPrice?.id,
      supplier_price_per_unit: potential.supplierPrice?.pricePerUnit,
      transport_cost_per_pallet: finalTransportCostPerPallet,
      transport_cost_per_unit: finalTransportCostPerUnit,
      estimated_total_cost: estimatedTotalCost,
      offer_price_per_unit: data.offer_price_per_unit,
      offer_currency: data.offer_currency,
      valid_till: data.valid_till ? format(data.valid_till, 'yyyy-MM-dd') : undefined,
      priority: data.priority,
      status: data.status,
      assigned_to: data.assigned_to,
      internal_notes: data.internal_notes,
      customer_requirements: data.customer_requirements,
    }

    try {
      await createMutation.mutateAsync(opportunityData)
      onOpenChange(false)
      form.reset()
      setDate(undefined)
    } catch (error) {
      console.error('Failed to create opportunity:', error)
    }
  }

  const offerPrice = form.watch('offer_price_per_unit')
  const margin = offerPrice && estimatedTotalCost ? offerPrice - estimatedTotalCost : 0
  const marginPercentage = offerPrice && estimatedTotalCost ? ((margin / offerPrice) * 100) : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Opportunity</DialogTitle>
          <DialogDescription>
            Convert this trade potential into an opportunity with your pricing
          </DialogDescription>
        </DialogHeader>

        {/* Trade Details Summary */}
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm text-gray-700">Customer</h4>
              <p className="text-sm">{potential.customer.name}</p>
              <p className="text-xs text-gray-500">{potential.customer.city}, {potential.customer.country}</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-700">Supplier</h4>
              <p className="text-sm">{potential.supplier.name}</p>
              <p className="text-xs text-gray-500">{potential.supplier.city}, {potential.supplier.country}</p>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-sm text-gray-700">Product</h4>
            <p className="text-sm">{potential.product.name}</p>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline" className="text-xs">{potential.product.category}</Badge>
              <Badge variant="outline" className="text-xs">{potential.product.packagingLabel}</Badge>
              <Badge variant="outline" className="text-xs">{potential.product.sizeName}</Badge>
            </div>
          </div>

          {/* Cost Breakdown */}
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-700">Estimated Costs</h4>
              {potential.supplierPrice && (
                <p>Supplier: {formatCurrency(potential.supplierPrice.pricePerUnit)}</p>
              )}
              {potential.transportRoute && (
                <div>
                  <p>Transport: {formatCurrency(transportCost)}/unit</p>
                  <p className="text-xs text-gray-500">
                    Via: {potential.transportRoute.transporterName} ({potential.transportRoute.durationDays} days)
                  </p>
                  <p className="text-xs text-gray-500">
                    Units per pallet: {potential.transportRoute.unitsPerPallet} {potential.product.soldBy}
                  </p>
                  {potential.transportRoute.availableBands && potential.transportRoute.availableBands.length > 1 && (
                    <p className="text-xs text-gray-500">
                      Multiple pricing tiers available - select below
                    </p>
                  )}
                </div>
              )}
              <p className="font-semibold border-t pt-1 mt-1">
                Total Cost: {formatCurrency(estimatedTotalCost)}
              </p>
            </div>
            {offerPrice && (
              <div>
                <h4 className="font-medium text-gray-700">Margin Analysis</h4>
                <p>Offer Price: {formatCurrency(offerPrice)}</p>
                <p className={cn(
                  "font-semibold",
                  margin >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  Margin: {formatCurrency(margin)} ({marginPercentage.toFixed(1)}%)
                </p>
              </div>
            )}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Pricing Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Pricing Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="offer_price_per_unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Offer Price per Unit *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.0001"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        Price you want to quote to the customer
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="offer_currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Supplier & Transport Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Supplier & Transport Options</h3>

              {availableSuppliers.length > 1 && (
                <FormField
                  control={form.control}
                  name="selected_supplier_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Supplier</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={potential.supplier.id}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select supplier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableSuppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name} - {supplier.city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Transport Information */}
              {potential.transportRoute && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-sm text-gray-700">Selected Transport Route</h4>
                  <p className="text-sm">{potential.transportRoute.transporterName}</p>
                  <p className="text-xs text-gray-500">Duration: {potential.transportRoute.durationDays} days</p>
                </div>
              )}

              {/* Transport Band Selection */}
              {console.log('🚛 Available bands for transport:', potential.transportRoute?.availableBands)}
              {potential.transportRoute?.availableBands && potential.transportRoute.availableBands.length >= 1 && (
                <FormField
                  control={form.control}
                  name="selected_transport_band_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Transport Price Band</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value)
                          setSelectedTransportBand(value)
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select price band" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {potential.transportRoute?.availableBands?.map((band, index) => {
                            const costPerUnit = potential.transportRoute && potential.transportRoute.unitsPerPallet > 0
                              ? band.price_per_pallet / potential.transportRoute.unitsPerPallet
                              : 0
                            return (
                              <SelectItem key={band.id || `band-${index}`} value={band.id || `band-${index}`}>
                                {formatCurrency(band.price_per_pallet)}/pallet
                                ({formatCurrency(costPerUnit)}/unit)
                                {band.min_pallets && band.max_pallets && (
                                  ` - ${band.min_pallets}-${band.max_pallets} pallets`
                                )}
                                {band.pallet_dimensions && ` - ${band.pallet_dimensions}`}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose the transport pricing tier based on volume
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Management Fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign to Agent</FormLabel>
                    <Select onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select agent" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {staff?.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name} {member.email && `(${member.email})`}
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
                name="valid_till"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Valid Until</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      When this opportunity expires
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="internal_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Internal notes about this opportunity..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customer_requirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Requirements</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Specific customer requirements or notes..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Opportunity
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}