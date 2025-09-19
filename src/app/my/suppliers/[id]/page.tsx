'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Package, Plus, Trash2, MapPin, Phone, Mail, Building, Truck, Edit, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { useMySupplier } from '@/hooks/use-my-data'
import { useCurrentStaffMember } from '@/hooks/use-staff'
import { useSupplierProducts, useSupplierLogistics, useSupplierCertifications } from '@/hooks/use-products'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import { AddSupplierProductForm } from '@/components/forms/add-supplier-product-form'
import { AddSupplierLogisticsForm } from '@/components/forms/add-supplier-logistics-form'
import { EditSupplierLogisticsForm } from '@/components/forms/edit-supplier-logistics-form'
import { AddSupplierCertificationForm } from '@/components/forms/add-supplier-certification-form'
import { EditSupplierCertificationForm } from '@/components/forms/edit-supplier-certification-form'

export default function MySupplierDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supplierId = params?.id as string

  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<any>(null)
  const [isAddLogisticsDialogOpen, setIsAddLogisticsDialogOpen] = useState(false)
  const [isEditLogisticsDialogOpen, setIsEditLogisticsDialogOpen] = useState(false)
  const [logisticsToEdit, setLogisticsToEdit] = useState<any>(null)
  const [logisticsToDelete, setLogisticsToDelete] = useState<any>(null)
  const [isAddCertificationDialogOpen, setIsAddCertificationDialogOpen] = useState(false)
  const [isEditCertificationDialogOpen, setIsEditCertificationDialogOpen] = useState(false)
  const [certificationToEdit, setCertificationToEdit] = useState<any>(null)
  const [certificationToDelete, setCertificationToDelete] = useState<any>(null)

  const { data: supplier, isLoading, error } = useMySupplier(supplierId)
  const { data: currentStaff } = useCurrentStaffMember()
  const { supplierProducts, isLoading: isLoadingProducts, error: productsError } = useSupplierProducts(supplierId)
  const { supplierLogistics, isLoading: isLoadingLogistics, error: logisticsError } = useSupplierLogistics(supplierId)
  const { supplierCertifications, isLoading: isLoadingCertifications, error: certificationsError } = useSupplierCertifications(supplierId)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const handleDeleteProduct = async (product: any) => {
    try {
      const { error } = await supabase
        .from('supplier_product_packaging_spec')
        .delete()
        .eq('id', product.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Product removed from supplier successfully',
      })

      queryClient.invalidateQueries({ queryKey: ['supplier-products', supplierId] })
      setProductToDelete(null)

    } catch (error: any) {
      console.error('Error removing product:', error)
      toast({
        title: 'Error',
        description: `Failed to remove product: ${error.message}`,
        variant: 'destructive',
      })
    }
  }

  const handleDeleteLogistics = async (logisticsCapability: any) => {
    try {
      const { error } = await supabase
        .from('supplier_logistics_capabilities')
        .delete()
        .eq('id', logisticsCapability.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Logistics capability removed successfully',
      })

      queryClient.invalidateQueries({ queryKey: ['supplier-logistics', supplierId] })
      setLogisticsToDelete(null)

    } catch (error: any) {
      console.error('Error removing logistics capability:', error)
      toast({
        title: 'Error',
        description: `Failed to remove logistics capability: ${error.message}`,
        variant: 'destructive',
      })
    }
  }

  const handleDeleteCertification = async (certification: any) => {
    try {
      const { error } = await supabase
        .from('supplier_certifications')
        .delete()
        .eq('id', certification.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: `Certification "${certification.certifications?.name}" removed from supplier successfully`,
      })

      queryClient.invalidateQueries({ queryKey: ['supplier-certifications', supplierId] })
      setCertificationToDelete(null)

    } catch (error: any) {
      console.error('Error removing certification:', error)
      toast({
        title: 'Error',
        description: `Failed to remove certification: ${error.message}`,
        variant: 'destructive',
      })
    }
  }

  if (!currentStaff) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/my/suppliers')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Suppliers
        </Button>
        <div className="text-center py-12 text-muted-foreground">
          You must be logged in as a staff member to view supplier details.
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/my/suppliers')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Suppliers
        </Button>
        <div className="text-center py-12">Loading supplier details...</div>
      </div>
    )
  }

  if (error || !supplier) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/my/suppliers')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Suppliers
        </Button>
        <div className="text-center py-12 text-red-500">
          {error
            ? `Error loading supplier: ${(error as Error).message}`
            : 'Supplier not found or not assigned to you'
          }
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/my/suppliers')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Suppliers
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building className="h-8 w-8" />
            {supplier.name}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={supplier.is_active ? "default" : "secondary"}>
              {supplier.is_active ? "Active" : "Inactive"}
            </Badge>
            <Badge variant="outline">
              Assigned to {currentStaff.name}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {supplier.email && (
              <div className="flex items-center text-sm">
                <Mail className="mr-2 h-4 w-4" />
                {supplier.email}
              </div>
            )}
            {supplier.phone_number && (
              <div className="flex items-center text-sm">
                <Phone className="mr-2 h-4 w-4" />
                {supplier.phone_number}
              </div>
            )}
            {(supplier.city || supplier.country) && (
              <div className="flex items-center text-sm">
                <MapPin className="mr-2 h-4 w-4" />
                {[supplier.city, supplier.country].filter(Boolean).join(', ')}
              </div>
            )}
            {supplier.address && (
              <div className="text-sm text-muted-foreground">
                <div className="font-medium">Address:</div>
                {supplier.address}
              </div>
            )}
            {supplier.warehouse_address && (
              <div className="text-sm text-muted-foreground">
                <div className="font-medium">Warehouse:</div>
                {supplier.warehouse_address}
              </div>
            )}
            {supplier.zip_code && (
              <div className="text-sm text-muted-foreground">
                <div className="font-medium">Zip Code:</div>
                {supplier.zip_code}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery Modes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {supplier.delivery_modes?.map((mode: string, index: number) => (
                <Badge key={index} variant="secondary">
                  {mode}
                </Badge>
              ))}
              {(!supplier.delivery_modes || supplier.delivery_modes.length === 0) && (
                <div className="text-sm text-muted-foreground">No delivery modes specified</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {supplier.notes || (
                <span className="text-muted-foreground">No notes available</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Logistics Capabilities
            </CardTitle>
            <Button onClick={() => setIsAddLogisticsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Route
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {logisticsError && (
            <div className="text-center py-12 text-red-500">
              Error loading logistics capabilities: {(logisticsError as Error).message}
            </div>
          )}
          {!logisticsError && (supplierLogistics?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No logistics capabilities configured yet. Add your first route to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Lead Time</TableHead>
                  <TableHead>Operational Days</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplierLogistics?.map((capability: any) => (
                  <TableRow key={capability.id}>
                    <TableCell>
                      <div className="font-medium">
                        {capability.mode === 'Ex Works' ? (
                          `${capability.origin_hub?.name || 'Unknown'} (Pickup)`
                        ) : (
                          `${capability.origin_hub?.name || 'Unknown'} → ${capability.destination_hub?.name || 'Unknown'}`
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {capability.mode === 'Ex Works' ? (
                          capability.origin_hub?.hub_code || 'N/A'
                        ) : (
                          `${capability.origin_hub?.hub_code || 'N/A'} → ${capability.destination_hub?.hub_code || 'N/A'}`
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {capability.mode}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {capability.typical_lead_time_days} {capability.typical_lead_time_days === 1 ? 'day' : 'days'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {capability.fixed_operational_days?.length > 0 ? (
                          capability.fixed_operational_days.map((day: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {day.slice(0, 3).toUpperCase()}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">All days</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {capability.notes || (
                          <span className="text-muted-foreground">No notes</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setLogisticsToEdit(capability)
                            setIsEditLogisticsDialogOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLogisticsToDelete(capability)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Product Offerings
            </CardTitle>
            <Button onClick={() => setIsAddProductDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Link Product
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {productsError && (
            <div className="text-center py-12 text-red-500">
              Error loading products: {(productsError as Error).message}
            </div>
          )}
          {!productsError && (supplierProducts?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No products linked to this supplier yet. Link your first product to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Packaging</TableHead>
                  <TableHead>Season</TableHead>
                  <TableHead>Available Months</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplierProducts?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">
                        {item.product_packaging_specs?.products?.name || 'Unknown Product'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item.product_packaging_specs?.products?.category || 'No category'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {item.product_packaging_specs?.packaging_options?.label || 'N/A'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {item.product_packaging_specs?.size_options?.name || 'No size'}
                        </div>
                        {item.product_packaging_specs?.weight_per_box && (
                          <div className="text-sm text-muted-foreground">
                            {item.product_packaging_specs.weight_per_box} {item.product_packaging_specs.weight_unit}/box
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.season ? (
                        <Badge variant="outline">
                          {item.season.replace('_', ' ').toUpperCase()}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Not specified</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.available_months?.map((month: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {month.slice(0, 3).toUpperCase()}
                          </Badge>
                        ))}
                        {(!item.available_months || item.available_months.length === 0) && (
                          <span className="text-muted-foreground text-sm">All year</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {item.notes || (
                          <span className="text-muted-foreground">No notes</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setProductToDelete(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ))}
        </CardContent>
      </Card>

      {/* Certifications Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Certifications
            </CardTitle>
            <Button onClick={() => setIsAddCertificationDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Certification
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {certificationsError && (
            <div className="text-center py-12 text-red-500">
              Error loading certifications: {(certificationsError as Error).message}
            </div>
          )}
          {!certificationsError && (supplierCertifications?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No certifications linked yet. Add your first certification to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Certification</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplierCertifications?.map((cert: any) => {
                  const isExpired = cert.expires_at && new Date(cert.expires_at) < new Date()
                  const isExpiringSoon = cert.expires_at &&
                    new Date(cert.expires_at) > new Date() &&
                    new Date(cert.expires_at) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days

                  return (
                    <TableRow key={cert.id}>
                      <TableCell>
                        <div className="font-medium">
                          {cert.certifications?.name || 'Unknown Certification'}
                        </div>
                        {cert.certifications?.description && (
                          <div className="text-sm text-muted-foreground">
                            {cert.certifications.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {cert.issued_at ? (
                          <div className="text-sm">
                            {new Date(cert.issued_at).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not specified</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {cert.expires_at ? (
                          <div className="text-sm">
                            {new Date(cert.expires_at).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No expiry</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isExpired ? (
                          <Badge variant="destructive">Expired</Badge>
                        ) : isExpiringSoon ? (
                          <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                            Expiring Soon
                          </Badge>
                        ) : cert.expires_at ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            Valid
                          </Badge>
                        ) : (
                          <Badge variant="secondary">No Expiry</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCertificationToEdit(cert)
                              setIsEditCertificationDialogOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCertificationToDelete(cert)}
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
          ))}
        </CardContent>
      </Card>

      <AddSupplierProductForm
        open={isAddProductDialogOpen}
        onOpenChange={setIsAddProductDialogOpen}
        supplierId={supplierId}
      />

      <AddSupplierLogisticsForm
        open={isAddLogisticsDialogOpen}
        onOpenChange={setIsAddLogisticsDialogOpen}
        supplierId={supplierId}
      />

      <EditSupplierLogisticsForm
        open={isEditLogisticsDialogOpen}
        onOpenChange={(open) => {
          setIsEditLogisticsDialogOpen(open)
          if (!open) setLogisticsToEdit(null)
        }}
        supplierId={supplierId}
        logisticsCapability={logisticsToEdit}
      />

      <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{productToDelete?.product_packaging_specs?.products?.name}" from this supplier's offerings.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => productToDelete && handleDeleteProduct(productToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!logisticsToDelete} onOpenChange={() => setLogisticsToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Logistics Capability?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the logistics route "{logisticsToDelete?.origin_hub?.name} → {logisticsToDelete?.destination_hub?.name}"
              for this supplier. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => logisticsToDelete && handleDeleteLogistics(logisticsToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddSupplierCertificationForm
        open={isAddCertificationDialogOpen}
        onOpenChange={(open) => {
          setIsAddCertificationDialogOpen(open)
          if (!open) {
            setCertificationToEdit(null)
          }
        }}
        supplierId={supplierId}
      />

      <EditSupplierCertificationForm
        open={isEditCertificationDialogOpen}
        onOpenChange={(open) => {
          setIsEditCertificationDialogOpen(open)
          if (!open) {
            setCertificationToEdit(null)
          }
        }}
        supplierId={supplierId}
        certification={certificationToEdit}
      />

      <AlertDialog open={!!certificationToDelete} onOpenChange={() => setCertificationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Certification?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the certification "{certificationToDelete?.certifications?.name}" from this supplier.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => certificationToDelete && handleDeleteCertification(certificationToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}