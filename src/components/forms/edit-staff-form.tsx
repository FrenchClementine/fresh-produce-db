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
import { Switch } from '@/components/ui/switch'
import {
  SearchableSelect,
  createSearchableOptions,
} from '@/components/ui/searchable-select'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthUsers } from '@/hooks/use-auth-users'

const editStaffSchema = z.object({
  name: z.string().min(1, 'Staff name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone_number: z.string().optional(),
  role: z.string().optional(),
  department: z.string().optional(),
  is_active: z.boolean(),
  auth_user_id: z.string().optional().or(z.literal('')),
})

type EditStaffFormValues = z.infer<typeof editStaffSchema>

interface EditStaffFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  staff: any
}

export function EditStaffForm({ open, onOpenChange, staff }: EditStaffFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { data: authUsers, isLoading: authUsersLoading } = useAuthUsers()

  const form = useForm<EditStaffFormValues>({
    resolver: zodResolver(editStaffSchema),
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

  useEffect(() => {
    if (staff) {
      form.reset({
        name: staff.name || '',
        email: staff.email || '',
        phone_number: staff.phone_number || '',
        role: staff.role || '',
        department: staff.department || '',
        is_active: staff.is_active ?? true,
        auth_user_id: staff.auth_user_id || '',
      })
    }
  }, [staff, form])

  const onSubmit = async (values: EditStaffFormValues) => {
    if (!staff) return

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
        .update(cleanValues)
        .eq('id', staff.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Staff member updated successfully',
      })

      queryClient.invalidateQueries({ queryKey: ['staff'] })
      queryClient.invalidateQueries({ queryKey: ['staff-with-customer-count'] })
      queryClient.invalidateQueries({ queryKey: ['active-staff'] })

      onOpenChange(false)
    } catch (error: any) {
      console.error('Error updating staff member:', error)
      toast({
        title: 'Error',
        description: `Failed to update staff member: ${error.message}`,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-terminal-panel border-terminal-border">
        <DialogHeader>
          <DialogTitle className="text-terminal-text font-mono">EDIT STAFF MEMBER</DialogTitle>
          <DialogDescription className="text-terminal-muted font-mono">
            Update staff member information and settings.
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
                  <FormLabel className="text-terminal-text font-mono">Linked Account (Optional)</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      options={createSearchableOptions([
                        { value: '', label: 'No account linked' },
                        ...(authUsers?.map(user => ({
                          value: user.id,
                          label: user.email ?
                            `${user.email} (${user.last_sign_in_at ?
                              `Last login: ${new Date(user.last_sign_in_at).toLocaleDateString()}` :
                              'Never logged in'})`
                            : `User ${user.id.slice(0, 8)}...`
                        })) || [])
                      ])}
                      placeholder={authUsersLoading ? "Loading accounts..." : "Select user account"}
                      searchPlaceholder="Search accounts..."
                      disabled={authUsersLoading}
                    />
                  </FormControl>
                  <div className="text-xs text-terminal-muted font-mono">
                    Link this staff member to a Supabase auth account for login access
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border-terminal-border bg-terminal-dark p-3 shadow-sm">
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
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="bg-terminal-dark border-2 border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-terminal-accent hover:bg-cyan-600 text-terminal-dark font-mono">
                {isLoading ? 'Updating...' : 'Update Staff Member'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}