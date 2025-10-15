'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package, Plus, Edit, Trash2, ChevronDown, ChevronRight, Users, Upload } from 'lucide-react'
import { ProductPackagingSpecForm } from '@/components/forms/product-packaging-spec-form'
import { EditProductPackagingSpecForm } from '@/components/forms/edit-product-packaging-spec-form'
import { useProductSpecs, useProductSuppliers } from '@/hooks/use-products'
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
import Link from 'next/link'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Category emojis mapping
const categoryEmojis: Record<string, string> = {
  tomatoes: '🍅',
  lettuce: '🥬', 
  babyleaf: '🌿',
  citrus: '🍊',
  greenhouse_crop: '🏠',
  mushroom: '🍄',
  grapes: '🍇',
  carrots: '🥕',
  potatoes: '🥔',
  onions: '🧅',
  fruit: '🍎',
  vegetables: '🥒'
}

interface ProductSuppliersDialogProps {
  product: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ProductSuppliersDialog({ product, open, onOpenChange }: ProductSuppliersDialogProps) {
  const { productSuppliers, isLoading } = useProductSuppliers(product?.products?.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-terminal-panel border-terminal-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-terminal-text font-mono">
            <Users className="h-5 w-5" />
            Suppliers for {product?.products?.name}
          </DialogTitle>
          <DialogDescription className="text-terminal-muted font-mono">
            All suppliers offering this product
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-terminal-accent"></div>
            <span className="ml-2 text-terminal-text font-mono">Loading suppliers...</span>
          </div>
        ) : productSuppliers && productSuppliers.length > 0 ? (
          <div className="space-y-4">
            {productSuppliers.map((supplierProduct: any) => (
              <Card key={supplierProduct.id} className="bg-terminal-dark border-terminal-border hover:border-terminal-accent transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg text-terminal-text font-mono">{supplierProduct.suppliers?.name}</CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-1 text-terminal-muted font-mono">
                        {(supplierProduct.suppliers?.city || supplierProduct.suppliers?.country) && (
                          <span>
                            📍 {[supplierProduct.suppliers?.city, supplierProduct.suppliers?.country].filter(Boolean).join(', ')}
                          </span>
                        )}
                        {supplierProduct.suppliers?.phone_number && (
                          <span>📞 {supplierProduct.suppliers.phone_number}</span>
                        )}
                      </CardDescription>
                    </div>
                    <Link href={`/suppliers?supplier=${supplierProduct.suppliers?.id}`}>
                      <Button size="sm" className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono">
                        View Supplier
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                {supplierProduct.notes && (
                  <CardContent className="pt-0">
                    <p className="text-sm text-terminal-muted font-mono">{supplierProduct.notes}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-terminal-muted mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-terminal-text font-mono">No Suppliers Found</h3>
            <p className="text-terminal-muted font-mono">
              No suppliers are currently offering this product.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function ProductsPage() {
  const { productSpecs, isLoading } = useProductSpecs()
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingSpec, setEditingSpec] = useState<any>(null)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
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

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  // Group products by category
  const productsByCategory = productSpecs?.reduce((acc: Record<string, any[]>, spec: any) => {
    const category = spec.products?.category || 'uncategorized'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(spec)
    return acc
  }, {}) || {}

  if (showCreateForm) {
    return (
      <ProductPackagingSpecForm onCancel={() => setShowCreateForm(false)} />
    )
  }

  return (
    <div className="min-h-screen bg-terminal-dark px-2 py-4 space-y-6">
      <div className="flex items-center justify-between border-b border-terminal-border pb-4">
        <div>
          <h1 className="text-2xl font-mono font-bold text-terminal-text tracking-wider">PRODUCTS</h1>
          <p className="text-terminal-muted font-mono text-sm">
            Manage your product packaging specifications
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/products/bulk-import">
            <Button
              variant="outline"
              className="bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono"
            >
              <Upload className="mr-2 h-4 w-4" />
              Bulk Import
            </Button>
          </Link>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Specification
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-terminal-accent"></div>
          <span className="ml-2 text-terminal-text font-mono">Loading products...</span>
        </div>
      ) : productSpecs && productSpecs.length === 0 ? (
        <Card className="bg-terminal-panel border-terminal-border">
          <CardContent className="p-8">
            <div className="text-center">
              <Package className="mx-auto h-12 w-12 text-terminal-muted mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-terminal-text font-mono">No Products Found</h3>
              <p className="text-terminal-muted font-mono mb-4">
                No product packaging specifications have been created yet.
              </p>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Specification
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(productsByCategory).map(([category, specs]) => (
            <Card key={category} className="bg-terminal-panel border-terminal-border">
              <Collapsible
                open={expandedCategories.has(category)}
                onOpenChange={() => toggleCategory(category)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="hover:bg-terminal-dark/50 cursor-pointer transition-colors">
                    <CardTitle className="flex items-center justify-between text-terminal-text font-mono">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{categoryEmojis[category] || '📦'}</span>
                        <div>
                          <span className="capitalize">{category.replace('_', ' ')}</span>
                          <Badge variant="secondary" className="ml-2 bg-terminal-dark text-terminal-accent border-terminal-border font-mono">
                            {specs.length}
                          </Badge>
                        </div>
                      </div>
                      {expandedCategories.has(category) ? (
                        <ChevronDown className="h-5 w-5 text-terminal-accent" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-terminal-muted" />
                      )}
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="border border-terminal-border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b border-terminal-border hover:bg-terminal-dark/50">
                            <TableHead className="text-terminal-muted font-mono">Product</TableHead>
                            <TableHead className="text-terminal-muted font-mono">Packaging</TableHead>
                            <TableHead className="text-terminal-muted font-mono">Pallet</TableHead>
                            <TableHead className="text-terminal-muted font-mono">Size</TableHead>
                            <TableHead className="text-terminal-muted font-mono">Boxes/Pallet</TableHead>
                            <TableHead className="text-terminal-muted font-mono">Weight/Box</TableHead>
                            <TableHead className="text-terminal-muted font-mono">Suppliers</TableHead>
                            <TableHead className="text-terminal-muted font-mono">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {specs.map((spec: any, index: number) => (
                            <TableRow key={spec.id || index} className="border-b border-terminal-border hover:bg-terminal-dark/50">
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  className="h-auto p-0 font-medium text-left justify-start text-terminal-text hover:text-terminal-accent font-mono"
                                  onClick={() => setSelectedProduct(spec)}
                                >
                                  {spec.products?.name || 'Unknown Product'}
                                </Button>
                              </TableCell>
                              <TableCell>
                                {spec.packaging_options ? (
                                  <div className="space-y-1">
                                    <div className="font-medium text-sm text-terminal-text font-mono">{spec.packaging_options.label}</div>
                                    <Badge variant="outline" className="text-xs bg-terminal-dark text-terminal-muted border-terminal-border font-mono">
                                      {spec.packaging_options.unit_type}
                                    </Badge>
                                  </div>
                                ) : (
                                  <span className="text-terminal-muted font-mono">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {spec.pallets ? (
                                  <div className="space-y-1">
                                    <div className="font-medium text-sm text-terminal-text font-mono">{spec.pallets.label}</div>
                                    {spec.pallets.dimensions_cm && (
                                      <div className="text-xs text-terminal-muted font-mono">
                                        {spec.pallets.dimensions_cm}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-terminal-muted font-mono">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {spec.size_options ? (
                                  <Badge variant="outline" className="text-xs bg-terminal-dark text-terminal-text border-terminal-border font-mono">
                                    {spec.size_options.name}
                                  </Badge>
                                ) : (
                                  <span className="text-terminal-muted font-mono">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className="font-mono text-sm text-terminal-text">{spec.boxes_per_pallet}</span>
                              </TableCell>
                              <TableCell>
                                <span className="font-mono text-sm text-terminal-text">
                                  {spec.weight_per_box ? `${spec.weight_per_box} ${spec.weight_unit}` : '-'}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedProduct(spec)}
                                  className="flex items-center gap-1 bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono"
                                >
                                  <Users className="h-3 w-3" />
                                  View
                                </Button>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingSpec(spec)}
                                    title="Edit specification"
                                    className="hover:bg-terminal-dark text-terminal-text hover:text-terminal-accent"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDelete(spec.id)}
                                    disabled={isDeleting === spec.id}
                                    title="Delete specification"
                                    className="hover:bg-terminal-dark text-terminal-alert hover:text-red-400"
                                  >
                                    <Trash2 className={`h-4 w-4 ${isDeleting === spec.id ? 'animate-spin' : ''}`} />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}

      <EditProductPackagingSpecForm
        spec={editingSpec}
        open={!!editingSpec}
        onOpenChange={(open) => {
          if (!open) {
            setEditingSpec(null)
          }
        }}
      />

      <ProductSuppliersDialog
        product={selectedProduct}
        open={!!selectedProduct}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedProduct(null)
          }
        }}
      />
    </div>
  )
}
