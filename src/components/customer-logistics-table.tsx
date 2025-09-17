'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, Truck, MapPin, Clock } from 'lucide-react'
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
import { AddCustomerLogisticsForm } from '@/components/forms/add-customer-logistics-form'
import { EditCustomerLogisticsForm } from '@/components/forms/edit-customer-logistics-form'

interface CustomerLogisticsTableProps {
  customerLogistics: any[]
  isLoading: boolean
  customerId: string
}

export function CustomerLogisticsTable({
  customerLogistics,
  isLoading,
  customerId,
}: CustomerLogisticsTableProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [logisticToEdit, setLogisticToEdit] = useState<any>(null)
  const [logisticToDelete, setLogisticToDelete] = useState<any>(null)

  const { toast } = useToast()
  const queryClient = useQueryClient()

  const handleDelete = async (logistic: any) => {
    try {
      const { error } = await supabase
        .from('customer_logistics_capabilities')
        .delete()
        .eq('id', logistic.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Logistics preference deleted successfully',
      })

      queryClient.invalidateQueries({ queryKey: ['customer-logistics', customerId] })
      setLogisticToDelete(null)

    } catch (error: any) {
      console.error('Error deleting logistics preference:', error)
      toast({
        title: 'Error',
        description: `Failed to delete logistics preference: ${error.message}`,
        variant: 'destructive',
      })
    }
  }

  const formatDays = (days: string[] | null) => {
    if (!days || days.length === 0) return 'Any day'
    return days.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(', ')
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading logistics preferences...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Logistics Preferences</h3>
          <p className="text-sm text-muted-foreground">
            Hub delivery and pickup preferences for this customer
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Logistics Preference
        </Button>
      </div>

      {customerLogistics.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Truck className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No logistics preferences</h3>
          <p className="text-sm">Add logistics preferences to get started.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mode</TableHead>
              <TableHead>Origin Hub</TableHead>
              <TableHead>Destination Hub</TableHead>
              <TableHead>Lead Time</TableHead>
              <TableHead>Operational Days</TableHead>
              <TableHead>Preferred Time</TableHead>
              <TableHead>Requirements</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customerLogistics.map((logistic) => (
              <TableRow key={logistic.id}>
                <TableCell>
                  <Badge variant="outline">
                    {logistic.mode}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">
                        {logistic.origin_hub?.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {logistic.origin_hub?.hub_code}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {logistic.destination_hub ? (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {logistic.destination_hub.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {logistic.destination_hub.hub_code}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Ex Works (Customer pickup)
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {logistic.typical_lead_time_days ? (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">
                        {logistic.typical_lead_time_days} days
                      </span>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Not specified</div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {formatDays(logistic.fixed_operational_days)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {logistic.preferred_delivery_time || 'No preference'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {logistic.special_requirements || 'None'}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setLogisticToEdit(logistic)
                        setIsEditDialogOpen(true)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLogisticToDelete(logistic)}
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

      <AddCustomerLogisticsForm
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        customerId={customerId}
      />

      <EditCustomerLogisticsForm
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) setLogisticToEdit(null)
        }}
        customerLogistics={logisticToEdit}
      />

      <AlertDialog open={!!logisticToDelete} onOpenChange={() => setLogisticToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this logistics preference.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => logisticToDelete && handleDelete(logisticToDelete)}
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