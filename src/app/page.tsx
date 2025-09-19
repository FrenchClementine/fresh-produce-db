'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Euro,
  TrendingUp,
  Truck,
  Settings,
  MapPin,
  Package,
  Users,
  Building2,
  Plus,
  Search,
  Eye,
  Route,
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import { useCurrentStaffMember } from '@/hooks/use-staff'
import { useCustomers } from '@/hooks/use-customers'
import { useSuppliers } from '@/hooks/use-products'
import { useTransporters, useRoutePriceBands } from '@/hooks/use-transporters'

export default function DashboardPage() {
  const { data: currentStaff } = useCurrentStaffMember()
  const { customers } = useCustomers()
  const { suppliers } = useSuppliers()
  const { data: transporters } = useTransporters()
  const { data: allPriceBands } = useRoutePriceBands()

  // Filter data by current staff member
  const myCustomers = customers?.filter(customer => customer.agent_id === currentStaff?.id) || []
  const mySuppliers = suppliers?.filter(supplier => supplier.agent_id === currentStaff?.id) || []
  const myTransporters = transporters?.filter(transporter => transporter.agent_id === currentStaff?.id) || []

  // Get expiring transport prices (expiring within 30 days)
  const expiringPriceBands = allPriceBands?.filter(band => {
    if (!band.valid_till) return false
    const expiryDate = new Date(band.valid_till)
    const now = new Date()
    const timeDiff = expiryDate.getTime() - now.getTime()
    const daysDiff = timeDiff / (1000 * 3600 * 24)
    return daysDiff <= 30 && daysDiff >= 0
  }) || []
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of recent activity and system status.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trade Section */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Euro className="h-5 w-5 text-green-600" />
                <CardTitle>Trade Operations</CardTitle>
              </div>
              <CardDescription>
                Manage supplier pricing and customer quotes
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Link href="/trade/prices">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        <CardTitle className="text-base">Input Prices</CardTitle>
                      </div>
                      <Badge variant="secondary">New</Badge>
                    </div>
                    <CardDescription className="text-sm">
                      Enter supplier pricing with delivery modes and validity periods
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/trade/view-prices">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-green-600" />
                        <CardTitle className="text-base">View Prices</CardTitle>
                      </div>
                      <Badge variant="secondary">New</Badge>
                    </div>
                    <CardDescription className="text-sm">
                      Customer pricing view with routes and margins
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Transport Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-purple-600" />
              <CardTitle>Transport</CardTitle>
            </div>
            <CardDescription>
              Manage transporters and routes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Button className="w-full" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Transporter
              </Button>
              <Button className="w-full" variant="outline">
                <Route className="mr-2 h-4 w-4" />
                Add Transport Route
              </Button>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium">Expiring Prices</span>
                {expiringPriceBands.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {expiringPriceBands.length}
                  </Badge>
                )}
              </div>
              {expiringPriceBands.length > 0 ? (
                <div className="space-y-2">
                  {expiringPriceBands.slice(0, 3).map((band, index) => (
                    <div key={index} className="text-xs border-l-2 border-yellow-500 pl-2">
                      <div className="font-medium">
                        {band.transporter_routes.transporters.name}
                      </div>
                      <div className="text-muted-foreground">
                        {band.transporter_routes.origin_hub.hub_code} → {band.transporter_routes.destination_hub.hub_code}
                      </div>
                      <div className="text-yellow-600">
                        Expires: {new Date(band.valid_till!).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                  {expiringPriceBands.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{expiringPriceBands.length - 3} more expiring
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No expiring transport prices
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Suppliers Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-orange-600" />
              <CardTitle>Suppliers</CardTitle>
            </div>
            <CardDescription>
              Manage your suppliers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Link href="/my/suppliers" className="w-full">
                <Button className="w-full" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Supplier
                </Button>
              </Link>
              <Link href="/my/suppliers" className="w-full">
                <Button className="w-full" variant="outline">
                  <Search className="mr-2 h-4 w-4" />
                  Search Suppliers
                </Button>
              </Link>
              <Link href="/my/suppliers" className="w-full">
                <Button className="w-full" variant="outline">
                  <Eye className="mr-2 h-4 w-4" />
                  View Profiles
                </Button>
              </Link>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Your Suppliers</span>
                <Badge variant="outline" className="text-xs">
                  {mySuppliers.length}
                </Badge>
              </div>
              {mySuppliers.length > 0 ? (
                <div className="space-y-2">
                  {mySuppliers.slice(0, 3).map((supplier, index) => (
                    <div key={index} className="text-xs border-l-2 border-orange-500 pl-2">
                      <div className="font-medium">{supplier.name}</div>
                      <div className="text-muted-foreground">
                        {supplier.city && supplier.country
                          ? `${supplier.city}, ${supplier.country}`
                          : supplier.country || supplier.city || 'Location not set'
                        }
                      </div>
                    </div>
                  ))}
                  {mySuppliers.length > 3 && (
                    <Link href="/my/suppliers" className="text-xs text-blue-600 hover:underline">
                      View all {mySuppliers.length} suppliers
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No suppliers assigned to you yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customers Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <CardTitle>Customers</CardTitle>
            </div>
            <CardDescription>
              Manage your customers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Link href="/my/customers" className="w-full">
                <Button className="w-full" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Customer
                </Button>
              </Link>
              <Link href="/my/customers" className="w-full">
                <Button className="w-full" variant="outline">
                  <Search className="mr-2 h-4 w-4" />
                  Search Customers
                </Button>
              </Link>
              <Link href="/my/customers" className="w-full">
                <Button className="w-full" variant="outline">
                  <Eye className="mr-2 h-4 w-4" />
                  View Profiles
                </Button>
              </Link>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Your Customers</span>
                <Badge variant="outline" className="text-xs">
                  {myCustomers.length}
                </Badge>
              </div>
              {myCustomers.length > 0 ? (
                <div className="space-y-2">
                  {myCustomers.slice(0, 3).map((customer, index) => (
                    <div key={index} className="text-xs border-l-2 border-blue-500 pl-2">
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-muted-foreground">
                        {customer.city && customer.country
                          ? `${customer.city}, ${customer.country}`
                          : customer.country || customer.city || 'Location not set'
                        }
                      </div>
                      {customer.email && (
                        <div className="text-muted-foreground">{customer.email}</div>
                      )}
                    </div>
                  ))}
                  {myCustomers.length > 3 && (
                    <Link href="/my/customers" className="text-xs text-blue-600 hover:underline">
                      View all {myCustomers.length} customers
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No customers assigned to you yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
