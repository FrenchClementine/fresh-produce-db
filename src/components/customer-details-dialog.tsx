'use client'

import { Users, User, Phone, Mail, MapPin, Package, Shield, Truck, Eye } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCustomer, useCustomerProductSpecs, useCustomerCertifications, useCustomerLogistics } from '@/hooks/use-customers'
import { CustomerProductSpecsTable } from '@/components/customer-product-specs-table'
import { CustomerCertificationsTable } from '@/components/customer-certifications-table'
import { CustomerLogisticsTable } from '@/components/customer-logistics-table'

interface CustomerDetailsDialogProps {
  customerId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CustomerDetailsDialog({ customerId, open, onOpenChange }: CustomerDetailsDialogProps) {
  const { customer, isLoading: customerLoading, error: customerError } = useCustomer(customerId || '')
  const { customerProductSpecs, isLoading: specsLoading } = useCustomerProductSpecs(customerId || '')
  const { customerCertifications, isLoading: certificationsLoading } = useCustomerCertifications(customerId || '')
  const { customerLogistics, isLoading: logisticsLoading } = useCustomerLogistics(customerId || '')

  if (!customerId) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] bg-terminal-panel border-terminal-border p-0">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6 space-y-4">
            {customerLoading ? (
              <div className="text-center py-12 text-terminal-muted font-mono">Loading customer details...</div>
            ) : customerError || !customer ? (
              <div className="text-center py-12 text-terminal-alert font-mono">
                Error loading customer: {customerError?.message || 'Customer not found'}
              </div>
            ) : (
              <>
                {/* Header */}
                <DialogHeader className="border-b border-terminal-border pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Users className="h-6 w-6 text-terminal-accent" />
                      <div>
                        <DialogTitle className="text-xl font-mono font-bold text-terminal-text tracking-wider">
                          {customer.name}
                        </DialogTitle>
                        <p className="text-terminal-muted font-mono text-xs">
                          Customer Details and Requirements
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`font-mono ${
                        customer.is_active
                          ? 'border-terminal-success text-terminal-success'
                          : 'border-terminal-muted text-terminal-muted'
                      }`}
                    >
                      {customer.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </DialogHeader>

                {/* Customer Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Card className="bg-terminal-dark border-terminal-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs font-medium font-mono text-terminal-text">Contact Info</CardTitle>
                      <User className="h-3 w-3 text-terminal-muted" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {customer.email && (
                          <div className="flex items-center text-xs font-mono text-terminal-text">
                            <Mail className="mr-1 h-3 w-3 text-terminal-muted" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                        )}
                        {customer.phone_number && (
                          <div className="flex items-center text-xs font-mono text-terminal-text">
                            <Phone className="mr-1 h-3 w-3 text-terminal-muted" />
                            {customer.phone_number}
                          </div>
                        )}
                        {(customer.city || customer.country) && (
                          <div className="flex items-center text-xs font-mono text-terminal-text">
                            <MapPin className="mr-1 h-3 w-3 text-terminal-muted" />
                            {[customer.city, customer.country].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-terminal-dark border-terminal-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs font-medium font-mono text-terminal-text">Assigned Agent</CardTitle>
                      <User className="h-3 w-3 text-terminal-muted" />
                    </CardHeader>
                    <CardContent>
                      {customer.staff ? (
                        <div className="space-y-1">
                          <div className="font-medium font-mono text-terminal-text text-xs">{customer.staff.name}</div>
                          {customer.staff.role && (
                            <div className="text-xs text-terminal-muted font-mono">{customer.staff.role}</div>
                          )}
                          {customer.staff.email && (
                            <div className="text-xs text-terminal-muted font-mono truncate">{customer.staff.email}</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-terminal-muted font-mono">No agent assigned</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-terminal-dark border-terminal-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs font-medium font-mono text-terminal-text">Product Requirements</CardTitle>
                      <Package className="h-3 w-3 text-terminal-muted" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold font-mono text-terminal-text">{customerProductSpecs?.length || 0}</div>
                      <p className="text-xs text-terminal-muted font-mono">
                        Product specifications
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-terminal-dark border-terminal-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-xs font-medium font-mono text-terminal-text">Delivery Modes</CardTitle>
                      <Truck className="h-3 w-3 text-terminal-muted" />
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1">
                        {customer.delivery_modes?.map((mode: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs font-mono border-terminal-border text-terminal-text">
                            {mode}
                          </Badge>
                        ))}
                        {(!customer.delivery_modes || customer.delivery_modes.length === 0) && (
                          <div className="text-xs text-terminal-muted font-mono">None specified</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Addresses */}
                {(customer.address || customer.warehouse_address) && (
                  <Card className="bg-terminal-dark border-terminal-border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 font-mono text-terminal-text text-sm">
                        <MapPin className="h-4 w-4 text-terminal-accent" />
                        Addresses
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {customer.address && (
                          <div>
                            <h4 className="font-medium mb-1 font-mono text-terminal-text text-xs">Primary Address</h4>
                            <p className="text-xs text-terminal-muted font-mono whitespace-pre-line">
                              {customer.address}
                            </p>
                          </div>
                        )}
                        {customer.warehouse_address && (
                          <div>
                            <h4 className="font-medium mb-1 font-mono text-terminal-text text-xs">Warehouse Address</h4>
                            <p className="text-xs text-terminal-muted font-mono whitespace-pre-line">
                              {customer.warehouse_address}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Notes */}
                {customer.notes && (
                  <Card className="bg-terminal-dark border-terminal-border">
                    <CardHeader>
                      <CardTitle className="font-mono text-terminal-text text-sm">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs whitespace-pre-line font-mono text-terminal-text">{customer.notes}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Tabs for detailed information */}
                <Tabs defaultValue="products" className="space-y-3">
                  <TabsList className="bg-terminal-dark border border-terminal-border">
                    <TabsTrigger value="products" className="flex items-center gap-2 font-mono text-xs data-[state=active]:bg-terminal-accent data-[state=active]:text-terminal-dark text-terminal-text">
                      <Package className="h-3 w-3" />
                      Product Requirements
                    </TabsTrigger>
                    <TabsTrigger value="certifications" className="flex items-center gap-2 font-mono text-xs data-[state=active]:bg-terminal-accent data-[state=active]:text-terminal-dark text-terminal-text">
                      <Shield className="h-3 w-3" />
                      Certification Requirements
                    </TabsTrigger>
                    <TabsTrigger value="logistics" className="flex items-center gap-2 font-mono text-xs data-[state=active]:bg-terminal-accent data-[state=active]:text-terminal-dark text-terminal-text">
                      <Truck className="h-3 w-3" />
                      Logistics Preferences
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="products" className="space-y-3">
                    <Card className="bg-terminal-dark border-terminal-border">
                      <CardHeader>
                        <CardTitle className="font-mono text-terminal-text text-sm">Product Requirements</CardTitle>
                        <CardDescription className="font-mono text-terminal-muted text-xs">
                          Products required by this customer with seasonal availability preferences
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <CustomerProductSpecsTable
                          customerProductSpecs={customerProductSpecs || []}
                          isLoading={specsLoading}
                          customerId={customerId}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="certifications" className="space-y-3">
                    <Card className="bg-terminal-dark border-terminal-border">
                      <CardHeader>
                        <CardTitle className="font-mono text-terminal-text text-sm">Certification Requirements</CardTitle>
                        <CardDescription className="font-mono text-terminal-muted text-xs">
                          Certifications required by this customer from their suppliers
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <CustomerCertificationsTable
                          customerCertifications={customerCertifications || []}
                          isLoading={certificationsLoading}
                          customerId={customerId}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="logistics" className="space-y-3">
                    <Card className="bg-terminal-dark border-terminal-border">
                      <CardHeader>
                        <CardTitle className="font-mono text-terminal-text text-sm">Logistics Preferences</CardTitle>
                        <CardDescription className="font-mono text-terminal-muted text-xs">
                          Delivery and pickup preferences between different hubs
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <CustomerLogisticsTable
                          customerLogistics={customerLogistics || []}
                          isLoading={logisticsLoading}
                          customerId={customerId}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
