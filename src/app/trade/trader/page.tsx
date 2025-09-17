'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Target,
  Users,
  Package,
  TrendingUp,
  Building2,
  MapPin,
  Truck,
  Euro,
  Clock,
  Calendar,
  Scale,
  Filter,
  Eye,
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
  Route
} from 'lucide-react'
import { useTradeOpportunities, useTradeOpportunityStats, type TradeOpportunityFilters } from '@/hooks/use-trade-opportunities'
import { useActiveStaff } from '@/hooks/use-staff'
import { useActiveCustomers } from '@/hooks/use-customers'
import { useProducts } from '@/hooks/use-products'
import { format } from 'date-fns'

export default function TraderPage() {
  const [filters, setFilters] = useState<TradeOpportunityFilters>({
    staffId: 'all',
    status: undefined,
    priority: undefined
  })
  const [selectedOpportunity, setSelectedOpportunity] = useState<string | null>(null)

  // Fetch data
  const { data: opportunities = [], isLoading, error } = useTradeOpportunities(filters)
  const { stats, isLoading: statsLoading } = useTradeOpportunityStats(filters)
  const { activeStaff = [] } = useActiveStaff()
  const { activeCustomers = [] } = useActiveCustomers()
  const { products = [] } = useProducts()

  // Get unique product categories for filtering
  const productCategories = React.useMemo(() => {
    const categories = new Set(products.map(p => p.category))
    return Array.from(categories).sort()
  }, [products])

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getLogisticsIcon = (solutionType: string) => {
    switch (solutionType) {
      case 'SUPPLIER_DELIVERY': return <Truck className="h-3 w-3" />
      case 'CUSTOMER_PICKUP': return <MapPin className="h-3 w-3" />
      case 'THIRD_PARTY_TRANSPORT': return <Route className="h-3 w-3" />
      case 'SUPPLIER_TRANSIT': return <Building2 className="h-3 w-3" />
      default: return <Circle className="h-3 w-3" />
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return <AlertTriangle className="h-3 w-3" />
      case 'medium': return <Circle className="h-3 w-3" />
      case 'low': return <CheckCircle2 className="h-3 w-3" />
      default: return <Circle className="h-3 w-3" />
    }
  }

  const formatCurrency = (amount: number, currency = 'EUR') => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatUnits = (amount: number, soldBy: string) => {
    const unit = soldBy === 'kg' ? 'kg' :
                 soldBy === 'box' ? 'boxes' :
                 soldBy === 'piece' ? 'pcs' :
                 soldBy === 'punnet' ? 'punnets' :
                 soldBy === 'bag' ? 'bags' : 'units'
    return `${amount.toLocaleString()} ${unit}`
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trade Opportunities</h1>
          <p className="text-muted-foreground">Loading trade opportunities...</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trade Opportunities</h1>
          <p className="text-muted-foreground">Error loading trade opportunities</p>
        </div>
        <Card>
          <CardContent className="py-6">
            <div className="text-center text-red-600">
              <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
              <p>Failed to load trade opportunities. Please try again.</p>
              <p className="text-sm mt-2">{error.message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trade Opportunities</h1>
        <p className="text-muted-foreground">
          Discover and manage customer-supplier matching opportunities based on logistics capabilities
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Opportunities</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOpportunities}</div>
            <p className="text-xs text-muted-foreground">
              {stats.highPriorityCount} high priority
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueCustomers}</div>
            <p className="text-xs text-muted-foreground">
              With matching suppliers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueProducts}</div>
            <p className="text-xs text-muted-foreground">
              Products with opportunities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageMargin.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Potential revenue: {formatCurrency(stats.totalPotentialRevenue)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter opportunities by staff, priority, and customer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {/* Staff Filter */}
            <div className="space-y-2">
              <Label>Staff Member</Label>
              <Select
                value={filters.staffId || 'all'}
                onValueChange={(value) => setFilters(prev => ({ ...prev, staffId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All staff</SelectItem>
                  <SelectItem value="me">My customers only</SelectItem>
                  {activeStaff.map(staff => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority Filter */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={filters.priority || 'all'}
                onValueChange={(value) => setFilters(prev => ({
                  ...prev,
                  priority: value === 'all' ? undefined : value as any
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="high">High priority</SelectItem>
                  <SelectItem value="medium">Medium priority</SelectItem>
                  <SelectItem value="low">Low priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Product Category Filter */}
            <div className="space-y-2">
              <Label>Product Category</Label>
              <Select
                value={filters.productCategory || 'all'}
                onValueChange={(value) => setFilters(prev => ({
                  ...prev,
                  productCategory: value === 'all' ? undefined : value
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {productCategories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Customer Filter */}
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select
                value={filters.customerId || 'all'}
                onValueChange={(value) => setFilters(prev => ({
                  ...prev,
                  customerId: value === 'all' ? undefined : value
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All customers</SelectItem>
                  {activeCustomers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Opportunities Table */}
      <Card>
        <CardHeader>
          <CardTitle>Trade Opportunities</CardTitle>
          <CardDescription>
            Showing {opportunities.length} matching opportunit{opportunities.length !== 1 ? 'ies' : 'y'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {opportunities.length === 0 ? (
            <div className="text-center py-12">
              <Target className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium">No opportunities found</h3>
              <p className="text-gray-500">
                Try adjusting your filters or ensure customers have logistics capabilities and suppliers have pricing data
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Product Needed</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Logistics</TableHead>
                    <TableHead className="text-right">Pricing</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opportunities.map((opportunity) => (
                    <TableRow key={opportunity.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{opportunity.customer.name}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {opportunity.customer.city}
                            {opportunity.customer.country && `, ${opportunity.customer.country}`}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{opportunity.customer.agent.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{opportunity.product.name}</div>
                          <div className="text-sm text-gray-500">
                            {opportunity.product.sizeName} • {opportunity.product.packagingLabel}
                          </div>
                          <div className="text-xs text-gray-400 flex items-center gap-1">
                            <Scale className="h-3 w-3" />
                            {formatUnits(opportunity.product.unitsPerPallet, opportunity.product.soldBy)}/pallet
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{opportunity.supplier.name}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {opportunity.supplier.hubName}
                          </div>
                          <div className="text-xs text-gray-400 flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            {opportunity.supplier.deliveryMode}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="flex items-center gap-1 text-sm">
                            {getLogisticsIcon(opportunity.logistics.solutionType)}
                            <span className="capitalize">
                              {opportunity.logistics.solutionType.replace('_', ' ').toLowerCase()}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {opportunity.logistics.durationDays} day{opportunity.logistics.durationDays !== 1 ? 's' : ''}
                          </div>
                          {opportunity.logistics.transporterName && (
                            <div className="text-xs text-gray-400">
                              via {opportunity.logistics.transporterName}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div>
                          <div className="font-semibold text-green-700">
                            {formatCurrency(opportunity.pricing.finalPricePerUnit)}
                          </div>
                          <div className="text-sm text-gray-500">
                            Margin: {opportunity.pricing.marginPercentage.toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-400">
                            Base: {formatCurrency(opportunity.pricing.basePricePerUnit)}
                          </div>
                          {opportunity.pricing.transportCostPerUnit > 0 && (
                            <div className="text-xs text-gray-400">
                              Transport: {formatCurrency(opportunity.pricing.transportCostPerUnit)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(opportunity.priority)}>
                          <div className="flex items-center gap-1">
                            {getPriorityIcon(opportunity.priority)}
                            {opportunity.priority}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Trade Opportunity Details</DialogTitle>
                                <DialogDescription>
                                  Complete breakdown for {opportunity.customer.name} - {opportunity.product.name}
                                </DialogDescription>
                              </DialogHeader>

                              <div className="space-y-6">
                                {/* Customer & Product Info */}
                                <div className="grid gap-6 md:grid-cols-2">
                                  <div>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                      <Users className="h-4 w-4" />
                                      Customer Details
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                      <div><strong>Name:</strong> {opportunity.customer.name}</div>
                                      <div><strong>Location:</strong> {opportunity.customer.city}, {opportunity.customer.country}</div>
                                      <div><strong>Agent:</strong> {opportunity.customer.agent.name}</div>
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                      <Package className="h-4 w-4" />
                                      Product Requirements
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                      <div><strong>Product:</strong> {opportunity.product.name}</div>
                                      <div><strong>Category:</strong> {opportunity.product.category}</div>
                                      <div><strong>Size:</strong> {opportunity.product.sizeName}</div>
                                      <div><strong>Packaging:</strong> {opportunity.product.packagingLabel}</div>
                                      <div><strong>Units/Pallet:</strong> {formatUnits(opportunity.product.unitsPerPallet, opportunity.product.soldBy)}</div>
                                      <div><strong>Weight/Pallet:</strong> {opportunity.product.weightPerPallet} {opportunity.product.weightUnit}</div>
                                    </div>
                                  </div>
                                </div>

                                {/* Logistics Details */}
                                <div>
                                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <Route className="h-4 w-4" />
                                    Logistics Solution
                                  </h4>
                                  <div className="bg-blue-50 p-4 rounded-lg">
                                    <div className="text-sm space-y-2">
                                      <div><strong>Type:</strong> {opportunity.logistics.solutionType.replace('_', ' ')}</div>
                                      <div><strong>Route:</strong> {opportunity.logistics.supplierHub} → {opportunity.logistics.customerHub}</div>
                                      <div><strong>Duration:</strong> {opportunity.logistics.durationDays} day{opportunity.logistics.durationDays !== 1 ? 's' : ''}</div>
                                      {opportunity.logistics.transporterName && (
                                        <div><strong>Transporter:</strong> {opportunity.logistics.transporterName}</div>
                                      )}
                                      <div className="mt-2 text-xs text-gray-600">
                                        {opportunity.logistics.description}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Pricing Breakdown */}
                                <div>
                                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <Euro className="h-4 w-4" />
                                    Pricing Breakdown (per {opportunity.product.soldBy})
                                  </h4>
                                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                                    <div className="flex justify-between text-sm">
                                      <span>Supplier Price:</span>
                                      <span>{formatCurrency(opportunity.pricing.basePricePerUnit)}</span>
                                    </div>
                                    {opportunity.pricing.transportCostPerUnit > 0 && (
                                      <div className="flex justify-between text-sm">
                                        <span>Transport Cost:</span>
                                        <span>{formatCurrency(opportunity.pricing.transportCostPerUnit)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between text-sm">
                                      <span>Subtotal:</span>
                                      <span>{formatCurrency(opportunity.pricing.subtotalPerUnit)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span>Margin ({opportunity.pricing.marginPercentage}%):</span>
                                      <span>{formatCurrency(opportunity.pricing.marginPerUnit)}</span>
                                    </div>
                                    <div className="border-t pt-2">
                                      <div className="flex justify-between font-semibold">
                                        <span>Final Price per {opportunity.product.soldBy}:</span>
                                        <span className="text-green-700">{formatCurrency(opportunity.pricing.finalPricePerUnit)}</span>
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-500 pt-2">
                                      Per pallet: {formatCurrency(opportunity.pricing.finalPricePerUnit * opportunity.product.unitsPerPallet)}
                                    </div>
                                  </div>
                                </div>

                                {/* Supplier Details */}
                                <div>
                                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    Supplier Information
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <div><strong>Supplier:</strong> {opportunity.supplier.name}</div>
                                    <div><strong>Hub:</strong> {opportunity.supplier.hubName} ({opportunity.supplier.hubCode})</div>
                                    <div><strong>Delivery Mode:</strong> {opportunity.supplier.deliveryMode}</div>
                                    <div><strong>Price Valid Until:</strong> {format(new Date(opportunity.supplier.validUntil), 'MMM dd, yyyy')}</div>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2 pt-4 border-t">
                                  <Button size="sm">
                                    <Mail className="mr-1 h-4 w-4" />
                                    Generate Quote
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <Phone className="mr-1 h-4 w-4" />
                                    Contact Customer
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <Building2 className="mr-1 h-4 w-4" />
                                    Contact Supplier
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
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
    </div>
  )
}