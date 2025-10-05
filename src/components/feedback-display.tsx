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
    color: 'bg-gray-100 text-gray-600',
    label: 'No feedback'
  },
  pending: {
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-600',
    label: 'Pending'
  },
  received: {
    icon: AlertCircle,
    color: 'bg-blue-100 text-blue-600',
    label: 'Received'
  },
  addressed: {
    icon: CheckCircle,
    color: 'bg-green-100 text-green-600',
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
        className={`${feedbackStatusConfig[opportunity.feedback_status || 'none'].color} text-xs`}
        variant="secondary"
      >
        <StatusIcon className="h-3 w-3 mr-1" />
        {feedbackStatusConfig[opportunity.feedback_status || 'none'].label}
      </Badge>

      {/* Feedback Date */}
      {opportunity.feedback_date && (
        <div className="text-xs text-muted-foreground">
          {format(new Date(opportunity.feedback_date), 'MMM dd, yyyy')}
        </div>
      )}

      {/* Quick Preview of Feedback */}
      {hasExistingFeedback && (
        <div className="text-xs text-muted-foreground max-w-[200px] truncate">
          "{opportunity.customer_feedback}"
        </div>
      )}

      {/* Feedback Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            size="sm"
            variant={hasExistingFeedback ? "outline" : "ghost"}
            className="text-xs h-6 px-2"
          >
            <Edit className="h-3 w-3 mr-1" />
            {hasExistingFeedback ? 'Edit' : 'Add'} Feedback
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Customer Feedback</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-2">Customer</div>
              <div className="text-sm text-muted-foreground">
                {opportunity.customer?.name} - {opportunity.product_packaging_specs?.products.name}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Feedback Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No feedback</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="addressed">Addressed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Feedback Details</label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Enter customer feedback..."
                className="mt-1 min-h-[100px]"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
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