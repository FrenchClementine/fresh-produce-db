'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
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
    // Navigate to the print report page (no agent parameter needed - shows all agents)
    router.push(`/trade/overview/print-report`)
    onOpenChange(false)
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
            className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono"
          >
            <Printer className="h-4 w-4 mr-2" />
            Open Print Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
