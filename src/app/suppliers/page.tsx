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
      <div className="min-h-screen bg-terminal-dark p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-terminal-border pb-4">
          <h1 className="text-2xl font-mono font-bold text-terminal-text tracking-wider">SUPPLIERS</h1>
        </div>
        <div className="text-center py-12 font-mono text-terminal-muted">Loading suppliers...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-terminal-dark p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-terminal-border pb-4">
          <h1 className="text-2xl font-mono font-bold text-terminal-text tracking-wider">SUPPLIERS</h1>
        </div>
        <div className="text-center py-12 text-terminal-alert font-mono">
          Error loading suppliers: {(error as Error).message}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-terminal-dark p-4 space-y-4">
      {/* Terminal Header */}
      <div className="flex items-center justify-between border-b border-terminal-border pb-4">
        <div className="flex items-center gap-4">
          <Truck className="h-8 w-8 text-terminal-accent" />
          <h1 className="text-2xl font-mono font-bold text-terminal-text tracking-wider">
            SUPPLIERS
          </h1>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono">
          <Plus className="mr-2 h-4 w-4" />
          Add Supplier
        </Button>
      </div>

      <Card className="bg-terminal-panel border-terminal-border">
        <CardHeader className="border-b border-terminal-border">
          <div className="flex items-center justify-between">
            <CardTitle className="font-mono text-sm text-terminal-text">SUPPLIER DIRECTORY</CardTitle>
            <div className="relative flex items-center space-x-2">
              <Search className="absolute left-3 h-4 w-4 text-terminal-muted" />
              <Input
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-80 pl-10 bg-terminal-dark border-terminal-border text-terminal-text font-mono"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {filteredSuppliers.length === 0 ? (
            <div className="text-center py-12 text-terminal-muted font-mono">
              {suppliers?.length === 0 ? 'No suppliers found. Add your first supplier to get started.' : 'No suppliers match your search.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-terminal-border hover:bg-terminal-dark">
                  <TableHead className="font-mono text-terminal-muted">Name</TableHead>
                  <TableHead className="font-mono text-terminal-muted">Contact</TableHead>
                  <TableHead className="font-mono text-terminal-muted">Location</TableHead>
                  <TableHead className="font-mono text-terminal-muted">Delivery Modes</TableHead>
                  <TableHead className="font-mono text-terminal-muted">Status</TableHead>
                  <TableHead className="text-right font-mono text-terminal-muted">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier: any) => (
                  <TableRow
                    key={supplier.id}
                    className="cursor-pointer hover:bg-terminal-dark border-terminal-border"
                    onClick={() => router.push(`/suppliers/${supplier.id}`)}
                  >
                    <TableCell>
                      <div className="font-medium font-mono text-terminal-text">{supplier.name}</div>
                      {supplier.staff && (
                        <div className="text-sm text-blue-400 font-medium font-mono mt-1">
                          Agent: {supplier.staff.name} {supplier.staff.role && `(${supplier.staff.role})`}
                        </div>
                      )}
                      {supplier.notes && (
                        <div className="text-sm text-terminal-muted font-mono mt-1">
                          {supplier.notes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {supplier.email && (
                          <div className="flex items-center text-sm font-mono text-terminal-text">
                            <Mail className="mr-2 h-3 w-3 text-terminal-accent" />
                            {supplier.email}
                          </div>
                        )}
                        {supplier.phone_number && (
                          <div className="flex items-center text-sm font-mono text-terminal-text">
                            <Phone className="mr-2 h-3 w-3 text-terminal-accent" />
                            {supplier.phone_number}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {(supplier.city || supplier.country) && (
                          <div className="flex items-center text-sm font-mono text-terminal-text">
                            <MapPin className="mr-2 h-3 w-3 text-terminal-accent" />
                            {[supplier.city, supplier.country].filter(Boolean).join(', ')}
                          </div>
                        )}
                        {supplier.address && (
                          <div className="text-sm text-terminal-muted font-mono">
                            {supplier.address}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {supplier.delivery_modes?.map((mode: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs bg-terminal-dark text-terminal-text border-terminal-border font-mono">
                            {mode}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={supplier.is_active ? "bg-terminal-success/20 text-terminal-success border-terminal-success font-mono" : "bg-gray-600/20 text-gray-400 border-gray-600 font-mono"}>
                        {supplier.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSupplierToEdit(supplier)
                            setIsEditDialogOpen(true)
                          }}
                          className="text-terminal-text hover:bg-terminal-dark hover:text-terminal-accent"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSupplierToDelete(supplier)
                          }}
                          className="text-terminal-alert hover:bg-terminal-dark hover:text-terminal-alert"
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
        <AlertDialogContent className="bg-terminal-panel border-terminal-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-terminal-text">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-terminal-muted">
              This will permanently delete the supplier "{supplierToDelete?.name}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => supplierToDelete && handleDelete(supplierToDelete)}
              className="bg-terminal-alert hover:bg-terminal-alert/90 text-white font-mono"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}