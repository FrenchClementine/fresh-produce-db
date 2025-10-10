'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Plus, Search, Filter, CheckCircle2 } from 'lucide-react'
import { useCustomerRequests, useCustomerRequestStats, useUpdateCustomerRequest } from '@/hooks/use-customer-requests'
import { CustomerRequestFilters, RequestStatus } from '@/types/customer-requests'
import { format } from 'date-fns'
import { LogCustomerRequestForm } from '@/components/forms/log-customer-request-form'

export default function CustomerRequestsPage() {
  const [filters, setFilters] = useState<CustomerRequestFilters>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [showLogForm, setShowLogForm] = useState(false)

  const { data: requests, isLoading } = useCustomerRequests(filters)
  const { data: stats } = useCustomerRequestStats()
  const updateRequest = useUpdateCustomerRequest()

  const handleMarkComplete = async (e: React.MouseEvent, requestId: string) => {
    e.stopPropagation() // Prevent row click navigation
    await updateRequest.mutateAsync({
      id: requestId,
      data: { status: 'closed' }
    })
  }

  // Filter requests by search term
  const filteredRequests = requests?.filter((request) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      request.customers?.name.toLowerCase().includes(searchLower) ||
      request.products?.name.toLowerCase().includes(searchLower) ||
      request.notes?.toLowerCase().includes(searchLower)
    )
  })

  const getStatusBadge = (status: RequestStatus) => {
    const statusConfig = {
      open: { label: 'OPEN', className: 'bg-yellow-600 text-white border-yellow-600' },
      matched: { label: 'MATCHED', className: 'bg-blue-600 text-white border-blue-600' },
      quoted: { label: 'QUOTED', className: 'bg-purple-600 text-white border-purple-600' },
      closed: { label: 'CLOSED', className: 'bg-terminal-success text-white border-terminal-success' }
    }
    const config = statusConfig[status]
    return (
      <Badge className={`font-mono text-xs font-bold ${config.className}`}>
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="min-h-screen bg-terminal-dark p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-terminal-border pb-4">
        <div>
          <h1 className="text-2xl font-mono font-bold text-terminal-text tracking-wider">
            CUSTOMER REQUESTS
          </h1>
          <p className="text-terminal-muted text-sm font-mono mt-1">
            Track and manage customer product requests
          </p>
        </div>
        <Button
          onClick={() => setShowLogForm(true)}
          className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono"
        >
          <Plus className="h-4 w-4 mr-2" />
          Log New Request
        </Button>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          <Card className="bg-terminal-panel border-terminal-border">
            <CardContent className="p-4">
              <div className="text-terminal-muted text-xs font-mono mb-1">TOTAL</div>
              <div className="text-3xl font-mono font-bold text-terminal-text">
                {stats.total}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-terminal-panel border-terminal-border">
            <CardContent className="p-4">
              <div className="text-terminal-muted text-xs font-mono mb-1">OPEN</div>
              <div className="text-3xl font-mono font-bold text-terminal-warning">
                {stats.open}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-terminal-panel border-terminal-border">
            <CardContent className="p-4">
              <div className="text-terminal-muted text-xs font-mono mb-1">MATCHED</div>
              <div className="text-3xl font-mono font-bold text-terminal-accent">
                {stats.matched}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-terminal-panel border-terminal-border">
            <CardContent className="p-4">
              <div className="text-terminal-muted text-xs font-mono mb-1">QUOTED</div>
              <div className="text-3xl font-mono font-bold text-blue-400">
                {stats.quoted}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-terminal-panel border-terminal-border">
            <CardContent className="p-4">
              <div className="text-terminal-muted text-xs font-mono mb-1">CLOSED</div>
              <div className="text-3xl font-mono font-bold text-terminal-muted">
                {stats.closed}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="bg-terminal-panel border-terminal-border">
        <CardHeader>
          <CardTitle className="text-terminal-text font-mono flex items-center gap-2">
            <Filter className="h-4 w-4" />
            FILTERS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-terminal-muted" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-terminal-dark border-terminal-border text-terminal-text font-mono"
              />
            </div>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) =>
                setFilters({ ...filters, status: value === 'all' ? undefined : value as RequestStatus })
              }
            >
              <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text font-mono">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="matched">Matched</SelectItem>
                <SelectItem value="quoted">Quoted</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.delivery_mode || 'all'}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  delivery_mode: value === 'all' ? undefined : value as 'DELIVERY' | 'Ex Works' | 'TRANSIT'
                })
              }
            >
              <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text font-mono">
                <SelectValue placeholder="Delivery Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="Ex Works">Ex Works</SelectItem>
                <SelectItem value="DELIVERY">Delivery (DDP)</SelectItem>
                <SelectItem value="TRANSIT">TRANSIT</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setFilters({})
                setSearchTerm('')
              }}
              className="border-terminal-border text-terminal-muted hover:bg-terminal-dark font-mono"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card className="bg-terminal-panel border-terminal-border">
        <CardHeader>
          <CardTitle className="text-terminal-text font-mono">
            REQUESTS ({filteredRequests?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-terminal-muted font-mono">
              Loading requests...
            </div>
          ) : !filteredRequests || filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-terminal-muted font-mono">
              No requests found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-terminal-border hover:bg-terminal-dark/50">
                  <TableHead className="text-terminal-muted font-mono">CREATED</TableHead>
                  <TableHead className="text-terminal-muted font-mono">CUSTOMER</TableHead>
                  <TableHead className="text-terminal-muted font-mono">PRODUCT</TableHead>
                  <TableHead className="text-terminal-muted font-mono">QUANTITY</TableHead>
                  <TableHead className="text-terminal-muted font-mono">NEEDED BY</TableHead>
                  <TableHead className="text-terminal-muted font-mono">DELIVERY</TableHead>
                  <TableHead className="text-terminal-muted font-mono">MATCHES</TableHead>
                  <TableHead className="text-terminal-muted font-mono">STATUS</TableHead>
                  <TableHead className="text-terminal-muted font-mono">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow
                    key={request.id}
                    onClick={() => window.location.href = `/trade/requests/${request.id}`}
                    className="border-terminal-border hover:bg-terminal-dark/50 cursor-pointer"
                  >
                    <TableCell className="text-terminal-text font-mono text-sm">
                      {format(new Date(request.created_at), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-terminal-text font-mono">
                      {request.customers?.name}
                    </TableCell>
                    <TableCell className="text-terminal-text font-mono">
                      <div>{request.products?.name}</div>
                      {request.variety && (
                        <div className="text-terminal-muted text-xs">{request.variety}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-terminal-text font-mono">
                      {request.quantity_needed
                        ? `${request.quantity_needed} ${request.quantity_unit || 'units'}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-terminal-text font-mono">
                      {request.needed_by_date
                        ? format(new Date(request.needed_by_date), 'dd MMM yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`font-mono text-xs ${
                          request.delivery_mode === 'DELIVERY'
                            ? 'border-terminal-success text-terminal-success'
                            : 'border-terminal-accent text-terminal-accent'
                        }`}
                      >
                        {request.delivery_mode === 'DELIVERY' ? 'DDP' : 'EXW'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-terminal-text font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-terminal-accent">{request.potential_matches}</span>
                        <span className="text-terminal-muted text-xs">
                          / {request.suppliers_checked} checked
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      {request.status !== 'closed' && (
                        <Button
                          onClick={(e) => handleMarkComplete(e, request.id)}
                          size="sm"
                          className="bg-terminal-success hover:bg-green-600 text-white font-mono"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Log Request Form Dialog */}
      <LogCustomerRequestForm open={showLogForm} onOpenChange={setShowLogForm} />
    </div>
  )
}
