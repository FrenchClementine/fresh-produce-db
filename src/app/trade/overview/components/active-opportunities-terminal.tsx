'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useOpportunities, useUpdateOpportunity, useDeleteOpportunity } from '@/hooks/use-opportunities'
import { useCustomerRequests } from '@/hooks/use-customer-requests'
import { useActiveStaff } from '@/hooks/use-staff'
import { Activity, MoreVertical, Check, MessageSquare, Trash2, Package2, Filter, Printer, Copy } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useFlashOnChangeById } from '@/hooks/use-flash-on-change'

interface ActiveOpportunitiesTerminalProps {
  onSupplierSelect: (supplierId: string) => void
}

export function ActiveOpportunitiesTerminal({ onSupplierSelect }: ActiveOpportunitiesTerminalProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: opportunities } = useOpportunities('all', 'all', true)
  const { data: requests } = useCustomerRequests({ status: 'open' })
  const { activeStaff } = useActiveStaff()
  const updateOpportunity = useUpdateOpportunity()
  const deleteOpportunity = useDeleteOpportunity()
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [customerFilter, setCustomerFilter] = useState<string>('all')
  const [agentFilter, setAgentFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(0)
  const [fadeIn, setFadeIn] = useState(true)

  // Track which opportunities have changed
  const flashingIds = useFlashOnChangeById(
    opportunities?.map(o => ({ id: o.id, status: o.status, offer_price_per_unit: o.offer_price_per_unit })) || [],
    2000
  )

  // Get unique customers (filtered by agent if selected)
  const uniqueCustomers = useMemo(() => {
    const customers = new Map()
    opportunities?.forEach(opp => {
      if (opp.customer) {
        // If agent filter is active, only include customers with that agent
        if (agentFilter === 'all' || opp.customer?.agent?.id === agentFilter) {
          customers.set(opp.customer.id, opp.customer.name)
        }
      }
    })
    return Array.from(customers.entries()).map(([id, name]) => ({ id, name }))
  }, [opportunities, agentFilter])

  // Filter opportunities
  const filteredOpportunities = useMemo(() => {
    let filtered = opportunities || []

    if (customerFilter !== 'all') {
      filtered = filtered.filter(opp => opp.customer_id === customerFilter)
    }

    if (agentFilter !== 'all') {
      filtered = filtered.filter(opp => opp.customer?.agent?.id === agentFilter)
    }

    return filtered
  }, [opportunities, customerFilter, agentFilter])

  // Pagination for opportunities
  const OPP_ITEMS_PER_PAGE = 5
  const totalOppPages = Math.ceil(filteredOpportunities.length / OPP_ITEMS_PER_PAGE)
  const shouldPaginateOpps = filteredOpportunities.length > OPP_ITEMS_PER_PAGE

  const visibleOpportunities = useMemo(() => {
    if (!shouldPaginateOpps) return filteredOpportunities
    const start = currentPage * OPP_ITEMS_PER_PAGE
    return filteredOpportunities.slice(start, start + OPP_ITEMS_PER_PAGE)
  }, [filteredOpportunities, currentPage, shouldPaginateOpps])

  // Auto-rotate pages with fade effect for opportunities
  useEffect(() => {
    if (!shouldPaginateOpps) return

    const interval = setInterval(() => {
      setFadeIn(false)
      setTimeout(() => {
        setCurrentPage((prev) => (prev + 1) % totalOppPages)
        setFadeIn(true)
      }, 300)
    }, 5000)

    return () => clearInterval(interval)
  }, [shouldPaginateOpps, totalOppPages])

  const openRequests = requests?.slice(0, 15) || []

  const handleMarkQuoted = async (oppId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setProcessingId(oppId)

    try {
      await updateOpportunity.mutateAsync({
        id: oppId,
        data: {
          status: 'offered',
        }
      })

      toast.success('Marked as quoted')
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
    } catch (error: any) {
      console.error('Error updating opportunity:', error)
      toast.error(error.message || 'Failed to update opportunity')
    } finally {
      setProcessingId(null)
    }
  }

  const handleAddFeedback = async (oppId: string, feedback: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setProcessingId(oppId)

    try {
      // Determine status based on feedback
      let newStatus: 'draft' | 'active' | 'negotiating' | 'offered' | 'confirmed' | 'cancelled' | 'completed' | 'feedback_received' = 'negotiating'
      if (feedback === 'accepted') {
        newStatus = 'confirmed'
      } else if (feedback === 'not_interested') {
        newStatus = 'cancelled'
      }

      await updateOpportunity.mutateAsync({
        id: oppId,
        data: {
          customer_feedback: feedback,
          feedback_date: new Date().toISOString(),
          status: newStatus,
        }
      })

      toast.success(`Marked as ${feedback}`)
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
    } catch (error: any) {
      console.error('Error updating opportunity:', error)
      toast.error(error.message || 'Failed to update opportunity')
    } finally {
      setProcessingId(null)
    }
  }

  const handleRemove = async (oppId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!window.confirm('Remove this opportunity? This action cannot be undone.')) {
      return
    }

    setProcessingId(oppId)

    try {
      await deleteOpportunity.mutateAsync(oppId)
      toast.success('Opportunity removed')
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove opportunity')
    } finally {
      setProcessingId(null)
    }
  }

  const handleCopyAsText = async () => {
    const dateStr = new Date().toLocaleDateString('en-GB')
    const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

    let text = `📊 ACTIVE OPPORTUNITIES - ${dateStr} ${timeStr}\n`
    text += `Total: ${filteredOpportunities.length} opportunities\n`
    text += `${'='.repeat(50)}\n\n`

    filteredOpportunities.forEach((opp, index) => {
      const hubName = opp.supplier_price?.hub_name || opp.supplier_price?.hub?.name || '-'
      const sizeName = opp.product_packaging_specs?.size_options?.name || '-'
      const packagingLabel = opp.product_packaging_specs?.packaging_options?.label || ''
      const deliveryMode = (opp.selected_transporter || opp.selected_transport_band || opp.supplier_price?.delivery_mode === 'DELIVERY') ? 'DDP' : 'EXW'

      text += `${index + 1}. ${opp.customer?.name || '-'}\n`
      text += `   Product: ${opp.product_packaging_specs?.products?.name || '-'}\n`
      text += `   Size: ${packagingLabel} ${sizeName}\n`
      text += `   Price: €${opp.offer_price_per_unit?.toFixed(2)}/${opp.product_packaging_specs?.products?.sold_by || 'unit'} (${deliveryMode})\n`
      text += `   Delivered to: ${hubName}\n`

      if (opp.selected_transport_band?.price_per_pallet) {
        text += `   Transport: €${opp.selected_transport_band.price_per_pallet.toFixed(2)}/pallet\n`
      }

      text += `\n`
    })

    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard! Ready to paste in WhatsApp')
    } catch (err) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=800,height=600')
    if (!printWindow) return

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Active Opportunities - ${new Date().toLocaleDateString()}</title>
        <style>
          body { font-family: monospace; padding: 20px; }
          h1 { font-size: 18px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #333; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f0f0f0; }
          .status-offered { color: #d97706; }
          .status-confirmed { color: #16a34a; }
          .status-negotiating { color: #2563eb; }
          .status-cancelled { color: #dc2626; }
        </style>
      </head>
      <body>
        <h1>ACTIVE OPPORTUNITIES - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</h1>
        <p>Total Opportunities: ${filteredOpportunities.length}</p>
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Product</th>
              <th>Size</th>
              <th>Delivered To</th>
              <th>Sales Price</th>
              <th>Transport Band</th>
              <th>Status</th>
              <th>Offered</th>
            </tr>
          </thead>
          <tbody>
            ${filteredOpportunities.map(opp => {
              const hubName = opp.supplier_price?.hub_name || opp.supplier_price?.hub?.name || '-'
              const sizeName = opp.product_packaging_specs?.size_options?.name || '-'
              const packagingLabel = opp.product_packaging_specs?.packaging_options?.label || ''

              return `
                <tr>
                  <td>${opp.customer?.name || '-'}</td>
                  <td>${opp.product_packaging_specs?.products?.name || '-'}</td>
                  <td>${packagingLabel} ${sizeName}</td>
                  <td>${hubName}</td>
                  <td>€${opp.offer_price_per_unit?.toFixed(2)}/${opp.product_packaging_specs?.products?.sold_by || 'unit'}</td>
                  <td>${opp.selected_transport_band?.price_per_pallet ? `€${opp.selected_transport_band.price_per_pallet.toFixed(2)}` : '-'}</td>
                  <td class="status-${opp.status}">${opp.status?.toUpperCase() || '-'}</td>
                  <td>${opp.status === 'offered' || opp.status === 'confirmed' ? 'Yes' : 'No'}</td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()
  }

  return (
    <Card className="bg-terminal-panel border-terminal-border h-[calc(100vh-16rem)]">
      <CardHeader className="border-b border-terminal-border pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-terminal-text font-mono text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-terminal-success" />
            ACTIVE ITEMS
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCopyAsText}
              className="bg-terminal-dark border-2 border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono h-7"
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy Text
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-terminal-dark border-2 border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono h-7"
            >
              <Printer className="h-3 w-3 mr-1" />
              Print
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="opportunities" className="h-full">
          <TabsList className="w-full bg-terminal-dark border-b border-terminal-border rounded-none">
            <TabsTrigger value="opportunities" className="flex-1 font-mono text-xs data-[state=active]:bg-terminal-panel">
              OPPORTUNITIES ({filteredOpportunities.length})
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex-1 font-mono text-xs data-[state=active]:bg-terminal-panel">
              OPEN REQUESTS ({openRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="opportunities" className="m-0 h-[calc(100%-3rem)]">
            {/* Filters */}
            <div className="p-2 border-b border-terminal-border bg-terminal-dark space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Select value={customerFilter} onValueChange={setCustomerFilter}>
                  <SelectTrigger className="h-8 bg-terminal-panel border-terminal-border text-terminal-text font-mono text-xs">
                    <SelectValue placeholder="All Customers" />
                  </SelectTrigger>
                  <SelectContent className="bg-terminal-panel border-terminal-border">
                    <SelectItem value="all" className="font-mono text-xs text-terminal-text">All Customers</SelectItem>
                    {uniqueCustomers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id} className="font-mono text-xs text-terminal-text">
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={agentFilter} onValueChange={setAgentFilter}>
                  <SelectTrigger className="h-8 bg-terminal-panel border-terminal-border text-terminal-text font-mono text-xs">
                    <SelectValue placeholder="All Agents" />
                  </SelectTrigger>
                  <SelectContent className="bg-terminal-panel border-terminal-border">
                    <SelectItem value="all" className="font-mono text-xs text-terminal-text">All Agents</SelectItem>
                    {activeStaff?.map(staff => (
                      <SelectItem key={staff.id} value={staff.id} className="font-mono text-xs text-terminal-text">
                        {staff.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-hidden">
              <div
                className="divide-y divide-terminal-border transition-opacity duration-300"
                style={{ opacity: fadeIn ? 1 : 0 }}
              >
                {visibleOpportunities.map((opp) => {
              const statusColors = {
                draft: 'text-terminal-muted',
                active: 'text-terminal-accent',
                negotiating: 'text-terminal-warning',
                offered: 'text-terminal-warning',
                feedback_received: 'text-terminal-warning',
                confirmed: 'text-terminal-success',
                cancelled: 'text-terminal-alert',
                completed: 'text-terminal-success'
              }

              const isProcessing = processingId === opp.id
              const isFlashing = flashingIds.has(opp.id)

              return (
                <div
                  key={opp.id}
                  className={`p-3 transition-all duration-500 ${
                    isFlashing
                      ? 'bg-terminal-accent/10 border-l-2 border-terminal-accent shadow-lg shadow-terminal-accent/20'
                      : 'hover:bg-terminal-dark border-l-2 border-transparent'
                  } group`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => opp.supplier?.id && onSupplierSelect(opp.supplier.id)}
                    >
                      <div className="text-terminal-text text-sm font-mono font-semibold">
                        {opp.customer?.name}
                      </div>
                      <div className="text-terminal-muted text-xs font-mono">
                        {opp.supplier?.name}
                      </div>
                    </div>

                    <Badge className={`${statusColors[opp.status]} bg-transparent border-0 font-mono text-xs`}>
                        {opp.status.toUpperCase()}
                      </Badge>
                  </div>

                  <div
                    className="text-terminal-text text-xs font-mono mb-1 cursor-pointer"
                    onClick={() => opp.supplier?.id && onSupplierSelect(opp.supplier.id)}
                  >
                    {opp.product_packaging_specs?.products.name}
                  </div>

                  {/* Hub/Destination */}
                  <div className="text-terminal-muted text-xs font-mono mb-2">
                    📍 {opp.supplier_price?.hub_name || opp.customer?.city || '-'}
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => opp.supplier?.id && onSupplierSelect(opp.supplier.id)}
                    >
                      <span className="text-terminal-success text-sm font-mono font-bold">
                        €{opp.offer_price_per_unit?.toFixed(2)}/{opp.product_packaging_specs?.products.sold_by}
                      </span>
                      <Badge variant="outline" className={`text-xs font-mono ${
                        opp.selected_transporter || opp.selected_transport_band || opp.supplier_price?.delivery_mode === 'DELIVERY'
                          ? 'border-terminal-success text-terminal-success'
                          : 'border-terminal-accent text-terminal-accent'
                      }`}>
                        {opp.selected_transporter || opp.selected_transport_band || opp.supplier_price?.delivery_mode === 'DELIVERY' ? 'DDP' : 'EXW'}
                      </Badge>
                    </div>
                    {opp.customer_feedback && (
                      <Badge variant="outline" className="text-xs font-mono border-terminal-muted text-terminal-muted">
                        {opp.customer_feedback}
                      </Badge>
                    )}
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex gap-1 pt-2 border-t border-terminal-border/50">
                    <Button
                      size="sm"
                      onClick={(e) => handleMarkQuoted(opp.id, e)}
                      disabled={isProcessing}
                      className="flex-1 h-7 bg-terminal-warning hover:bg-yellow-600 text-terminal-dark font-mono text-xs"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Quoted
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          disabled={isProcessing}
                          className="flex-1 h-7 bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs"
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Feedback
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-terminal-panel border-terminal-border"
                      >
                        <DropdownMenuItem
                          onClick={(e) => handleAddFeedback(opp.id, 'interested', e)}
                          className="text-terminal-text font-mono text-xs cursor-pointer hover:bg-terminal-dark"
                        >
                          <MessageSquare className="h-3 w-3 mr-2 text-green-500" />
                          Interested
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => handleAddFeedback(opp.id, 'negotiating', e)}
                          className="text-terminal-text font-mono text-xs cursor-pointer hover:bg-terminal-dark"
                        >
                          <MessageSquare className="h-3 w-3 mr-2 text-yellow-500" />
                          Negotiating
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => handleAddFeedback(opp.id, 'too_expensive', e)}
                          className="text-terminal-text font-mono text-xs cursor-pointer hover:bg-terminal-dark"
                        >
                          <MessageSquare className="h-3 w-3 mr-2 text-orange-500" />
                          Too Expensive
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => handleAddFeedback(opp.id, 'not_interested', e)}
                          className="text-terminal-text font-mono text-xs cursor-pointer hover:bg-terminal-dark"
                        >
                          <MessageSquare className="h-3 w-3 mr-2 text-red-500" />
                          Not Interested
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => handleAddFeedback(opp.id, 'accepted', e)}
                          className="text-terminal-text font-mono text-xs cursor-pointer hover:bg-terminal-dark"
                        >
                          <MessageSquare className="h-3 w-3 mr-2 text-green-600" />
                          Accepted
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    </div>
                </div>
              )
            })}
              </div>

              {/* Pagination Indicator */}
              {shouldPaginateOpps && (
                <div className="flex justify-center gap-1 py-3 border-t border-terminal-border">
                  {Array.from({ length: totalOppPages }).map((_, index) => (
                    <div
                      key={index}
                      className={`h-1.5 w-1.5 rounded-full transition-all ${
                        index === currentPage
                          ? 'bg-terminal-accent w-4'
                          : 'bg-terminal-border'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="requests" className="m-0 h-[calc(100%-3rem)]">
            <ScrollArea className="h-full">
              <div className="divide-y divide-terminal-border">
                {openRequests.map((request) => (
                  <div
                    key={request.id}
                    className="p-3 hover:bg-terminal-dark transition-colors cursor-pointer"
                    onClick={() => router.push(`/trade/requests/${request.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="text-terminal-text text-sm font-mono font-semibold">
                          {request.customers?.name}
                        </div>
                        <div className="text-terminal-muted text-xs font-mono">
                          {request.products?.name}
                        </div>
                      </div>
                      <Badge className="bg-yellow-500/20 text-yellow-500 border-0 font-mono text-xs">
                        OPEN
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-terminal-text text-xs font-mono">
                        {request.quantity_needed} {request.quantity_unit || 'units'}
                      </div>
                      {request.target_price_per_unit && (
                        <div className="text-terminal-success text-sm font-mono">
                          Target: €{request.target_price_per_unit.toFixed(2)}
                        </div>
                      )}
                    </div>

                    {request.delivery_mode && (
                      <div className="mt-1">
                        <Badge variant="outline" className={`text-xs font-mono ${
                          request.delivery_mode === 'DELIVERY'
                            ? 'border-terminal-success text-terminal-success'
                            : 'border-terminal-accent text-terminal-accent'
                        }`}>
                          {request.delivery_mode === 'DELIVERY' ? 'DDP' : 'EXW'}
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
