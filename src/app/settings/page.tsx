'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Package, Box, Layers, Ruler, Settings, Plus, Edit, Trash2, MapPin, Award } from 'lucide-react'
import { useProducts, usePackagingOptions, usePallets, useSizeOptions, useHubs, useCertifications } from '@/hooks/use-products'
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
import { AddCertificationForm } from '@/components/forms/add-certification-form'

export default function SettingsPage() {
  const { products, isLoading: productsLoading } = useProducts()
  const { packagingOptions, isLoading: packagingLoading } = usePackagingOptions()
  const { pallets, isLoading: palletsLoading } = usePallets()
  const { sizeOptions, isLoading: sizesLoading } = useSizeOptions()
  const { hubs, isLoading: hubsLoading } = useHubs()
  const { certifications, isLoading: certificationsLoading } = useCertifications()
  
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [editingPackaging, setEditingPackaging] = useState<any>(null)
  const [editingPallet, setEditingPallet] = useState<any>(null)
  const [editingSize, setEditingSize] = useState<any>(null)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showAddPackaging, setShowAddPackaging] = useState(false)
  const [showAddPallet, setShowAddPallet] = useState(false)
  const [showAddSize, setShowAddSize] = useState(false)
  const [showAddHub, setShowAddHub] = useState(false)
  const [showAddCertification, setShowAddCertification] = useState(false)
  const queryClient = useQueryClient()

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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your product catalog base data
          </p>
        </div>
      </div>

      <Tabs defaultValue="products" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Products
          </TabsTrigger>
          <TabsTrigger value="packaging" className="flex items-center gap-2">
            <Box className="h-4 w-4" />
            Packaging
          </TabsTrigger>
          <TabsTrigger value="pallets" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Pallets
          </TabsTrigger>
          <TabsTrigger value="sizes" className="flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            Sizes
          </TabsTrigger>
          <TabsTrigger value="hubs" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Hubs
          </TabsTrigger>
          <TabsTrigger value="certifications" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Certifications
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Products
                  </CardTitle>
                  <CardDescription>
                    Manage your product catalog
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddProduct(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {productsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Loading products...</span>
                </div>
              ) : products && products.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Products Found</h3>
                  <p className="text-muted-foreground">
                    No products have been created yet.
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Intended Use</TableHead>
                        <TableHead>Sold By</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products?.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {product.category.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {product.intended_use}
                            </Badge>
                          </TableCell>
                          <TableCell>{product.sold_by}</TableCell>
                          <TableCell>
                            <Badge variant={product.is_active ? "default" : "secondary"}>
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
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete('products', product.id, product.name)}
                                disabled={isDeleting === product.id}
                                title="Delete product"
                              >
                                <Trash2 className={`h-4 w-4 text-red-500 ${isDeleting === product.id ? 'animate-spin' : ''}`} />
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

        {/* Packaging Tab */}
        <TabsContent value="packaging">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Box className="h-5 w-5" />
                    Packaging Options
                  </CardTitle>
                  <CardDescription>
                    Manage packaging types and configurations
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddPackaging(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Packaging
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {packagingLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Loading packaging options...</span>
                </div>
              ) : packagingOptions && packagingOptions.length === 0 ? (
                <div className="text-center py-8">
                  <Box className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Packaging Options Found</h3>
                  <p className="text-muted-foreground">
                    No packaging options have been created yet.
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Label</TableHead>
                        <TableHead>Unit Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Deposit Fee</TableHead>
                        <TableHead>Rent Fee</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {packagingOptions?.map((packaging) => (
                        <TableRow key={packaging.id}>
                          <TableCell className="font-medium">{packaging.label}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {packaging.unit_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {packaging.description || <span className="text-muted-foreground">-</span>}
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
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    Pallet Types
                  </CardTitle>
                  <CardDescription>
                    Manage pallet configurations and specifications
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddPallet(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Pallet
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {palletsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Loading pallets...</span>
                </div>
              ) : pallets && pallets.length === 0 ? (
                <div className="text-center py-8">
                  <Layers className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Pallets Found</h3>
                  <p className="text-muted-foreground">
                    No pallet types have been created yet.
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Label</TableHead>
                        <TableHead>Dimensions</TableHead>
                        <TableHead>Brutto Weight</TableHead>
                        <TableHead>Per Truck</TableHead>
                        <TableHead>Deposit Fee</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pallets?.map((pallet) => (
                        <TableRow key={pallet.id}>
                          <TableCell className="font-medium">{pallet.label}</TableCell>
                          <TableCell>
                            {pallet.dimensions_cm || <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>
                            {pallet.brutto_weight ? `${pallet.brutto_weight}kg` : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>
                            {pallet.pallets_per_truck || <span className="text-muted-foreground">-</span>}
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
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Ruler className="h-5 w-5" />
                    Size Options
                  </CardTitle>
                  <CardDescription>
                    Manage size classifications and options
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddSize(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Size
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {sizesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Loading sizes...</span>
                </div>
              ) : sizeOptions && sizeOptions.length === 0 ? (
                <div className="text-center py-8">
                  <Ruler className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Size Options Found</h3>
                  <p className="text-muted-foreground">
                    No size options have been created yet.
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sizeOptions?.map((size) => (
                        <TableRow key={size.id}>
                          <TableCell className="font-medium">{size.name}</TableCell>
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
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Logistics Hubs
                  </CardTitle>
                  <CardDescription>
                    Manage distribution and logistics hubs
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddHub(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Hub
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {hubsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Loading hubs...</span>
                </div>
              ) : hubs && hubs.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Hubs Found</h3>
                  <p className="text-muted-foreground mb-4">
                    No logistics hubs have been created yet.
                  </p>
                  <Button onClick={() => setShowAddHub(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Hub
                  </Button>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Hub Code</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hubs?.map((hub) => (
                        <TableRow key={hub.id}>
                          <TableCell className="font-medium">{hub.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {hub.hub_code}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {hub.city_name || <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>
                            {hub.country_code || <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>
                            {hub.region || <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>
                            <Badge variant={hub.is_active ? "default" : "secondary"}>
                              {hub.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="ghost" title="Edit hub">
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
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Certifications
                  </CardTitle>
                  <CardDescription>
                    Manage certification standards and requirements
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddCertification(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Certification
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {certificationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Loading certifications...</span>
                </div>
              ) : certifications && certifications.length === 0 ? (
                <div className="text-center py-8">
                  <Award className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Certifications Found</h3>
                  <p className="text-muted-foreground mb-4">
                    No certification standards have been created yet.
                  </p>
                  <Button onClick={() => setShowAddCertification(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Certification
                  </Button>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {certifications?.map((certification) => (
                        <TableRow key={certification.id}>
                          <TableCell className="font-medium">{certification.name}</TableCell>
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
    </div>
  )
}