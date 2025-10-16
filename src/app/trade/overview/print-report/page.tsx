'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { useOpportunities, useUpdateOpportunity } from '@/hooks/use-opportunities'
import { useSuppliers } from '@/hooks/use-suppliers'
import { useActiveStaff } from '@/hooks/use-staff'
import { ArrowLeft, Printer, Save } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

export default function PrintReportPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: opportunities } = useOpportunities('all', 'all', true)
  const { data: suppliers } = useSuppliers()
  const { activeStaff } = useActiveStaff()
  const updateOpportunity = useUpdateOpportunity()

  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null)
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({})
  const [generalFeedback, setGeneralFeedback] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  // Group opportunities by agent, then by customer
  const groupedByAgent = useMemo(() => {
    if (!opportunities || !activeStaff) return []

    // Group by agent - show ALL active opportunities (matching the overview page)
    const byAgent = opportunities.reduce((acc, opp) => {
      const agentId = opp.customer?.agent?.id
      if (!agentId || !opp.customer?.agent) return acc

      if (!acc[agentId]) {
        acc[agentId] = {
          agent: opp.customer.agent,
          customers: {}
        }
      }

      const customerId = opp.customer_id
      if (!acc[agentId].customers[customerId]) {
        acc[agentId].customers[customerId] = {
          customer: opp.customer,
          opportunities: []
        }
      }
      acc[agentId].customers[customerId].opportunities.push(opp)
      return acc
    }, {} as Record<string, { agent: any; customers: Record<string, { customer: any; opportunities: any[] }> }>)

    return Object.values(byAgent).map(agentData => ({
      agent: agentData.agent,
      customers: Object.values(agentData.customers)
    }))
  }, [opportunities, activeStaff])

  // Calculate stats
  const stats = useMemo(() => {
    const uniqueSupplierIds = new Set<string>()
    let totalOpportunities = 0
    let totalCustomers = 0

    groupedByAgent.forEach(agentGroup => {
      totalCustomers += agentGroup.customers.length
      agentGroup.customers.forEach(customerGroup => {
        totalOpportunities += customerGroup.opportunities.length
        customerGroup.opportunities.forEach(opp => {
          if (opp.supplier?.id) {
            uniqueSupplierIds.add(opp.supplier.id)
          }
        })
      })
    })

    return {
      suppliers: uniqueSupplierIds.size,
      prices: totalOpportunities,
      customers: totalCustomers,
      items: totalOpportunities,
    }
  }, [groupedByAgent])

  const handleStartEditFeedback = (oppId: string, currentFeedback: string | undefined) => {
    setEditingFeedbackId(oppId)
    setFeedbackText({ ...feedbackText, [oppId]: currentFeedback || '' })
  }

  const handleSaveFeedback = async (oppId: string) => {
    setSavingId(oppId)
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
      console.error('Error saving feedback:', error)
      toast.error(error.message || 'Failed to save feedback')
    } finally {
      setSavingId(null)
    }
  }

  const handleCancelEditFeedback = () => {
    setEditingFeedbackId(null)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Hidden on print */}
      <div className="bg-terminal-dark p-4 border-b border-terminal-border print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Button
            onClick={() => router.push('/trade/overview')}
            variant="outline"
            className="border-terminal-border text-terminal-text hover:bg-terminal-panel font-mono"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handlePrint}
            className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print to PDF
          </Button>
        </div>
      </div>

      {/* Print Content */}
      <div className="max-w-7xl mx-auto p-8">
        {/* Report Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-gray-900">TRADE REPORT</h1>
          <p className="text-gray-700 font-medium">
            Date: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-4 gap-4 mb-8 p-6 bg-gray-50 border border-gray-200 rounded">
          <div>
            <div className="text-sm text-gray-700 font-semibold mb-1">Suppliers</div>
            <div className="text-3xl font-bold text-gray-900">{stats.suppliers}</div>
          </div>
          <div>
            <div className="text-sm text-gray-700 font-semibold mb-1">Prices</div>
            <div className="text-3xl font-bold text-gray-900">{stats.prices}</div>
          </div>
          <div>
            <div className="text-sm text-gray-700 font-semibold mb-1">Customers</div>
            <div className="text-3xl font-bold text-gray-900">{stats.customers}</div>
          </div>
          <div>
            <div className="text-sm text-gray-700 font-semibold mb-1">Total Items</div>
            <div className="text-3xl font-bold text-gray-900">{stats.items}</div>
          </div>
        </div>

        {/* General Trade Overview Feedback */}
        <div className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded general-feedback-section">
          <div className="text-lg font-bold text-gray-900 mb-3">General Trade Overview Notes</div>
          <Textarea
            value={generalFeedback}
            onChange={(e) => setGeneralFeedback(e.target.value)}
            placeholder="Add general notes about this trade overview..."
            className="min-h-[100px] bg-white text-gray-900 placeholder:text-gray-500 border-gray-300 print:hidden"
          />
          {generalFeedback && (
            <div className="hidden print:block text-sm whitespace-pre-wrap text-gray-900 border-2 border-gray-300 rounded p-3 bg-white">
              {generalFeedback}
            </div>
          )}
          {!generalFeedback && (
            <div className="hidden print:block border-2 border-gray-300 rounded h-24 bg-white"></div>
          )}
        </div>

        {/* Agents with Customers and Products */}
        <div className="space-y-8">
          {groupedByAgent.map(({ agent, customers }) => (
            <div key={agent.id} className="space-y-4">
              {/* Agent Section Header */}
              <div className="bg-gray-200 border-2 border-gray-400 p-4 rounded-lg agent-header">
                <h2 className="text-2xl font-bold text-gray-900">Agent: {agent.name}</h2>
                <p className="text-sm text-gray-700 font-semibold mt-1">
                  {customers.length} {customers.length === 1 ? 'customer' : 'customers'}
                </p>
              </div>

              {/* Customers for this Agent */}
              <div className="space-y-6">
                {customers.map(({ customer, opportunities }) => (
                  <div
                    key={customer.id}
                    className="border border-gray-300 rounded-lg overflow-hidden customer-section"
                  >
                    {/* Customer Header */}
                    <div className="bg-gray-100 p-4 border-b border-gray-300 customer-header">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <Checkbox id={`customer-${customer.id}`} className="print:hidden" />
                            <label
                              htmlFor={`customer-${customer.id}`}
                              className="text-xl font-bold cursor-pointer text-gray-900"
                            >
                              {customer.name}
                            </label>
                          </div>
                          <p className="text-sm text-gray-700 font-medium ml-7">
                            {customer.city}, {customer.country}
                          </p>
                        </div>
                        <div className="text-sm text-gray-700 font-semibold">
                          {opportunities.length} {opportunities.length === 1 ? 'item' : 'items'}
                        </div>
                      </div>
                    </div>

              {/* Products Table */}
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left p-3 text-sm font-semibold text-gray-900">Product</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-900">Supplier</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-900">Delivery Location</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-900">Sales Price</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-900">Terms</th>
                  </tr>
                </thead>
                <tbody>
                  {opportunities.map((opp, idx) => (
                    <tr
                      key={opp.id}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    >
                      <td className="p-3 text-sm text-gray-900 font-medium">
                        {opp.product_packaging_specs?.products?.name || 'N/A'}
                        <div className="text-xs text-gray-600">
                          {opp.product_packaging_specs?.packaging_options?.label} •{' '}
                          {opp.product_packaging_specs?.size_options?.name}
                        </div>
                      </td>
                      <td className="p-3 text-sm text-gray-900">
                        {opp.supplier?.name || 'N/A'}
                        <div className="text-xs text-gray-600">
                          {opp.supplier?.city}, {opp.supplier?.country}
                        </div>
                      </td>
                      <td className="p-3 text-sm text-gray-900">
                        {opp.delivery_hub?.name || opp.supplier_price?.hub_name || 'N/A'}
                        <div className="text-xs text-gray-600">
                          {opp.delivery_hub?.city ? `${opp.delivery_hub.city}, ${opp.delivery_hub.country}` : ''}
                        </div>
                      </td>
                      <td className="p-3 text-sm font-semibold text-green-600">
                        €{opp.offer_price_per_unit?.toFixed(2)}/
                        {opp.product_packaging_specs?.products?.sold_by || 'unit'}
                      </td>
                      <td className="p-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            opp.supplier_price?.delivery_mode === 'DELIVERY'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {opp.supplier_price?.delivery_mode === 'DELIVERY' ? 'DDP' : 'EXW'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Feedback Section - Now pulls from database and groups all opportunity feedback */}
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                <div className="text-sm font-semibold mb-3 text-gray-900">Customer Feedback / Notes:</div>
                <div className="space-y-3">
                  {opportunities.map((opp) => {
                    // Group all opportunities for this customer
                    const customerOpps = opportunities.filter((o: any) => o.customer_id === customer.id)
                    const oppForCustomer = customerOpps.find((o: any) => o.id === opp.id)

                    if (!oppForCustomer || opp.customer_id !== customer.id) return null

                    const isEditing = editingFeedbackId === opp.id
                    const isSaving = savingId === opp.id

                    return (
                      <div key={opp.id} className="border border-gray-300 rounded p-3 bg-white opportunity-feedback">
                        <div className="text-xs text-gray-600 font-medium mb-2">
                          {opp.product_packaging_specs?.products?.name || 'Product'} - {opp.supplier?.name || 'Supplier'}
                        </div>

                        {isEditing ? (
                          <div className="space-y-2 print:hidden">
                            <Textarea
                              value={feedbackText[opp.id] || ''}
                              onChange={(e) => setFeedbackText({ ...feedbackText, [opp.id]: e.target.value })}
                              placeholder="Enter feedback notes..."
                              className="min-h-[60px] bg-white text-gray-900 placeholder:text-gray-500 border-gray-300 text-sm"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSaveFeedback(opp.id)}
                                disabled={isSaving}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs"
                              >
                                <Save className="h-3 w-3 mr-1" />
                                {isSaving ? 'Saving...' : 'Save'}
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleCancelEditFeedback}
                                disabled={isSaving}
                                variant="outline"
                                className="text-xs"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {opp.customer_feedback ? (
                              <div
                                className="cursor-pointer group print:cursor-default"
                                onClick={() => handleStartEditFeedback(opp.id, opp.customer_feedback)}
                              >
                                <div className="text-sm text-gray-900 whitespace-pre-wrap group-hover:bg-gray-50 print:group-hover:bg-white p-2 rounded transition-colors">
                                  {opp.customer_feedback}
                                </div>
                                <div className="text-xs text-gray-500 mt-1 print:hidden">Click to edit</div>
                              </div>
                            ) : (
                              <div
                                className="cursor-pointer group text-sm text-gray-500 italic p-2 hover:bg-gray-50 rounded print:hidden"
                                onClick={() => handleStartEditFeedback(opp.id, opp.customer_feedback)}
                              >
                                Click to add feedback...
                              </div>
                            )}

                            {/* Display for print - show feedback if exists, or empty box */}
                            {opp.customer_feedback ? (
                              <div className="hidden print:block text-sm text-gray-900 whitespace-pre-wrap p-2">
                                {opp.customer_feedback}
                              </div>
                            ) : (
                              <div className="hidden print:block border-2 border-gray-300 rounded h-16"></div>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          html, body {
            height: auto;
            overflow: visible;
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          * {
            overflow: visible !important;
          }

          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }

          @page {
            margin: 1cm;
            size: A4;
          }

          /* Try to keep entire customer sections together */
          .customer-section {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          /* Prevent customer header from separating from content */
          .customer-header {
            page-break-inside: avoid;
            break-inside: avoid;
            page-break-after: avoid;
            break-after: avoid;
          }

          /* Keep agent headers with their content */
          .agent-header {
            page-break-inside: avoid;
            break-inside: avoid;
            page-break-after: avoid;
            break-after: avoid;
          }

          /* Table handling - allow breaking between rows if customer section is large */
          table {
            page-break-inside: auto;
            break-inside: auto;
            page-break-before: avoid;
            break-before: avoid;
          }

          thead {
            display: table-header-group;
            page-break-inside: avoid;
            break-inside: avoid;
            page-break-after: avoid;
            break-after: avoid;
          }

          tbody {
            display: table-row-group;
          }

          /* Never break within a table row */
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Prevent feedback section from breaking */
          .feedback-section,
          .general-feedback-section,
          .opportunity-feedback {
            page-break-inside: avoid;
            break-inside: avoid;
            page-break-before: avoid;
            break-before: avoid;
          }

          /* Ensure borders and backgrounds print */
          .border,
          .border-t,
          .border-b,
          .border-l,
          .border-r {
            border-color: #d1d5db !important;
          }

          .bg-gray-50,
          .bg-gray-100,
          .bg-gray-200 {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  )
}
