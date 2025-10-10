'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import {
  Loader2,
  MoreHorizontal,
  Eye,
  Edit,
  MessageSquare,
  ToggleLeft,
  ToggleRight,
  Calendar,
  User,
  DollarSign,
  Target,
  TrendingUp,
  ExternalLink,
  Filter,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  FileText,
  Printer
} from 'lucide-react'
import {
  useOpportunities,
  useOpportunitySummary,
  useUpdateOpportunity,
  useDeleteOpportunity
} from '@/hooks/use-opportunities'
import { useActiveStaff } from '@/hooks/use-staff'
import { OpportunityStatus, OpportunityPriority } from '@/types/opportunities'
import { format, isAfter, isBefore, addDays } from 'date-fns'
import Link from 'next/link'
import { toast } from 'sonner'
import { getPriceStatus, formatPriceStatusBadge } from '@/lib/price-utils'
import { TransportDisplay } from '@/components/transport-display'
import { FeedbackDisplay } from '@/components/feedback-display'

// Simple currency formatter
const formatCurrency = (amount: number, currency: string = 'EUR') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount)
}

type SortField = 'customer' | 'product' | 'pricing' | 'status' | 'priority' | 'validUntil' | 'agent' | 'created'
type SortDirection = 'asc' | 'desc' | null

export default function TradeOpportunitiesPage() {
  const [statusFilter, setStatusFilter] = useState<OpportunityStatus>('all')
  const [priorityFilter, setPriorityFilter] = useState<OpportunityPriority>('all')
  const [activeOnly, setActiveOnly] = useState(true)
  const [assignedTo, setAssignedTo] = useState<string>()
  const [customerAgentFilter, setCustomerAgentFilter] = useState<string>('all')
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  const { data: opportunities, isLoading, error } = useOpportunities(
    statusFilter,
    priorityFilter,
    activeOnly,
    assignedTo
  )

  const { data: summary } = useOpportunitySummary()
  const { activeStaff } = useActiveStaff()
  const updateMutation = useUpdateOpportunity()
  const deleteMutation = useDeleteOpportunity()

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading opportunities...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Failed to load opportunities</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Filter opportunities by search term and additional filters
  const filteredOpportunities = opportunities?.filter(opp => {
    // Search term filter
    if (searchTerm !== '' &&
        !opp.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !opp.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !opp.product_packaging_specs?.products.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false
    }

    // Customer agent filter
    if (customerAgentFilter !== 'all' && opp.customer?.agent?.id !== customerAgentFilter) {
      return false
    }

    // Feedback status filter
    if (feedbackStatusFilter !== 'all' && (opp.feedback_status || 'none') !== feedbackStatusFilter) {
      return false
    }

    return true
  }) || []

  const statusConfig = {
    draft: { color: 'bg-gray-600/20 text-gray-400 border-gray-600 font-mono', label: 'Draft' },
    active: { color: 'bg-blue-600/20 text-blue-400 border-blue-600 font-mono', label: 'Active' },
    negotiating: { color: 'bg-yellow-600/20 text-yellow-400 border-yellow-600 font-mono', label: 'Negotiating' },
    offered: { color: 'bg-purple-600/20 text-purple-400 border-purple-600 font-mono', label: 'Offered' },
    feedback_received: { color: 'bg-orange-600/20 text-orange-400 border-orange-600 font-mono', label: 'Feedback Received' },
    confirmed: { color: 'bg-terminal-success/20 text-terminal-success border-terminal-success font-mono', label: 'Confirmed' },
    cancelled: { color: 'bg-terminal-alert/20 text-terminal-alert border-terminal-alert font-mono', label: 'Cancelled' },
    completed: { color: 'bg-terminal-success/20 text-terminal-success border-terminal-success font-mono', label: 'Completed' },
  }

  const priorityConfig = {
    low: { color: 'bg-gray-600/20 text-gray-400 border-gray-600 font-mono', label: 'Low' },
    medium: { color: 'bg-blue-600/20 text-blue-400 border-blue-600 font-mono', label: 'Medium' },
    high: { color: 'bg-orange-600/20 text-orange-400 border-orange-600 font-mono', label: 'High' },
    urgent: { color: 'bg-terminal-alert/20 text-terminal-alert border-terminal-alert font-mono', label: 'Urgent' },
  }

  const handleToggleActive = async (opportunityId: string, currentlyActive: boolean) => {
    try {
      await updateMutation.mutateAsync({
        id: opportunityId,
        data: { is_active: !currentlyActive }
      })
      toast.success(`Opportunity ${!currentlyActive ? 'activated' : 'deactivated'}`)
    } catch (error) {
      toast.error('Failed to update opportunity')
    }
  }

  const handleStatusUpdate = async (opportunityId: string, newStatus: string) => {
    try {
      await updateMutation.mutateAsync({
        id: opportunityId,
        data: { status: newStatus as any }
      })
      toast.success('Status updated successfully')
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const handleRemoveOpportunity = async (opportunityId: string, customerName: string, supplierName: string) => {
    if (window.confirm(`Are you sure you want to remove this opportunity for ${customerName} ↔ ${supplierName}? This will move it back to potential trades.`)) {
      try {
        await deleteMutation.mutateAsync(opportunityId)
        toast.success('Opportunity removed successfully')
      } catch (error) {
        console.error('Failed to remove opportunity:', error)
        toast.error('Failed to remove opportunity')
      }
    }
  }

  const getExpiryStatus = (validTill?: string) => {
    if (!validTill) return null

    const expiryDate = new Date(validTill)
    const now = new Date()
    const sevenDaysFromNow = addDays(now, 7)

    if (isBefore(expiryDate, now)) {
      return { status: 'expired', label: 'Expired', color: 'bg-red-100 text-red-800' }
    } else if (isBefore(expiryDate, sevenDaysFromNow)) {
      return { status: 'expiring', label: 'Expiring Soon', color: 'bg-yellow-100 text-yellow-800' }
    }
    return null
  }

  const handlePrintPriceList = () => {
    // Generate price list with pallet-level info
    const priceListWindow = window.open('', '_blank')
    if (!priceListWindow) {
      toast.error('Please allow popups to print price list')
      return
    }

    const priceListHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Price List - ${format(new Date(), 'MMM dd, yyyy')}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #333; }
          .header { margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f8f9fa; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .price { font-weight: bold; color: #16a34a; }
          .transport { color: #2563eb; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Price List</h1>
          <p><strong>Generated:</strong> ${format(new Date(), 'MMMM dd, yyyy HH:mm')}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Product</th>
              <th>Packaging & Size</th>
              <th>Price per Unit</th>
              <th>Units per Pallet</th>
              <th>Price per Pallet</th>
              <th>Transport</th>
              <th>Transport Band</th>
              <th>Valid Until</th>
            </tr>
          </thead>
          <tbody>
            ${filteredOpportunities.map(opp => {
              const spec = opp.product_packaging_specs
              const unitsPerPallet = spec?.boxes_per_pallet || 0
              const pricePerPallet = opp.offer_price_per_unit ? opp.offer_price_per_unit * unitsPerPallet : 0
              const transportBand = opp.selected_transport_band

              return `
                <tr>
                  <td>${opp.customer?.name || 'N/A'}<br/><small>${opp.customer?.city}, ${opp.customer?.country}</small></td>
                  <td>${spec?.products.name || 'N/A'}</td>
                  <td>${spec?.packaging_options.label || 'N/A'} - ${spec?.size_options.name || 'N/A'}</td>
                  <td class="price">${formatCurrency(opp.offer_price_per_unit || 0, opp.offer_currency)}/${spec?.products.sold_by || 'unit'}</td>
                  <td>${unitsPerPallet} ${spec?.products.sold_by || 'units'}</td>
                  <td class="price">${formatCurrency(pricePerPallet, opp.offer_currency)}</td>
                  <td class="transport">${opp.selected_transporter?.name || (opp.supplier_price?.delivery_mode === 'DELIVERY' ? 'DDP' : 'EXW')}</td>
                  <td>${transportBand ? `${transportBand.min_pallets}-${transportBand.max_pallets} pallets` : 'N/A'}</td>
                  <td>${opp.valid_till ? format(new Date(opp.valid_till), 'MMM dd, yyyy') : 'N/A'}</td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
        <div style="margin-top: 30px;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">Print</button>
          <button onclick="window.close()" style="padding: 10px 20px; margin-left: 10px; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
        </div>
      </body>
      </html>
    `

    priceListWindow.document.write(priceListHTML)
    priceListWindow.document.close()
  }

  return (
    <div className="min-h-screen bg-terminal-dark p-4 space-y-4">
      {/* Terminal Header */}
      <div className="flex items-center justify-between border-b border-terminal-border pb-4">
        <div className="flex items-center gap-4">
          <TrendingUp className="h-8 w-8 text-terminal-accent" />
          <div>
            <h1 className="text-2xl font-mono font-bold text-terminal-text tracking-wider">
              TRADE OPPORTUNITIES
            </h1>
            <p className="text-terminal-muted font-mono text-sm">
              Manage active opportunities and track quotes to customers
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePrintPriceList}
            className="bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print Price List
          </Button>
          <Button
            asChild
            className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono"
          >
            <Link href="/trade/potential">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Trade Potential
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card className="bg-terminal-panel border-terminal-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-mono text-terminal-muted">TOTAL</CardTitle>
              <Target className="h-4 w-4 text-terminal-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-terminal-text">{summary.total}</div>
              <p className="text-xs text-terminal-muted font-mono">
                {summary.active} active, {summary.inactive} inactive
              </p>
            </CardContent>
          </Card>

          <Card className="bg-terminal-panel border-terminal-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-mono text-terminal-muted">DRAFT</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-terminal-text">{summary.draft}</div>
            </CardContent>
          </Card>

          <Card className="bg-terminal-panel border-terminal-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-mono text-terminal-muted">OFFERED</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-purple-400">{summary.offered}</div>
            </CardContent>
          </Card>

          <Card className="bg-terminal-panel border-terminal-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-mono text-terminal-muted">CONFIRMED</CardTitle>
              <TrendingUp className="h-4 w-4 text-terminal-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-terminal-success">{summary.confirmed}</div>
            </CardContent>
          </Card>

          <Card className="bg-terminal-panel border-terminal-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-mono text-terminal-muted">URGENT</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-terminal-alert">{summary.byPriority.urgent}</div>
            </CardContent>
          </Card>

          <Card className="bg-terminal-panel border-terminal-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-mono text-terminal-muted">EXPIRING SOON</CardTitle>
              <Calendar className="h-4 w-4 text-terminal-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-terminal-warning">{summary.expiringSoon}</div>
              <p className="text-xs text-terminal-muted font-mono">
                {summary.expired} expired
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="bg-terminal-panel border-terminal-border">
        <CardHeader className="border-b border-terminal-border">
          <CardTitle className="flex items-center gap-2 font-mono text-sm text-terminal-text">
            <Filter className="h-4 w-4 text-terminal-accent" />
            FILTERS & SEARCH
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end pt-6">
          <div>
            <Label htmlFor="search" className="text-terminal-muted font-mono text-xs">SEARCH</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-terminal-muted" />
              <Input
                id="search"
                placeholder="Search opportunities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-terminal-dark border-terminal-border text-terminal-text font-mono"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="status-filter" className="text-terminal-muted font-mono text-xs">STATUS</Label>
            <Select value={statusFilter} onValueChange={(value: OpportunityStatus) => setStatusFilter(value)}>
              <SelectTrigger id="status-filter" className="bg-terminal-dark border-terminal-border text-terminal-text font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-terminal-panel border-terminal-border">
                <SelectItem value="all" className="font-mono text-terminal-text">All Statuses</SelectItem>
                <SelectItem value="draft" className="font-mono text-terminal-text">Draft</SelectItem>
                <SelectItem value="active" className="font-mono text-terminal-text">Active</SelectItem>
                <SelectItem value="negotiating" className="font-mono text-terminal-text">Negotiating</SelectItem>
                <SelectItem value="offered" className="font-mono text-terminal-text">Offered</SelectItem>
                <SelectItem value="confirmed" className="font-mono text-terminal-text">Confirmed</SelectItem>
                <SelectItem value="cancelled" className="font-mono text-terminal-text">Cancelled</SelectItem>
                <SelectItem value="completed" className="font-mono text-terminal-text">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="priority-filter" className="text-terminal-muted font-mono text-xs">PRIORITY</Label>
            <Select value={priorityFilter} onValueChange={(value: OpportunityPriority) => setPriorityFilter(value)}>
              <SelectTrigger id="priority-filter" className="bg-terminal-dark border-terminal-border text-terminal-text font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-terminal-panel border-terminal-border">
                <SelectItem value="all" className="font-mono text-terminal-text">All Priorities</SelectItem>
                <SelectItem value="low" className="font-mono text-terminal-text">Low</SelectItem>
                <SelectItem value="medium" className="font-mono text-terminal-text">Medium</SelectItem>
                <SelectItem value="high" className="font-mono text-terminal-text">High</SelectItem>
                <SelectItem value="urgent" className="font-mono text-terminal-text">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="customer-agent-filter" className="text-terminal-muted font-mono text-xs">CUSTOMER AGENT</Label>
            <Select value={customerAgentFilter} onValueChange={setCustomerAgentFilter}>
              <SelectTrigger id="customer-agent-filter" className="bg-terminal-dark border-terminal-border text-terminal-text font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-terminal-panel border-terminal-border">
                <SelectItem value="all" className="font-mono text-terminal-text">All Customer Agents</SelectItem>
                {activeStaff?.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id} className="font-mono text-terminal-text">
                    {staff.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="feedback-filter" className="text-terminal-muted font-mono text-xs">FEEDBACK STATUS</Label>
            <Select value={feedbackStatusFilter} onValueChange={setFeedbackStatusFilter}>
              <SelectTrigger id="feedback-filter" className="bg-terminal-dark border-terminal-border text-terminal-text font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-terminal-panel border-terminal-border">
                <SelectItem value="all" className="font-mono text-terminal-text">All Feedback</SelectItem>
                <SelectItem value="none" className="font-mono text-terminal-text">No Feedback</SelectItem>
                <SelectItem value="pending" className="font-mono text-terminal-text">Pending</SelectItem>
                <SelectItem value="received" className="font-mono text-terminal-text">Received</SelectItem>
                <SelectItem value="addressed" className="font-mono text-terminal-text">Addressed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="active-filter"
              checked={activeOnly}
              onCheckedChange={setActiveOnly}
            />
            <Label htmlFor="active-filter" className="font-mono text-terminal-text text-xs">Active Only</Label>
          </div>

          <div className="text-sm text-terminal-muted font-mono">
            Showing {filteredOpportunities.length} opportunities
          </div>
        </CardContent>
      </Card>

      {/* Opportunities Table */}
      <Card className="bg-terminal-panel border-terminal-border">
        <CardHeader className="border-b border-terminal-border">
          <CardTitle className="font-mono text-sm text-terminal-text">OPPORTUNITIES</CardTitle>
          <CardDescription className="font-mono text-xs text-terminal-muted">
            Manage and track your opportunities through the sales pipeline
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-terminal-border hover:bg-terminal-dark">
                  <TableHead className="font-mono text-terminal-muted">Customer</TableHead>
                  <TableHead className="font-mono text-terminal-muted">Product</TableHead>
                  <TableHead className="font-mono text-terminal-muted">Sales Price</TableHead>
                  <TableHead className="font-mono text-terminal-muted">Transport & Delivery</TableHead>
                  <TableHead className="font-mono text-terminal-muted">Status</TableHead>
                  <TableHead className="font-mono text-terminal-muted">Agent</TableHead>
                  <TableHead className="font-mono text-terminal-muted">Feedback</TableHead>
                  <TableHead className="font-mono text-terminal-muted">Valid Until</TableHead>
                  <TableHead className="font-mono text-terminal-muted">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOpportunities.map((opportunity) => {
                  const margin = opportunity.offer_price_per_unit && opportunity.estimated_total_cost
                    ? opportunity.offer_price_per_unit - opportunity.estimated_total_cost
                    : 0

                  const marginPercentage = opportunity.offer_price_per_unit && margin
                    ? (margin / opportunity.offer_price_per_unit) * 100
                    : 0

                  const expiryStatus = getExpiryStatus(opportunity.valid_till)
                  const supplierPriceStatus = getPriceStatus(opportunity.supplier_price?.valid_until)

                  return (
                    <TableRow key={opportunity.id} className="border-terminal-border hover:bg-terminal-dark/50">
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium font-mono text-terminal-text">{opportunity.customer?.name}</div>
                          <div className="text-sm text-terminal-muted font-mono">
                            {opportunity.customer?.city}, {opportunity.customer?.country}
                          </div>
                          <div className="text-xs text-terminal-muted font-mono">
                            Supplier: {opportunity.selected_supplier?.name || opportunity.supplier?.name}
                          </div>
                          {opportunity.customer?.agent && (
                            <Badge variant="outline" className="text-xs bg-terminal-dark text-terminal-text border-terminal-border font-mono">
                              Agent: {opportunity.customer.agent.name}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium font-mono text-terminal-text">
                            {opportunity.product_packaging_specs?.products.name}
                          </div>
                          <div className="flex gap-1 flex-wrap">
                            <Badge variant="outline" className="text-xs bg-terminal-dark text-terminal-text border-terminal-border font-mono">
                              {opportunity.product_packaging_specs?.products.category}
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-terminal-dark text-terminal-text border-terminal-border font-mono">
                              {opportunity.product_packaging_specs?.packaging_options.label}
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-terminal-dark text-terminal-text border-terminal-border font-mono">
                              {opportunity.product_packaging_specs?.size_options.name}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          {opportunity.offer_price_per_unit ? (
                            <div className="text-lg font-bold text-terminal-success font-mono">
                              {formatCurrency(opportunity.offer_price_per_unit, opportunity.offer_currency)}
                              {opportunity.product_packaging_specs?.products?.sold_by && (
                                <span className="text-sm ml-1 text-terminal-text">/{opportunity.product_packaging_specs.products.sold_by}</span>
                              )}
                            </div>
                          ) : (
                            <div className="text-sm text-terminal-muted font-mono">No price set</div>
                          )}
                          {margin > 0 && (
                            <div className={`text-xs font-mono ${margin >= 0 ? 'text-terminal-success' : 'text-terminal-alert'}`}>
                              Margin: {formatCurrency(margin)} ({marginPercentage.toFixed(1)}%)
                            </div>
                          )}
                          {(supplierPriceStatus.isExpired || supplierPriceStatus.isExpiringSoon) && (
                            <Badge
                              variant={formatPriceStatusBadge(supplierPriceStatus).variant}
                              className="text-xs font-mono"
                            >
                              {formatPriceStatusBadge(supplierPriceStatus).text}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <TransportDisplay opportunity={opportunity} />
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline" className={statusConfig[opportunity.status].color}>
                            {statusConfig[opportunity.status].label}
                          </Badge>
                          <Badge variant="outline" className={priorityConfig[opportunity.priority].color}>
                            {priorityConfig[opportunity.priority].label}
                          </Badge>
                          {!opportunity.is_active && (
                            <Badge variant="outline" className="text-xs bg-gray-600/20 text-gray-400 border-gray-600 font-mono">
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium font-mono text-terminal-text">
                            {opportunity.customer?.agent?.name || 'No agent assigned'}
                          </div>
                          <div className="text-xs text-terminal-muted font-mono">
                            Created {format(new Date(opportunity.created_at), 'MMM dd')}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <FeedbackDisplay opportunity={opportunity} />
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          {opportunity.valid_till && (
                            <div className="text-sm font-mono text-terminal-text">
                              {format(new Date(opportunity.valid_till), 'MMM dd, yyyy')}
                            </div>
                          )}
                          {expiryStatus && (
                            <Badge className={`${expiryStatus.color} font-mono`} variant="outline">
                              {expiryStatus.label}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          <Link href={`/trade/opportunities/${opportunity.id}`}>
                            <Button size="sm" variant="outline" className="bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono">
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Feedback
                            </Button>
                          </Link>

                          {opportunity.status !== 'offered' ? (
                            <Button
                              size="sm"
                              className="bg-purple-600 hover:bg-purple-700 text-white font-mono"
                              onClick={() => handleStatusUpdate(opportunity.id, 'offered')}
                              disabled={updateMutation.isPending}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Quote
                            </Button>
                          ) : (
                            <Badge className="bg-purple-600/20 text-purple-400 border-purple-600 px-3 py-1 font-mono">
                              Quoted
                            </Badge>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-terminal-dark border-terminal-border text-terminal-alert hover:bg-terminal-panel hover:border-terminal-alert font-mono"
                            onClick={() => handleRemoveOpportunity(
                              opportunity.id,
                              opportunity.customer?.name || 'Unknown Customer',
                              opportunity.supplier?.name || 'Unknown Supplier'
                            )}
                            disabled={deleteMutation.isPending}
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
          </div>

          {filteredOpportunities.length === 0 && (
            <div className="text-center py-8 text-terminal-muted font-mono">
              No opportunities found matching your filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}