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
      <Card className="bg-terminal-panel border-terminal-border">
        <CardContent className="pt-6">
          <div className="text-center py-8 text-terminal-muted font-mono">Loading routes...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-terminal-panel border-terminal-border">
        <CardContent className="p-6">
          <p className="text-terminal-alert font-mono">Error loading routes. Please try again.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-terminal-panel border-terminal-border">
      <CardHeader className="border-b border-terminal-border">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 font-mono text-sm text-terminal-text">
              <Route className="h-4 w-4 text-terminal-accent" />
              TRANSPORTER ROUTES
              <Badge variant="secondary" className="bg-terminal-success/20 text-terminal-success border-terminal-success font-mono">
                {filteredRoutes.length}
              </Badge>
            </CardTitle>
            <CardDescription className="text-terminal-muted font-mono text-xs mt-1">
              Manage hub-to-hub transportation services
            </CardDescription>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Add Route
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-terminal-dark border-terminal-border">
              <DialogHeader>
                <DialogTitle className="text-terminal-text font-mono">Add New Route</DialogTitle>
                <DialogDescription className="text-terminal-muted font-mono">
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
      <CardContent className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-terminal-muted" />
          <Input
            placeholder="Search routes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-terminal-dark border-terminal-border text-terminal-text font-mono text-xs placeholder:text-terminal-muted h-9"
          />
        </div>

        {/* Routes Table */}
        <div className="rounded-md border border-terminal-border">
          <Table>
            <TableHeader>
              <TableRow className="border-terminal-border hover:bg-terminal-dark">
                <TableHead className="font-mono text-terminal-muted text-xs">TRANSPORTER</TableHead>
                <TableHead className="font-mono text-terminal-muted text-xs">ROUTE</TableHead>
                <TableHead className="font-mono text-terminal-muted text-xs">TRANSIT</TableHead>
                <TableHead className="font-mono text-terminal-muted text-xs">SCHEDULE</TableHead>
                <TableHead className="font-mono text-terminal-muted text-xs">CUSTOMS</TableHead>
                <TableHead className="font-mono text-terminal-muted text-xs">STATUS</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoutes.length === 0 ? (
                <TableRow className="border-terminal-border hover:bg-terminal-dark/50">
                  <TableCell colSpan={7} className="text-center py-8 text-terminal-muted font-mono text-xs">
                    {searchTerm ? 'No routes found matching your search.' : 'No routes added yet.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRoutes.map((route) => (
                  <TableRow key={route.id} className="border-terminal-border hover:bg-terminal-dark/50">
                    <TableCell className="font-mono text-terminal-text text-xs">
                      <div>
                        <div className="font-semibold">{route.transporters.name}</div>
                        <div className="text-xs text-terminal-muted flex items-center gap-1 mt-0.5">
                          <Euro className="h-3 w-3" />
                          {route.transporters.diesel_surcharge_percentage}% diesel
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-terminal-text text-xs">
                      <div className="space-y-1">
                        <div className="font-medium">
                          {route.origin_hub.name} → {route.destination_hub.name}
                        </div>
                        <div className="text-xs text-terminal-muted">
                          {route.origin_hub.country_code} → {route.destination_hub.country_code}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-terminal-text text-xs">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-terminal-accent" />
                        {route.transport_duration_days}d
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-terminal-text text-xs">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-terminal-accent" />
                        <span className="text-xs">
                          {formatDepartureDays(route.fixed_departure_days)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {route.customs_cost_per_shipment > 0 ? (
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-xs font-mono border-terminal-border text-terminal-text">
                            €{route.customs_cost_per_shipment}
                          </Badge>
                          {route.customs_description && (
                            <div className="text-xs text-terminal-muted font-mono">
                              {route.customs_description}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-xs font-mono bg-terminal-muted/20 text-terminal-muted border-terminal-muted">
                          None
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={route.is_active ? "default" : "secondary"} className={`${
                        route.is_active
                          ? 'bg-terminal-success/20 text-terminal-success border-terminal-success'
                          : 'bg-terminal-muted/20 text-terminal-muted border-terminal-muted'
                      } font-mono text-xs`}>
                        {route.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 text-terminal-text hover:bg-terminal-dark">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-terminal-dark border-terminal-border">
                          <DropdownMenuLabel className="font-mono text-terminal-text">Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setEditingRoute(route.id)} className="font-mono text-terminal-text hover:bg-terminal-panel">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-terminal-border" />
                          <DropdownMenuItem
                            onClick={() => handleDelete(route.id)}
                            className="text-terminal-alert font-mono hover:bg-terminal-panel"
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
          <div className="text-xs text-terminal-muted font-mono">
            Showing {filteredRoutes.length} of {routes?.length} routes
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editingRoute} onOpenChange={() => setEditingRoute(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-terminal-dark border-terminal-border">
          <DialogHeader>
            <DialogTitle className="text-terminal-text font-mono">Edit Route</DialogTitle>
            <DialogDescription className="text-terminal-muted font-mono">
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