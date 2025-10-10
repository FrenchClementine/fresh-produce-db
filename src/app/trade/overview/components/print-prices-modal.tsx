'use client'

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useActiveStaff } from '@/hooks/use-staff'
import { useOpportunities } from '@/hooks/use-opportunities'
import { Printer } from 'lucide-react'
import { toast } from 'sonner'

interface PrintPricesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PrintPricesModal({ open, onOpenChange }: PrintPricesModalProps) {
  const [selectedAgent, setSelectedAgent] = useState<string>('')
  const { activeStaff } = useActiveStaff()
  const { data: opportunities } = useOpportunities('all', 'all', true)

  // Group opportunities by customer for the selected agent
  const groupedOpportunities = useMemo(() => {
    if (!selectedAgent || !opportunities) return []

    console.log('🔍 Print Prices - Selected Agent:', selectedAgent)
    console.log('🔍 Print Prices - Total Opportunities:', opportunities.length)

    // Debug: Check first few opportunities
    if (opportunities.length > 0) {
      console.log('🔍 Sample opportunity:', {
        customer: opportunities[0].customer,
        agent: opportunities[0].customer?.agent,
        status: opportunities[0].status
      })
    }

    // Filter opportunities for this agent's customers
    const agentOpps = opportunities.filter(
      (opp) => {
        const hasAgent = opp.customer?.agent?.id === selectedAgent
        const hasCorrectStatus = opp.status === 'active' || opp.status === 'offered'
        return hasAgent && hasCorrectStatus
      }
    )

    console.log('🔍 Filtered agent opportunities:', agentOpps.length)

    // Group by customer
    const grouped = agentOpps.reduce((acc, opp) => {
      const customerId = opp.customer_id
      if (!acc[customerId]) {
        acc[customerId] = {
          customer: opp.customer,
          opportunities: []
        }
      }
      acc[customerId].opportunities.push(opp)
      return acc
    }, {} as Record<string, { customer: any; opportunities: any[] }>)

    return Object.values(grouped)
  }, [selectedAgent, opportunities])

  const totalOpportunities = useMemo(() => {
    return groupedOpportunities.reduce((sum, group) => sum + group.opportunities.length, 0)
  }, [groupedOpportunities])

  const handlePrint = () => {
    if (!selectedAgent) {
      toast.error('Please select an agent')
      return
    }

    if (groupedOpportunities.length === 0) {
      toast.error('No active opportunities found for this agent')
      return
    }

    const agent = activeStaff?.find(s => s.id === selectedAgent)

    // Create print content grouped by customer
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Price List - ${agent?.name}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              padding: 40px;
              color: #333;
            }
            h1 {
              border-bottom: 3px solid #000;
              padding-bottom: 10px;
              margin-bottom: 30px;
            }
            h2 {
              margin-top: 40px;
              margin-bottom: 15px;
              color: #059669;
              font-size: 18px;
            }
            .header-info {
              margin-bottom: 30px;
              line-height: 1.8;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            .price {
              font-weight: bold;
              color: #059669;
            }
            .delivery {
              font-size: 11px;
              color: #666;
            }
            .customer-header {
              background-color: #f0f9ff;
              padding: 15px;
              margin-top: 30px;
              margin-bottom: 15px;
              border-left: 4px solid #059669;
            }
            @media print {
              body { padding: 20px; }
              .customer-header {
                page-break-before: auto;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <h1>AGENT PRICE LIST</h1>
          <div class="header-info">
            <strong>Agent:</strong> ${agent?.name}<br>
            <strong>Date:</strong> ${new Date().toLocaleDateString()}<br>
            <strong>Total Customers:</strong> ${groupedOpportunities.length}<br>
            <strong>Total Opportunities:</strong> ${totalOpportunities}
          </div>

          ${groupedOpportunities.map(({ customer, opportunities }) => `
            <div class="customer-header">
              <h2>${customer?.name || 'Unknown Customer'}</h2>
              <div style="font-size: 12px; color: #666;">
                ${customer?.city ? `${customer.city}, ${customer.country}` : ''} •
                ${opportunities.length} ${opportunities.length === 1 ? 'opportunity' : 'opportunities'}
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Supplier</th>
                  <th>Delivery Location</th>
                  <th>Sales Price</th>
                  <th>Terms</th>
                </tr>
              </thead>
              <tbody>
                ${opportunities.map((opp) => `
                  <tr>
                    <td>${opp.product_packaging_specs?.products?.name || 'N/A'}</td>
                    <td>
                      ${opp.supplier?.name || 'N/A'}
                      <div class="delivery">${opp.supplier?.city ? `${opp.supplier.city}, ${opp.supplier.country}` : ''}</div>
                    </td>
                    <td>
                      ${opp.delivery_hub?.name || opp.supplier_price?.hub_name || 'N/A'}
                      <div class="delivery">${opp.delivery_hub?.city ? `${opp.delivery_hub.city}, ${opp.delivery_hub.country}` : ''}</div>
                    </td>
                    <td class="price">€${opp.offer_price_per_unit?.toFixed(2)}/${opp.product_packaging_specs?.products?.sold_by || 'unit'}</td>
                    <td>${opp.supplier_price?.delivery_mode === 'DELIVERY' ? 'DDP' : 'EXW'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `).join('')}
        </body>
      </html>
    `

    // Open print window
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 250)
      toast.success('Opening print dialog...')
      onOpenChange(false)
    } else {
      toast.error('Failed to open print window. Please check your popup blocker.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-terminal-panel border-terminal-border">
        <DialogHeader>
          <DialogTitle className="text-terminal-text font-mono flex items-center gap-2">
            <Printer className="h-5 w-5" />
            PRINT AGENT PRICES
          </DialogTitle>
          <DialogDescription className="text-terminal-muted font-mono">
            Select an agent to print all their customer opportunities grouped by customer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-terminal-muted text-xs font-mono">AGENT</Label>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text font-mono">
                <SelectValue placeholder="Select agent" />
              </SelectTrigger>
              <SelectContent className="bg-terminal-panel border-terminal-border">
                {activeStaff?.map((staff) => (
                  <SelectItem
                    key={staff.id}
                    value={staff.id}
                    className="text-terminal-text font-mono"
                  >
                    {staff.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedAgent && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-terminal-dark border border-terminal-border rounded p-3">
                <div className="text-terminal-muted font-mono text-xs mb-1">
                  Customers
                </div>
                <div className="text-terminal-text font-mono text-2xl font-bold">
                  {groupedOpportunities.length}
                </div>
              </div>
              <div className="bg-terminal-dark border border-terminal-border rounded p-3">
                <div className="text-terminal-muted font-mono text-xs mb-1">
                  Total Opportunities
                </div>
                <div className="text-terminal-text font-mono text-2xl font-bold">
                  {totalOpportunities}
                </div>
              </div>
            </div>
          )}

          {selectedAgent && groupedOpportunities.length > 0 && (
            <div className="bg-terminal-dark border border-terminal-border rounded p-3 max-h-40 overflow-y-auto">
              <div className="text-terminal-muted font-mono text-xs mb-2">
                Preview by Customer
              </div>
              {groupedOpportunities.map(({ customer, opportunities }) => (
                <div key={customer.id} className="text-terminal-text font-mono text-xs py-1">
                  • {customer.name} ({opportunities.length})
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-terminal-border">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-terminal-border text-terminal-text hover:bg-terminal-dark font-mono"
          >
            Cancel
          </Button>
          <Button
            onClick={handlePrint}
            disabled={!selectedAgent || groupedOpportunities.length === 0}
            className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
