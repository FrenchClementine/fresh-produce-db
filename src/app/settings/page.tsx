'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Package, Box, Layers, Ruler, Settings, Plus, Edit, Trash2, MapPin, Award, Tag, UserCheck, Loader2 } from 'lucide-react'
import { useProducts, usePackagingOptions, usePallets, useSizeOptions, useHubs, useCertifications, useProductCategories } from '@/hooks/use-products'
import { useStaffWithCustomerCount } from '@/hooks/use-staff'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { EditProductForm } from '@/components/forms/edit-product-form'
import { EditPackagingForm } from '@/components/forms/edit-packaging-form'
import { EditPalletForm } from '@/components/forms/edit-pallet-form'
import { EditSizeForm } from '@/components/forms/edit-size-form'
import { AddProductForm } from '@/components/forms/add-product-form'
import { AddPackagingForm } from '@/components/forms/add-packaging-form'
import { AddPalletForm } from '@/components/forms/add-pallet-form'
import { AddSizeForm } from '@/components/forms/add-size-form'
import { AddHubForm } from '@/components/forms/add-hub-form'
import { EditHubForm } from '@/components/forms/edit-hub-form'
import { AddCertificationForm } from '@/components/forms/add-certification-form'
import { AddStaffForm } from '@/components/forms/add-staff-form'
import { EditStaffForm } from '@/components/forms/edit-staff-form'
import { useCoordinateResolution } from '@/hooks/use-coordinate-resolution'

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

const getCategoryEmoji = (category: string) => {
  return categoryEmojis[category] || '📦'
}

const formatCategoryName = (category: string) => {
  return category.replace('_', ' ').split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}

export default function SettingsPage() {
  const { products, isLoading: productsLoading } = useProducts()
  const { packagingOptions, isLoading: packagingLoading } = usePackagingOptions()
  const { pallets, isLoading: palletsLoading } = usePallets()
  const { sizeOptions, isLoading: sizesLoading } = useSizeOptions()
  const { hubs, isLoading: hubsLoading } = useHubs()
  const { certifications, isLoading: certificationsLoading } = useCertifications()
  const { categories, isLoading: categoriesLoading } = useProductCategories()
  const { staffWithCount, isLoading: staffLoading } = useStaffWithCustomerCount()
  
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [editingPackaging, setEditingPackaging] = useState<any>(null)
  const [editingPallet, setEditingPallet] = useState<any>(null)
  const [editingSize, setEditingSize] = useState<any>(null)
  const [editingHub, setEditingHub] = useState<any>(null)
  const [editingStaff, setEditingStaff] = useState<any>(null)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showAddPackaging, setShowAddPackaging] = useState(false)
  const [showAddPallet, setShowAddPallet] = useState(false)
  const [showAddSize, setShowAddSize] = useState(false)
  const [showAddHub, setShowAddHub] = useState(false)
  const [showAddCertification, setShowAddCertification] = useState(false)
  const [showAddStaff, setShowAddStaff] = useState(false)
  const queryClient = useQueryClient()

  // Coordinate resolution hook
  const { resolveEntityCoordinates, isBatchProcessing } = useCoordinateResolution()

  const handleDelete = async (table: string, id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(id)
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)

      if (error) throw error

      await queryClient.invalidateQueries({ queryKey: [table.replace('_', '-')] })
      toast.success(`${name} deleted successfully`)
    } catch (error: any) {
      console.error(`Error deleting ${table}:`, error)
      toast.error(`Failed to delete ${name}: ${error.message}`)
    } finally {
      setIsDeleting(null)
    }
  }

  const handleFillMissingCoordinates = async () => {
    try {
      const stats = await resolveEntityCoordinates('hubs', 50);
      if (stats.processed > 0) {
        await queryClient.invalidateQueries({ queryKey: ['hubs'] });
        toast.success(`Geocoded ${stats.successful} hubs${stats.failed > 0 ? `, ${stats.failed} failed` : ''}`);
      } else {
        toast.info('All hubs already have coordinates');
      }
    } catch (error) {
      console.error('Error filling missing coordinates:', error);
      toast.error('Failed to fill missing coordinates');
    }
  }

  return (
    <div className="min-h-screen bg-terminal-dark p-4 space-y-8">
      <div className="flex items-center justify-between border-b border-terminal-border pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-terminal-text font-mono">SETTINGS</h1>
          <p className="text-terminal-muted font-mono">
            Manage your product catalog base data
          </p>
        </div>
      </div>

      <Tabs defaultValue="products" className="space-y-4">
        <TabsList className="grid w-full grid-cols-9 bg-terminal-panel border border-terminal-border">
          <TabsTrigger value="products" className="flex items-center gap-2 font-mono data-[state=active]:bg-terminal-accent data-[state=active]:text-terminal-dark text-terminal-text">
            <Package className="h-4 w-4" />
            Products
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2 font-mono data-[state=active]:bg-terminal-accent data-[state=active]:text-terminal-dark text-terminal-text">
            <Tag className="h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="packaging" className="flex items-center gap-2 font-mono data-[state=active]:bg-terminal-accent data-[state=active]:text-terminal-dark text-terminal-text">
            <Box className="h-4 w-4" />
            Packaging
          </TabsTrigger>
          <TabsTrigger value="pallets" className="flex items-center gap-2 font-mono data-[state=active]:bg-terminal-accent data-[state=active]:text-terminal-dark text-terminal-text">
            <Layers className="h-4 w-4" />
            Pallets
          </TabsTrigger>
          <TabsTrigger value="sizes" className="flex items-center gap-2 font-mono data-[state=active]:bg-terminal-accent data-[state=active]:text-terminal-dark text-terminal-text">
            <Ruler className="h-4 w-4" />
            Sizes
          </TabsTrigger>
          <TabsTrigger value="hubs" className="flex items-center gap-2 font-mono data-[state=active]:bg-terminal-accent data-[state=active]:text-terminal-dark text-terminal-text">
            <MapPin className="h-4 w-4" />
            Hubs
          </TabsTrigger>
          <TabsTrigger value="certifications" className="flex items-center gap-2 font-mono data-[state=active]:bg-terminal-accent data-[state=active]:text-terminal-dark text-terminal-text">
            <Award className="h-4 w-4" />
            Certifications
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-2 font-mono data-[state=active]:bg-terminal-accent data-[state=active]:text-terminal-dark text-terminal-text">
            <UserCheck className="h-4 w-4" />
            Staff
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products">
          <Card className="bg-terminal-panel border-terminal-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-terminal-text font-mono">
                    <Package className="h-5 w-5" />
                    Products
                  </CardTitle>
                  <CardDescription className="text-terminal-muted font-mono">
                    Manage your product catalog
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddProduct(true)} className="bg-terminal-accent hover:bg-cyan-600 text-terminal-dark font-mono">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {productsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-terminal-accent"></div>
                  <span className="ml-2 text-terminal-text font-mono">Loading products...</span>
                </div>
              ) : products && products.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="mx-auto h-12 w-12 text-terminal-muted mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-terminal-text font-mono">No Products Found</h3>
                  <p className="text-terminal-muted font-mono">
                    No products have been created yet.
                  </p>
                </div>
              ) : (
                <div className="border border-terminal-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-terminal-border hover:bg-terminal-dark/50">
                        <TableHead className="text-terminal-text font-mono">Name</TableHead>
                        <TableHead className="text-terminal-text font-mono">Category</TableHead>
                        <TableHead className="text-terminal-text font-mono">Intended Use</TableHead>
                        <TableHead className="text-terminal-text font-mono">Status</TableHead>
                        <TableHead className="text-terminal-text font-mono">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products?.map((product) => (
                        <TableRow key={product.id} className="border-terminal-border hover:bg-terminal-dark/50">
                          <TableCell className="font-medium text-terminal-text font-mono">{product.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize bg-terminal-dark border-terminal-border text-terminal-text font-mono">
                              {product.category.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize border-terminal-border text-terminal-text font-mono">
                              {product.intended_use}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={product.is_active ? "default" : "secondary"} className={product.is_active ? "bg-terminal-success text-terminal-dark font-mono" : "bg-terminal-dark border-terminal-border text-terminal-muted font-mono"}>
                              {product.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Edit product"
                                onClick={() => setEditingProduct(product)}
                                className="text-terminal-text hover:text-terminal-accent hover:bg-terminal-dark"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete('products', product.id, product.name)}
                                disabled={isDeleting === product.id}
                                title="Delete product"
                                className="text-terminal-alert hover:text-red-400 hover:bg-terminal-dark"
                              >
                                <Trash2 className={`h-4 w-4 ${isDeleting === product.id ? 'animate-spin' : ''}`} />
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
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <Card className="bg-terminal-panel border-terminal-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-terminal-text font-mono">
                    <Tag className="h-5 w-5" />
                    Product Categories
                  </CardTitle>
                  <CardDescription className="text-terminal-muted font-mono">
                    Manage product category classifications with emojis
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {categoriesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-terminal-accent"></div>
                  <span className="ml-2 text-terminal-text font-mono">Loading categories...</span>
                </div>
              ) : categories && categories.length === 0 ? (
                <div className="text-center py-8">
                  <Tag className="mx-auto h-12 w-12 text-terminal-muted mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-terminal-text font-mono">No Categories Found</h3>
                  <p className="text-terminal-muted font-mono">
                    No product categories are currently in use.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categories?.map((category) => (
                    <Card key={category} className="p-4 bg-terminal-dark border-terminal-border">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getCategoryEmoji(category)}</span>
                        <div>
                          <h3 className="font-semibold text-terminal-text font-mono">{formatCategoryName(category)}</h3>
                          <p className="text-sm text-terminal-muted font-mono">{category}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {!categoriesLoading && (
                <div className="mt-6 p-4 bg-terminal-dark/50 border border-terminal-border rounded-lg">
                  <h3 className="font-semibold mb-2 flex items-center gap-2 text-terminal-text font-mono">
                    <Settings className="h-4 w-4" />
                    Need to add a new category?
                  </h3>
                  <p className="text-sm text-terminal-muted mb-3 font-mono">
                    Product categories are defined at the database level. To add new categories, please contact your system administrator or add the category to the database enum.
                  </p>
                  <div className="text-xs text-terminal-muted bg-terminal-dark p-3 rounded border border-terminal-border font-mono">
                    ALTER TYPE "public"."product_category" ADD VALUE 'new_category';
                  </div>
                  <p className="text-xs text-terminal-muted mt-2 font-mono">
                    <strong>Note:</strong> Categories shown above are currently in use by existing products. New enum values will appear here once products use them.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Packaging Tab */}
        <TabsContent value="packaging">
          <Card className="bg-terminal-panel border-terminal-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-terminal-text font-mono">
                    <Box className="h-5 w-5" />
                    Packaging Options
                  </CardTitle>
                  <CardDescription className="text-terminal-muted font-mono">
                    Manage packaging types and configurations
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddPackaging(true)} className="bg-terminal-accent hover:bg-cyan-600 text-terminal-dark font-mono">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Packaging
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {packagingLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-terminal-accent"></div>
                  <span className="ml-2 text-terminal-text font-mono">Loading packaging options...</span>
                </div>
              ) : packagingOptions && packagingOptions.length === 0 ? (
                <div className="text-center py-8">
                  <Box className="mx-auto h-12 w-12 text-terminal-muted mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-terminal-text font-mono">No Packaging Options Found</h3>
                  <p className="text-terminal-muted font-mono">
                    No packaging options have been created yet.
                  </p>
                </div>
              ) : (
                <div className="border border-terminal-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-terminal-border hover:bg-terminal-dark/50">
                        <TableHead className="text-terminal-text font-mono">Label</TableHead>
                        <TableHead className="text-terminal-text font-mono">Unit Type</TableHead>
                        <TableHead className="text-terminal-text font-mono">Description</TableHead>
                        <TableHead className="text-terminal-text font-mono">Deposit Fee</TableHead>
                        <TableHead className="text-terminal-text font-mono">Rent Fee</TableHead>
                        <TableHead className="text-terminal-text font-mono">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {packagingOptions?.map((packaging) => (
                        <TableRow key={packaging.id}>
                          <TableCell className="font-medium text-terminal-text font-mono">{packaging.label}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {packaging.unit_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {packaging.description || <span className="text-terminal-muted font-mono">-</span>}
                          </TableCell>
                          <TableCell>
                            {packaging.deposit_fee ? `€${packaging.deposit_fee}` : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>
                            {packaging.rent_fee ? `€${packaging.rent_fee}` : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                title="Edit packaging"
                                onClick={() => setEditingPackaging(packaging)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete('packaging_options', packaging.id, packaging.label)}
                                disabled={isDeleting === packaging.id}
                                title="Delete packaging"
                              >
                                <Trash2 className={`h-4 w-4 text-red-500 ${isDeleting === packaging.id ? 'animate-spin' : ''}`} />
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
        </TabsContent>

        {/* Pallets Tab */}
        <TabsContent value="pallets">
          <Card className="bg-terminal-panel border-terminal-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-terminal-text font-mono">
                    <Layers className="h-5 w-5" />
                    Pallet Types
                  </CardTitle>
                  <CardDescription className="text-terminal-muted font-mono">
                    Manage pallet configurations and specifications
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddPallet(true)} className="bg-terminal-accent hover:bg-cyan-600 text-terminal-dark font-mono">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Pallet
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {palletsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-terminal-accent"></div>
                  <span className="ml-2 text-terminal-text font-mono">Loading pallets...</span>
                </div>
              ) : pallets && pallets.length === 0 ? (
                <div className="text-center py-8">
                  <Layers className="mx-auto h-12 w-12 text-terminal-muted mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-terminal-text font-mono">No Pallets Found</h3>
                  <p className="text-terminal-muted font-mono">
                    No pallet types have been created yet.
                  </p>
                </div>
              ) : (
                <div className="border border-terminal-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-terminal-border hover:bg-terminal-dark/50">
                        <TableHead className="text-terminal-text font-mono">Label</TableHead>
                        <TableHead className="text-terminal-text font-mono">Dimensions</TableHead>
                        <TableHead className="text-terminal-text font-mono">Brutto Weight</TableHead>
                        <TableHead className="text-terminal-text font-mono">Per Truck</TableHead>
                        <TableHead className="text-terminal-text font-mono">Deposit Fee</TableHead>
                        <TableHead className="text-terminal-text font-mono">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pallets?.map((pallet) => (
                        <TableRow key={pallet.id}>
                          <TableCell className="font-medium text-terminal-text font-mono">{pallet.label}</TableCell>
                          <TableCell>
                            {pallet.dimensions_cm || <span className="text-terminal-muted font-mono">-</span>}
                          </TableCell>
                          <TableCell>
                            {pallet.brutto_weight ? `${pallet.brutto_weight}kg` : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>
                            {pallet.pallets_per_truck || <span className="text-terminal-muted font-mono">-</span>}
                          </TableCell>
                          <TableCell>
                            {pallet.deposit_fee ? `€${pallet.deposit_fee}` : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                title="Edit pallet"
                                onClick={() => setEditingPallet(pallet)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete('pallets', pallet.id, pallet.label)}
                                disabled={isDeleting === pallet.id}
                                title="Delete pallet"
                              >
                                <Trash2 className={`h-4 w-4 text-red-500 ${isDeleting === pallet.id ? 'animate-spin' : ''}`} />
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
        </TabsContent>

        {/* Sizes Tab */}
        <TabsContent value="sizes">
          <Card className="bg-terminal-panel border-terminal-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-terminal-text font-mono">
                    <Ruler className="h-5 w-5" />
                    Size Options
                  </CardTitle>
                  <CardDescription className="text-terminal-muted font-mono">
                    Manage size classifications and options
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddSize(true)} className="bg-terminal-accent hover:bg-cyan-600 text-terminal-dark font-mono">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Size
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {sizesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-terminal-accent"></div>
                  <span className="ml-2 text-terminal-text font-mono">Loading sizes...</span>
                </div>
              ) : sizeOptions && sizeOptions.length === 0 ? (
                <div className="text-center py-8">
                  <Ruler className="mx-auto h-12 w-12 text-terminal-muted mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-terminal-text font-mono">No Size Options Found</h3>
                  <p className="text-terminal-muted font-mono">
                    No size options have been created yet.
                  </p>
                </div>
              ) : (
                <div className="border border-terminal-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-terminal-border hover:bg-terminal-dark/50">
                        <TableHead className="text-terminal-text font-mono">Name</TableHead>
                        <TableHead className="text-terminal-text font-mono">Created</TableHead>
                        <TableHead className="text-terminal-text font-mono">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sizeOptions?.map((size) => (
                        <TableRow key={size.id}>
                          <TableCell className="font-medium text-terminal-text font-mono">{size.name}</TableCell>
                          <TableCell>
                            {new Date(size.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                title="Edit size"
                                onClick={() => setEditingSize(size)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete('size_options', size.id, size.name)}
                                disabled={isDeleting === size.id}
                                title="Delete size"
                              >
                                <Trash2 className={`h-4 w-4 text-red-500 ${isDeleting === size.id ? 'animate-spin' : ''}`} />
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
        </TabsContent>

        {/* Hubs Tab */}
        <TabsContent value="hubs">
          <Card className="bg-terminal-panel border-terminal-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-terminal-text font-mono">
                    <MapPin className="h-5 w-5" />
                    Logistics Hubs
                  </CardTitle>
                  <CardDescription className="text-terminal-muted font-mono">
                    Manage distribution and logistics hubs
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleFillMissingCoordinates}
                    disabled={isBatchProcessing}
                  >
                    {isBatchProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Filling...
                      </>
                    ) : (
                      <>
                        <MapPin className="mr-2 h-4 w-4" />
                        Fill Missing Coordinates
                      </>
                    )}
                  </Button>
                  <Button onClick={() => setShowAddHub(true)} className="bg-terminal-accent hover:bg-cyan-600 text-terminal-dark font-mono">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Hub
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {hubsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-terminal-accent"></div>
                  <span className="ml-2 text-terminal-text font-mono">Loading hubs...</span>
                </div>
              ) : hubs && hubs.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="mx-auto h-12 w-12 text-terminal-muted mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-terminal-text font-mono">No Hubs Found</h3>
                  <p className="text-muted-foreground mb-4">
                    No logistics hubs have been created yet.
                  </p>
                  <Button onClick={() => setShowAddHub(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Hub
                  </Button>
                </div>
              ) : (
                <div className="border border-terminal-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-terminal-border hover:bg-terminal-dark/50">
                        <TableHead className="text-terminal-text font-mono">Name</TableHead>
                        <TableHead className="text-terminal-text font-mono">Hub Code</TableHead>
                        <TableHead className="text-terminal-text font-mono">City</TableHead>
                        <TableHead className="text-terminal-text font-mono">Country</TableHead>
                        <TableHead className="text-terminal-text font-mono">Region</TableHead>
                        <TableHead className="text-terminal-text font-mono">Status</TableHead>
                        <TableHead className="text-terminal-text font-mono">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hubs?.map((hub) => (
                        <TableRow key={hub.id}>
                          <TableCell className="font-medium text-terminal-text font-mono">{hub.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {hub.hub_code}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {hub.city_name || <span className="text-terminal-muted font-mono">-</span>}
                          </TableCell>
                          <TableCell>
                            {hub.country_code || <span className="text-terminal-muted font-mono">-</span>}
                          </TableCell>
                          <TableCell>
                            {hub.region || <span className="text-terminal-muted font-mono">-</span>}
                          </TableCell>
                          <TableCell>
                            <Badge variant={hub.is_active ? "default" : "secondary"}>
                              {hub.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                title="Edit hub"
                                onClick={() => setEditingHub(hub)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete('hubs', hub.id, hub.name)}
                                disabled={isDeleting === hub.id}
                                title="Delete hub"
                              >
                                <Trash2 className={`h-4 w-4 text-red-500 ${isDeleting === hub.id ? 'animate-spin' : ''}`} />
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
        </TabsContent>

        {/* Certifications Tab */}
        <TabsContent value="certifications">
          <Card className="bg-terminal-panel border-terminal-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-terminal-text font-mono">
                    <Award className="h-5 w-5" />
                    Certifications
                  </CardTitle>
                  <CardDescription className="text-terminal-muted font-mono">
                    Manage certification standards and requirements
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddCertification(true)} className="bg-terminal-accent hover:bg-cyan-600 text-terminal-dark font-mono">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Certification
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {certificationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-terminal-accent"></div>
                  <span className="ml-2 text-terminal-text font-mono">Loading certifications...</span>
                </div>
              ) : certifications && certifications.length === 0 ? (
                <div className="text-center py-8">
                  <Award className="mx-auto h-12 w-12 text-terminal-muted mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-terminal-text font-mono">No Certifications Found</h3>
                  <p className="text-muted-foreground mb-4">
                    No certification standards have been created yet.
                  </p>
                  <Button onClick={() => setShowAddCertification(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Certification
                  </Button>
                </div>
              ) : (
                <div className="border border-terminal-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-terminal-border hover:bg-terminal-dark/50">
                        <TableHead className="text-terminal-text font-mono">Name</TableHead>
                        <TableHead className="text-terminal-text font-mono">Description</TableHead>
                        <TableHead className="text-terminal-text font-mono">Created</TableHead>
                        <TableHead className="text-terminal-text font-mono">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {certifications?.map((certification) => (
                        <TableRow key={certification.id}>
                          <TableCell className="font-medium text-terminal-text font-mono">{certification.name}</TableCell>
                          <TableCell>
                            {certification.description ? (
                              <div className="max-w-md truncate" title={certification.description}>
                                {certification.description}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(certification.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="ghost" title="Edit certification">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete('certifications', certification.id, certification.name)}
                                disabled={isDeleting === certification.id}
                                title="Delete certification"
                              >
                                <Trash2 className={`h-4 w-4 text-red-500 ${isDeleting === certification.id ? 'animate-spin' : ''}`} />
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
        </TabsContent>

        {/* Staff Tab */}
        <TabsContent value="staff">
          <Card className="bg-terminal-panel border-terminal-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-terminal-text font-mono">
                    <UserCheck className="h-5 w-5" />
                    Staff Management
                  </CardTitle>
                  <CardDescription className="text-terminal-muted font-mono">
                    Manage internal staff members and customer relationship assignments
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddStaff(true)} className="bg-terminal-accent hover:bg-cyan-600 text-terminal-dark font-mono">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Staff Member
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {staffLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-terminal-accent"></div>
                  <span className="ml-2 text-terminal-text font-mono">Loading staff...</span>
                </div>
              ) : staffWithCount && staffWithCount.length === 0 ? (
                <div className="text-center py-8">
                  <UserCheck className="mx-auto h-12 w-12 text-terminal-muted mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-terminal-text font-mono">No Staff Members Found</h3>
                  <p className="text-muted-foreground mb-4">
                    No staff members have been created yet.
                  </p>
                  <Button onClick={() => setShowAddStaff(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Staff Member
                  </Button>
                </div>
              ) : (
                <div className="border border-terminal-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-terminal-border hover:bg-terminal-dark/50">
                        <TableHead className="text-terminal-text font-mono">Name</TableHead>
                        <TableHead className="text-terminal-text font-mono">Email</TableHead>
                        <TableHead className="text-terminal-text font-mono">Role</TableHead>
                        <TableHead className="text-terminal-text font-mono">Department</TableHead>
                        <TableHead className="text-terminal-text font-mono">Customers</TableHead>
                        <TableHead className="text-terminal-text font-mono">Status</TableHead>
                        <TableHead className="text-terminal-text font-mono">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffWithCount?.map((staff) => (
                        <TableRow key={staff.id}>
                          <TableCell className="font-medium text-terminal-text font-mono">{staff.name}</TableCell>
                          <TableCell>
                            {staff.email || <span className="text-terminal-muted font-mono">-</span>}
                          </TableCell>
                          <TableCell>
                            {staff.role && (
                              <Badge variant="outline">{staff.role}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {staff.department && (
                              <Badge variant="secondary">{staff.department}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <span className="font-medium">{staff.customer_count || 0}</span>
                              <span className="text-xs text-muted-foreground ml-1">customers</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={staff.is_active ? "default" : "secondary"}>
                              {staff.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Edit staff member"
                                onClick={() => setEditingStaff(staff)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete('staff', staff.id, staff.name)}
                                disabled={isDeleting === staff.id || staff.customer_count > 0}
                                title={staff.customer_count > 0 ? 'Cannot delete staff with assigned customers' : 'Delete staff member'}
                              >
                                <Trash2 className={`h-4 w-4 text-red-500 ${isDeleting === staff.id ? 'animate-spin' : ''}`} />
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
        </TabsContent>
      </Tabs>

      <EditProductForm
        product={editingProduct}
        open={!!editingProduct}
        onOpenChange={(open) => {
          if (!open) {
            setEditingProduct(null)
          }
        }}
      />

      <EditPackagingForm
        packaging={editingPackaging}
        open={!!editingPackaging}
        onOpenChange={(open) => {
          if (!open) {
            setEditingPackaging(null)
          }
        }}
      />

      <EditPalletForm
        pallet={editingPallet}
        open={!!editingPallet}
        onOpenChange={(open) => {
          if (!open) {
            setEditingPallet(null)
          }
        }}
      />

      <EditSizeForm
        size={editingSize}
        open={!!editingSize}
        onOpenChange={(open) => {
          if (!open) {
            setEditingSize(null)
          }
        }}
      />

      <AddProductForm
        open={showAddProduct}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddProduct(false)
          }
        }}
      />

      <AddPackagingForm
        open={showAddPackaging}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddPackaging(false)
          }
        }}
      />

      <AddPalletForm
        open={showAddPallet}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddPallet(false)
          }
        }}
      />

      <AddSizeForm
        open={showAddSize}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddSize(false)
          }
        }}
      />

      <AddHubForm
        open={showAddHub}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddHub(false)
          }
        }}
      />

      <AddCertificationForm
        open={showAddCertification}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddCertification(false)
          }
        }}
      />

      <EditHubForm
        hub={editingHub}
        open={!!editingHub}
        onOpenChange={(open) => {
          if (!open) {
            setEditingHub(null)
          }
        }}
      />

      <AddStaffForm
        open={showAddStaff}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddStaff(false)
          }
        }}
      />

      <EditStaffForm
        staff={editingStaff}
        open={!!editingStaff}
        onOpenChange={(open) => {
          if (!open) {
            setEditingStaff(null)
          }
        }}
      />
    </div>
  )
}