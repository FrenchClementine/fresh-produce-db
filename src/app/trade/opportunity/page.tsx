'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Loader2,
  Plus,
  Search,
  Filter,
  Save,
  X,
  Eye,
  MessageSquare,
  DollarSign,
  TrendingUp,
  Calendar,
  User,
  Target,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2
} from 'lucide-react'
import {
  useOpportunities,
  useOpportunitySummary,
  useCreateOpportunity,
  useUpdateOpportunity,
  useDeleteOpportunity
} from '@/hooks/use-opportunities'
import { useActiveStaff } from '@/hooks/use-staff'
import { OpportunityStatus, OpportunityPriority, CreateOpportunityData } from '@/types/opportunities'
import { format, isAfter, isBefore, addDays } from 'date-fns'
import Link from 'next/link'
import { toast } from 'sonner'
import { getPriceStatus, formatPriceStatusBadge } from '@/lib/price-utils'
import {
  useBatchFlagPriceChanges,
  useOpportunitiesWithPriceChanges,
  useUpdateOpportunityPriceStatus,
  useDeactivateChangedOpportunities,
  useAutoDeactivateOnPriceChange
} from '@/hooks/use-price-change-detection'
import { TransportDisplay } from '@/components/transport-display'

// Simple currency formatter
const formatCurrency = (amount: number, currency: string = 'EUR') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'EUR',
  }).format(amount)
}

const statusConfig = {
  draft: { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
  active: { color: 'bg-green-100 text-green-800', label: 'Active' },
  negotiating: { color: 'bg-yellow-100 text-yellow-800', label: 'Negotiating' },
  offered: { color: 'bg-blue-100 text-blue-800', label: 'Offered' },
  feedback_received: { color: 'bg-orange-100 text-orange-800', label: 'Feedback Received' },
  confirmed: { color: 'bg-purple-100 text-purple-800', label: 'Confirmed' },
  cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
  completed: { color: 'bg-emerald-100 text-emerald-800', label: 'Completed' },
}

const priorityConfig = {
  low: { color: 'bg-slate-100 text-slate-800', label: 'Low' },
  medium: { color: 'bg-blue-100 text-blue-800', label: 'Medium' },
  high: { color: 'bg-orange-100 text-orange-800', label: 'High' },
  urgent: { color: 'bg-red-100 text-red-800', label: 'Urgent' },
}

export default function OpportunityPage() {
  const [activeTab, setActiveTab] = useState('list')
  const [statusFilter, setStatusFilter] = useState<OpportunityStatus>('all')
  const [priorityFilter, setPriorityFilter] = useState<OpportunityPriority>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showInactiveOnly, setShowInactiveOnly] = useState(false)
  const [sortField, setSortField] = useState<string>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  // Form states for creating new opportunity
  const [isCreating, setIsCreating] = useState(false)
  const [newOpportunity, setNewOpportunity] = useState<Partial<CreateOpportunityData>>({
    status: 'draft',
    priority: 'medium',
    offer_currency: 'EUR'
  })

  // Inline editing states
  const [editingFeedback, setEditingFeedback] = useState<string | null>(null)
  const [feedbackValue, setFeedbackValue] = useState('')

  // Data fetching
  const { data: opportunities = [], isLoading, error, refetch } = useOpportunities(
    statusFilter,
    priorityFilter,
    !showInactiveOnly,
    undefined
  )
  const { data: summary } = useOpportunitySummary()
  const { activeStaff } = useActiveStaff()
  const createMutation = useCreateOpportunity()
  const updateMutation = useUpdateOpportunity()
  const deleteMutation = useDeleteOpportunity()

  // Price change detection hooks
  const batchFlagMutation = useBatchFlagPriceChanges()
  const { data: priceChangeOpportunities } = useOpportunitiesWithPriceChanges()
  const updatePriceStatusMutation = useUpdateOpportunityPriceStatus()
  const deactivateChangedMutation = useDeactivateChangedOpportunities()
  const autoDeactivateMutation = useAutoDeactivateOnPriceChange()

  // Inline feedback editing handlers
  const handleEditFeedback = (opportunityId: string, currentFeedback?: string) => {
    setEditingFeedback(opportunityId)
    setFeedbackValue(currentFeedback || '')
  }

  const handleSaveFeedback = async (opportunityId: string) => {
    try {
      await updateMutation.mutateAsync({
        id: opportunityId,
        data: {
          quote_feedback: feedbackValue,
          status: 'feedback_received'
        }
      })
      setEditingFeedback(null)
      setFeedbackValue('')
    } catch (error) {
      console.error('Error saving feedback:', error)
    }
  }

  const handleCancelFeedback = () => {
    setEditingFeedback(null)
    setFeedbackValue('')
  }

  const handleRemoveOpportunity = async (opportunityId: string, customerName: string, supplierName: string) => {
    if (window.confirm(`Are you sure you want to remove this opportunity for ${customerName} ↔ ${supplierName}? This will move it back to potential trades.`)) {
      try {
        await deleteMutation.mutateAsync(opportunityId)
      } catch (error) {
        console.error('Failed to remove opportunity:', error)
      }
    }
  }

  const handleStatusUpdate = async (opportunityId: string, newStatus: OpportunityStatus) => {
    if (newStatus === 'all') return // Skip if "all" is somehow passed
    setUpdatingStatus(opportunityId)
    try {
      await updateMutation.mutateAsync({
        id: opportunityId,
        data: { status: newStatus as any }
      })
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    } finally {
      setUpdatingStatus(null)
    }
  }

  // Create opportunity handler
  const handleCreateOpportunity = async () => {
    if (!newOpportunity.customer_id || !newOpportunity.supplier_id || !newOpportunity.product_packaging_spec_id) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      await createMutation.mutateAsync(newOpportunity as CreateOpportunityData)
      setIsCreating(false)
      setNewOpportunity({
        status: 'draft',
        priority: 'medium',
        offer_currency: 'EUR'
      })
      toast.success('Opportunity created successfully')
    } catch (error) {
      toast.error('Failed to create opportunity')
    }
  }

  // Filter and sort opportunities
  const filteredOpportunities = opportunities.filter(opportunity => {
    const matchesSearch = !searchTerm ||
      opportunity.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opportunity.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opportunity.product_packaging_specs?.products.name.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  }).sort((a, b) => {
    const aVal = a[sortField as keyof typeof a]
    const bVal = b[sortField as keyof typeof b]
    const direction = sortDirection === 'asc' ? 1 : -1

    if (aVal == null && bVal == null) return 0
    if (aVal == null) return 1 * direction
    if (bVal == null) return -1 * direction
    if (aVal < bVal) return -1 * direction
    if (aVal > bVal) return 1 * direction
    return 0
  })

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-50" />
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3" />
      : <ArrowDown className="h-3 w-3" />
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Opportunities</h1>
          <p className="text-muted-foreground">Manage your trade opportunities</p>
        </div>
        <Button onClick={() => setActiveTab('create')}>
          <Plus className="mr-2 h-4 w-4" />
          Create Opportunity
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Opportunities</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total}</div>
              <p className="text-xs text-muted-foreground">
                {summary.active} active, {summary.inactive} inactive
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Opportunities</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.active}</div>
              <p className="text-xs text-muted-foreground">
                {summary.confirmed} confirmed
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.expiringSoon}</div>
              <p className="text-xs text-muted-foreground">
                Next 7 days
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Price Changes</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.priceChanges || 0}</div>
              <p className="text-xs text-muted-foreground">
                Need attention
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list">Opportunity List</TabsTrigger>
          <TabsTrigger value="create">Create New</TabsTrigger>
          <TabsTrigger value="manage">Price Management</TabsTrigger>
        </TabsList>

        {/* Opportunities List Tab */}
        <TabsContent value="list" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters & Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search opportunities..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="min-w-[150px]">
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as OpportunityStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="negotiating">Negotiating</SelectItem>
                      <SelectItem value="offered">Offered</SelectItem>
                      <SelectItem value="feedback_received">Feedback Received</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[150px]">
                  <Label>Priority</Label>
                  <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as OpportunityPriority)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Opportunities Table */}
          <Card>
            <CardHeader>
              <CardTitle>Opportunities ({filteredOpportunities.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-medium hover:bg-transparent"
                          onClick={() => handleSort('customer')}
                        >
                          Customer
                          {getSortIcon('customer')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-medium hover:bg-transparent"
                          onClick={() => handleSort('supplier')}
                        >
                          Supplier
                          {getSortIcon('supplier')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-medium hover:bg-transparent"
                          onClick={() => handleSort('product')}
                        >
                          Product
                          {getSortIcon('product')}
                        </Button>
                      </TableHead>
                      <TableHead>Transport Details</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-medium hover:bg-transparent"
                          onClick={() => handleSort('pricing')}
                        >
                          Pricing
                          {getSortIcon('pricing')}
                        </Button>
                      </TableHead>
                      <TableHead>Feedback</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-medium hover:bg-transparent"
                          onClick={() => handleSort('status')}
                        >
                          Status
                          {getSortIcon('status')}
                        </Button>
                      </TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOpportunities.map((opportunity) => (
                      <TableRow key={opportunity.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{opportunity.customer?.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {opportunity.customer?.city}, {opportunity.customer?.country}
                            </div>
                            {opportunity.customer?.agent && (
                              <div className="text-xs text-muted-foreground">
                                Agent: {opportunity.customer.agent.name}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{opportunity.supplier?.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {opportunity.supplier?.city}, {opportunity.supplier?.country}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-sm">
                              {opportunity.product_packaging_specs?.products.name}
                            </div>
                            <div className="flex gap-1">
                              <Badge variant="outline" className="text-xs">
                                {opportunity.product_packaging_specs?.packaging_options.label}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {opportunity.product_packaging_specs?.size_options.name}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <TransportDisplay opportunity={opportunity} />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {opportunity.offer_price_per_unit && (
                              <div className="font-medium text-green-600">
                                {formatCurrency(opportunity.offer_price_per_unit, opportunity.offer_currency)}
                                {opportunity.product_packaging_specs?.products?.sold_by && (
                                  <span className="text-xs ml-1">/{opportunity.product_packaging_specs.products.sold_by}</span>
                                )}
                              </div>
                            )}
                            {opportunity.supplier_price && (
                              <div className="text-xs text-muted-foreground">
                                Cost: {formatCurrency(opportunity.supplier_price.price_per_unit, opportunity.supplier_price.currency)}
                                {opportunity.product_packaging_specs?.products?.sold_by && (
                                  <span>/{opportunity.product_packaging_specs.products.sold_by}</span>
                                )}
                              </div>
                            )}
                            {opportunity.price_status && (
                              <div className="text-xs">
                                {formatPriceStatusBadge(opportunity.price_status)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            {editingFeedback === opportunity.id ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={feedbackValue}
                                  onChange={(e) => setFeedbackValue(e.target.value)}
                                  className="min-h-[60px]"
                                  placeholder="Add quote feedback..."
                                />
                                <div className="flex gap-1">
                                  <Button size="sm" onClick={() => handleSaveFeedback(opportunity.id)}>
                                    <Save className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={handleCancelFeedback}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm min-h-[40px] cursor-pointer hover:bg-gray-50 p-1 rounded"
                                   onClick={() => handleEditFeedback(opportunity.id, opportunity.quote_feedback)}>
                                {opportunity.quote_feedback || <span className="text-muted-foreground italic">Click to add feedback...</span>}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Select
                              value={opportunity.status}
                              onValueChange={(newStatus: OpportunityStatus) => handleStatusUpdate(opportunity.id, newStatus)}
                              disabled={updatingStatus === opportunity.id}
                            >
                              <SelectTrigger className="w-full h-8">
                                <SelectValue>
                                  <div className="flex items-center gap-2">
                                    {updatingStatus === opportunity.id && <Loader2 className="h-3 w-3 animate-spin" />}
                                    <Badge className={statusConfig[opportunity.status].color} variant="outline">
                                      {statusConfig[opportunity.status].label}
                                    </Badge>
                                  </div>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="draft">
                                  <Badge className={statusConfig.draft.color} variant="outline">
                                    {statusConfig.draft.label}
                                  </Badge>
                                </SelectItem>
                                <SelectItem value="active">
                                  <Badge className={statusConfig.active.color} variant="outline">
                                    {statusConfig.active.label}
                                  </Badge>
                                </SelectItem>
                                <SelectItem value="negotiating">
                                  <Badge className={statusConfig.negotiating.color} variant="outline">
                                    {statusConfig.negotiating.label}
                                  </Badge>
                                </SelectItem>
                                <SelectItem value="offered">
                                  <Badge className={statusConfig.offered.color} variant="outline">
                                    {statusConfig.offered.label}
                                  </Badge>
                                </SelectItem>
                                <SelectItem value="feedback_received">
                                  <Badge className={statusConfig.feedback_received.color} variant="outline">
                                    {statusConfig.feedback_received.label}
                                  </Badge>
                                </SelectItem>
                                <SelectItem value="confirmed">
                                  <Badge className={statusConfig.confirmed.color} variant="outline">
                                    {statusConfig.confirmed.label}
                                  </Badge>
                                </SelectItem>
                                <SelectItem value="cancelled">
                                  <Badge className={statusConfig.cancelled.color} variant="outline">
                                    {statusConfig.cancelled.label}
                                  </Badge>
                                </SelectItem>
                                <SelectItem value="completed">
                                  <Badge className={statusConfig.completed.color} variant="outline">
                                    {statusConfig.completed.label}
                                  </Badge>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <Badge className={priorityConfig[opportunity.priority].color} variant="outline">
                              {priorityConfig[opportunity.priority].label}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Link href={`/trade/opportunities/${opportunity.id}`}>
                              <Button size="sm" variant="outline" title="View Details">
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300"
                              onClick={() => handleRemoveOpportunity(
                                opportunity.id,
                                opportunity.customer?.name || 'Unknown Customer',
                                opportunity.supplier?.name || 'Unknown Supplier'
                              )}
                              disabled={deleteMutation.isPending}
                              title="Remove opportunity and send back to potential"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create Opportunity Tab */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Opportunity</CardTitle>
              <CardDescription>
                Create a new trade opportunity from existing trade potential or build from scratch.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer">Customer *</Label>
                    <Input
                      id="customer"
                      placeholder="Select customer..."
                      value={newOpportunity.customer_id || ''}
                      onChange={(e) => setNewOpportunity(prev => ({ ...prev, customer_id: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplier">Supplier *</Label>
                    <Input
                      id="supplier"
                      placeholder="Select supplier..."
                      value={newOpportunity.supplier_id || ''}
                      onChange={(e) => setNewOpportunity(prev => ({ ...prev, supplier_id: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="product">Product Specification *</Label>
                  <Input
                    id="product"
                    placeholder="Select product packaging spec..."
                    value={newOpportunity.product_packaging_spec_id || ''}
                    onChange={(e) => setNewOpportunity(prev => ({ ...prev, product_packaging_spec_id: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="offer-price">Offer Price per Unit *</Label>
                    <Input
                      id="offer-price"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newOpportunity.offer_price_per_unit || ''}
                      onChange={(e) => setNewOpportunity(prev => ({ ...prev, offer_price_per_unit: parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={newOpportunity.offer_currency || 'EUR'}
                      onValueChange={(value) => setNewOpportunity(prev => ({ ...prev, offer_currency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={newOpportunity.priority || 'medium'}
                      onValueChange={(value) => setNewOpportunity(prev => ({ ...prev, priority: value as OpportunityPriority }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Internal Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any internal notes..."
                    value={newOpportunity.internal_notes || ''}
                    onChange={(e) => setNewOpportunity(prev => ({ ...prev, internal_notes: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="customer-requirements">Customer Requirements</Label>
                  <Textarea
                    id="customer-requirements"
                    placeholder="Describe customer requirements..."
                    value={newOpportunity.customer_requirements || ''}
                    onChange={(e) => setNewOpportunity(prev => ({ ...prev, customer_requirements: e.target.value }))}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCreateOpportunity} disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Opportunity
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setNewOpportunity({
                      status: 'draft',
                      priority: 'medium',
                      offer_currency: 'EUR'
                    })}
                  >
                    Clear Form
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Price Management Tab */}
        <TabsContent value="manage" className="space-y-4">
          {priceChangeOpportunities && priceChangeOpportunities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Price Change Management</CardTitle>
                <CardDescription>
                  Opportunities with price changes that need attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap mb-4">
                  <Button
                    onClick={() => batchFlagMutation.mutate()}
                    disabled={batchFlagMutation.isPending}
                    variant="outline"
                    size="sm"
                  >
                    {batchFlagMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Check All Prices
                  </Button>
                  <Button
                    onClick={() => autoDeactivateMutation.mutate()}
                    disabled={autoDeactivateMutation.isPending}
                    variant="secondary"
                    size="sm"
                  >
                    {autoDeactivateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Auto-Process Price Changes
                  </Button>
                  <Button
                    onClick={() => {
                      const changedIds = priceChangeOpportunities
                        .filter(opp => opp.price_status === 'changed' || opp.price_status === 'expired')
                        .map(opp => opp.id)
                      if (changedIds.length > 0) {
                        deactivateChangedMutation.mutate(changedIds)
                      }
                    }}
                    disabled={deactivateChangedMutation.isPending}
                    variant="destructive"
                    size="sm"
                  >
                    {deactivateChangedMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Deactivate All Changed
                  </Button>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Price Status</TableHead>
                        <TableHead>Current Price</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {priceChangeOpportunities.map((opportunity) => (
                        <TableRow key={opportunity.id}>
                          <TableCell>{opportunity.customer?.name}</TableCell>
                          <TableCell>{opportunity.supplier?.name}</TableCell>
                          <TableCell>{opportunity.product_packaging_specs?.products.name}</TableCell>
                          <TableCell>
                            {formatPriceStatusBadge(opportunity.price_status)}
                          </TableCell>
                          <TableCell>
                            {opportunity.offer_price_per_unit &&
                              formatCurrency(opportunity.offer_price_per_unit, 'EUR')
                            }
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updatePriceStatusMutation.mutate({
                                    opportunityId: opportunity.id,
                                    newStatus: 'reviewed'
                                  })
                                }
                              >
                                Mark Reviewed
                              </Button>
                              <Link href={`/trade/opportunities/${opportunity.id}`}>
                                <Button size="sm" variant="outline" title="View Details">
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}