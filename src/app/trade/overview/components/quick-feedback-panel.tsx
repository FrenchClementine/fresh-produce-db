'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useOpportunities, useUpdateOpportunity } from '@/hooks/use-opportunities'
import { MessageSquare, Save } from 'lucide-react'
import { toast } from 'sonner'

export function QuickFeedbackPanel() {
  const [selectedOpportunity, setSelectedOpportunity] = useState('')
  const [feedbackStatus, setFeedbackStatus] = useState('')
  const [notes, setNotes] = useState('')

  const { data: opportunities } = useOpportunities('offered', 'all', true)
  const updateOpportunity = useUpdateOpportunity()

  // Get recent offered opportunities
  const recentOffered = opportunities?.slice(0, 10) || []

  const handleSaveFeedback = async () => {
    if (!selectedOpportunity || !feedbackStatus) {
      toast.error('Please select an opportunity and feedback status')
      return
    }

    try {
      await updateOpportunity.mutateAsync({
        id: selectedOpportunity,
        data: {
          feedback_status: feedbackStatus as any,
          feedback_notes: notes || undefined
        }
      })

      toast.success('Feedback saved successfully!')
      // Reset form
      setSelectedOpportunity('')
      setFeedbackStatus('')
      setNotes('')
    } catch (error) {
      toast.error('Failed to save feedback')
    }
  }

  return (
    <Card className="bg-terminal-panel border-terminal-border">
      <CardHeader className="border-b border-terminal-border pb-3">
        <CardTitle className="text-terminal-text font-mono text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-terminal-warning" />
          QUICK FEEDBACK
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <Label className="text-terminal-muted text-xs font-mono">OPPORTUNITY</Label>
          <Select value={selectedOpportunity} onValueChange={setSelectedOpportunity}>
            <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text">
              <SelectValue placeholder="Select opportunity" />
            </SelectTrigger>
            <SelectContent className="bg-terminal-panel border-terminal-border">
              {recentOffered.map((opp) => (
                <SelectItem key={opp.id} value={opp.id} className="text-terminal-text">
                  {opp.customer?.name} → {opp.product_packaging_specs?.products.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-terminal-muted text-xs font-mono">STATUS</Label>
          <Select value={feedbackStatus} onValueChange={setFeedbackStatus}>
            <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent className="bg-terminal-panel border-terminal-border">
              <SelectItem value="interested" className="text-terminal-success">
                Interested
              </SelectItem>
              <SelectItem value="not_interested" className="text-terminal-alert">
                Not Interested
              </SelectItem>
              <SelectItem value="price_too_high" className="text-terminal-warning">
                Price Too High
              </SelectItem>
              <SelectItem value="quality_concerns" className="text-terminal-warning">
                Quality Concerns
              </SelectItem>
              <SelectItem value="timing_issue" className="text-terminal-muted">
                Timing Issue
              </SelectItem>
              <SelectItem value="pending" className="text-terminal-accent">
                Pending Response
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-terminal-muted text-xs font-mono">NOTES</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add feedback notes..."
            className="bg-terminal-dark border-terminal-border text-terminal-text font-mono text-sm min-h-[80px]"
          />
        </div>

        <Button
          onClick={handleSaveFeedback}
          disabled={updateOpportunity.isPending}
          className="w-full bg-terminal-warning hover:bg-terminal-warning/90 text-terminal-dark font-mono"
        >
          <Save className="h-4 w-4 mr-2" />
          SAVE FEEDBACK
        </Button>

        {recentOffered.length > 0 && (
          <div className="pt-3 border-t border-terminal-border">
            <div className="text-terminal-muted text-xs font-mono mb-2">RECENT QUOTES</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {recentOffered.slice(0, 5).map((opp) => (
                <div
                  key={opp.id}
                  className="text-xs text-terminal-text font-mono flex items-center justify-between p-1 hover:bg-terminal-dark rounded cursor-pointer"
                  onClick={() => setSelectedOpportunity(opp.id)}
                >
                  <span className="truncate">{opp.customer?.name}</span>
                  <span className="text-terminal-accent">€{opp.offer_price_per_unit?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
