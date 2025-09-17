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
      <div className="space-y-6">
        <div className="text-center py-12">Loading customer details...</div>
      </div>
    )
  }

  if (customerError || !customer) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-red-500">
          Error loading customer: {customerError?.message || 'Customer not found'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8" />
            {customer.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            Customer Details and Requirements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={customer.is_active ? "default" : "secondary"}>
            {customer.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      {/* Customer Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contact Info</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {customer.email && (
                <div className="flex items-center text-sm">
                  <Mail className="mr-2 h-3 w-3" />
                  {customer.email}
                </div>
              )}
              {customer.phone_number && (
                <div className="flex items-center text-sm">
                  <Phone className="mr-2 h-3 w-3" />
                  {customer.phone_number}
                </div>
              )}
              {(customer.city || customer.country) && (
                <div className="flex items-center text-sm">
                  <MapPin className="mr-2 h-3 w-3" />
                  {[customer.city, customer.country].filter(Boolean).join(', ')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Agent</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {customer.staff ? (
              <div className="space-y-1">
                <div className="font-medium">{customer.staff.name}</div>
                {customer.staff.role && (
                  <div className="text-sm text-muted-foreground">{customer.staff.role}</div>
                )}
                {customer.staff.email && (
                  <div className="text-xs text-muted-foreground">{customer.staff.email}</div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No agent assigned</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Product Requirements</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerProductSpecs?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Product specifications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Modes</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {customer.delivery_modes?.map((mode: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {mode}
                </Badge>
              ))}
              {(!customer.delivery_modes || customer.delivery_modes.length === 0) && (
                <div className="text-sm text-muted-foreground">None specified</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Addresses */}
      {(customer.address || customer.warehouse_address) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Addresses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customer.address && (
                <div>
                  <h4 className="font-medium mb-2">Primary Address</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {customer.address}
                  </p>
                </div>
              )}
              {customer.warehouse_address && (
                <div>
                  <h4 className="font-medium mb-2">Warehouse Address</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
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
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-line">{customer.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs for detailed information */}
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Product Requirements
          </TabsTrigger>
          <TabsTrigger value="certifications" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Certification Requirements
          </TabsTrigger>
          <TabsTrigger value="logistics" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Logistics Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Requirements</CardTitle>
              <CardDescription>
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
          <Card>
            <CardHeader>
              <CardTitle>Certification Requirements</CardTitle>
              <CardDescription>
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
          <Card>
            <CardHeader>
              <CardTitle>Logistics Preferences</CardTitle>
              <CardDescription>
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