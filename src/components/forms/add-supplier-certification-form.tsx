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
  FormDescription,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  SearchableSelect,
  SearchableSelectOption,
} from '@/components/ui/searchable-select'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useCertifications } from '@/hooks/use-products'
import { Plus } from 'lucide-react'

const addCertificationSchema = z.object({
  certification_id: z.string().min(1, 'Certification is required'),
  issued_at: z.string().optional(),
  expires_at: z.string().optional(),
  new_certification: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
  }).optional(),
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

type AddCertificationFormValues = z.infer<typeof addCertificationSchema>

interface AddSupplierCertificationFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplierId: string
}

export function AddSupplierCertificationForm({ 
  open, 
  onOpenChange, 
  supplierId 
}: AddSupplierCertificationFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showNewCertification, setShowNewCertification] = useState(false)
  
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { certifications } = useCertifications()

  const form = useForm<AddCertificationFormValues>({
    resolver: zodResolver(addCertificationSchema),
    defaultValues: {
      certification_id: '',
      issued_at: '',
      expires_at: '',
    },
  })

  const onSubmit = async (values: AddCertificationFormValues) => {
    setIsLoading(true)
    try {
      let certificationId = values.certification_id

      // Create new certification if needed
      if (values.certification_id === 'new' && values.new_certification) {
        const { data: newCertification, error: certificationError } = await supabase
          .from('certifications')
          .insert([{
            name: values.new_certification.name!,
            description: values.new_certification.description || null,
          }])
          .select()
          .single()

        if (certificationError) throw certificationError
        certificationId = newCertification.id
      }

      // Link certification to supplier
      const certificationData: any = {
        supplier_id: supplierId,
        certification_id: certificationId,
      }

      if (values.issued_at) {
        certificationData.issued_at = values.issued_at
      }
      if (values.expires_at) {
        certificationData.expires_at = values.expires_at
      }

      const { error } = await supabase
        .from('supplier_certifications')
        .insert([certificationData])

      if (error) throw error

      const certificationName = values.certification_id === 'new' 
        ? values.new_certification?.name 
        : certifications?.find(c => c.id === certificationId)?.name

      toast({
        title: 'Success',
        description: `Certification "${certificationName}" linked to supplier successfully`,
      })

      queryClient.invalidateQueries({ queryKey: ['supplier-certifications', supplierId] })
      queryClient.invalidateQueries({ queryKey: ['certifications'] })
      onOpenChange(false)
      form.reset()
      setShowNewCertification(false)
      
    } catch (error: any) {
      console.error('Error linking certification:', error)
      toast({
        title: 'Error',
        description: `Failed to link certification: ${error.message}`,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-terminal-panel border-terminal-border">
        <DialogHeader>
          <DialogTitle className="text-terminal-text font-mono">ADD CERTIFICATION</DialogTitle>
          <DialogDescription className="text-terminal-muted font-mono">
            Link a certification to this supplier with optional validity dates
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="certification_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-terminal-text font-mono">Certification *</FormLabel>
                  <SearchableSelect
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value)
                      setShowNewCertification(value === 'new')
                    }}
                    options={[
                      ...(certifications?.map((certification) => ({
                        value: certification.id,
                        label: certification.name,
                      })) || []),
                      {
                        value: 'new',
                        label: '+ Add New Certification'
                      }
                    ]}
                    placeholder="Select certification"
                    searchPlaceholder="Search certifications..."
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {showNewCertification && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <FormField
                  control={form.control}
                  name="new_certification.name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-terminal-text font-mono">Certification Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Organic, ISO 14001, Fair Trade" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="new_certification.description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-terminal-text font-mono">Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="issued_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-terminal-text font-mono">Issue Date (Optional)</FormLabel>
                  <FormControl>
                    <Input className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" type="date" {...field} />
                  </FormControl>
                  <FormDescription className="text-terminal-muted font-mono">
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
                  <FormLabel className="text-terminal-text font-mono">Expiry Date (Optional)</FormLabel>
                  <FormControl>
                    <Input className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" type="date" {...field} />
                  </FormControl>
                  <FormDescription className="text-terminal-muted font-mono">
                    When the certification expires
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" className="bg-terminal-dark border-2 border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono" onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-terminal-accent hover:bg-cyan-600 text-terminal-dark font-mono" disabled={isLoading}>
                {isLoading ? 'Adding...' : 'Add Certification'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}