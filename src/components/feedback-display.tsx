'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MessageSquare, Edit, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { Opportunity } from '@/types/opportunities'
import { useUpdateOpportunity } from '@/hooks/use-opportunities'
import { format } from 'date-fns'

interface FeedbackDisplayProps {
  opportunity: Opportunity
}

const feedbackStatusConfig = {
  none: {
    icon: MessageSquare,
    color: 'bg-terminal-dark text-terminal-muted border-terminal-border',
    label: 'No feedback'
  },
  pending: {
    icon: Clock,
    color: 'bg-yellow-600/20 text-yellow-400 border-yellow-600',
    label: 'Pending'
  },
  received: {
    icon: AlertCircle,
    color: 'bg-blue-600/20 text-blue-400 border-blue-600',
    label: 'Received'
  },
  addressed: {
    icon: CheckCircle,
    color: 'bg-terminal-success/20 text-terminal-success border-terminal-success',
    label: 'Addressed'
  }
}

export function FeedbackDisplay({ opportunity }: FeedbackDisplayProps) {
  const [open, setOpen] = useState(false)
  const [feedback, setFeedback] = useState(opportunity.customer_feedback || '')
  const [status, setStatus] = useState(opportunity.feedback_status || 'none')

  const updateMutation = useUpdateOpportunity()
  const StatusIcon = feedbackStatusConfig[status].icon

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        id: opportunity.id,
        data: {
          customer_feedback: feedback,
          feedback_status: status as any,
        }
      })
      setOpen(false)
    } catch (error) {
      console.error('Failed to update feedback:', error)
    }
  }

  const hasExistingFeedback = opportunity.customer_feedback && opportunity.customer_feedback.length > 0

  return (
    <div className="space-y-1">
      {/* Feedback Status Badge */}
      <Badge
        className={`${feedbackStatusConfig[opportunity.feedback_status || 'none'].color} text-xs font-mono`}
        variant="outline"
      >
        <StatusIcon className="h-3 w-3 mr-1" />
        {feedbackStatusConfig[opportunity.feedback_status || 'none'].label}
      </Badge>

      {/* Feedback Date */}
      {opportunity.feedback_date && (
        <div className="text-xs text-terminal-muted font-mono">
          {format(new Date(opportunity.feedback_date), 'MMM dd, yyyy')}
        </div>
      )}

      {/* Quick Preview of Feedback */}
      {hasExistingFeedback && (
        <div className="text-xs text-terminal-muted max-w-[200px] truncate font-mono">
          "{opportunity.customer_feedback}"
        </div>
      )}

      {/* Feedback Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-6 px-2 bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono"
          >
            <Edit className="h-3 w-3 mr-1" />
            {hasExistingFeedback ? 'Edit' : 'Add'} Feedback
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-md bg-terminal-panel border-terminal-border">
          <DialogHeader>
            <DialogTitle className="font-mono text-terminal-text">Customer Feedback</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-2 font-mono text-terminal-text">Customer</div>
              <div className="text-sm text-terminal-muted font-mono">
                {opportunity.customer?.name} - {opportunity.product_packaging_specs?.products.name}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium font-mono text-terminal-text">Feedback Status</label>
              <Select value={status} onValueChange={(value) => setStatus(value as 'pending' | 'none' | 'received' | 'addressed')}>
                <SelectTrigger className="mt-1 bg-terminal-dark border-terminal-border text-terminal-text font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-terminal-panel border-terminal-border">
                  <SelectItem value="none" className="font-mono text-terminal-text">No feedback</SelectItem>
                  <SelectItem value="pending" className="font-mono text-terminal-text">Pending</SelectItem>
                  <SelectItem value="received" className="font-mono text-terminal-text">Received</SelectItem>
                  <SelectItem value="addressed" className="font-mono text-terminal-text">Addressed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium font-mono text-terminal-text">Feedback Details</label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Enter customer feedback..."
                className="mt-1 min-h-[100px] bg-terminal-dark border-terminal-border text-terminal-text font-mono"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}