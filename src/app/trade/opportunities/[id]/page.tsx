'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ArrowLeft,
  Edit,
  Save,
  X,
  DollarSign,
  Calendar,
  User,
  Building,
  Package,
  Truck,
  MapPin,
  Clock,
  MessageSquare,
  Trash2
} from 'lucide-react'
import { useOpportunity, useUpdateOpportunity, useDeleteOpportunity } from '@/hooks/use-opportunities'
import { format } from 'date-fns'
import Link from 'next/link'
import { toast } from 'sonner'
import { TransportDisplay } from '@/components/transport-display'
import { OpportunityStatus, OpportunityPriority } from '@/types/opportunities'

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

const formatCurrency = (amount: number, currency: string = 'EUR') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount)
}

export default function OpportunityDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [isEditing, setIsEditing] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<any>({})

  const { data: opportunity, isLoading, error } = useOpportunity(id)
  const updateMutation = useUpdateOpportunity()
  const deleteMutation = useDeleteOpportunity()

  const handleRemoveOpportunity = async () => {
    if (window.confirm(`Are you sure you want to remove this opportunity? This will move it back to potential trades.`)) {
      try {
        await deleteMutation.mutateAsync(id)
        toast.success('Opportunity removed successfully')
        router.push('/trade/trader')
      } catch (error) {
        console.error('Failed to remove opportunity:', error)
        toast.error('Failed to remove opportunity')
      }
    }
  }

  const handleSaveField = async (field: string, value: any) => {
    try {
      await updateMutation.mutateAsync({
        id,
        data: { [field]: value }
      })
      setEditingField(null)
      setEditValues({})
      toast.success('Updated successfully')
    } catch (error) {
      toast.error('Failed to update')
    }
  }

  const startEditing = (field: string, currentValue: any) => {
    setEditingField(field)
    setEditValues({ [field]: currentValue })
  }

  const cancelEditing = () => {
    setEditingField(null)
    setEditValues({})
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading opportunity...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !opportunity) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Opportunity Not Found</CardTitle>
            <CardDescription>
              The opportunity you're looking for doesn't exist or has been removed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/trade/trader">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Opportunities
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" asChild>
            <Link href="/trade/trader">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Opportunity Details</h1>
            <p className="text-muted-foreground">
              {opportunity.customer?.name} ↔ {opportunity.supplier?.name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
            <Edit className="mr-2 h-4 w-4" />
            {isEditing ? 'Stop Editing' : 'Edit'}
          </Button>
          <Button
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleRemoveOpportunity}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
          </Button>
        </div>
      </div>

      {/* Status and Priority */}
      <div className="flex gap-2">
        <Badge className={statusConfig[opportunity.status].color}>
          {statusConfig[opportunity.status].label}
        </Badge>
        <Badge className={priorityConfig[opportunity.priority].color}>
          {priorityConfig[opportunity.priority].label}
        </Badge>
        {!opportunity.is_active && (
          <Badge variant="secondary">Inactive</Badge>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Company</Label>
              <p className="text-lg font-semibold">{opportunity.customer?.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Location</Label>
              <p>{opportunity.customer?.city}, {opportunity.customer?.country}</p>
            </div>
            {opportunity.customer?.agent && (
              <div>
                <Label className="text-sm font-medium">Agent</Label>
                <p>{opportunity.customer.agent.name}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Supplier Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Supplier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Company</Label>
              <p className="text-lg font-semibold">{opportunity.supplier?.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Location</Label>
              <p>{opportunity.supplier?.city}, {opportunity.supplier?.country}</p>
            </div>
          </CardContent>
        </Card>

        {/* Product Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Product
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Product</Label>
              <p className="text-lg font-semibold">{opportunity.product_packaging_specs?.products.name}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline">
                {opportunity.product_packaging_specs?.products.category}
              </Badge>
              <Badge variant="outline">
                {opportunity.product_packaging_specs?.packaging_options.label}
              </Badge>
              <Badge variant="outline">
                {opportunity.product_packaging_specs?.size_options.name}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Transport Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Transport & Delivery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TransportDisplay opportunity={opportunity} />
          </CardContent>
        </Card>

        {/* Pricing Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {opportunity.offer_price_per_unit && (
              <div>
                <Label className="text-sm font-medium">Offer Price</Label>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(opportunity.offer_price_per_unit, opportunity.offer_currency)}
                </p>
              </div>
            )}
            {opportunity.supplier_price && (
              <div>
                <Label className="text-sm font-medium">Supplier Cost</Label>
                <p className="text-lg">
                  {formatCurrency(opportunity.supplier_price.price_per_unit, opportunity.supplier_price.currency)}
                </p>
              </div>
            )}
            {opportunity.offer_price_per_unit && opportunity.supplier_price && (
              <div>
                <Label className="text-sm font-medium">Margin</Label>
                <p className="text-lg font-semibold">
                  {formatCurrency(opportunity.offer_price_per_unit - opportunity.supplier_price.price_per_unit)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Created</Label>
              <p>{format(new Date(opportunity.created_at), 'PPP')}</p>
            </div>
            {opportunity.valid_till && (
              <div>
                <Label className="text-sm font-medium">Valid Until</Label>
                <p>{format(new Date(opportunity.valid_till), 'PPP')}</p>
              </div>
            )}
            {opportunity.quote_sent_date && (
              <div>
                <Label className="text-sm font-medium">Quote Sent</Label>
                <p>{format(new Date(opportunity.quote_sent_date), 'PPP')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes and Feedback */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Internal Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Internal Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {editingField === 'internal_notes' ? (
              <div className="space-y-2">
                <Textarea
                  value={editValues.internal_notes || ''}
                  onChange={(e) => setEditValues({ ...editValues, internal_notes: e.target.value })}
                  placeholder="Add internal notes..."
                  rows={4}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleSaveField('internal_notes', editValues.internal_notes)}>
                    <Save className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEditing}>
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="min-h-[100px] p-2 rounded border cursor-pointer hover:bg-gray-50"
                onClick={() => startEditing('internal_notes', opportunity.internal_notes)}
              >
                {opportunity.internal_notes || (
                  <span className="text-muted-foreground italic">Click to add internal notes...</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quote Feedback */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Quote Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editingField === 'quote_feedback' ? (
              <div className="space-y-2">
                <Textarea
                  value={editValues.quote_feedback || ''}
                  onChange={(e) => setEditValues({ ...editValues, quote_feedback: e.target.value })}
                  placeholder="Add customer feedback..."
                  rows={4}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleSaveField('quote_feedback', editValues.quote_feedback)}>
                    <Save className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEditing}>
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="min-h-[100px] p-2 rounded border cursor-pointer hover:bg-gray-50"
                onClick={() => startEditing('quote_feedback', opportunity.quote_feedback)}
              >
                {opportunity.quote_feedback || (
                  <span className="text-muted-foreground italic">Click to add customer feedback...</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}