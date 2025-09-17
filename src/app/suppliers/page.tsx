'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Truck, Plus, Search, Edit, Trash2, Eye, MapPin, Phone, Mail } from 'lucide-react'
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
import { useSuppliers } from '@/hooks/use-products'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import { AddSupplierForm } from '@/components/forms/add-supplier-form'
import { EditSupplierForm } from '@/components/forms/edit-supplier-form'

export default function SuppliersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [supplierToEdit, setSupplierToEdit] = useState<any>(null)
  const [supplierToDelete, setSupplierToDelete] = useState<any>(null)
  
  const { suppliers, isLoading, error } = useSuppliers()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const router = useRouter()

  const filteredSuppliers = suppliers?.filter((supplier: any) =>
    supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.country?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const handleDelete = async (supplier: any) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplier.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: `Supplier "${supplier.name}" deleted successfully`,
      })

      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      setSupplierToDelete(null)
      
    } catch (error: any) {
      console.error('Error deleting supplier:', error)
      toast({
        title: 'Error',
        description: `Failed to delete supplier: ${error.message}`,
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
        </div>
        <div className="text-center py-12">Loading suppliers...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
        </div>
        <div className="text-center py-12 text-red-500">
          Error loading suppliers: {(error as Error).message}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Truck className="h-8 w-8" />
          Suppliers
        </h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Supplier
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Supplier Directory</CardTitle>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-80"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSuppliers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {suppliers?.length === 0 ? 'No suppliers found. Add your first supplier to get started.' : 'No suppliers match your search.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Delivery Modes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier: any) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <div className="font-medium">{supplier.name}</div>
                      {supplier.staff && (
                        <div className="text-sm text-blue-600 font-medium mt-1">
                          Agent: {supplier.staff.name} {supplier.staff.role && `(${supplier.staff.role})`}
                        </div>
                      )}
                      {supplier.notes && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {supplier.notes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {supplier.email && (
                          <div className="flex items-center text-sm">
                            <Mail className="mr-2 h-3 w-3" />
                            {supplier.email}
                          </div>
                        )}
                        {supplier.phone_number && (
                          <div className="flex items-center text-sm">
                            <Phone className="mr-2 h-3 w-3" />
                            {supplier.phone_number}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {(supplier.city || supplier.country) && (
                          <div className="flex items-center text-sm">
                            <MapPin className="mr-2 h-3 w-3" />
                            {[supplier.city, supplier.country].filter(Boolean).join(', ')}
                          </div>
                        )}
                        {supplier.address && (
                          <div className="text-sm text-muted-foreground">
                            {supplier.address}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {supplier.delivery_modes?.map((mode: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {mode}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={supplier.is_active ? "default" : "secondary"}>
                        {supplier.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => router.push(`/suppliers/${supplier.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSupplierToEdit(supplier)
                            setIsEditDialogOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSupplierToDelete(supplier)}
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

      <AddSupplierForm
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />

      <EditSupplierForm
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) setSupplierToEdit(null)
        }}
        supplier={supplierToEdit}
      />

      <AlertDialog open={!!supplierToDelete} onOpenChange={() => setSupplierToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the supplier "{supplierToDelete?.name}". 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => supplierToDelete && handleDelete(supplierToDelete)}
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