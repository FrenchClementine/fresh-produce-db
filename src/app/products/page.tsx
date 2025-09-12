'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package, Plus, Edit, Trash2 } from 'lucide-react'
import { ProductPackagingSpecForm } from '@/components/forms/product-packaging-spec-form'
import { EditProductPackagingSpecForm } from '@/components/forms/edit-product-packaging-spec-form'
import { useProductSpecs } from '@/hooks/use-products'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export default function ProductsPage() {
  const { productSpecs, isLoading } = useProductSpecs()
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingSpec, setEditingSpec] = useState<any>(null)
  const queryClient = useQueryClient()

  const handleDelete = async (specId: string) => {
    if (!confirm('Are you sure you want to delete this packaging specification?')) {
      return
    }

    setIsDeleting(specId)
    try {
      const { error } = await supabase
        .from('product_packaging_specs')
        .delete()
        .eq('id', specId)

      if (error) throw error

      await queryClient.invalidateQueries({ queryKey: ['product-specs'] })
      toast.success('Packaging specification deleted successfully')
    } catch (error) {
      console.error('Error deleting spec:', error)
      toast.error('Failed to delete packaging specification')
    } finally {
      setIsDeleting(null)
    }
  }

  if (showCreateForm) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Products</h1>
            <p className="text-muted-foreground">
              Create a new product packaging specification
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowCreateForm(false)}
          >
            Back to List
          </Button>
        </div>

        <div className="flex justify-center">
          <ProductPackagingSpecForm />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your product packaging specifications
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Specification
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Packaging Specifications
          </CardTitle>
          <CardDescription>
            All configured product specifications with packaging, pallet, and size details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading specifications...</span>
            </div>
          ) : productSpecs && productSpecs.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Specifications Found</h3>
              <p className="text-muted-foreground mb-4">
                No product packaging specifications have been created yet.
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Specification
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Packaging</TableHead>
                    <TableHead>Pallet</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Boxes/Pallet</TableHead>
                    <TableHead>Weight/Box</TableHead>
                    <TableHead>Pieces/Box</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productSpecs?.map((spec, index) => (
                    <TableRow key={spec.id || index}>
                      <TableCell>
                        {spec.products ? (
                          <div className="font-medium">{spec.products.name}</div>
                        ) : (
                          <span className="text-muted-foreground">Unknown Product</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {spec.products?.category ? (
                          <Badge variant="secondary" className="text-xs capitalize">
                            {spec.products.category.replace('_', ' ')}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {spec.packaging_options ? (
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{spec.packaging_options.label}</div>
                            <Badge variant="outline" className="text-xs">
                              {spec.packaging_options.unit_type}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {spec.pallets ? (
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{spec.pallets.label}</div>
                            {spec.pallets.dimensions_cm && (
                              <div className="text-xs text-muted-foreground">
                                {spec.pallets.dimensions_cm}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {spec.size_options ? (
                          <Badge variant="outline" className="text-xs">
                            {spec.size_options.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{spec.boxes_per_pallet}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {spec.weight_per_box ? `${spec.weight_per_box} ${spec.weight_unit}` : '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{spec.pieces_per_box || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingSpec(spec)}
                            title="Edit specification"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(spec.id)}
                            disabled={isDeleting === spec.id}
                            title="Delete specification"
                          >
                            <Trash2 className={`h-4 w-4 text-red-500 ${isDeleting === spec.id ? 'animate-spin' : ''}`} />
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

      <EditProductPackagingSpecForm
        spec={editingSpec}
        open={!!editingSpec}
        onOpenChange={(open) => {
          if (!open) {
            setEditingSpec(null)
          }
        }}
      />
    </div>
  )
}