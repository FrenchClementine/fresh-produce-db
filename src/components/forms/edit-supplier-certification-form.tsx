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
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'

const editCertificationSchema = z.object({
  issued_at: z.string().optional(),
  expires_at: z.string().optional(),
}).refine((data) => {
  // If both dates are provided, expires_at must be after issued_at
  if (data.issued_at && data.expires_at) {
    const issuedDate = new Date(data.issued_at)
    const expiryDate = new Date(data.expires_at)
    return expiryDate > issuedDate
  }
  return true
}, {
  message: "Expiry date must be after issue date",
  path: ["expires_at"],
})

type EditCertificationFormValues = z.infer<typeof editCertificationSchema>

interface EditSupplierCertificationFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplierId: string
  certification: any
}

export function EditSupplierCertificationForm({ 
  open, 
  onOpenChange, 
  supplierId,
  certification
}: EditSupplierCertificationFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const form = useForm<EditCertificationFormValues>({
    resolver: zodResolver(editCertificationSchema),
    defaultValues: {
      issued_at: '',
      expires_at: '',
    },
  })

  // Update form when certification changes
  useEffect(() => {
    if (certification) {
      form.reset({
        issued_at: certification.issued_at || '',
        expires_at: certification.expires_at || '',
      })
    }
  }, [certification, form])

  const onSubmit = async (values: EditCertificationFormValues) => {
    setIsLoading(true)
    try {
      const updateData: any = {}

      if (values.issued_at) {
        updateData.issued_at = values.issued_at
      } else {
        updateData.issued_at = null
      }

      if (values.expires_at) {
        updateData.expires_at = values.expires_at
      } else {
        updateData.expires_at = null
      }

      const { error } = await supabase
        .from('supplier_certifications')
        .update(updateData)
        .eq('id', certification.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: `Certification "${certification.certifications?.name}" updated successfully`,
      })

      queryClient.invalidateQueries({ queryKey: ['supplier-certifications', supplierId] })
      onOpenChange(false)
      
    } catch (error: any) {
      console.error('Error updating certification:', error)
      toast({
        title: 'Error',
        description: `Failed to update certification: ${error.message}`,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!certification) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Certification</DialogTitle>
          <DialogDescription>
            Update validity dates for "{certification.certifications?.name}"
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="issued_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issue Date (Optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>
                    When the certification was issued
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expires_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiry Date (Optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>
                    When the certification expires
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                {isLoading ? 'Updating...' : 'Update Certification'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}