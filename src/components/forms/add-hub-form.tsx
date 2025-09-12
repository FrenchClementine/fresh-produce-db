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
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'

const addHubSchema = z.object({
  name: z.string().min(1, 'Hub name is required'),
  hub_code: z.string().min(1, 'Hub code is required'),
  country_code: z.string().optional(),
  city_name: z.string().optional(),
  region: z.string().optional(),
})

type AddHubFormValues = z.infer<typeof addHubSchema>

interface AddHubFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddHubForm({ open, onOpenChange }: AddHubFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const form = useForm<AddHubFormValues>({
    resolver: zodResolver(addHubSchema),
    defaultValues: {
      name: '',
      hub_code: '',
      country_code: '',
      city_name: '',
      region: '',
    },
  })

  const onSubmit = async (values: AddHubFormValues) => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('hubs')
        .insert([{
          name: values.name,
          hub_code: values.hub_code,
          country_code: values.country_code || null,
          city_name: values.city_name || null,
          region: values.region || null,
        }])

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Hub created successfully',
      })

      queryClient.invalidateQueries({ queryKey: ['hubs'] })
      onOpenChange(false)
      form.reset()
      
    } catch (error: any) {
      console.error('Error creating hub:', error)
      toast({
        title: 'Error',
        description: `Failed to create hub: ${error.message}`,
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
          <DialogTitle>Add New Hub</DialogTitle>
          <DialogDescription>
            Create a new logistics hub
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hub Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Amsterdam Distribution Center" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hub_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hub Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. AMS-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="country_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country Code (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. NL" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Amsterdam" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. North Holland" {...field} />
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
                {isLoading ? 'Creating...' : 'Create Hub'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}