'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TransporterRouteForm } from '@/components/transporters/transporter-route-form'
import { CustomerProductRequest } from '@/types/customer-requests'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface AddTransportRouteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requestContext?: CustomerProductRequest
}

export function AddTransportRouteModal({
  open,
  onOpenChange,
  requestContext,
}: AddTransportRouteModalProps) {
  const queryClient = useQueryClient()

  const handleSuccess = (routeId?: string) => {
    toast.success('Transport route added successfully')
    queryClient.invalidateQueries({ queryKey: ['transporter-routes'] })
    queryClient.invalidateQueries({ queryKey: ['transport-bands'] })
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-terminal-panel border-terminal-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-terminal-text font-mono">
            ADD TRANSPORT ROUTE
          </DialogTitle>
          <DialogDescription className="text-terminal-muted font-mono">
            Add a new transport route {requestContext ? 'for this customer request' : ''}
            {requestContext?.delivery_hub_id && (
              <div className="mt-2 text-terminal-accent">
                💡 Suggested destination hub: {requestContext.hubs?.name}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <TransporterRouteForm
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
