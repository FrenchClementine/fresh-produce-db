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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useCertifications } from '@/hooks/use-products'

const addCustomerCertificationSchema = z.object({
  certification_id: z.string().min(1, 'Certification is required'),
  is_required: z.boolean().default(true),
  notes: z.string().optional(),
})

type AddCustomerCertificationFormValues = z.infer<typeof addCustomerCertificationSchema>

interface AddCustomerCertificationFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: string
}

export function AddCustomerCertificationForm({ open, onOpenChange, customerId }: AddCustomerCertificationFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { certifications } = useCertifications()

  const form = useForm<AddCustomerCertificationFormValues>({
    resolver: zodResolver(addCustomerCertificationSchema),
    defaultValues: {
      certification_id: '',
      is_required: true,
      notes: '',
    },
  })

  const onSubmit = async (values: AddCustomerCertificationFormValues) => {
    setIsLoading(true)
    try {
      const cleanValues = {
        customer_id: customerId,
        certification_id: values.certification_id,
        is_required: values.is_required,
        notes: values.notes || null,
      }

      const { error } = await supabase
        .from('customer_certifications')
        .insert(cleanValues)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Certification requirement added successfully',
      })

      queryClient.invalidateQueries({ queryKey: ['customer-certifications', customerId] })
      form.reset()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error adding certification requirement:', error)
      toast({
        title: 'Error',
        description: `Failed to add certification requirement: ${error.message}`,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Certification Requirement</DialogTitle>
          <DialogDescription>
            Add a certification requirement for this customer's suppliers.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="certification_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Certification</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a certification" />
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_required"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Required</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      This certification is mandatory for suppliers
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

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional requirements or notes about this certification" {...field} />
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
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Adding...' : 'Add Certification Requirement'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}