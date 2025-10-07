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
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

const addSizeSchema = z.object({
  name: z.string().min(1, 'Size name is required'),
})

type AddSizeFormValues = z.infer<typeof addSizeSchema>

interface AddSizeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddSizeForm({ open, onOpenChange }: AddSizeFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<AddSizeFormValues>({
    resolver: zodResolver(addSizeSchema),
    defaultValues: {
      name: '',
    },
  })

  const onSubmit = async (values: AddSizeFormValues) => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('size_options')
        .insert([{
          name: values.name,
        }])

      if (error) throw error

      toast.success('Size option created successfully')

      queryClient.invalidateQueries({ queryKey: ['size-options'] })
      onOpenChange(false)
      form.reset()

    } catch (error: any) {
      console.error('Error creating size:', error)
      toast.error(`Failed to create size: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-terminal-panel border-terminal-border">
        <DialogHeader>
          <DialogTitle className="text-terminal-text font-mono">ADD NEW SIZE</DialogTitle>
          <DialogDescription className="text-terminal-muted font-mono">
            Create a new size option
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-terminal-text font-mono">Size Name</FormLabel>
                  <FormControl>
                    <Input className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" placeholder="e.g. Large, XL, 500g" {...field} />
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
                {isLoading ? 'Creating...' : 'Create Size'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}