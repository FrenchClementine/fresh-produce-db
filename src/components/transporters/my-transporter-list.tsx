'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, Plus, MoreHorizontal, Truck, Edit, Trash2, Eye } from 'lucide-react'
import { useMyTransporters } from '@/hooks/use-my-data'
import { useDeleteTransporter } from '@/hooks/use-transporters'
import { TransporterForm } from './transporter-form'
import { toast } from 'sonner'
import Link from 'next/link'

export function MyTransporterList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingTransporter, setEditingTransporter] = useState<string | null>(null)

  const { transporters, isLoading, error } = useMyTransporters()
  const deleteTransporter = useDeleteTransporter()

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this transporter? This will also delete all associated routes.')) {
      try {
        await deleteTransporter.mutateAsync(id)
        toast.success('Transporter deleted successfully')
      } catch (error) {
        toast.error('Failed to delete transporter')
      }
    }
  }

  const filteredTransporters = transporters?.filter(transporter =>
    transporter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transporter.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transporter.city?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">Error loading your transporters. Please try again.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-6 w-6 text-blue-600" />
              Your Transporters
            </CardTitle>
            <CardDescription>
              Third-party logistics providers assigned to you
            </CardDescription>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Transporter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Transporter</DialogTitle>
                <DialogDescription>
                  Create a new third-party logistics provider
                </DialogDescription>
              </DialogHeader>
              <TransporterForm
                onSuccess={() => {
                  setShowForm(false)
                  toast.success('Transporter created successfully')
                }}
                onCancel={() => setShowForm(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search your transporters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Transporters Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Diesel Surcharge</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransporters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {transporters?.length === 0
                        ? 'No transporters assigned to you yet. Contact your admin to assign transporters or add new ones.'
                        : 'No transporters found matching your search.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransporters.map((transporter) => (
                    <TableRow key={transporter.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-medium">{transporter.name}</div>
                          {transporter.notes && (
                            <div className="text-sm text-muted-foreground">
                              {transporter.notes}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {[transporter.city, transporter.country].filter(Boolean).join(', ') || 'Not specified'}
                        </div>
                        {transporter.address && (
                          <div className="text-xs text-muted-foreground">
                            {transporter.address}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          {transporter.email && (
                            <div>{transporter.email}</div>
                          )}
                          {transporter.phone_number && (
                            <div className="text-muted-foreground">{transporter.phone_number}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {transporter.diesel_surcharge_percentage}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={transporter.is_active ? "default" : "secondary"}>
                          {transporter.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link href={`/my/transporters/${transporter.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => setEditingTransporter(transporter.id)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(transporter.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredTransporters.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Showing {filteredTransporters.length} of {transporters?.length} transporters assigned to you
            </div>
          )}
        </div>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editingTransporter} onOpenChange={() => setEditingTransporter(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Transporter</DialogTitle>
            <DialogDescription>
              Update transporter information
            </DialogDescription>
          </DialogHeader>
          {editingTransporter && (
            <TransporterForm
              transporterId={editingTransporter}
              onSuccess={() => {
                setEditingTransporter(null)
                toast.success('Transporter updated successfully')
              }}
              onCancel={() => setEditingTransporter(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}