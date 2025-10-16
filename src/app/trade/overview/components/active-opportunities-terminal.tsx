'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
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
import { Activity, MoreVertical, Check, MessageSquare, Trash2, Package2, Filter, Printer, Copy, ChevronDown, ChevronUp, Users, Save, X } from 'lucide-react'
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
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set())
  const [isHovering, setIsHovering] = useState(false)
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null)
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({})

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

  // Group opportunities by customer
  const groupedOpportunities = useMemo(() => {
    const groups = new Map()

    filteredOpportunities.forEach(opp => {
      if (!opp.customer_id) return

      if (!groups.has(opp.customer_id)) {
        groups.set(opp.customer_id, {
          customerId: opp.customer_id,
          customerName: opp.customer?.name || 'Unknown',
          agent: opp.customer?.agent,
          opportunities: []
        })
      }

      groups.get(opp.customer_id).opportunities.push(opp)
    })

    return Array.from(groups.values())
  }, [filteredOpportunities])

  // Pagination for customer groups
  const OPP_ITEMS_PER_PAGE = 5
  const totalOppPages = Math.ceil(groupedOpportunities.length / OPP_ITEMS_PER_PAGE)
  const shouldPaginateOpps = groupedOpportunities.length > OPP_ITEMS_PER_PAGE

  const visibleCustomerGroups = useMemo(() => {
    if (!shouldPaginateOpps) return groupedOpportunities
    const start = currentPage * OPP_ITEMS_PER_PAGE
    return groupedOpportunities.slice(start, start + OPP_ITEMS_PER_PAGE)
  }, [groupedOpportunities, currentPage, shouldPaginateOpps])

  // Toggle customer expansion
  const toggleCustomerExpansion = (customerId: string) => {
    setExpandedCustomers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(customerId)) {
        newSet.delete(customerId)
      } else {
        newSet.add(customerId)
      }
      return newSet
    })
  }

  // Calculate age of opportunity
  const getOpportunityAge = (createdAt: string) => {
    const now = new Date()
    const created = new Date(createdAt)
    const diffMs = now.getTime() - created.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 24) {
      return `${diffHours}h`
    } else {
      return `${diffDays}d`
    }
  }

  // Auto-rotate pages with fade effect for opportunities (pause when hovering)
  useEffect(() => {
    if (!shouldPaginateOpps || isHovering) return

    const interval = setInterval(() => {
      setFadeIn(false)
      setTimeout(() => {
        setCurrentPage((prev) => (prev + 1) % totalOppPages)
        setFadeIn(true)
      }, 300)
    }, 5000)

    return () => clearInterval(interval)
  }, [shouldPaginateOpps, totalOppPages, isHovering])

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

  const handleStartEditFeedback = (oppId: string, currentFeedback: string | undefined, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setEditingFeedbackId(oppId)
    setFeedbackText({ ...feedbackText, [oppId]: currentFeedback || '' })
  }

  const handleSaveFeedback = async (oppId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setProcessingId(oppId)

    try {
      const feedback = feedbackText[oppId] || ''

      await updateOpportunity.mutateAsync({
        id: oppId,
        data: {
          customer_feedback: feedback,
          feedback_date: new Date().toISOString(),
          feedback_status: feedback ? 'received' : 'none',
        }
      })

      toast.success('Feedback saved')
      setEditingFeedbackId(null)
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
    } catch (error: any) {
      console.error('Error updating opportunity:', error)
      toast.error(error.message || 'Failed to save feedback')
    } finally {
      setProcessingId(null)
    }
  }

  const handleCancelEditFeedback = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setEditingFeedbackId(null)
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

  // Bulk actions for customer groups
  const handleBulkMarkQuoted = async (opportunities: any[], e: React.MouseEvent) => {
    e.stopPropagation()

    try {
      await Promise.all(
        opportunities.map(opp =>
          updateOpportunity.mutateAsync({
            id: opp.id,
            data: { status: 'offered' }
          })
        )
      )

      toast.success(`Marked ${opportunities.length} opportunities as quoted`)
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
    } catch (error: any) {
      console.error('Error updating opportunities:', error)
      toast.error(error.message || 'Failed to update opportunities')
    }
  }

  const handleBulkAddFeedback = async (opportunities: any[], feedback: string, e: React.MouseEvent) => {
    e.stopPropagation()

    try {
      // Determine status based on feedback
      let newStatus: 'draft' | 'active' | 'negotiating' | 'offered' | 'confirmed' | 'cancelled' | 'completed' | 'feedback_received' = 'negotiating'
      if (feedback === 'accepted') {
        newStatus = 'confirmed'
      } else if (feedback === 'not_interested') {
        newStatus = 'cancelled'
      }

      await Promise.all(
        opportunities.map(opp =>
          updateOpportunity.mutateAsync({
            id: opp.id,
            data: {
              customer_feedback: feedback,
              feedback_date: new Date().toISOString(),
              status: newStatus,
            }
          })
        )
      )

      toast.success(`Marked ${opportunities.length} opportunities as ${feedback}`)
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
    } catch (error: any) {
      console.error('Error updating opportunities:', error)
      toast.error(error.message || 'Failed to update opportunities')
    }
  }

  const handleCopyCustomerOpportunities = async (customerOpportunities: any[], e: React.MouseEvent) => {
    e.stopPropagation() // Prevent expanding/collapsing

    const dateStr = new Date().toLocaleDateString('en-GB')
    const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

    let text = `📊 ${customerOpportunities[0]?.customer?.name || 'Customer'} - ${dateStr} ${timeStr}\n`
    text += `${'='.repeat(50)}\n\n`

    // Group by route/transport details
    const groupedForCopy = new Map()

    customerOpportunities.forEach((opp) => {
      const originHub = opp.supplier_price?.hub_name || opp.supplier_price?.hub?.name || opp.supplier?.city || '-'
      const destinationHub = opp.delivery_hub?.name || opp.customer?.city || '-'
      const deliveryMode = (opp.selected_transporter || opp.selected_transport_band || opp.supplier_price?.delivery_mode === 'DELIVERY') ? 'DDP' : 'EXW'
      const routeText = deliveryMode === 'DDP' ? `${originHub} → ${destinationHub}` : originHub
      const transportPrice = opp.selected_transport_band?.price_per_pallet || null

      const groupKey = `${routeText}|${transportPrice}`

      if (!groupedForCopy.has(groupKey)) {
        groupedForCopy.set(groupKey, {
          routeText,
          deliveryMode,
          transportPrice,
          destinationHub,
          products: []
        })
      }

      groupedForCopy.get(groupKey).products.push({
        name: opp.product_packaging_specs?.products?.name || '-',
        packaging: opp.product_packaging_specs?.packaging_options?.label || '-',
        sizeName: opp.product_packaging_specs?.size_options?.name || '-',
        price: opp.offer_price_per_unit,
        unit: opp.product_packaging_specs?.products?.sold_by || 'unit'
      })
    })

    groupedForCopy.forEach((group) => {
      // Format location header
      const locationHeader = group.deliveryMode === 'DDP'
        ? `Price delivered to: ${group.destinationHub}`
        : `${group.routeText} Pick up:`

      text += `${locationHeader}\n`

      if (group.transportPrice) {
        text += `Transport: €${group.transportPrice.toFixed(2)}/pallet\n`
      }

      group.products.forEach((product: { name: string; packaging: string; sizeName: string; price: number; unit: string }) => {
        // Format:     Product SizeName - Packaging - Price/unit
        text += `    ${product.name} ${product.sizeName} - ${product.packaging} - ${product.price?.toFixed(2)}/${product.unit}\n`
      })

      text += `\n`
    })

    try {
      await navigator.clipboard.writeText(text)
      toast.success(`Copied ${customerOpportunities[0]?.customer?.name}'s opportunities!`)
    } catch (err) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const handleCopyAsText = async () => {
    const dateStr = new Date().toLocaleDateString('en-GB')
    const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

    let text = `📊 ACTIVE OPPORTUNITIES - ${dateStr} ${timeStr}\n`
    text += `Total: ${filteredOpportunities.length} opportunities\n`
    text += `${'='.repeat(50)}\n\n`

    // Group opportunities by customer and route/transport details
    const groupedForCopy = new Map()

    filteredOpportunities.forEach((opp) => {
      const customerId = opp.customer_id || 'unknown'
      const originHub = opp.supplier_price?.hub_name || opp.supplier_price?.hub?.name || opp.supplier?.city || '-'
      const destinationHub = opp.delivery_hub?.name || opp.customer?.city || '-'
      const deliveryMode = (opp.selected_transporter || opp.selected_transport_band || opp.supplier_price?.delivery_mode === 'DELIVERY') ? 'DDP' : 'EXW'
      const routeText = deliveryMode === 'DDP' ? `${originHub} → ${destinationHub}` : originHub
      const transportPrice = opp.selected_transport_band?.price_per_pallet || null

      // Create a unique key for grouping (customer + route + transport)
      const groupKey = `${customerId}|${routeText}|${transportPrice}`

      if (!groupedForCopy.has(groupKey)) {
        groupedForCopy.set(groupKey, {
          customerName: opp.customer?.name || '-',
          routeText,
          deliveryMode,
          transportPrice,
          destinationHub,
          products: []
        })
      }

      groupedForCopy.get(groupKey).products.push({
        name: opp.product_packaging_specs?.products?.name || '-',
        packaging: opp.product_packaging_specs?.packaging_options?.label || '-',
        sizeName: opp.product_packaging_specs?.size_options?.name || '-',
        price: opp.offer_price_per_unit,
        unit: opp.product_packaging_specs?.products?.sold_by || 'unit'
      })
    })

    let groupIndex = 1
    groupedForCopy.forEach((group) => {
      text += `${groupIndex}. ${group.customerName}\n`

      // Format location header
      const locationHeader = group.deliveryMode === 'DDP'
        ? `   Price delivered to: ${group.destinationHub}`
        : `   ${group.routeText} Pick up:`

      text += `${locationHeader}\n`

      if (group.transportPrice) {
        text += `   Transport: €${group.transportPrice.toFixed(2)}/pallet\n`
      }

      group.products.forEach((product: { name: string; packaging: string; sizeName: string; price: number; unit: string }) => {
        // Format:       Product SizeName - Packaging - Price/unit
        text += `       ${product.name} ${product.sizeName} - ${product.packaging} - ${product.price?.toFixed(2)}/${product.unit}\n`
      })

      text += `\n`
      groupIndex++
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
              <th>Route</th>
              <th>Sales Price</th>
              <th>Transport Band</th>
              <th>Status</th>
              <th>Offered</th>
            </tr>
          </thead>
          <tbody>
            ${filteredOpportunities.map(opp => {
              const originHub = opp.supplier_price?.hub_name || opp.supplier_price?.hub?.name || opp.supplier?.city || '-'
              const destinationHub = opp.delivery_hub?.name || opp.customer?.city || '-'
              const sizeName = opp.product_packaging_specs?.size_options?.name || '-'
              const packagingLabel = opp.product_packaging_specs?.packaging_options?.label || ''
              const deliveryMode = (opp.selected_transporter || opp.selected_transport_band || opp.supplier_price?.delivery_mode === 'DELIVERY') ? 'DDP' : 'EXW'
              const routeText = deliveryMode === 'DDP' ? `${originHub} → ${destinationHub}` : `${originHub} (pickup)`

              return `
                <tr>
                  <td>${opp.customer?.name || '-'}</td>
                  <td>${opp.product_packaging_specs?.products?.name || '-'}</td>
                  <td>${packagingLabel} ${sizeName}</td>
                  <td>${routeText}</td>
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

            <div
              className="overflow-hidden"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              <div
                className="divide-y divide-terminal-border transition-opacity duration-300"
                style={{ opacity: (fadeIn || isHovering) ? 1 : 0 }}
              >
                {visibleCustomerGroups.map((group) => {
                  const isExpanded = expandedCustomers.has(group.customerId)
                  const totalValue = group.opportunities.reduce((sum: number, opp: any) => sum + (opp.offer_price_per_unit || 0), 0)
                  const uniqueSuppliers = Array.from(new Set(group.opportunities.map((opp: any) => opp.supplier?.name).filter(Boolean)))
                  const hasFlashingItems = group.opportunities.some((opp: any) => flashingIds.has(opp.id))
                  // Get the oldest opportunity to show age
                  const oldestOpportunity = group.opportunities.reduce((oldest: any, opp: any) => {
                    return new Date(opp.created_at) < new Date(oldest.created_at) ? opp : oldest
                  }, group.opportunities[0])

                  // Check if all opportunities are quoted or have feedback
                  const allQuoted = group.opportunities.every((opp: any) => opp.status === 'offered' || opp.status === 'confirmed')
                  const allHaveFeedback = group.opportunities.every((opp: any) => opp.customer_feedback && opp.customer_feedback.trim() !== '')

                  return (
                    <div
                      key={group.customerId}
                      className={`transition-all duration-500 ${
                        hasFlashingItems
                          ? 'bg-terminal-accent/10 border-l-2 border-terminal-accent shadow-lg shadow-terminal-accent/20'
                          : 'border-l-2 border-transparent'
                      }`}
                    >
                      {/* Collapsed Customer Header */}
                      <div className="p-3 hover:bg-terminal-dark">
                        <div className="flex items-start justify-between">
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() => toggleCustomerExpansion(group.customerId)}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Users className="h-4 w-4 text-terminal-accent" />
                              <span className="text-terminal-text text-sm font-mono font-semibold">
                                {group.customerName}
                              </span>
                              <Badge variant="outline" className="text-xs font-mono border-terminal-accent/50 text-terminal-text bg-terminal-accent/10 px-1.5 py-0.5">
                                {getOpportunityAge(oldestOpportunity.created_at)}
                              </Badge>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-terminal-muted" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-terminal-muted" />
                              )}
                            </div>

                            {!isExpanded && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-3 text-xs font-mono text-terminal-muted">
                                  <span>🏷️ {group.opportunities.length} Product{group.opportunities.length > 1 ? 's' : ''}</span>
                                </div>
                                <div className="text-xs font-mono text-terminal-muted">
                                  📦 {uniqueSuppliers.length} Supplier{uniqueSuppliers.length > 1 ? 's' : ''}: {uniqueSuppliers.slice(0, 2).join(', ')}{uniqueSuppliers.length > 2 ? ` +${uniqueSuppliers.length - 2} more` : ''}
                                </div>
                                {group.agent && (
                                  <div className="text-xs font-mono text-terminal-muted">
                                    👔 Agent: {group.agent.name}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Bulk Action Buttons */}
                          <div className="flex items-center gap-1 ml-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => handleCopyCustomerOpportunities(group.opportunities, e)}
                              className="h-6 w-6 p-0 hover:bg-terminal-accent/20 text-terminal-muted hover:text-terminal-accent"
                              title="Copy this customer's opportunities"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={(e) => handleBulkMarkQuoted(group.opportunities, e)}
                              className={`h-6 px-2 font-mono text-[10px] ${
                                allQuoted
                                  ? 'bg-terminal-success/20 border border-terminal-success text-terminal-success hover:bg-terminal-success/30'
                                  : 'bg-terminal-warning hover:bg-yellow-600 text-terminal-dark'
                              }`}
                              title={allQuoted ? "All opportunities quoted" : "Mark all as quoted"}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              {allQuoted ? '✓ All Quoted' : 'All Quoted'}
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  className={`h-6 px-2 font-mono text-[10px] ${
                                    allHaveFeedback
                                      ? 'bg-terminal-success/20 border border-terminal-success text-terminal-success hover:bg-terminal-success/30'
                                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                                  }`}
                                  title={allHaveFeedback ? "All have feedback" : "Add feedback to all"}
                                >
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  {allHaveFeedback ? '✓ All Feedback' : 'All Feedback'}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="bg-terminal-panel border-terminal-border"
                              >
                                <DropdownMenuItem
                                  onClick={(e) => handleBulkAddFeedback(group.opportunities, 'interested', e)}
                                  className="text-terminal-text font-mono text-xs cursor-pointer hover:bg-terminal-dark"
                                >
                                  <MessageSquare className="h-3 w-3 mr-2 text-green-500" />
                                  Interested
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => handleBulkAddFeedback(group.opportunities, 'negotiating', e)}
                                  className="text-terminal-text font-mono text-xs cursor-pointer hover:bg-terminal-dark"
                                >
                                  <MessageSquare className="h-3 w-3 mr-2 text-yellow-500" />
                                  Negotiating
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => handleBulkAddFeedback(group.opportunities, 'too_expensive', e)}
                                  className="text-terminal-text font-mono text-xs cursor-pointer hover:bg-terminal-dark"
                                >
                                  <MessageSquare className="h-3 w-3 mr-2 text-orange-500" />
                                  Too Expensive
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => handleBulkAddFeedback(group.opportunities, 'not_interested', e)}
                                  className="text-terminal-text font-mono text-xs cursor-pointer hover:bg-terminal-dark"
                                >
                                  <MessageSquare className="h-3 w-3 mr-2 text-red-500" />
                                  Not Interested
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => handleBulkAddFeedback(group.opportunities, 'accepted', e)}
                                  className="text-terminal-text font-mono text-xs cursor-pointer hover:bg-terminal-dark"
                                >
                                  <MessageSquare className="h-3 w-3 mr-2 text-green-600" />
                                  Accepted
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Opportunities List */}
                      {isExpanded && (
                        <div className="border-t border-terminal-border/50">
                          {group.opportunities.map((opp: any, index: number) => {
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
                                className={`p-3 ml-6 transition-all duration-500 ${
                                  index < group.opportunities.length - 1 ? 'border-b border-terminal-border/30' : ''
                                } ${
                                  isFlashing
                                    ? 'bg-terminal-accent/5'
                                    : 'hover:bg-terminal-dark/50'
                                }`}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div
                                    className="flex-1 cursor-pointer"
                                    onClick={() => opp.supplier?.id && onSupplierSelect(opp.supplier.id)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="text-terminal-text text-sm font-mono font-semibold">
                                        {opp.product_packaging_specs?.products.name}
                                      </div>
                                      <Badge variant="outline" className="text-xs font-mono border-terminal-accent/50 text-terminal-text bg-terminal-accent/10 px-1.5 py-0.5">
                                        {getOpportunityAge(opp.created_at)}
                                      </Badge>
                                    </div>
                                    <div className="text-terminal-muted text-xs font-mono">
                                      {opp.supplier?.name}
                                    </div>
                                  </div>

                                  <Badge className={`${statusColors[opp.status as keyof typeof statusColors] || 'text-terminal-muted'} bg-transparent border-0 font-mono text-xs`}>
                                    {opp.status.toUpperCase()}
                                  </Badge>
                                </div>

                                {/* Hub/Destination */}
                                <div className="text-terminal-muted text-xs font-mono mb-2">
                                  {(opp.selected_transporter || opp.selected_transport_band || opp.supplier_price?.delivery_mode === 'DELIVERY') ? (
                                    <>📍 {opp.supplier_price?.hub_name || opp.supplier?.city || '-'} → {opp.delivery_hub?.name || opp.customer?.city || '-'}</>
                                  ) : (
                                    <>📍 {opp.supplier_price?.hub_name || opp.supplier?.city || '-'} (pickup)</>
                                  )}
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
                                </div>

                                {/* Feedback Section */}
                                <div className="mb-2">
                                  {editingFeedbackId === opp.id ? (
                                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                      <Textarea
                                        value={feedbackText[opp.id] || ''}
                                        onChange={(e) => setFeedbackText({ ...feedbackText, [opp.id]: e.target.value })}
                                        placeholder="Enter feedback notes..."
                                        className="bg-terminal-dark border-terminal-border text-terminal-text font-mono text-xs min-h-[60px] resize-none"
                                      />
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          onClick={(e) => handleSaveFeedback(opp.id, e)}
                                          disabled={isProcessing}
                                          className="flex-1 h-7 bg-terminal-success hover:bg-green-600 text-terminal-dark font-mono text-xs"
                                        >
                                          <Save className="h-3 w-3 mr-1" />
                                          Save
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={(e) => handleCancelEditFeedback(e)}
                                          disabled={isProcessing}
                                          variant="outline"
                                          className="flex-1 h-7 bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel font-mono text-xs"
                                        >
                                          <X className="h-3 w-3 mr-1" />
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div
                                      className="cursor-pointer group"
                                      onClick={(e) => handleStartEditFeedback(opp.id, opp.customer_feedback, e)}
                                    >
                                      {opp.customer_feedback ? (
                                        <div className="bg-terminal-dark/50 border border-terminal-border rounded p-2 group-hover:border-terminal-accent transition-colors">
                                          <div className="flex items-start justify-between gap-2">
                                            <p className="text-xs font-mono text-terminal-text whitespace-pre-wrap flex-1">
                                              {opp.customer_feedback}
                                            </p>
                                            <MessageSquare className="h-3 w-3 text-terminal-muted group-hover:text-terminal-accent flex-shrink-0" />
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="bg-terminal-dark/30 border border-dashed border-terminal-border rounded p-2 group-hover:border-terminal-accent transition-colors">
                                          <p className="text-xs font-mono text-terminal-muted group-hover:text-terminal-accent flex items-center gap-1">
                                            <MessageSquare className="h-3 w-3" />
                                            Click to add feedback...
                                          </p>
                                        </div>
                                      )}
                                    </div>
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
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
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
