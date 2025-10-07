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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

const addCertificationSchema = z.object({
  name: z.string().min(1, 'Certification name is required'),
  description: z.string().optional(),
})

type AddCertificationFormValues = z.infer<typeof addCertificationSchema>

interface AddCertificationFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddCertificationForm({ open, onOpenChange }: AddCertificationFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<AddCertificationFormValues>({
    resolver: zodResolver(addCertificationSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  })

  const onSubmit = async (values: AddCertificationFormValues) => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('certifications')
        .insert([{
          name: values.name,
          description: values.description || null,
        }])

      if (error) throw error

      toast.success('Certification created successfully')

      queryClient.invalidateQueries({ queryKey: ['certifications'] })
      onOpenChange(false)
      form.reset()

    } catch (error: any) {
      console.error('Error creating certification:', error)
      toast.error(`Failed to create certification: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-terminal-panel border-terminal-border">
        <DialogHeader>
          <DialogTitle className="text-terminal-text font-mono">ADD NEW CERTIFICATION</DialogTitle>
          <DialogDescription className="text-terminal-muted font-mono">
            Create a new certification standard
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-terminal-text font-mono">Certification Name</FormLabel>
                  <FormControl>
                    <Input className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" placeholder="e.g. Organic, HACCP, BRC" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-terminal-text font-mono">Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      className="bg-terminal-dark border-terminal-border text-terminal-text font-mono resize-none"
                      placeholder="Optional description of the certification..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="bg-terminal-dark border-2 border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-terminal-accent hover:bg-cyan-600 text-terminal-dark font-mono">
                {isLoading ? 'Creating...' : 'Create Certification'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}