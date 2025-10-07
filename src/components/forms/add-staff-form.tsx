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
import { toast } from 'sonner'
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

      toast.success('Staff member added successfully')

      queryClient.invalidateQueries({ queryKey: ['staff'] })
      queryClient.invalidateQueries({ queryKey: ['staff-with-customer-count'] })
      queryClient.invalidateQueries({ queryKey: ['active-staff'] })

      form.reset()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error adding staff member:', error)
      toast.error(`Failed to add staff member: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-terminal-panel border-terminal-border">
        <DialogHeader>
          <DialogTitle className="text-terminal-text font-mono">ADD STAFF MEMBER</DialogTitle>
          <DialogDescription className="text-terminal-muted font-mono">
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
                  <FormLabel className="text-terminal-text font-mono">Name</FormLabel>
                  <FormControl>
                    <Input className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" placeholder="Enter staff member name" {...field} />
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
                  <FormLabel className="text-terminal-text font-mono">Email</FormLabel>
                  <FormControl>
                    <Input className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" placeholder="Enter email address" type="email" {...field} />
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
                  <FormLabel className="text-terminal-text font-mono">Phone Number</FormLabel>
                  <FormControl>
                    <Input className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" placeholder="Enter phone number" {...field} />
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
                  <FormLabel className="text-terminal-text font-mono">Role</FormLabel>
                  <FormControl>
                    <Input className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" placeholder="e.g., Account Manager, Sales Representative" {...field} />
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
                  <FormLabel className="text-terminal-text font-mono">Department</FormLabel>
                  <FormControl>
                    <Input className="bg-terminal-dark border-terminal-border text-terminal-text font-mono" placeholder="e.g., Sales, Customer Service" {...field} />
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
                  <FormLabel className="text-terminal-text font-mono">Auth Account (Optional)</FormLabel>
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
                  <div className="text-sm text-terminal-muted font-mono">
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
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-terminal-border bg-terminal-dark p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel className="text-terminal-text font-mono">Active</FormLabel>
                    <div className="text-sm text-terminal-muted font-mono">
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
                className="bg-terminal-dark border-2 border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-terminal-accent hover:bg-cyan-600 text-terminal-dark font-mono">
                {isLoading ? 'Adding...' : 'Add Staff Member'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}