'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, Shield, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import { AddCustomerCertificationForm } from '@/components/forms/add-customer-certification-form'
import { EditCustomerCertificationForm } from '@/components/forms/edit-customer-certification-form'

interface CustomerCertificationsTableProps {
  customerCertifications: any[]
  isLoading: boolean
  customerId: string
}

export function CustomerCertificationsTable({
  customerCertifications,
  isLoading,
  customerId,
}: CustomerCertificationsTableProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [certificationToEdit, setCertificationToEdit] = useState<any>(null)
  const [certificationToDelete, setCertificationToDelete] = useState<any>(null)

  const { toast } = useToast()
  const queryClient = useQueryClient()

  const handleDelete = async (certification: any) => {
    try {
      const { error } = await supabase
        .from('customer_certifications')
        .delete()
        .eq('id', certification.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Certification requirement deleted successfully',
      })

      queryClient.invalidateQueries({ queryKey: ['customer-certifications', customerId] })
      setCertificationToDelete(null)

    } catch (error: any) {
      console.error('Error deleting certification requirement:', error)
      toast({
        title: 'Error',
        description: `Failed to delete certification requirement: ${error.message}`,
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading certification requirements...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Certification Requirements</h3>
          <p className="text-sm text-muted-foreground">
            Certifications that suppliers must have to work with this customer
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Certification Requirement
        </Button>
      </div>

      {customerCertifications.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Shield className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No certification requirements</h3>
          <p className="text-sm">Add certification requirements to get started.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Certification</TableHead>
              <TableHead>Required</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customerCertifications.map((certification) => (
              <TableRow key={certification.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <div className="font-medium">
                      {certification.certifications?.name}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={certification.is_required ? "destructive" : "secondary"}
                    className="flex items-center gap-1 w-fit"
                  >
                    {certification.is_required && <AlertTriangle className="h-3 w-3" />}
                    {certification.is_required ? 'Required' : 'Optional'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    {certification.certifications?.description || 'No description'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {certification.notes || 'No notes'}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCertificationToEdit(certification)
                        setIsEditDialogOpen(true)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCertificationToDelete(certification)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <AddCustomerCertificationForm
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        customerId={customerId}
      />

      <EditCustomerCertificationForm
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) setCertificationToEdit(null)
        }}
        customerCertification={certificationToEdit}
      />

      <AlertDialog open={!!certificationToDelete} onOpenChange={() => setCertificationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the certification requirement for "{certificationToDelete?.certifications?.name}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => certificationToDelete && handleDelete(certificationToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}