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

  const getPriceAgeColor = (daysOld: number) => {
    if (daysOld <= 7) return 'text-terminal-success'
    if (daysOld <= 30) return 'text-terminal-warning'
    return 'text-terminal-alert'
  }

  if (isLoading) {
    return (
      <Card className="bg-terminal-panel border-terminal-border">
        <CardContent className="pt-6">
          <div className="text-center py-8 text-terminal-muted font-mono">Loading price bands...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-terminal-panel border-terminal-border">
        <CardContent className="p-6">
          <p className="text-terminal-alert font-mono">Error loading price bands. Please try again.</p>
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
              <Euro className="h-4 w-4 text-terminal-accent" />
              ROUTE PRICE BANDS
              <Badge variant="secondary" className="bg-terminal-success/20 text-terminal-success border-terminal-success font-mono">
                {filteredBands.length}
              </Badge>
            </CardTitle>
            <CardDescription className="text-terminal-muted font-mono text-xs mt-1">
              Manage tiered pricing for different pallet quantities and dimensions
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Price Bands
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-terminal-dark border-terminal-border">
                <DropdownMenuItem onClick={() => setShowForm(true)} className="font-mono text-terminal-text hover:bg-terminal-panel">
                  <Plus className="h-4 w-4 mr-2" />
                  Single Price Band
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowBulkForm(true)} className="font-mono text-terminal-text hover:bg-terminal-panel">
                  <Package className="h-4 w-4 mr-2" />
                  Multiple Price Bands
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Single Price Band Dialog */}
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-terminal-dark border-terminal-border">
              <DialogHeader>
                <DialogTitle className="text-terminal-text font-mono">Add New Price Band</DialogTitle>
                <DialogDescription className="text-terminal-muted font-mono">
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
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-terminal-dark border-terminal-border">
              <DialogHeader>
                <DialogTitle className="text-terminal-text font-mono">Add Multiple Price Bands</DialogTitle>
                <DialogDescription className="text-terminal-muted font-mono">
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
      <CardContent className="p-4 space-y-4">
        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-terminal-muted" />
            <Input
              placeholder="Search price bands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-terminal-dark border-terminal-border text-terminal-text font-mono text-xs placeholder:text-terminal-muted h-9"
            />
          </div>

          <Select value={selectedRoute} onValueChange={setSelectedRoute}>
            <SelectTrigger className="w-[280px] bg-terminal-dark border-terminal-border text-terminal-text font-mono text-xs h-9">
              <SelectValue placeholder="Filter by route" />
            </SelectTrigger>
            <SelectContent className="bg-terminal-dark border-terminal-border">
              <SelectItem value="all" className="font-mono text-terminal-text">All Routes</SelectItem>
              {routes?.map((route) => (
                <SelectItem key={route.id} value={route.id} className="font-mono text-terminal-text text-xs">
                  {route.transporters.name}: {route.origin_hub.name} → {route.destination_hub.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Price Bands Table */}
        <div className="rounded-md border border-terminal-border">
          <Table>
            <TableHeader>
              <TableRow className="border-terminal-border hover:bg-terminal-dark">
                <TableHead className="font-mono text-terminal-muted text-xs">ROUTE</TableHead>
                <TableHead className="font-mono text-terminal-muted text-xs">PALLET SIZE</TableHead>
                <TableHead className="font-mono text-terminal-muted text-xs">QTY RANGE</TableHead>
                <TableHead className="font-mono text-terminal-muted text-xs">PRICE/PALLET</TableHead>
                <TableHead className="font-mono text-terminal-muted text-xs">VALID UNTIL</TableHead>
                <TableHead className="font-mono text-terminal-muted text-xs">AGE</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBands.length === 0 ? (
                <TableRow className="border-terminal-border hover:bg-terminal-dark/50">
                  <TableCell colSpan={7} className="text-center py-8 text-terminal-muted font-mono text-xs">
                    {searchTerm || selectedRoute !== 'all' ? 'No price bands found matching your filters.' : 'No price bands added yet.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredBands.map((band) => {
                  const daysOld = getDaysOld(band.last_updated_at)
                  return (
                    <TableRow key={band.id} className="border-terminal-border hover:bg-terminal-dark/50">
                      <TableCell className="font-mono text-terminal-text text-xs">
                        <div className="space-y-1">
                          <div className="font-semibold">
                            {band.transporter_routes.transporters.name}
                          </div>
                          <div className="text-xs text-terminal-muted">
                            {band.transporter_routes.origin_hub.name} → {band.transporter_routes.destination_hub.name}
                          </div>
                          <div className="text-xs text-terminal-muted">
                            {band.transporter_routes.origin_hub.country_code} → {band.transporter_routes.destination_hub.country_code}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-mono border-terminal-border text-terminal-text">
                          {band.pallet_dimensions}cm
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-terminal-text text-xs">
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3 text-terminal-accent" />
                          <span>
                            {formatPalletRange(band.min_pallets, band.max_pallets)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-terminal-text text-xs font-semibold">
                        €{band.price_per_pallet.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono text-terminal-text text-xs">
                        {band.valid_till ? (
                          <div>
                            {new Date(band.valid_till).toLocaleDateString('en-GB')}
                          </div>
                        ) : (
                          <span className="text-terminal-muted">No expiry</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`font-mono text-xs ${getPriceAgeColor(daysOld)}`}>
                          {daysOld}d
                        </span>
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
                            <DropdownMenuItem onClick={() => setEditingBand(band.id)} className="font-mono text-terminal-text hover:bg-terminal-panel">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-terminal-border" />
                            <DropdownMenuItem
                              onClick={() => handleDelete(band.id)}
                              className="text-terminal-alert font-mono hover:bg-terminal-panel"
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
          <div className="text-xs text-terminal-muted font-mono">
            Showing {filteredBands.length} of {priceBands?.length} price bands
            {selectedRoute !== 'all' && ` (filtered by route)`}
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editingBand} onOpenChange={() => setEditingBand(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-terminal-dark border-terminal-border">
          <DialogHeader>
            <DialogTitle className="text-terminal-text font-mono">Edit Price Band</DialogTitle>
            <DialogDescription className="text-terminal-muted font-mono">
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