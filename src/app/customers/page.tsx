'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Plus, Search, Edit, Trash2, Eye, MapPin, Phone, Mail, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { useCustomers } from '@/hooks/use-customers'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import { AddCustomerForm } from '@/components/forms/add-customer-form'
import { EditCustomerForm } from '@/components/forms/edit-customer-form'

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [customerToEdit, setCustomerToEdit] = useState<any>(null)
  const [customerToDelete, setCustomerToDelete] = useState<any>(null)

  const { customers, isLoading, error } = useCustomers()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const router = useRouter()

  const filteredCustomers = customers?.filter((customer: any) =>
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.staff?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const handleDelete = async (customer: any) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customer.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: `Customer "${customer.name}" deleted successfully`,
      })

      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['active-customers'] })
      setCustomerToDelete(null)

    } catch (error: any) {
      console.error('Error deleting customer:', error)
      toast({
        title: 'Error',
        description: `Failed to delete customer: ${error.message}`,
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        </div>
        <div className="text-center py-12">Loading customers...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        </div>
        <div className="text-center py-12 text-red-500">
          Error loading customers: {(error as Error).message}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-8 w-8" />
          Customers
        </h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Customer Directory</CardTitle>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-80"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {customers?.length === 0 ? 'No customers found. Add your first customer to get started.' : 'No customers match your search.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Delivery Modes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer: any) => (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/customers/${customer.id}`)}
                  >
                    <TableCell>
                      <div className="font-medium">{customer.name}</div>
                      {customer.notes && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {customer.notes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {customer.email && (
                          <div className="flex items-center text-sm">
                            <Mail className="mr-2 h-3 w-3" />
                            {customer.email}
                          </div>
                        )}
                        {customer.phone_number && (
                          <div className="flex items-center text-sm">
                            <Phone className="mr-2 h-3 w-3" />
                            {customer.phone_number}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {(customer.city || customer.country) && (
                          <div className="flex items-center text-sm">
                            <MapPin className="mr-2 h-3 w-3" />
                            {[customer.city, customer.country].filter(Boolean).join(', ')}
                          </div>
                        )}
                        {customer.address && (
                          <div className="text-sm text-muted-foreground">
                            {customer.address}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {customer.staff ? (
                        <div className="flex items-center text-sm">
                          <User className="mr-2 h-3 w-3" />
                          <div>
                            <div className="font-medium">{customer.staff.name}</div>
                            {customer.staff.role && (
                              <div className="text-xs text-muted-foreground">{customer.staff.role}</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No agent assigned</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {customer.delivery_modes?.map((mode: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {mode}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={customer.is_active ? "default" : "secondary"}>
                        {customer.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setCustomerToEdit(customer)
                            setIsEditDialogOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setCustomerToDelete(customer)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddCustomerForm
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />

      <EditCustomerForm
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) setCustomerToEdit(null)
        }}
        customer={customerToEdit}
      />

      <AlertDialog open={!!customerToDelete} onOpenChange={() => setCustomerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the customer "{customerToDelete?.name}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => customerToDelete && handleDelete(customerToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}