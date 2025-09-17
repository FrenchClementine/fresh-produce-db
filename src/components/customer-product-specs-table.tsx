'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, Calendar, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import { AddCustomerProductSpecForm } from '@/components/forms/add-customer-product-spec-form'
import { EditCustomerProductSpecForm } from '@/components/forms/edit-customer-product-spec-form'

interface CustomerProductSpecsTableProps {
  customerProductSpecs: any[]
  isLoading: boolean
  customerId: string
}

export function CustomerProductSpecsTable({
  customerProductSpecs,
  isLoading,
  customerId,
}: CustomerProductSpecsTableProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [specToEdit, setSpecToEdit] = useState<any>(null)
  const [specToDelete, setSpecToDelete] = useState<any>(null)

  const { toast } = useToast()
  const queryClient = useQueryClient()

  const handleDelete = async (spec: any) => {
    try {
      const { error } = await supabase
        .from('customer_product_packaging_spec')
        .delete()
        .eq('id', spec.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Product requirement deleted successfully',
      })

      queryClient.invalidateQueries({ queryKey: ['customer-product-specs', customerId] })
      setSpecToDelete(null)

    } catch (error: any) {
      console.error('Error deleting product spec:', error)
      toast({
        title: 'Error',
        description: `Failed to delete product requirement: ${error.message}`,
        variant: 'destructive',
      })
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString()
  }

  const getProductionModeStatus = (spec: any) => {
    const today = new Date().toISOString().split('T')[0]

    if (spec.local_production_from_date && spec.local_production_till_date) {
      if (today >= spec.local_production_from_date && today <= spec.local_production_till_date) {
        return { mode: 'LOCAL', variant: 'default' as const }
      }
    }

    if (spec.import_period_from_date && spec.import_period_till_date) {
      if (today >= spec.import_period_from_date && today <= spec.import_period_till_date) {
        return { mode: 'IMPORT', variant: 'secondary' as const }
      }
    }

    return { mode: 'UNAVAILABLE', variant: 'outline' as const }
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading product requirements...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Product Requirements</h3>
          <p className="text-sm text-muted-foreground">
            Manage seasonal product requirements for this customer
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product Requirement
        </Button>
      </div>

      {customerProductSpecs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No product requirements</h3>
          <p className="text-sm">Add product requirements to get started.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Packaging</TableHead>
              <TableHead>Season</TableHead>
              <TableHead>Current Mode</TableHead>
              <TableHead>Local Period</TableHead>
              <TableHead>Import Period</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customerProductSpecs.map((spec) => {
              const productionStatus = getProductionModeStatus(spec)
              return (
                <TableRow key={spec.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {spec.product_packaging_specs?.products?.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {spec.product_packaging_specs?.products?.category}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm">
                        {spec.product_packaging_specs?.packaging_options?.label} -
                        {spec.product_packaging_specs?.size_options?.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {spec.product_packaging_specs?.pallets?.label}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {spec.season && (
                      <Badge variant="outline" className="capitalize">
                        {spec.season}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={productionStatus.variant}>
                      {productionStatus.mode}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{formatDate(spec.local_production_from_date)}</div>
                      <div className="text-xs text-muted-foreground">
                        to {formatDate(spec.local_production_till_date)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{formatDate(spec.import_period_from_date)}</div>
                      <div className="text-xs text-muted-foreground">
                        to {formatDate(spec.import_period_till_date)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSpecToEdit(spec)
                          setIsEditDialogOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSpecToDelete(spec)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <AddCustomerProductSpecForm
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        customerId={customerId}
      />

      <EditCustomerProductSpecForm
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) setSpecToEdit(null)
        }}
        customerProductSpec={specToEdit}
      />

      <AlertDialog open={!!specToDelete} onOpenChange={() => setSpecToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this product requirement.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => specToDelete && handleDelete(specToDelete)}
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