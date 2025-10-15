'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Plus, Search, Edit, Trash2, MapPin, Phone, Mail, User, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { AddCustomerForm } from '@/components/forms/add-customer-form'
import { EditCustomerForm } from '@/components/forms/edit-customer-form'
import { CustomerDetailsDialog } from '@/components/customer-details-dialog'

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [agentFilter, setAgentFilter] = useState('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [customerToEdit, setCustomerToEdit] = useState<any>(null)
  const [customerToDelete, setCustomerToDelete] = useState<any>(null)
  const [customerToView, setCustomerToView] = useState<string | null>(null)

  const { customers, isLoading, error } = useCustomers()
  const queryClient = useQueryClient()
  const router = useRouter()

  // Get unique agents
  const uniqueAgents = Array.from(
    new Set(customers?.map((c: any) => c.staff).filter(Boolean))
  ).reduce((acc: any[], staff: any) => {
    if (!acc.find((s: any) => s.id === staff.id)) acc.push(staff)
    return acc
  }, [])

  const filteredCustomers = customers?.filter((customer: any) => {
    const matchesSearch = !searchTerm ||
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.staff?.name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesAgent = agentFilter === 'all' ||
      agentFilter === 'unassigned' && !customer.agent_id ||
      customer.agent_id === agentFilter

    return matchesSearch && matchesAgent
  }) || []

  const handleDelete = async (customer: any) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customer.id)

      if (error) throw error

      toast.success(`Customer "${customer.name}" deleted successfully`)

      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['active-customers'] })
      setCustomerToDelete(null)

    } catch (error: any) {
      console.error('Error deleting customer:', error)
      toast.error(`Failed to delete customer: ${error.message}`)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-terminal-dark px-2 py-4">
        <div className="flex items-center justify-between border-b border-terminal-border pb-4">
          <h1 className="text-2xl font-mono font-bold text-terminal-text tracking-wider">CUSTOMERS</h1>
        </div>
        <div className="text-center py-12 text-terminal-muted font-mono">Loading customers...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-terminal-dark px-2 py-4">
        <div className="flex items-center justify-between border-b border-terminal-border pb-4">
          <h1 className="text-2xl font-mono font-bold text-terminal-text tracking-wider">CUSTOMERS</h1>
        </div>
        <div className="text-center py-12 text-terminal-alert font-mono">
          Error loading customers: {(error as Error).message}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-terminal-dark px-2 py-4 space-y-4">
      {/* Terminal Header */}
      <div className="flex items-center justify-between border-b border-terminal-border pb-4">
        <div className="flex items-center gap-4">
          <Users className="h-8 w-8 text-terminal-accent" />
          <div>
            <h1 className="text-2xl font-mono font-bold text-terminal-text tracking-wider">
              CUSTOMERS TERMINAL
            </h1>
            <p className="text-terminal-muted font-mono text-sm">
              Manage customer directory and relationships
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-terminal-success text-terminal-dark font-mono">
            {customers?.length || 0} TOTAL
          </Badge>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-terminal-accent hover:bg-cyan-600 text-terminal-dark font-mono"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <Card className="bg-terminal-panel border-terminal-border">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-terminal-muted" />
              <Input
                placeholder="Search customers by name, email, city, country or agent..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-terminal-dark border-terminal-border text-terminal-text font-mono"
              />
            </div>
            <div>
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text font-mono">
                  <SelectValue placeholder="Filter by agent" />
                </SelectTrigger>
                <SelectContent className="bg-terminal-panel border-terminal-border">
                  <SelectItem value="all" className="font-mono text-terminal-text">All Agents</SelectItem>
                  <SelectItem value="unassigned" className="font-mono text-terminal-text">Unassigned</SelectItem>
                  {uniqueAgents.map((agent: any) => (
                    <SelectItem key={agent.id} value={agent.id} className="font-mono text-terminal-text">
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card className="bg-terminal-panel border-terminal-border">
        <CardHeader className="border-b border-terminal-border">
          <CardTitle className="flex items-center gap-2 font-mono text-sm text-terminal-text">
            <Users className="h-4 w-4 text-terminal-accent" />
            CUSTOMER DIRECTORY
            {filteredCustomers.length > 0 && (
              <Badge variant="secondary" className="bg-terminal-success/20 text-terminal-success border-terminal-success font-mono">
                {filteredCustomers.length} result{filteredCustomers.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-terminal-muted font-mono">
              {customers?.length === 0 ? 'No customers found. Add your first customer to get started.' : 'No customers match your search.'}
            </div>
          ) : (
            <div className="rounded-md border border-terminal-border">
              <Table>
                <TableHeader>
                  <TableRow className="border-terminal-border hover:bg-terminal-dark">
                    <TableHead className="font-mono text-terminal-muted">NAME</TableHead>
                    <TableHead className="font-mono text-terminal-muted">CONTACT</TableHead>
                    <TableHead className="font-mono text-terminal-muted">LOCATION</TableHead>
                    <TableHead className="font-mono text-terminal-muted">AGENT</TableHead>
                    <TableHead className="font-mono text-terminal-muted">DELIVERY</TableHead>
                    <TableHead className="font-mono text-terminal-muted">STATUS</TableHead>
                    <TableHead className="font-mono text-terminal-muted text-right">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer: any) => (
                    <TableRow
                      key={customer.id}
                      className="cursor-pointer hover:bg-terminal-dark/50 border-terminal-border"
                      onClick={() => router.push(`/customers/${customer.id}`)}
                    >
                      <TableCell className="font-mono text-terminal-text">
                        <div className="font-semibold">{customer.name}</div>
                        {customer.notes && (
                          <div className="text-xs text-terminal-muted mt-1">
                            {customer.notes}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {customer.email && (
                            <div className="flex items-center text-sm font-mono text-terminal-text">
                              <Mail className="mr-2 h-3 w-3 text-terminal-muted" />
                              {customer.email}
                            </div>
                          )}
                          {customer.phone_number && (
                            <div className="flex items-center text-sm font-mono text-terminal-text">
                              <Phone className="mr-2 h-3 w-3 text-terminal-muted" />
                              {customer.phone_number}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {(customer.city || customer.country) && (
                            <div className="flex items-center text-sm font-mono text-terminal-text">
                              <MapPin className="mr-2 h-3 w-3 text-terminal-muted" />
                              {[customer.city, customer.country].filter(Boolean).join(', ')}
                            </div>
                          )}
                          {customer.address && (
                            <div className="text-xs text-terminal-muted font-mono">
                              {customer.address}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.staff ? (
                          <div className="flex items-center text-sm font-mono text-terminal-text">
                            <User className="mr-2 h-3 w-3 text-terminal-muted" />
                            <div>
                              <div className="font-semibold">{customer.staff.name}</div>
                              {customer.staff.role && (
                                <div className="text-xs text-terminal-muted">{customer.staff.role}</div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-terminal-muted font-mono">No agent assigned</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {customer.delivery_modes?.map((mode: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs font-mono border-terminal-border text-terminal-text">
                              {mode}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`font-mono text-xs ${
                            customer.is_active
                              ? 'border-terminal-success text-terminal-success'
                              : 'border-terminal-muted text-terminal-muted'
                          }`}
                        >
                          {customer.is_active ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setCustomerToView(customer.id)
                            }}
                            className="bg-terminal-accent hover:bg-cyan-600 text-terminal-dark font-mono"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setCustomerToEdit(customer)
                              setIsEditDialogOpen(true)
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-mono"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setCustomerToDelete(customer)
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white font-mono"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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

      <CustomerDetailsDialog
        customerId={customerToView}
        open={!!customerToView}
        onOpenChange={(open) => {
          if (!open) setCustomerToView(null)
        }}
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