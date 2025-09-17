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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Plus, MoreHorizontal, Euro, Package, Edit, Trash2, Clock, ChevronDown } from 'lucide-react'
import { useRoutePriceBands, useDeleteRoutePriceBand, useTransporterRoutes } from '@/hooks/use-transporters'
import { RoutePriceBandForm } from './route-price-band-form'
import { BulkRoutePriceBandForm } from './bulk-route-price-band-form'
import { toast } from 'sonner'

export function RoutePriceBandsList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [editingBand, setEditingBand] = useState<string | null>(null)
  const [selectedRoute, setSelectedRoute] = useState<string>('all')

  const { data: priceBands, isLoading, error } = useRoutePriceBands()
  const { data: routes } = useTransporterRoutes()
  const deletePriceBand = useDeleteRoutePriceBand()

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this price band?')) {
      try {
        await deletePriceBand.mutateAsync(id)
        toast.success('Price band deleted successfully')
      } catch (error) {
        toast.error('Failed to delete price band')
      }
    }
  }

  const filteredBands = priceBands?.filter(band => {
    const matchesSearch = 
      band.transporter_routes.transporters.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      band.transporter_routes.origin_hub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      band.transporter_routes.destination_hub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      band.pallet_dimensions.includes(searchTerm.toLowerCase())
    
    const matchesRoute = selectedRoute === 'all' || band.transporter_route_id === selectedRoute
    
    return matchesSearch && matchesRoute
  }) || []

  const formatPalletRange = (minPallets: number, maxPallets?: number) => {
    if (!maxPallets) {
      return `${minPallets}+`
    }
    return `${minPallets}-${maxPallets}`
  }

  const getDaysOld = (lastUpdated: string) => {
    const now = new Date()
    const updated = new Date(lastUpdated)
    const diffTime = Math.abs(now.getTime() - updated.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getPriceAgeVariant = (daysOld: number) => {
    if (daysOld <= 7) return 'default'
    if (daysOld <= 30) return 'secondary'
    return 'destructive'
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
          <p className="text-red-600">Error loading price bands. Please try again.</p>
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
              <Euro className="h-6 w-6 text-amber-600" />
              Route Price Bands
            </CardTitle>
            <CardDescription>
              Manage tiered pricing for different pallet quantities and dimensions
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Price Bands
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Single Price Band
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowBulkForm(true)}>
                  <Package className="h-4 w-4 mr-2" />
                  Multiple Price Bands
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Single Price Band Dialog */}
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Price Band</DialogTitle>
                <DialogDescription>
                  Create a new pricing tier for a route
                </DialogDescription>
              </DialogHeader>
              <RoutePriceBandForm
                onSuccess={() => {
                  setShowForm(false)
                  toast.success('Price band created successfully')
                }}
                onCancel={() => setShowForm(false)}
              />
            </DialogContent>
          </Dialog>

          {/* Bulk Price Bands Dialog */}
          <Dialog open={showBulkForm} onOpenChange={setShowBulkForm}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Multiple Price Bands</DialogTitle>
                <DialogDescription>
                  Create multiple pricing tiers for a route at once
                </DialogDescription>
              </DialogHeader>
              <BulkRoutePriceBandForm
                onSuccess={() => {
                  setShowBulkForm(false)
                  toast.success('Price bands created successfully')
                }}
                onCancel={() => setShowBulkForm(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search price bands..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedRoute} onValueChange={setSelectedRoute}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Filter by route" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Routes</SelectItem>
                {routes?.map((route) => (
                  <SelectItem key={route.id} value={route.id}>
                    {route.transporters.name}: {route.origin_hub.name} → {route.destination_hub.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price Bands Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead>Pallet Size</TableHead>
                  <TableHead>Quantity Range</TableHead>
                  <TableHead>Price per Pallet</TableHead>
                  <TableHead>Price Age</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBands.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm || selectedRoute !== 'all' ? 'No price bands found matching your filters.' : 'No price bands added yet.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBands.map((band) => {
                    const daysOld = getDaysOld(band.last_updated_at)
                    return (
                      <TableRow key={band.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-sm">
                              {band.transporter_routes.transporters.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {band.transporter_routes.origin_hub.name} → {band.transporter_routes.destination_hub.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {band.transporter_routes.origin_hub.country_code} → {band.transporter_routes.destination_hub.country_code}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {band.pallet_dimensions}cm
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            <span className="text-sm">
                              {formatPalletRange(band.min_pallets, band.max_pallets)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            €{band.price_per_pallet.toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriceAgeVariant(daysOld)} className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {daysOld} day{daysOld !== 1 ? 's' : ''}
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
                              <DropdownMenuItem onClick={() => setEditingBand(band.id)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDelete(band.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {filteredBands.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Showing {filteredBands.length} of {priceBands?.length} price bands
              {selectedRoute !== 'all' && ` (filtered by route)`}
            </div>
          )}
        </div>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editingBand} onOpenChange={() => setEditingBand(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Price Band</DialogTitle>
            <DialogDescription>
              Update price band information
            </DialogDescription>
          </DialogHeader>
          {editingBand && (
            <RoutePriceBandForm
              priceBandId={editingBand}
              onSuccess={() => {
                setEditingBand(null)
                toast.success('Price band updated successfully')
              }}
              onCancel={() => setEditingBand(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}