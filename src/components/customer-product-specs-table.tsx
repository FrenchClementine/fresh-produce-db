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
import { toast } from 'sonner'
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

  const queryClient = useQueryClient()

  const handleDelete = async (spec: any) => {
    try {
      const { error } = await supabase
        .from('customer_product_packaging_spec')
        .delete()
        .eq('id', spec.id)

      if (error) throw error

      toast.success('Product requirement deleted successfully')

      queryClient.invalidateQueries({ queryKey: ['customer-product-specs', customerId] })
      setSpecToDelete(null)

    } catch (error: any) {
      console.error('Error deleting product spec:', error)
      toast.error(`Failed to delete product requirement: ${error.message}`)
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

  // Group specs by product name
  const groupedSpecs = customerProductSpecs.reduce((acc, spec) => {
    const productName = spec.product_packaging_specs?.products?.name || 'Unknown Product'
    if (!acc[productName]) {
      acc[productName] = []
    }
    acc[productName].push(spec)
    return acc
  }, {} as Record<string, any[]>)

  if (isLoading) {
    return <div className="text-center py-8">Loading product requirements...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-terminal-text font-mono">Product Requirements</h3>
          <p className="text-sm text-terminal-muted font-mono">
            Manage seasonal product requirements for this customer
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="bg-terminal-accent hover:bg-cyan-600 text-terminal-dark font-mono">
          <Plus className="mr-2 h-4 w-4" />
          Add Product Requirement
        </Button>
      </div>

      {customerProductSpecs.length === 0 ? (
        <div className="text-center py-12 text-terminal-muted font-mono">
          <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2 text-terminal-text">No product requirements</h3>
          <p className="text-sm">Add product requirements to get started.</p>
        </div>
      ) : (
        <div className="rounded-md border border-terminal-border">
          <Table>
            <TableHeader>
              <TableRow className="border-terminal-border hover:bg-terminal-dark">
                <TableHead className="font-mono text-terminal-muted">Product</TableHead>
                <TableHead className="font-mono text-terminal-muted">Packaging</TableHead>
                <TableHead className="font-mono text-terminal-muted">Season</TableHead>
                <TableHead className="font-mono text-terminal-muted">Current Mode</TableHead>
                <TableHead className="font-mono text-terminal-muted">Local Period</TableHead>
                <TableHead className="font-mono text-terminal-muted">Import Period</TableHead>
                <TableHead className="text-right font-mono text-terminal-muted">Actions</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {Object.entries(groupedSpecs).map(([productName, specs]) => {
              // Use the first spec for common product info
              const firstSpec = specs[0]
              const productionStatus = getProductionModeStatus(firstSpec)

              return (
                <TableRow key={productName} className="border-terminal-border hover:bg-terminal-dark/50">
                  <TableCell className="font-mono text-terminal-text">
                    <div>
                      <div className="font-medium">{productName}</div>
                      <div className="text-sm text-terminal-muted">
                        {firstSpec.product_packaging_specs?.products?.category}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-terminal-text">
                    <div className="space-y-2">
                      {specs.map((spec, index) => (
                        <div key={spec.id} className="space-y-1">
                          <div className="text-sm text-terminal-text">
                            {spec.product_packaging_specs?.packaging_options?.label} -
                            {spec.product_packaging_specs?.size_options?.name}
                          </div>
                          <div className="text-xs text-terminal-muted">
                            {spec.product_packaging_specs?.pallets?.label}
                          </div>
                          {index < specs.length - 1 && (
                            <div className="border-b border-terminal-border my-1"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">
                    {firstSpec.season && (
                      <Badge variant="outline" className="capitalize border-terminal-border text-terminal-text font-mono">
                        {firstSpec.season}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono">
                    <Badge
                      variant={productionStatus.variant}
                      className={productionStatus.mode === 'UNAVAILABLE' ? 'border-terminal-border text-terminal-muted' : ''}
                    >
                      {productionStatus.mode}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-terminal-text">
                    <div className="text-sm">
                      <div>{formatDate(firstSpec.local_production_from_date)}</div>
                      <div className="text-xs text-terminal-muted">
                        to {formatDate(firstSpec.local_production_till_date)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-terminal-text">
                    <div className="text-sm">
                      <div>{formatDate(firstSpec.import_period_from_date)}</div>
                      <div className="text-xs text-terminal-muted">
                        to {formatDate(firstSpec.import_period_till_date)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      {specs.map((spec) => (
                        <div key={spec.id} className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSpecToEdit(spec)
                              setIsEditDialogOpen(true)
                            }}
                            className="text-terminal-accent hover:text-terminal-accent hover:bg-terminal-dark"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSpecToDelete(spec)}
                            className="text-terminal-alert hover:text-terminal-alert hover:bg-terminal-dark"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
          </Table>
        </div>
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