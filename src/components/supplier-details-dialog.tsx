'use client'

import { Building, Truck, Package, Award, MapPin, Phone, Mail, Edit, Trash2, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSuppliers, useSupplierProducts, useSupplierLogistics, useSupplierCertifications } from '@/hooks/use-products'

interface SupplierDetailsDialogProps {
  supplierId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SupplierDetailsDialog({ supplierId, open, onOpenChange }: SupplierDetailsDialogProps) {
  const { suppliers } = useSuppliers()
  const { supplierProducts, isLoading, error } = useSupplierProducts(supplierId || '')
  const { supplierLogistics, isLoading: isLoadingLogistics, error: logisticsError } = useSupplierLogistics(supplierId || '')
  const { supplierCertifications, isLoading: isLoadingCertifications, error: certificationsError } = useSupplierCertifications(supplierId || '')

  const supplier = suppliers?.find(s => s.id === supplierId)

  if (!supplierId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] bg-terminal-panel border-terminal-border p-0">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6 space-y-4">
            {!supplier ? (
              <div className="text-center py-12 text-terminal-muted font-mono">Supplier not found</div>
            ) : (
              <>
                {/* Header */}
                <DialogHeader className="border-b border-terminal-border pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Building className="h-6 w-6 text-terminal-accent" />
                      <div>
                        <DialogTitle className="text-xl font-mono font-bold text-terminal-text tracking-wider">
                          {supplier.name}
                        </DialogTitle>
                        <p className="text-terminal-muted font-mono text-xs">
                          Supplier Details and Capabilities
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={supplier.is_active
                        ? "border-terminal-success text-terminal-success font-mono"
                        : "border-terminal-muted text-terminal-muted font-mono"
                      }
                    >
                      {supplier.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </DialogHeader>

                {/* Overview Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <Card className="bg-terminal-dark border-terminal-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-mono text-terminal-text text-xs">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {supplier.email && (
                        <div className="flex items-center text-xs font-mono text-terminal-text">
                          <Mail className="mr-1 h-3 w-3 text-terminal-accent" />
                          <span className="truncate">{supplier.email}</span>
                        </div>
                      )}
                      {supplier.phone_number && (
                        <div className="flex items-center text-xs font-mono text-terminal-text">
                          <Phone className="mr-1 h-3 w-3 text-terminal-accent" />
                          {supplier.phone_number}
                        </div>
                      )}
                      {(supplier.city || supplier.country) && (
                        <div className="flex items-center text-xs font-mono text-terminal-text">
                          <MapPin className="mr-1 h-3 w-3 text-terminal-accent" />
                          {[supplier.city, supplier.country].filter(Boolean).join(', ')}
                        </div>
                      )}
                      {supplier.address && (
                        <div className="text-xs text-terminal-muted font-mono">
                          <div className="font-medium text-terminal-text">Address:</div>
                          <div className="whitespace-pre-line">{supplier.address}</div>
                        </div>
                      )}
                      {supplier.warehouse_address && (
                        <div className="text-xs text-terminal-muted font-mono">
                          <div className="font-medium text-terminal-text">Warehouse:</div>
                          <div className="whitespace-pre-line">{supplier.warehouse_address}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-terminal-dark border-terminal-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-mono text-terminal-text text-xs">Delivery Modes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1">
                        {supplier.delivery_modes?.map((mode: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs bg-terminal-panel text-terminal-text border-terminal-border font-mono">
                            {mode}
                          </Badge>
                        ))}
                        {(!supplier.delivery_modes || supplier.delivery_modes.length === 0) && (
                          <div className="text-xs text-terminal-muted font-mono">No delivery modes specified</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-terminal-dark border-terminal-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-mono text-terminal-text text-xs">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs font-mono text-terminal-text">
                        {supplier.notes || (
                          <span className="text-terminal-muted">No notes available</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Logistics Capabilities */}
                <Card className="bg-terminal-dark border-terminal-border">
                  <CardHeader className="border-b border-terminal-border">
                    <CardTitle className="flex items-center gap-2 font-mono text-sm text-terminal-text">
                      <Truck className="h-4 w-4 text-terminal-accent" />
                      Logistics Capabilities
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {logisticsError && (
                      <div className="text-center py-8 text-terminal-alert font-mono text-xs">
                        Error loading logistics capabilities
                      </div>
                    )}
                    {!logisticsError && (supplierLogistics?.length === 0 ? (
                      <div className="text-center py-8 text-terminal-muted font-mono text-xs">
                        No logistics capabilities configured yet
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-terminal-border">
                              <TableHead className="font-mono text-terminal-muted text-xs">Route</TableHead>
                              <TableHead className="font-mono text-terminal-muted text-xs">Mode</TableHead>
                              <TableHead className="font-mono text-terminal-muted text-xs">Lead Time</TableHead>
                              <TableHead className="font-mono text-terminal-muted text-xs">Operational Days</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {supplierLogistics?.map((capability: any) => (
                              <TableRow key={capability.id} className="border-terminal-border">
                                <TableCell className="font-mono text-terminal-text text-xs">
                                  <div className="font-medium">
                                    {capability.mode === 'Ex Works' ? (
                                      `${capability.origin_hub?.name || 'Unknown'} (Pickup)`
                                    ) : (
                                      `${capability.origin_hub?.name || 'Unknown'} → ${capability.destination_hub?.name || 'Unknown'}`
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs">
                                  <Badge variant="outline" className="bg-terminal-panel text-terminal-text border-terminal-border font-mono text-xs">
                                    {capability.mode}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-mono text-terminal-text text-xs">
                                  {capability.typical_lead_time_days} {capability.typical_lead_time_days === 1 ? 'day' : 'days'}
                                </TableCell>
                                <TableCell className="text-xs">
                                  <div className="flex flex-wrap gap-1">
                                    {capability.fixed_operational_days?.length > 0 ? (
                                      capability.fixed_operational_days.map((day: string, index: number) => (
                                        <Badge key={index} variant="outline" className="bg-terminal-panel text-terminal-text border-terminal-border font-mono text-xs">
                                          {day.slice(0, 3).toUpperCase()}
                                        </Badge>
                                      ))
                                    ) : (
                                      <span className="text-terminal-muted font-mono">All days</span>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Product Offerings */}
                <Card className="bg-terminal-dark border-terminal-border">
                  <CardHeader className="border-b border-terminal-border">
                    <CardTitle className="flex items-center gap-2 font-mono text-sm text-terminal-text">
                      <Package className="h-4 w-4 text-terminal-accent" />
                      Product Offerings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {error && (
                      <div className="text-center py-8 text-terminal-alert font-mono text-xs">
                        Error loading products
                      </div>
                    )}
                    {!error && (supplierProducts?.length === 0 ? (
                      <div className="text-center py-8 text-terminal-muted font-mono text-xs">
                        No products linked to this supplier yet
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-terminal-border">
                              <TableHead className="font-mono text-terminal-muted text-xs">Product</TableHead>
                              <TableHead className="font-mono text-terminal-muted text-xs">Packaging</TableHead>
                              <TableHead className="font-mono text-terminal-muted text-xs">Season</TableHead>
                              <TableHead className="font-mono text-terminal-muted text-xs">Available Months</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {supplierProducts?.map((item: any) => (
                              <TableRow key={item.id} className="border-terminal-border">
                                <TableCell className="font-mono text-terminal-text text-xs">
                                  <div className="font-medium">
                                    {item.product_packaging_specs?.products?.name || 'Unknown Product'}
                                  </div>
                                  <div className="text-xs text-terminal-muted">
                                    {item.product_packaging_specs?.products?.category || 'No category'}
                                  </div>
                                </TableCell>
                                <TableCell className="font-mono text-terminal-text text-xs">
                                  <div>
                                    <div className="font-medium">
                                      {item.product_packaging_specs?.packaging_options?.label || 'N/A'}
                                    </div>
                                    <div className="text-xs text-terminal-muted">
                                      {item.product_packaging_specs?.size_options?.name || 'No size'}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs">
                                  {item.season ? (
                                    <Badge variant="outline" className="bg-terminal-panel text-terminal-text border-terminal-border font-mono text-xs">
                                      {item.season.replace('_', ' ').toUpperCase()}
                                    </Badge>
                                  ) : (
                                    <span className="text-terminal-muted font-mono">Not specified</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs">
                                  <div className="flex flex-wrap gap-1">
                                    {item.available_months?.map((month: string, index: number) => (
                                      <Badge key={index} variant="outline" className="bg-terminal-panel text-terminal-text border-terminal-border font-mono text-xs">
                                        {month.slice(0, 3).toUpperCase()}
                                      </Badge>
                                    ))}
                                    {(!item.available_months || item.available_months.length === 0) && (
                                      <span className="text-terminal-muted font-mono">All year</span>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Certifications */}
                <Card className="bg-terminal-dark border-terminal-border">
                  <CardHeader className="border-b border-terminal-border">
                    <CardTitle className="flex items-center gap-2 font-mono text-sm text-terminal-text">
                      <Award className="h-4 w-4 text-terminal-accent" />
                      Certifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {certificationsError && (
                      <div className="text-center py-8 text-terminal-alert font-mono text-xs">
                        Error loading certifications
                      </div>
                    )}
                    {!certificationsError && (supplierCertifications?.length === 0 ? (
                      <div className="text-center py-8 text-terminal-muted font-mono text-xs">
                        No certifications linked yet
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-terminal-border">
                              <TableHead className="font-mono text-terminal-muted text-xs">Certification</TableHead>
                              <TableHead className="font-mono text-terminal-muted text-xs">Issue Date</TableHead>
                              <TableHead className="font-mono text-terminal-muted text-xs">Expiry Date</TableHead>
                              <TableHead className="font-mono text-terminal-muted text-xs">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {supplierCertifications?.map((cert: any) => {
                              const isExpired = cert.expires_at && new Date(cert.expires_at) < new Date()
                              const isExpiringSoon = cert.expires_at &&
                                new Date(cert.expires_at) > new Date() &&
                                new Date(cert.expires_at) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)

                              return (
                                <TableRow key={cert.id} className="border-terminal-border">
                                  <TableCell className="font-mono text-terminal-text text-xs">
                                    <div className="font-medium">
                                      {cert.certifications?.name || 'Unknown Certification'}
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-mono text-terminal-text text-xs">
                                    {cert.issued_at ? (
                                      new Date(cert.issued_at).toLocaleDateString()
                                    ) : (
                                      <span className="text-terminal-muted">Not specified</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="font-mono text-terminal-text text-xs">
                                    {cert.expires_at ? (
                                      new Date(cert.expires_at).toLocaleDateString()
                                    ) : (
                                      <span className="text-terminal-muted">No expiry</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {isExpired ? (
                                      <Badge variant="outline" className="bg-terminal-alert/20 text-terminal-alert border-terminal-alert font-mono text-xs">Expired</Badge>
                                    ) : isExpiringSoon ? (
                                      <Badge variant="outline" className="bg-yellow-500/20 text-yellow-500 border-yellow-500 font-mono text-xs">
                                        Expiring Soon
                                      </Badge>
                                    ) : cert.expires_at ? (
                                      <Badge variant="outline" className="bg-terminal-success/20 text-terminal-success border-terminal-success font-mono text-xs">
                                        Valid
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-terminal-panel text-terminal-muted border-terminal-border font-mono text-xs">No Expiry</Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
