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
  Building2
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of recent activity and system status.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Trade Section */}
        <div className="md:col-span-2 lg:col-span-3">
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
              <Link href="/trade/input-prices">
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

        {/* Quick Links */}
        <div className="md:col-span-2 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Quick Links
              </CardTitle>
              <CardDescription>
                Access key system functions
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <Link href="/transport">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3 text-center">
                    <Truck className="h-8 w-8 mx-auto text-purple-600" />
                    <CardTitle className="text-sm">Transport</CardTitle>
                    <CardDescription className="text-xs">
                      Route planning
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/settings">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3 text-center">
                    <Settings className="h-8 w-8 mx-auto text-gray-600" />
                    <CardTitle className="text-sm">Settings</CardTitle>
                    <CardDescription className="text-xs">
                      System configuration
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/suppliers">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3 text-center">
                    <Building2 className="h-8 w-8 mx-auto text-orange-600" />
                    <CardTitle className="text-sm">Suppliers</CardTitle>
                    <CardDescription className="text-xs">
                      Manage suppliers
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/customers">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3 text-center">
                    <Users className="h-8 w-8 mx-auto text-blue-600" />
                    <CardTitle className="text-sm">Customers</CardTitle>
                    <CardDescription className="text-xs">
                      Manage customers
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
