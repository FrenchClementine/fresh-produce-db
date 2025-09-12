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
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'

const packagingTypeSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  unit_type: z.enum(['Box', 'Bag', 'Crate', 'Pallet', 'Container', 'Bulk']),
  description: z.string().optional(),
})

type PackagingTypeFormValues = z.infer<typeof packagingTypeSchema>

interface AddPackagingTypeFormProps {
  children?: React.ReactNode
}

export function AddPackagingTypeForm({ children }: AddPackagingTypeFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const form = useForm<PackagingTypeFormValues>({
    resolver: zodResolver(packagingTypeSchema),
    defaultValues: {
      label: '',
      unit_type: undefined,
      description: '',
    },
  })

  const onSubmit = async (values: PackagingTypeFormValues) => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('packaging_options')
        .insert([{
          label: values.label,
          unit_type: values.unit_type,
          description: values.description || null,
        }])

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Packaging type added successfully',
      })

      queryClient.invalidateQueries({ queryKey: ['packaging-options'] })
      
      form.reset()
      setIsOpen(false)
    } catch (error) {
      console.error('Error adding packaging type:', error)
      toast({
        title: 'Error',
        description: 'Failed to add packaging type. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Packaging Type
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Packaging Type</DialogTitle>
          <DialogDescription>
            Create a new packaging option for products
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label *</FormLabel>
                  <FormControl>
                    <Input placeholder="5kg Box" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unit_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Box">Box</SelectItem>
                      <SelectItem value="Bag">Bag</SelectItem>
                      <SelectItem value="Crate">Crate</SelectItem>
                      <SelectItem value="Pallet">Pallet</SelectItem>
                      <SelectItem value="Container">Container</SelectItem>
                      <SelectItem value="Bulk">Bulk</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional description..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Adding...' : 'Add Packaging Type'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}