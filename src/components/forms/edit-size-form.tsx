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
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'

const editSizeSchema = z.object({
  name: z.string().min(1, 'Size name is required'),
})

type EditSizeFormValues = z.infer<typeof editSizeSchema>

interface EditSizeFormProps {
  size: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditSizeForm({ size, open, onOpenChange }: EditSizeFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const form = useForm<EditSizeFormValues>({
    resolver: zodResolver(editSizeSchema),
    defaultValues: {
      name: size?.name || '',
    },
  })

  // Reset form when size changes
  useEffect(() => {
    if (size) {
      form.reset({
        name: size.name || '',
      })
    }
  }, [size, form])

  const onSubmit = async (values: EditSizeFormValues) => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('size_options')
        .update({
          name: values.name,
        })
        .eq('id', size.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Size updated successfully',
      })

      queryClient.invalidateQueries({ queryKey: ['size-options'] })
      onOpenChange(false)
      
    } catch (error: any) {
      console.error('Error updating size:', error)
      toast({
        title: 'Error',
        description: `Failed to update size: ${error.message}`,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Size</DialogTitle>
          <DialogDescription>
            Update the size option
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Size Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Large, XL, 500g" {...field} />
                  </FormControl>
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
                {isLoading ? 'Updating...' : 'Update Size'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}