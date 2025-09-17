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
import { Search, Plus, MoreHorizontal, Route, Edit, Trash2, Euro, Clock, Calendar } from 'lucide-react'
import { useTransporterRoutes, useDeleteTransporterRoute } from '@/hooks/use-transporters'
import { TransporterRouteForm } from './transporter-route-form'
import { toast } from 'sonner'

export function TransporterRoutesList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingRoute, setEditingRoute] = useState<string | null>(null)

  const { data: routes, isLoading, error } = useTransporterRoutes()
  const deleteRoute = useDeleteTransporterRoute()

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this route? This will also delete all associated price bands.')) {
      try {
        await deleteRoute.mutateAsync(id)
        toast.success('Route deleted successfully')
      } catch (error) {
        toast.error('Failed to delete route')
      }
    }
  }

  const filteredRoutes = routes?.filter(route =>
    route.transporters.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    route.origin_hub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    route.destination_hub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    route.origin_hub.country_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    route.destination_hub.country_code?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const formatDepartureDays = (days?: string[]) => {
    if (!days || days.length === 0) return 'Not specified'
    
    const dayNames: Record<string, string> = {
      'monday': 'Mon',
      'tuesday': 'Tue', 
      'wednesday': 'Wed',
      'thursday': 'Thu',
      'friday': 'Fri',
      'saturday': 'Sat',
      'sunday': 'Sun'
    }
    
    return days.map(day => dayNames[day] || day).join(', ')
  }

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
          <p className="text-red-600">Error loading routes. Please try again.</p>
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
              <Route className="h-6 w-6 text-green-600" />
              Transporter Routes
            </CardTitle>
            <CardDescription>
              Manage hub-to-hub transportation services
            </CardDescription>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Route
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Route</DialogTitle>
                <DialogDescription>
                  Create a new hub-to-hub transportation service
                </DialogDescription>
              </DialogHeader>
              <TransporterRouteForm
                onSuccess={() => {
                  setShowForm(false)
                  toast.success('Route created successfully')
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
              placeholder="Search routes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Routes Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transporter</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Transit</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Customs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoutes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'No routes found matching your search.' : 'No routes added yet.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRoutes.map((route) => (
                    <TableRow key={route.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-medium">{route.transporters.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Euro className="h-3 w-3" />
                            {route.transporters.diesel_surcharge_percentage}% diesel
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {route.origin_hub.name} → {route.destination_hub.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {route.origin_hub.country_code} → {route.destination_hub.country_code}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3" />
                          {route.transport_duration_days} day{route.transport_duration_days !== 1 ? 's' : ''}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          <span className="text-xs">
                            {formatDepartureDays(route.fixed_departure_days)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {route.customs_cost_per_shipment > 0 ? (
                          <div className="space-y-1">
                            <Badge variant="outline" className="text-xs">
                              €{route.customs_cost_per_shipment}
                            </Badge>
                            {route.customs_description && (
                              <div className="text-xs text-muted-foreground">
                                {route.customs_description}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            None
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={route.is_active ? "default" : "secondary"}>
                          {route.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setEditingRoute(route.id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(route.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredRoutes.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Showing {filteredRoutes.length} of {routes?.length} routes
            </div>
          )}
        </div>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editingRoute} onOpenChange={() => setEditingRoute(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Route</DialogTitle>
            <DialogDescription>
              Update route information
            </DialogDescription>
          </DialogHeader>
          {editingRoute && (
            <TransporterRouteForm
              routeId={editingRoute}
              onSuccess={() => {
                setEditingRoute(null)
                toast.success('Route updated successfully')
              }}
              onCancel={() => setEditingRoute(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}