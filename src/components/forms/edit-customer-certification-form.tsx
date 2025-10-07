'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface EditCustomerCertificationFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerCertification: any
}

export function EditCustomerCertificationForm({ open, onOpenChange, customerCertification }: EditCustomerCertificationFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-terminal-panel border-terminal-border">
        <DialogHeader>
          <DialogTitle className="text-terminal-text font-mono">EDIT CERTIFICATION REQUIREMENT</DialogTitle>
          <DialogDescription className="text-terminal-muted font-mono">
            Update the certification requirement details.
          </DialogDescription>
        </DialogHeader>
        <div className="p-4 text-center text-terminal-muted font-mono">
          Form coming soon... This will allow editing certification requirements for customers.
        </div>
      </DialogContent>
    </Dialog>
  )
}