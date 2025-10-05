'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TradePotential } from '@/types/trade-potential'
import { Building2, Package, Euro, Truck, Calendar, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight, Undo2, Info } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateOpportunity } from '@/hooks/use-opportunities'
import { supabase } from '@/lib/supabase'

interface QueueModeProps {
  potentials: TradePotential[]
  onRefresh: () => void
}

interface Decision {
  itemId: string
  action: 'approved' | 'rejected' | 'skipped'
  timestamp: number
}

interface UndoAction {
  action: 'approve' | 'reject' | 'skip'
  itemId: string
  previousIndex: number
  opportunityId?: string
}

export function QueueMode({ potentials, onRefresh }: QueueModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [decisions, setDecisions] = useState<Record<string, 'approved' | 'rejected' | 'skipped'>>({})
  const [undoStack, setUndoStack] = useState<UndoAction[]>([])
  const [showDetails, setShowDetails] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const createOpportunityMutation = useCreateOpportunity()

  const currentItem = potentials[currentIndex]
  const totalItems = potentials.length
  const reviewedCount = Object.keys(decisions).length
  const approvedCount = Object.values(decisions).filter(d => d === 'approved').length
  const rejectedCount = Object.values(decisions).filter(d => d === 'rejected').length
  const skippedCount = Object.values(decisions).filter(d => d === 'skipped').length
  const progressPercent = (reviewedCount / totalItems) * 100

  // Navigate to next unreviewed item
  const goToNextUnreviewed = useCallback(() => {
    const nextIndex = potentials.findIndex((p, idx) => idx > currentIndex && !decisions[p.id])
    if (nextIndex !== -1) {
      setCurrentIndex(nextIndex)
    } else {
      // Wrap around to first unreviewed
      const firstUnreviewed = potentials.findIndex(p => !decisions[p.id])
      if (firstUnreviewed !== -1) {
        setCurrentIndex(firstUnreviewed)
      } else {
        toast.success('All items reviewed!')
      }
    }
  }, [currentIndex, potentials, decisions])

  // Approve - Create Opportunity
  const handleApprove = async () => {
    if (!currentItem) return
    setIsProcessing(true)

    try {
      const opportunity = await createOpportunityMutation.mutateAsync({
        customer_id: currentItem.customer.id,
        supplier_id: currentItem.supplier.id,
        product_packaging_spec_id: currentItem.product.specId,
        offer_price_per_unit: currentItem.supplierPrice?.pricePerUnit || 0,
        offer_currency: currentItem.supplierPrice?.currency || 'EUR',
        status: 'draft',
        priority: 'medium',
        supplier_price_id: currentItem.supplierPrice?.id,
        assigned_to: currentItem.customer.agent?.id
      })

      setDecisions(prev => ({ ...prev, [currentItem.id]: 'approved' }))
      setUndoStack(prev => [...prev, {
        action: 'approve',
        itemId: currentItem.id,
        previousIndex: currentIndex,
        opportunityId: opportunity.id
      }])

      toast.success('Opportunity created!')
      goToNextUnreviewed()
    } catch (error) {
      toast.error('Failed to create opportunity')
    } finally {
      setIsProcessing(false)
    }
  }

  // Reject - Mark as Non-viable
  const handleReject = async () => {
    if (!currentItem) return
    setIsProcessing(true)

    try {
      // You can add a non_viable flag or just track in decisions
      setDecisions(prev => ({ ...prev, [currentItem.id]: 'rejected' }))
      setUndoStack(prev => [...prev, {
        action: 'reject',
        itemId: currentItem.id,
        previousIndex: currentIndex
      }])

      toast.success('Marked as non-viable')
      goToNextUnreviewed()
    } catch (error) {
      toast.error('Failed to mark as non-viable')
    } finally {
      setIsProcessing(false)
    }
  }

  // Skip
  const handleSkip = () => {
    if (!currentItem) return

    setDecisions(prev => ({ ...prev, [currentItem.id]: 'skipped' }))
    setUndoStack(prev => [...prev, {
      action: 'skip',
      itemId: currentItem.id,
      previousIndex: currentIndex
    }])

    goToNextUnreviewed()
  }

  // Undo
  const handleUndo = async () => {
    if (undoStack.length === 0) return

    const lastAction = undoStack[undoStack.length - 1]
    setIsProcessing(true)

    try {
      // If we created an opportunity, delete it
      if (lastAction.action === 'approve' && lastAction.opportunityId) {
        await supabase
          .from('opportunities')
          .delete()
          .eq('id', lastAction.opportunityId)
      }

      // Remove from decisions
      setDecisions(prev => {
        const newDecisions = { ...prev }
        delete newDecisions[lastAction.itemId]
        return newDecisions
      })

      // Go back to previous index
      setCurrentIndex(lastAction.previousIndex)

      // Remove from undo stack
      setUndoStack(prev => prev.slice(0, -1))

      toast.success('Undone')
    } catch (error) {
      toast.error('Failed to undo')
    } finally {
      setIsProcessing(false)
    }
  }

  // Next/Previous
  const handleNext = () => {
    if (currentIndex < totalItems - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key.toLowerCase()) {
        case 'd':
        case 'enter':
          e.preventDefault()
          if (!isProcessing) handleApprove()
          break
        case 's':
          e.preventDefault()
          if (!isProcessing) handleReject()
          break
        case 'a':
          e.preventDefault()
          if (!isProcessing) handleSkip()
          break
        case 'n':
          e.preventDefault()
          handleNext()
          break
        case 'p':
          e.preventDefault()
          handlePrevious()
          break
        case ' ':
          e.preventDefault()
          setShowDetails(!showDetails)
          break
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            handleUndo()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentIndex, isProcessing, showDetails, handleApprove, handleReject, handleSkip, handleUndo])

  if (!currentItem) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">All Done!</h3>
          <p className="text-muted-foreground">No more items to review</p>
        </div>
      </div>
    )
  }

  const getStatusBadge = () => {
    if (currentItem.status === 'complete') {
      return <Badge className="bg-green-100 text-green-800">✅ Complete - Ready to create opportunity</Badge>
    } else if (currentItem.status === 'missing_price') {
      return <Badge className="bg-orange-100 text-orange-800">⚠️ Missing Price</Badge>
    } else if (currentItem.status === 'missing_transport') {
      return <Badge className="bg-orange-100 text-orange-800">⚠️ Missing Transport</Badge>
    } else {
      return <Badge className="bg-red-100 text-red-800">❌ Missing Both</Badge>
    }
  }

  const margin = currentItem.supplierPrice?.pricePerUnit
    ? (currentItem.opportunity?.offerPrice || currentItem.supplierPrice.pricePerUnit * 1.15) - currentItem.supplierPrice.pricePerUnit
    : 0
  const marginPercent = currentItem.supplierPrice?.pricePerUnit
    ? (margin / (currentItem.opportunity?.offerPrice || currentItem.supplierPrice.pricePerUnit * 1.15)) * 100
    : 0

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Main Card */}
      <Card className="shadow-lg">
        <CardContent className="p-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
                <span className="font-semibold">{currentItem.customer.name}</span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <span className="font-semibold">{currentItem.supplier.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>📍 {currentItem.customer.city}, {currentItem.customer.country}</span>
                <span>→</span>
                <span>{currentItem.supplier.city}, {currentItem.supplier.country}</span>
              </div>
            </div>

            {/* Product */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-600" />
                <span className="text-xl font-semibold">{currentItem.product.name}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                📦 {currentItem.product.packagingLabel} - {currentItem.product.sizeName}
              </div>
            </div>

            {/* Pricing */}
            {currentItem.supplierPrice && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                <div className="font-semibold text-green-900">💰 PRICING</div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Cost</div>
                    <div className="font-semibold">€{currentItem.supplierPrice.pricePerUnit.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Offer</div>
                    <div className="font-semibold">
                      €{(currentItem.opportunity?.offerPrice || currentItem.supplierPrice.pricePerUnit * 1.15).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Margin</div>
                    <div className="font-semibold text-green-600">
                      €{margin.toFixed(2)} ({marginPercent.toFixed(1)}%)
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Transport */}
            {currentItem.transportRoute && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <div className="font-semibold text-blue-900">🚚 LOGISTICS</div>
                <div className="text-sm">
                  {currentItem.transportRoute.transporterName} • {currentItem.transportRoute.durationDays} days
                </div>
              </div>
            )}

            {/* Validity */}
            {currentItem.supplierPrice?.validUntil && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Valid until: {new Date(currentItem.supplierPrice.validUntil).toLocaleDateString()}</span>
              </div>
            )}

            {/* Status */}
            <div>
              {getStatusBadge()}
            </div>

            {/* Expandable Details */}
            {showDetails && (
              <div className="border-t pt-4 space-y-2 text-sm">
                <div><strong>Customer Agent:</strong> {currentItem.customer.agent?.name || 'N/A'}</div>
                <div><strong>Product Category:</strong> {currentItem.product.category}</div>
                <div><strong>Sold By:</strong> {currentItem.product.soldBy}</div>
                {currentItem.supplierPrice?.hubName && (
                  <div><strong>Hub:</strong> {currentItem.supplierPrice.hubName}</div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={handleSkip}
              disabled={isProcessing}
              className="h-16"
            >
              <div className="text-center">
                <div className="font-semibold">Skip</div>
                <div className="text-xs text-muted-foreground">(A)</div>
              </div>
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={handleReject}
              disabled={isProcessing}
              className="h-16 border-red-200 hover:bg-red-50"
            >
              <div className="text-center">
                <div className="font-semibold text-red-600">Non-viable</div>
                <div className="text-xs text-muted-foreground">(S)</div>
              </div>
            </Button>

            <Button
              variant="default"
              size="lg"
              onClick={handleApprove}
              disabled={isProcessing || currentItem.status !== 'complete'}
              className="h-16 bg-green-600 hover:bg-green-700"
            >
              <div className="text-center">
                <div className="font-semibold">Create Opportunity →</div>
                <div className="text-xs opacity-80">(D or Enter)</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress & Stats */}
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress: {reviewedCount}/{totalItems} ({progressPercent.toFixed(0)}%)</span>
            <span>Item {currentIndex + 1} of {totalItems}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex gap-4">
            <span className="text-green-600">✓ {approvedCount} created</span>
            <span className="text-red-600">✗ {rejectedCount} rejected</span>
            <span className="text-gray-600">⏭️ {skippedCount} skipped</span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={undoStack.length === 0 || isProcessing}
            >
              <Undo2 className="h-4 w-4 mr-1" />
              Undo (Ctrl+Z)
            </Button>
          </div>
        </div>
      </div>

      {/* Keyboard Hints */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4" />
          <span><strong>Space</strong> Show details • <strong>N</strong> Next • <strong>P</strong> Previous • <strong>Ctrl+Z</strong> Undo</span>
        </div>
      </div>
    </div>
  )
}
