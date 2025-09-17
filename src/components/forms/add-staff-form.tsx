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
import { Switch } from '@/components/ui/switch'
import {
  SearchableSelect,
  createSearchableOptions,
} from '@/components/ui/searchable-select'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthUsers } from '@/hooks/use-auth-users'

const addStaffSchema = z.object({
  name: z.string().min(1, 'Staff name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone_number: z.string().optional(),
  role: z.string().optional(),
  department: z.string().optional(),
  is_active: z.boolean().default(true),
  auth_user_id: z.string().optional().or(z.literal('')),
})

type AddStaffFormValues = z.infer<typeof addStaffSchema>

interface AddStaffFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddStaffForm({ open, onOpenChange }: AddStaffFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { data: authUsers, isLoading: authUsersLoading } = useAuthUsers()

  const form = useForm<AddStaffFormValues>({
    resolver: zodResolver(addStaffSchema),
    defaultValues: {
      name: '',
      email: '',
      phone_number: '',
      role: '',
      department: '',
      is_active: true,
      auth_user_id: '',
    },
  })

  const onSubmit = async (values: AddStaffFormValues) => {
    setIsLoading(true)
    try {
      // Clean up empty strings to null for optional fields
      const cleanValues = {
        ...values,
        email: values.email || null,
        phone_number: values.phone_number || null,
        role: values.role || null,
        department: values.department || null,
        auth_user_id: values.auth_user_id || null,
      }

      const { error } = await supabase
        .from('staff')
        .insert(cleanValues)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Staff member added successfully',
      })

      queryClient.invalidateQueries({ queryKey: ['staff'] })
      queryClient.invalidateQueries({ queryKey: ['staff-with-customer-count'] })
      queryClient.invalidateQueries({ queryKey: ['active-staff'] })

      form.reset()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error adding staff member:', error)
      toast({
        title: 'Error',
        description: `Failed to add staff member: ${error.message}`,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Staff Member</DialogTitle>
          <DialogDescription>
            Add a new staff member to manage customer relationships.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter staff member name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter email address" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Account Manager, Sales Representative" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Sales, Customer Service" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="auth_user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Auth Account (Optional)</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      options={createSearchableOptions(
                        authUsers?.map((user) => ({
                          value: user.id,
                          label: user.email || '',
                        })) || []
                      )}
                      placeholder={authUsersLoading ? "Loading users..." : "Select an auth account"}
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={authUsersLoading}
                    />
                  </FormControl>
                  <div className="text-sm text-muted-foreground">
                    Link this staff member to a Supabase auth account
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Staff member can be assigned to customers
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
                {isLoading ? 'Adding...' : 'Add Staff Member'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}