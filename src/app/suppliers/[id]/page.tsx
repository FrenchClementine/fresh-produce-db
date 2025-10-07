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
import { useSuppliers, useSupplierProducts, useSupplierLogistics, useSupplierCertifications } from '@/hooks/use-products'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import { AddSupplierProductForm } from '@/components/forms/add-supplier-product-form'
import { AddSupplierLogisticsForm } from '@/components/forms/add-supplier-logistics-form'
import { EditSupplierLogisticsForm } from '@/components/forms/edit-supplier-logistics-form'
import { AddSupplierCertificationForm } from '@/components/forms/add-supplier-certification-form'
import { EditSupplierCertificationForm } from '@/components/forms/edit-supplier-certification-form'

export default function SupplierDetailPage() {
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

  const { suppliers } = useSuppliers()
  const { supplierProducts, isLoading, error } = useSupplierProducts(supplierId)
  const { supplierLogistics, isLoading: isLoadingLogistics, error: logisticsError } = useSupplierLogistics(supplierId)
  const { supplierCertifications, isLoading: isLoadingCertifications, error: certificationsError } = useSupplierCertifications(supplierId)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const supplier = suppliers?.find(s => s.id === supplierId)

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

  if (!supplier && !isLoading) {
    return (
      <div className="min-h-screen bg-terminal-dark p-4 space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="text-terminal-text hover:bg-terminal-dark hover:text-terminal-accent font-mono"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Suppliers
        </Button>
        <div className="text-center py-12 text-terminal-muted font-mono">Supplier not found</div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-terminal-dark p-4 space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="text-terminal-text hover:bg-terminal-dark hover:text-terminal-accent font-mono"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Suppliers
        </Button>
        <div className="text-center py-12 text-terminal-muted font-mono">Loading supplier details...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-terminal-dark p-4 space-y-4">
      <div className="flex items-center gap-4 bg-terminal-panel border border-terminal-border rounded p-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="text-terminal-text hover:bg-terminal-dark hover:text-terminal-accent font-mono"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Suppliers
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-mono font-bold tracking-tight flex items-center gap-2 text-terminal-text">
            <Building className="h-6 w-6 text-terminal-accent" />
            {supplier?.name}
          </h1>
          <Badge
            variant={supplier?.is_active ? "default" : "secondary"}
            className={supplier?.is_active
              ? "mt-2 bg-terminal-success/20 text-terminal-success border-terminal-success font-mono"
              : "mt-2 bg-terminal-dark text-terminal-muted border-terminal-border font-mono"
            }
          >
            {supplier?.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-terminal-panel border-terminal-border">
          <CardHeader className="border-b border-terminal-border">
            <CardTitle className="font-mono text-sm text-terminal-text">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            {supplier?.email && (
              <div className="flex items-center text-sm font-mono text-terminal-text">
                <Mail className="mr-2 h-4 w-4 text-terminal-accent" />
                {supplier.email}
              </div>
            )}
            {supplier?.phone_number && (
              <div className="flex items-center text-sm font-mono text-terminal-text">
                <Phone className="mr-2 h-4 w-4 text-terminal-accent" />
                {supplier.phone_number}
              </div>
            )}
            {(supplier?.city || supplier?.country) && (
              <div className="flex items-center text-sm font-mono text-terminal-text">
                <MapPin className="mr-2 h-4 w-4 text-terminal-accent" />
                {[supplier?.city, supplier?.country].filter(Boolean).join(', ')}
              </div>
            )}
            {supplier?.address && (
              <div className="text-sm text-terminal-muted font-mono">
                <div className="font-medium text-terminal-text">Address:</div>
                {supplier.address}
              </div>
            )}
            {supplier?.warehouse_address && (
              <div className="text-sm text-terminal-muted font-mono">
                <div className="font-medium text-terminal-text">Warehouse:</div>
                {supplier.warehouse_address}
              </div>
            )}
            {supplier?.zip_code && (
              <div className="text-sm text-terminal-muted font-mono">
                <div className="font-medium text-terminal-text">Zip Code:</div>
                {supplier.zip_code}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-terminal-panel border-terminal-border">
          <CardHeader className="border-b border-terminal-border">
            <CardTitle className="font-mono text-sm text-terminal-text">Delivery Modes</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              {supplier?.delivery_modes?.map((mode: string, index: number) => (
                <Badge key={index} className="bg-terminal-dark text-terminal-text border-terminal-border font-mono">
                  {mode}
                </Badge>
              ))}
              {(!supplier?.delivery_modes || supplier.delivery_modes.length === 0) && (
                <div className="text-sm text-terminal-muted font-mono">No delivery modes specified</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-terminal-panel border-terminal-border">
          <CardHeader className="border-b border-terminal-border">
            <CardTitle className="font-mono text-sm text-terminal-text">Notes</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-sm font-mono text-terminal-text">
              {supplier?.notes || (
                <span className="text-terminal-muted">No notes available</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-terminal-panel border-terminal-border">
        <CardHeader className="border-b border-terminal-border">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 font-mono text-sm text-terminal-text">
              <Truck className="h-5 w-5 text-terminal-accent" />
              Logistics Capabilities
            </CardTitle>
            <Button
              onClick={() => setIsAddLogisticsDialogOpen(true)}
              className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Route
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {logisticsError && (
            <div className="text-center py-12 text-terminal-alert font-mono">
              Error loading logistics capabilities: {(logisticsError as Error).message}
            </div>
          )}
          {!logisticsError && (supplierLogistics?.length === 0 ? (
            <div className="text-center py-12 text-terminal-muted font-mono">
              No logistics capabilities configured yet. Add your first route to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-terminal-border hover:bg-transparent">
                  <TableHead className="font-mono text-terminal-muted border-terminal-border">Route</TableHead>
                  <TableHead className="font-mono text-terminal-muted border-terminal-border">Mode</TableHead>
                  <TableHead className="font-mono text-terminal-muted border-terminal-border">Lead Time</TableHead>
                  <TableHead className="font-mono text-terminal-muted border-terminal-border">Operational Days</TableHead>
                  <TableHead className="font-mono text-terminal-muted border-terminal-border">Notes</TableHead>
                  <TableHead className="text-right font-mono text-terminal-muted border-terminal-border">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplierLogistics?.map((capability: any) => (
                  <TableRow key={capability.id} className="border-terminal-border hover:bg-terminal-dark">
                    <TableCell className="font-mono text-terminal-text">
                      <div className="font-medium">
                        {capability.mode === 'Ex Works' ? (
                          `${capability.origin_hub?.name || 'Unknown'} (Pickup)`
                        ) : (
                          `${capability.origin_hub?.name || 'Unknown'} → ${capability.destination_hub?.name || 'Unknown'}`
                        )}
                      </div>
                      <div className="text-sm text-terminal-muted">
                        {capability.mode === 'Ex Works' ? (
                          capability.origin_hub?.hub_code || 'N/A'
                        ) : (
                          `${capability.origin_hub?.hub_code || 'N/A'} → ${capability.destination_hub?.hub_code || 'N/A'}`
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-terminal-dark text-terminal-text border-terminal-border font-mono">
                        {capability.mode}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-terminal-text">
                      <div className="font-medium">
                        {capability.typical_lead_time_days} {capability.typical_lead_time_days === 1 ? 'day' : 'days'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {capability.fixed_operational_days?.length > 0 ? (
                          capability.fixed_operational_days.map((day: string, index: number) => (
                            <Badge key={index} className="bg-terminal-dark text-terminal-text border-terminal-border font-mono text-xs">
                              {day.slice(0, 3).toUpperCase()}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-terminal-muted font-mono">All days</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-terminal-text">
                      <div className="text-sm">
                        {capability.notes || (
                          <span className="text-terminal-muted">No notes</span>
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
                          className="text-terminal-text hover:bg-terminal-dark hover:text-terminal-accent"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLogisticsToDelete(capability)}
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
          ))}
        </CardContent>
      </Card>

      <Card className="bg-terminal-panel border-terminal-border">
        <CardHeader className="border-b border-terminal-border">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 font-mono text-sm text-terminal-text">
              <Package className="h-5 w-5 text-terminal-accent" />
              Product Offerings
            </CardTitle>
            <Button
              onClick={() => setIsAddProductDialogOpen(true)}
              className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono"
            >
              <Plus className="mr-2 h-4 w-4" />
              Link Product
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {error && (
            <div className="text-center py-12 text-terminal-alert font-mono">
              Error loading products: {(error as Error).message}
            </div>
          )}
          {!error && (supplierProducts?.length === 0 ? (
            <div className="text-center py-12 text-terminal-muted font-mono">
              No products linked to this supplier yet. Link your first product to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-terminal-border hover:bg-transparent">
                  <TableHead className="font-mono text-terminal-muted border-terminal-border">Product</TableHead>
                  <TableHead className="font-mono text-terminal-muted border-terminal-border">Packaging</TableHead>
                  <TableHead className="font-mono text-terminal-muted border-terminal-border">Season</TableHead>
                  <TableHead className="font-mono text-terminal-muted border-terminal-border">Available Months</TableHead>
                  <TableHead className="font-mono text-terminal-muted border-terminal-border">Notes</TableHead>
                  <TableHead className="text-right font-mono text-terminal-muted border-terminal-border">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplierProducts?.map((item: any) => (
                  <TableRow key={item.id} className="border-terminal-border hover:bg-terminal-dark">
                    <TableCell className="font-mono text-terminal-text">
                      <div className="font-medium">
                        {item.product_packaging_specs?.products?.name || 'Unknown Product'}
                      </div>
                      <div className="text-sm text-terminal-muted">
                        {item.product_packaging_specs?.products?.category || 'No category'}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-terminal-text">
                      <div>
                        <div className="font-medium">
                          {item.product_packaging_specs?.packaging_options?.label || 'N/A'}
                        </div>
                        <div className="text-sm text-terminal-muted">
                          {item.product_packaging_specs?.size_options?.name || 'No size'}
                        </div>
                        {item.product_packaging_specs?.weight_per_box && (
                          <div className="text-sm text-terminal-muted">
                            {item.product_packaging_specs.weight_per_box} {item.product_packaging_specs.weight_unit}/box
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.season ? (
                        <Badge className="bg-terminal-dark text-terminal-text border-terminal-border font-mono">
                          {item.season.replace('_', ' ').toUpperCase()}
                        </Badge>
                      ) : (
                        <span className="text-terminal-muted font-mono">Not specified</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.available_months?.map((month: string, index: number) => (
                          <Badge key={index} className="bg-terminal-dark text-terminal-text border-terminal-border font-mono text-xs">
                            {month.slice(0, 3).toUpperCase()}
                          </Badge>
                        ))}
                        {(!item.available_months || item.available_months.length === 0) && (
                          <span className="text-terminal-muted text-sm font-mono">All year</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-terminal-text">
                      <div className="text-sm">
                        {item.notes || (
                          <span className="text-terminal-muted">No notes</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setProductToDelete(item)}
                        className="text-terminal-alert hover:bg-terminal-dark hover:text-terminal-alert"
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
      <Card className="bg-terminal-panel border-terminal-border">
        <CardHeader className="border-b border-terminal-border">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 font-mono text-sm text-terminal-text">
              <Award className="h-5 w-5 text-terminal-accent" />
              Certifications
            </CardTitle>
            <Button
              onClick={() => setIsAddCertificationDialogOpen(true)}
              className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Certification
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {certificationsError && (
            <div className="text-center py-12 text-terminal-alert font-mono">
              Error loading certifications: {(certificationsError as Error).message}
            </div>
          )}
          {!certificationsError && (supplierCertifications?.length === 0 ? (
            <div className="text-center py-12 text-terminal-muted font-mono">
              No certifications linked yet. Add your first certification to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-terminal-border hover:bg-transparent">
                  <TableHead className="font-mono text-terminal-muted border-terminal-border">Certification</TableHead>
                  <TableHead className="font-mono text-terminal-muted border-terminal-border">Issue Date</TableHead>
                  <TableHead className="font-mono text-terminal-muted border-terminal-border">Expiry Date</TableHead>
                  <TableHead className="font-mono text-terminal-muted border-terminal-border">Status</TableHead>
                  <TableHead className="text-right font-mono text-terminal-muted border-terminal-border">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplierCertifications?.map((cert: any) => {
                  const isExpired = cert.expires_at && new Date(cert.expires_at) < new Date()
                  const isExpiringSoon = cert.expires_at &&
                    new Date(cert.expires_at) > new Date() &&
                    new Date(cert.expires_at) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days

                  return (
                    <TableRow key={cert.id} className="border-terminal-border hover:bg-terminal-dark">
                      <TableCell className="font-mono text-terminal-text">
                        <div className="font-medium">
                          {cert.certifications?.name || 'Unknown Certification'}
                        </div>
                        {cert.certifications?.description && (
                          <div className="text-sm text-terminal-muted">
                            {cert.certifications.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-terminal-text">
                        {cert.issued_at ? (
                          <div className="text-sm">
                            {new Date(cert.issued_at).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-terminal-muted text-sm">Not specified</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-terminal-text">
                        {cert.expires_at ? (
                          <div className="text-sm">
                            {new Date(cert.expires_at).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-terminal-muted text-sm">No expiry</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isExpired ? (
                          <Badge className="bg-terminal-alert/20 text-terminal-alert border-terminal-alert font-mono">Expired</Badge>
                        ) : isExpiringSoon ? (
                          <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500 font-mono">
                            Expiring Soon
                          </Badge>
                        ) : cert.expires_at ? (
                          <Badge className="bg-terminal-success/20 text-terminal-success border-terminal-success font-mono">
                            Valid
                          </Badge>
                        ) : (
                          <Badge className="bg-terminal-dark text-terminal-muted border-terminal-border font-mono">No Expiry</Badge>
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
                            className="text-terminal-text hover:bg-terminal-dark hover:text-terminal-accent"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCertificationToDelete(cert)}
                            className="text-terminal-alert hover:bg-terminal-dark hover:text-terminal-alert"
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
        <AlertDialogContent className="bg-terminal-panel border-terminal-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-terminal-text">Remove Product?</AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-terminal-muted">
              This will remove "{productToDelete?.product_packaging_specs?.products?.name}" from this supplier's offerings.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => productToDelete && handleDeleteProduct(productToDelete)}
              className="bg-terminal-alert hover:bg-terminal-alert/90 text-white font-mono"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!logisticsToDelete} onOpenChange={() => setLogisticsToDelete(null)}>
        <AlertDialogContent className="bg-terminal-panel border-terminal-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-terminal-text">Remove Logistics Capability?</AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-terminal-muted">
              This will remove the logistics route "{logisticsToDelete?.origin_hub?.name} → {logisticsToDelete?.destination_hub?.name}"
              for this supplier. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => logisticsToDelete && handleDeleteLogistics(logisticsToDelete)}
              className="bg-terminal-alert hover:bg-terminal-alert/90 text-white font-mono"
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
        <AlertDialogContent className="bg-terminal-panel border-terminal-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-terminal-text">Remove Certification?</AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-terminal-muted">
              This will remove the certification "{certificationToDelete?.certifications?.name}" from this supplier.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => certificationToDelete && handleDeleteCertification(certificationToDelete)}
              className="bg-terminal-alert hover:bg-terminal-alert/90 text-white font-mono"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}