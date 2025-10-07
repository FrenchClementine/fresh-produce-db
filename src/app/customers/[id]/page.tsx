'use client'

import { useParams } from 'next/navigation'
import { Users, User, Phone, Mail, MapPin, Package, Shield, Truck, Calendar, Activity } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { useCustomer, useCustomerProductSpecs, useCustomerCertifications, useCustomerLogistics } from '@/hooks/use-customers'
import { CustomerProductSpecsTable } from '@/components/customer-product-specs-table'
import { CustomerCertificationsTable } from '@/components/customer-certifications-table'
import { CustomerLogisticsTable } from '@/components/customer-logistics-table'

export default function CustomerDetailPage() {
  const params = useParams()
  const customerId = params.id as string

  const { customer, isLoading: customerLoading, error: customerError } = useCustomer(customerId)
  const { customerProductSpecs, isLoading: specsLoading } = useCustomerProductSpecs(customerId)
  const { customerCertifications, isLoading: certificationsLoading } = useCustomerCertifications(customerId)
  const { customerLogistics, isLoading: logisticsLoading } = useCustomerLogistics(customerId)

  if (customerLoading) {
    return (
      <div className="min-h-screen bg-terminal-dark p-4">
        <div className="text-center py-12 text-terminal-muted font-mono">Loading customer details...</div>
      </div>
    )
  }

  if (customerError || !customer) {
    return (
      <div className="min-h-screen bg-terminal-dark p-4">
        <div className="text-center py-12 text-terminal-alert font-mono">
          Error loading customer: {customerError?.message || 'Customer not found'}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-terminal-dark p-4 space-y-4">
      {/* Terminal Header */}
      <div className="flex items-center justify-between border-b border-terminal-border pb-4">
        <div className="flex items-center gap-4">
          <Users className="h-8 w-8 text-terminal-accent" />
          <div>
            <h1 className="text-2xl font-mono font-bold text-terminal-text tracking-wider">
              {customer.name}
            </h1>
            <p className="text-terminal-muted font-mono text-sm">
              Customer Details and Requirements
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      {/* Customer Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-terminal-panel border-terminal-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-mono text-terminal-text">Contact Info</CardTitle>
            <User className="h-4 w-4 text-terminal-muted" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {customer.email && (
                <div className="flex items-center text-sm font-mono text-terminal-text">
                  <Mail className="mr-2 h-3 w-3 text-terminal-muted" />
                  {customer.email}
                </div>
              )}
              {customer.phone_number && (
                <div className="flex items-center text-sm font-mono text-terminal-text">
                  <Phone className="mr-2 h-3 w-3 text-terminal-muted" />
                  {customer.phone_number}
                </div>
              )}
              {(customer.city || customer.country) && (
                <div className="flex items-center text-sm font-mono text-terminal-text">
                  <MapPin className="mr-2 h-3 w-3 text-terminal-muted" />
                  {[customer.city, customer.country].filter(Boolean).join(', ')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-terminal-panel border-terminal-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-mono text-terminal-text">Assigned Agent</CardTitle>
            <User className="h-4 w-4 text-terminal-muted" />
          </CardHeader>
          <CardContent>
            {customer.staff ? (
              <div className="space-y-1">
                <div className="font-medium font-mono text-terminal-text">{customer.staff.name}</div>
                {customer.staff.role && (
                  <div className="text-sm text-terminal-muted font-mono">{customer.staff.role}</div>
                )}
                {customer.staff.email && (
                  <div className="text-xs text-terminal-muted font-mono">{customer.staff.email}</div>
                )}
              </div>
            ) : (
              <div className="text-sm text-terminal-muted font-mono">No agent assigned</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-terminal-panel border-terminal-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-mono text-terminal-text">Product Requirements</CardTitle>
            <Package className="h-4 w-4 text-terminal-muted" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-terminal-text">{customerProductSpecs?.length || 0}</div>
            <p className="text-xs text-terminal-muted font-mono">
              Product specifications
            </p>
          </CardContent>
        </Card>

        <Card className="bg-terminal-panel border-terminal-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-mono text-terminal-text">Delivery Modes</CardTitle>
            <Truck className="h-4 w-4 text-terminal-muted" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {customer.delivery_modes?.map((mode: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs font-mono border-terminal-border text-terminal-text">
                  {mode}
                </Badge>
              ))}
              {(!customer.delivery_modes || customer.delivery_modes.length === 0) && (
                <div className="text-sm text-terminal-muted font-mono">None specified</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Addresses */}
      {(customer.address || customer.warehouse_address) && (
        <Card className="bg-terminal-panel border-terminal-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono text-terminal-text">
              <MapPin className="h-5 w-5 text-terminal-accent" />
              Addresses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customer.address && (
                <div>
                  <h4 className="font-medium mb-2 font-mono text-terminal-text">Primary Address</h4>
                  <p className="text-sm text-terminal-muted font-mono whitespace-pre-line">
                    {customer.address}
                  </p>
                </div>
              )}
              {customer.warehouse_address && (
                <div>
                  <h4 className="font-medium mb-2 font-mono text-terminal-text">Warehouse Address</h4>
                  <p className="text-sm text-terminal-muted font-mono whitespace-pre-line">
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
        <Card className="bg-terminal-panel border-terminal-border">
          <CardHeader>
            <CardTitle className="font-mono text-terminal-text">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-line font-mono text-terminal-text">{customer.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs for detailed information */}
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList className="bg-terminal-panel border border-terminal-border">
          <TabsTrigger value="products" className="flex items-center gap-2 font-mono data-[state=active]:bg-terminal-accent data-[state=active]:text-terminal-dark text-terminal-text">
            <Package className="h-4 w-4" />
            Product Requirements
          </TabsTrigger>
          <TabsTrigger value="certifications" className="flex items-center gap-2 font-mono data-[state=active]:bg-terminal-accent data-[state=active]:text-terminal-dark text-terminal-text">
            <Shield className="h-4 w-4" />
            Certification Requirements
          </TabsTrigger>
          <TabsTrigger value="logistics" className="flex items-center gap-2 font-mono data-[state=active]:bg-terminal-accent data-[state=active]:text-terminal-dark text-terminal-text">
            <Truck className="h-4 w-4" />
            Logistics Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <Card className="bg-terminal-panel border-terminal-border">
            <CardHeader>
              <CardTitle className="font-mono text-terminal-text">Product Requirements</CardTitle>
              <CardDescription className="font-mono text-terminal-muted">
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

        <TabsContent value="certifications" className="space-y-4">
          <Card className="bg-terminal-panel border-terminal-border">
            <CardHeader>
              <CardTitle className="font-mono text-terminal-text">Certification Requirements</CardTitle>
              <CardDescription className="font-mono text-terminal-muted">
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

        <TabsContent value="logistics" className="space-y-4">
          <Card className="bg-terminal-panel border-terminal-border">
            <CardHeader>
              <CardTitle className="font-mono text-terminal-text">Logistics Preferences</CardTitle>
              <CardDescription className="font-mono text-terminal-muted">
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
    </div>
  )
}