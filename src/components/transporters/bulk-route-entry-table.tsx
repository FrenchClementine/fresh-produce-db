'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Plus,
  Truck,
  Edit2,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  Trash2,
  Package,
  Euro,
  Clock,
  MapPin,
} from 'lucide-react'
import {
  useTransporterRoutes,
  useRoutePriceBands,
  useUpdateTransporterRoute,
  useUpdateRoutePriceBand,
  useCreateRoutePriceBand,
  useDeleteRoutePriceBand,
  type RouteWithDetails,
  type PriceBandWithRoute,
} from '@/hooks/use-transporters'
import { useTransporters } from '@/hooks/use-transporters'
import { useHubs } from '@/hooks/use-hubs'
import { toast } from 'sonner'

interface EditingRoute {
  id: string
  transport_duration_days: number
  customs_cost_per_shipment: number
}

interface EditingPriceBand {
  id: string
  price_per_pallet: number
  min_pallets: number
  max_pallets: number | null
}

interface NewPriceBand {
  routeId: string
  pallet_dimensions: '120x80' | '120x100'
  price_per_pallet: string
  min_pallets: string
  max_pallets: string
}

export function BulkRouteEntryTable() {
  const [searchTerm, setSearchTerm] = useState('')
  const [transporterFilter, setTransporterFilter] = useState('all')
  const [expandedTransporters, setExpandedTransporters] = useState<Set<string>>(new Set())
  const [expandedRoutes, setExpandedRoutes] = useState<Set<string>>(new Set())

  const [editingRoute, setEditingRoute] = useState<EditingRoute | null>(null)
  const [editingPriceBand, setEditingPriceBand] = useState<EditingPriceBand | null>(null)
  const [newPriceBands, setNewPriceBands] = useState<Map<string, NewPriceBand>>(new Map())

  const { data: routes, isLoading } = useTransporterRoutes()
  const { data: allPriceBands } = useRoutePriceBands()
  const { data: transporters } = useTransporters()
  const { data: hubs } = useHubs()
  const updateRoute = useUpdateTransporterRoute()
  const updatePriceBand = useUpdateRoutePriceBand()
  const createPriceBand = useCreateRoutePriceBand()
  const deletePriceBand = useDeleteRoutePriceBand()

  // Filter routes
  const filteredRoutes = routes?.filter(route => {
    const matchesSearch = !searchTerm ||
      route.transporters.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.origin_hub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.destination_hub.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesTransporter = transporterFilter === 'all' || route.transporter_id === transporterFilter

    return matchesSearch && matchesTransporter
  })

  // Group routes by transporter
  const routesByTransporter = useMemo(() => {
    if (!filteredRoutes) return []

    const grouped = filteredRoutes.reduce((acc, route) => {
      const transporterId = route.transporter_id
      if (!acc[transporterId]) {
        acc[transporterId] = {
          transporterId,
          transporterName: route.transporters.name,
          transporterDieselSurcharge: route.transporters.diesel_surcharge_percentage,
          routes: []
        }
      }
      acc[transporterId].routes.push(route)
      return acc
    }, {} as Record<string, { transporterId: string; transporterName: string; transporterDieselSurcharge: number; routes: RouteWithDetails[] }>)

    return Object.values(grouped).sort((a, b) => a.transporterName.localeCompare(b.transporterName))
  }, [filteredRoutes])

  const toggleTransporter = (transporterId: string) => {
    const newExpanded = new Set(expandedTransporters)
    if (newExpanded.has(transporterId)) {
      newExpanded.delete(transporterId)
    } else {
      newExpanded.add(transporterId)
    }
    setExpandedTransporters(newExpanded)
  }

  const toggleRoute = (routeId: string) => {
    const newExpanded = new Set(expandedRoutes)
    if (newExpanded.has(routeId)) {
      newExpanded.delete(routeId)
    } else {
      newExpanded.add(routeId)
    }
    setExpandedRoutes(newExpanded)
  }

  // Route editing handlers
  const handleEditRoute = (route: RouteWithDetails) => {
    setEditingRoute({
      id: route.id,
      transport_duration_days: route.transport_duration_days,
      customs_cost_per_shipment: route.customs_cost_per_shipment,
    })
  }

  const handleSaveRoute = async () => {
    if (!editingRoute) return

    try {
      await updateRoute.mutateAsync({
        id: editingRoute.id,
        transport_duration_days: editingRoute.transport_duration_days,
        customs_cost_per_shipment: editingRoute.customs_cost_per_shipment,
      })
      setEditingRoute(null)
      toast.success('Route updated successfully')
    } catch (error) {
      toast.error('Failed to update route')
    }
  }

  const handleCancelRouteEdit = () => {
    setEditingRoute(null)
  }

  // Price band editing handlers
  const handleEditPriceBand = (band: PriceBandWithRoute) => {
    setEditingPriceBand({
      id: band.id,
      price_per_pallet: band.price_per_pallet,
      min_pallets: band.min_pallets,
      max_pallets: band.max_pallets || null,
    })
  }

  const handleSavePriceBand = async () => {
    if (!editingPriceBand) return

    try {
      await updatePriceBand.mutateAsync({
        id: editingPriceBand.id,
        price_per_pallet: editingPriceBand.price_per_pallet,
        min_pallets: editingPriceBand.min_pallets,
        max_pallets: editingPriceBand.max_pallets ?? undefined,
      })
      setEditingPriceBand(null)
      toast.success('Price band updated successfully')
    } catch (error) {
      toast.error('Failed to update price band')
    }
  }

  const handleCancelPriceBandEdit = () => {
    setEditingPriceBand(null)
  }

  const handleDeletePriceBand = async (bandId: string) => {
    if (confirm('Are you sure you want to delete this price band?')) {
      try {
        await deletePriceBand.mutateAsync(bandId)
        toast.success('Price band deleted successfully')
      } catch (error) {
        toast.error('Failed to delete price band')
      }
    }
  }

  // New price band handlers
  const handleAddNewPriceBand = (routeId: string) => {
    const newBandKey = `${routeId}-new`
    setNewPriceBands(prev => new Map(prev).set(newBandKey, {
      routeId,
      pallet_dimensions: '120x100',
      price_per_pallet: '',
      min_pallets: '',
      max_pallets: '',
    }))
  }

  const handleSaveNewPriceBand = async (routeId: string) => {
    const newBandKey = `${routeId}-new`
    const newBand = newPriceBands.get(newBandKey)
    if (!newBand) return

    if (!newBand.price_per_pallet || !newBand.min_pallets) {
      toast.error('Please fill in required fields (price and min pallets)')
      return
    }

    try {
      await createPriceBand.mutateAsync({
        transporter_route_id: routeId,
        pallet_dimensions: newBand.pallet_dimensions,
        price_per_pallet: parseFloat(newBand.price_per_pallet),
        min_pallets: parseInt(newBand.min_pallets),
        max_pallets: newBand.max_pallets ? parseInt(newBand.max_pallets) : undefined,
      })

      // Remove from new bands map
      setNewPriceBands(prev => {
        const newMap = new Map(prev)
        newMap.delete(newBandKey)
        return newMap
      })

      toast.success('Price band created successfully')
    } catch (error) {
      toast.error('Failed to create price band')
    }
  }

  const handleCancelNewPriceBand = (routeId: string) => {
    const newBandKey = `${routeId}-new`
    setNewPriceBands(prev => {
      const newMap = new Map(prev)
      newMap.delete(newBandKey)
      return newMap
    })
  }

  const getPriceBandsForRoute = (routeId: string) => {
    return allPriceBands?.filter(band => band.transporter_route_id === routeId) || []
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

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <Card className="bg-terminal-panel border-terminal-border">
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="text-terminal-muted font-mono text-xs mb-2 block">SEARCH ROUTES</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-terminal-muted" />
                <Input
                  placeholder="Search transporters, routes, hubs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-terminal-dark border-terminal-border text-terminal-text font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-terminal-muted font-mono text-xs mb-2 block">TRANSPORTER</label>
              <Select value={transporterFilter} onValueChange={setTransporterFilter}>
                <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-terminal-dark border-terminal-border">
                  <SelectItem value="all" className="font-mono text-terminal-text">All Transporters</SelectItem>
                  {transporters?.map(transporter => (
                    <SelectItem key={transporter.id} value={transporter.id} className="font-mono text-terminal-text">
                      {transporter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => {
                  setSearchTerm('')
                  setTransporterFilter('all')
                }}
                className="bg-terminal-dark border-2 border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Routes Table */}
      <Card className="bg-terminal-panel border-terminal-border">
        <CardHeader className="border-b border-terminal-border">
          <CardTitle className="flex items-center gap-2 font-mono text-sm text-terminal-text">
            <Truck className="h-4 w-4 text-terminal-accent" />
            TRANSPORT ROUTES & PRICE BANDS
            {filteredRoutes && (
              <Badge variant="secondary" className="bg-terminal-success/20 text-terminal-success border-terminal-success font-mono">
                {filteredRoutes.length} route{filteredRoutes.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
          <p className="text-xs text-terminal-muted font-mono mt-1">
            Manage routes and their pricing tiers in one place
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8 text-terminal-muted font-mono">Loading routes...</div>
          ) : !routesByTransporter || routesByTransporter.length === 0 ? (
            <div className="text-center py-8 text-terminal-muted font-mono">No routes found</div>
          ) : (
            <div className="space-y-2">
              {routesByTransporter.map((transporterGroup) => {
                const isTransporterExpanded = expandedTransporters.has(transporterGroup.transporterId)

                return (
                  <div key={transporterGroup.transporterId} className="rounded-md border border-terminal-border bg-terminal-dark/30">
                    {/* Transporter Header - Clickable */}
                    <button
                      onClick={() => toggleTransporter(transporterGroup.transporterId)}
                      className="w-full flex items-center justify-between p-4 hover:bg-terminal-dark/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isTransporterExpanded ? (
                          <ChevronDown className="h-5 w-5 text-terminal-accent" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-terminal-muted" />
                        )}
                        <Truck className="h-5 w-5 text-terminal-accent" />
                        <span className="font-mono font-bold text-terminal-text text-lg">
                          {transporterGroup.transporterName}
                        </span>
                        <Badge variant="outline" className="bg-terminal-warning/20 text-terminal-warning border-terminal-warning font-mono text-xs">
                          {transporterGroup.transporterDieselSurcharge}% diesel
                        </Badge>
                        <Badge variant="secondary" className="bg-terminal-success/20 text-terminal-success border-terminal-success font-mono">
                          {transporterGroup.routes.length} route{transporterGroup.routes.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </button>

                    {/* Expanded Routes */}
                    {isTransporterExpanded && (
                      <div className="border-t border-terminal-border">
                        <div className="divide-y divide-terminal-border/50">
                          {transporterGroup.routes.map((route) => {
                            const isRouteExpanded = expandedRoutes.has(route.id)
                            const isEditingThisRoute = editingRoute?.id === route.id
                            const priceBands = getPriceBandsForRoute(route.id)
                            const newBandKey = `${route.id}-new`
                            const hasNewBand = newPriceBands.has(newBandKey)

                            return (
                              <div key={route.id} className="bg-terminal-dark/20">
                                {/* Route Header */}
                                <div className="p-3 hover:bg-terminal-dark/40 transition-colors">
                                  <div className="flex items-start justify-between">
                                    <button
                                      onClick={() => toggleRoute(route.id)}
                                      className="flex items-center gap-2 flex-1"
                                    >
                                      {isRouteExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-terminal-accent flex-shrink-0" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 text-terminal-muted flex-shrink-0" />
                                      )}
                                      <MapPin className="h-4 w-4 text-terminal-accent flex-shrink-0" />
                                      <div className="flex-1 text-left">
                                        <div className="font-mono font-semibold text-terminal-text text-sm">
                                          {route.origin_hub.name} ({route.origin_hub.hub_code}) → {route.destination_hub.name} ({route.destination_hub.hub_code})
                                        </div>
                                        <div className="font-mono text-xs text-terminal-muted mt-0.5">
                                          {route.origin_hub.country_code} → {route.destination_hub.country_code}
                                        </div>
                                      </div>
                                    </button>

                                    <div className="flex items-center gap-2 ml-4">
                                      {isEditingThisRoute ? (
                                        <>
                                          <div className="flex items-center gap-2">
                                            <div>
                                              <label className="text-xs text-terminal-muted font-mono">Transit Days</label>
                                              <Input
                                                type="number"
                                                value={editingRoute.transport_duration_days}
                                                onChange={(e) => setEditingRoute({
                                                  ...editingRoute,
                                                  transport_duration_days: parseInt(e.target.value)
                                                })}
                                                className="w-20 h-7 bg-terminal-dark border-terminal-border text-terminal-text font-mono text-xs"
                                              />
                                            </div>
                                            <div>
                                              <label className="text-xs text-terminal-muted font-mono">Customs €</label>
                                              <Input
                                                type="number"
                                                step="0.01"
                                                value={editingRoute.customs_cost_per_shipment}
                                                onChange={(e) => setEditingRoute({
                                                  ...editingRoute,
                                                  customs_cost_per_shipment: parseFloat(e.target.value)
                                                })}
                                                className="w-24 h-7 bg-terminal-dark border-terminal-border text-terminal-text font-mono text-xs"
                                              />
                                            </div>
                                          </div>
                                          <Button
                                            size="sm"
                                            onClick={handleSaveRoute}
                                            className="h-7 bg-terminal-success hover:bg-green-600 text-white font-mono"
                                          >
                                            <Save className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            onClick={handleCancelRouteEdit}
                                            className="h-7 bg-terminal-dark border-2 border-terminal-border text-terminal-text hover:bg-terminal-panel font-mono"
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <Badge variant="outline" className="font-mono text-xs border-terminal-border text-terminal-text">
                                            <Clock className="h-3 w-3 mr-1" />
                                            {route.transport_duration_days}d
                                          </Badge>
                                          {route.customs_cost_per_shipment > 0 && (
                                            <Badge variant="outline" className="font-mono text-xs border-terminal-border text-terminal-text">
                                              <Euro className="h-3 w-3 mr-1" />
                                              €{route.customs_cost_per_shipment}
                                            </Badge>
                                          )}
                                          <Badge variant={route.is_active ? "default" : "secondary"} className={`${
                                            route.is_active
                                              ? 'bg-terminal-success/20 text-terminal-success border-terminal-success'
                                              : 'bg-terminal-muted/20 text-terminal-muted border-terminal-muted'
                                          } font-mono text-xs`}>
                                            {route.is_active ? 'Active' : 'Inactive'}
                                          </Badge>
                                          <Button
                                            size="sm"
                                            onClick={() => handleEditRoute(route)}
                                            className="h-7 bg-blue-600 hover:bg-blue-700 text-white font-mono"
                                          >
                                            <Edit2 className="h-3 w-3" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Expanded Price Bands */}
                                {isRouteExpanded && (
                                  <div className="border-t border-terminal-border/50 bg-terminal-dark/30">
                                    <div className="p-3">
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                          <Package className="h-4 w-4 text-terminal-accent" />
                                          <span className="font-mono text-xs text-terminal-muted font-semibold">PRICE BANDS</span>
                                          <Badge variant="secondary" className="bg-terminal-success/20 text-terminal-success border-terminal-success font-mono text-xs">
                                            {priceBands.length}
                                          </Badge>
                                        </div>
                                        {!hasNewBand && (
                                          <Button
                                            size="sm"
                                            onClick={() => handleAddNewPriceBand(route.id)}
                                            className="h-7 bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono"
                                          >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Add Price Band
                                          </Button>
                                        )}
                                      </div>

                                      {priceBands.length === 0 && !hasNewBand ? (
                                        <div className="text-center py-4 text-terminal-muted font-mono text-xs">
                                          No price bands configured for this route
                                        </div>
                                      ) : (
                                        <Table>
                                          <TableHeader>
                                            <TableRow className="border-terminal-border hover:bg-transparent">
                                              <TableHead className="font-mono text-terminal-muted text-xs">PALLET SIZE</TableHead>
                                              <TableHead className="font-mono text-terminal-muted text-xs">MIN PALLETS</TableHead>
                                              <TableHead className="font-mono text-terminal-muted text-xs">MAX PALLETS</TableHead>
                                              <TableHead className="font-mono text-terminal-muted text-xs">PRICE/PALLET</TableHead>
                                              <TableHead className="font-mono text-terminal-muted text-xs">AGE</TableHead>
                                              <TableHead className="font-mono text-terminal-muted text-xs w-[120px]">ACTIONS</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {priceBands.map((band) => {
                                              const isEditingThisBand = editingPriceBand?.id === band.id
                                              const daysOld = getDaysOld(band.last_updated_at)

                                              return (
                                                <TableRow key={band.id} className="border-terminal-border hover:bg-terminal-dark/50">
                                                  <TableCell className="font-mono text-terminal-text text-xs">
                                                    {band.pallet_dimensions}cm
                                                  </TableCell>
                                                  <TableCell className="font-mono text-terminal-text text-xs">
                                                    {isEditingThisBand ? (
                                                      <Input
                                                        type="number"
                                                        value={editingPriceBand.min_pallets}
                                                        onChange={(e) => setEditingPriceBand({
                                                          ...editingPriceBand,
                                                          min_pallets: parseInt(e.target.value)
                                                        })}
                                                        className="w-20 h-7 bg-terminal-dark border-terminal-border text-terminal-text font-mono text-xs"
                                                      />
                                                    ) : (
                                                      band.min_pallets
                                                    )}
                                                  </TableCell>
                                                  <TableCell className="font-mono text-terminal-text text-xs">
                                                    {isEditingThisBand ? (
                                                      <Input
                                                        type="number"
                                                        value={editingPriceBand.max_pallets || ''}
                                                        onChange={(e) => setEditingPriceBand({
                                                          ...editingPriceBand,
                                                          max_pallets: e.target.value ? parseInt(e.target.value) : null
                                                        })}
                                                        placeholder="∞"
                                                        className="w-20 h-7 bg-terminal-dark border-terminal-border text-terminal-text font-mono text-xs"
                                                      />
                                                    ) : (
                                                      band.max_pallets || '∞'
                                                    )}
                                                  </TableCell>
                                                  <TableCell className="font-mono text-terminal-text text-xs font-semibold">
                                                    {isEditingThisBand ? (
                                                      <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={editingPriceBand.price_per_pallet}
                                                        onChange={(e) => setEditingPriceBand({
                                                          ...editingPriceBand,
                                                          price_per_pallet: parseFloat(e.target.value)
                                                        })}
                                                        className="w-24 h-7 bg-terminal-dark border-terminal-border text-terminal-text font-mono text-xs"
                                                      />
                                                    ) : (
                                                      `€${band.price_per_pallet.toFixed(2)}`
                                                    )}
                                                  </TableCell>
                                                  <TableCell>
                                                    <span className={`font-mono text-xs ${getPriceAgeColor(daysOld)}`}>
                                                      {daysOld}d
                                                    </span>
                                                  </TableCell>
                                                  <TableCell>
                                                    <div className="flex gap-1">
                                                      {isEditingThisBand ? (
                                                        <>
                                                          <Button
                                                            size="sm"
                                                            onClick={handleSavePriceBand}
                                                            className="h-6 px-2 bg-terminal-success hover:bg-green-600 text-white font-mono"
                                                          >
                                                            <Save className="h-3 w-3" />
                                                          </Button>
                                                          <Button
                                                            size="sm"
                                                            onClick={handleCancelPriceBandEdit}
                                                            className="h-6 px-2 bg-terminal-dark border-2 border-terminal-border text-terminal-text hover:bg-terminal-panel font-mono"
                                                          >
                                                            <X className="h-3 w-3" />
                                                          </Button>
                                                        </>
                                                      ) : (
                                                        <>
                                                          <Button
                                                            size="sm"
                                                            onClick={() => handleEditPriceBand(band)}
                                                            className="h-6 px-2 bg-blue-600 hover:bg-blue-700 text-white font-mono"
                                                          >
                                                            <Edit2 className="h-3 w-3" />
                                                          </Button>
                                                          <Button
                                                            size="sm"
                                                            onClick={() => handleDeletePriceBand(band.id)}
                                                            className="h-6 px-2 bg-red-600 hover:bg-red-700 text-white font-mono"
                                                          >
                                                            <Trash2 className="h-3 w-3" />
                                                          </Button>
                                                        </>
                                                      )}
                                                    </div>
                                                  </TableCell>
                                                </TableRow>
                                              )
                                            })}

                                            {/* New Price Band Row */}
                                            {hasNewBand && (() => {
                                              const newBand = newPriceBands.get(newBandKey)!
                                              return (
                                                <TableRow className="border-terminal-border bg-terminal-accent/5">
                                                  <TableCell>
                                                    <Select
                                                      value={newBand.pallet_dimensions}
                                                      onValueChange={(value: '120x80' | '120x100') => {
                                                        setNewPriceBands(prev => new Map(prev).set(newBandKey, {
                                                          ...newBand,
                                                          pallet_dimensions: value
                                                        }))
                                                      }}
                                                    >
                                                      <SelectTrigger className="h-7 bg-terminal-dark border-terminal-border text-terminal-text font-mono text-xs">
                                                        <SelectValue />
                                                      </SelectTrigger>
                                                      <SelectContent className="bg-terminal-dark border-terminal-border">
                                                        <SelectItem value="120x80" className="font-mono text-terminal-text text-xs">120x80cm</SelectItem>
                                                        <SelectItem value="120x100" className="font-mono text-terminal-text text-xs">120x100cm</SelectItem>
                                                      </SelectContent>
                                                    </Select>
                                                  </TableCell>
                                                  <TableCell>
                                                    <Input
                                                      type="number"
                                                      placeholder="Min"
                                                      value={newBand.min_pallets}
                                                      onChange={(e) => {
                                                        setNewPriceBands(prev => new Map(prev).set(newBandKey, {
                                                          ...newBand,
                                                          min_pallets: e.target.value
                                                        }))
                                                      }}
                                                      className="w-20 h-7 bg-terminal-dark border-terminal-border text-terminal-text font-mono text-xs"
                                                    />
                                                  </TableCell>
                                                  <TableCell>
                                                    <Input
                                                      type="number"
                                                      placeholder="Max"
                                                      value={newBand.max_pallets}
                                                      onChange={(e) => {
                                                        setNewPriceBands(prev => new Map(prev).set(newBandKey, {
                                                          ...newBand,
                                                          max_pallets: e.target.value
                                                        }))
                                                      }}
                                                      className="w-20 h-7 bg-terminal-dark border-terminal-border text-terminal-text font-mono text-xs"
                                                    />
                                                  </TableCell>
                                                  <TableCell>
                                                    <Input
                                                      type="number"
                                                      step="0.01"
                                                      placeholder="€0.00"
                                                      value={newBand.price_per_pallet}
                                                      onChange={(e) => {
                                                        setNewPriceBands(prev => new Map(prev).set(newBandKey, {
                                                          ...newBand,
                                                          price_per_pallet: e.target.value
                                                        }))
                                                      }}
                                                      className="w-24 h-7 bg-terminal-dark border-terminal-border text-terminal-text font-mono text-xs"
                                                    />
                                                  </TableCell>
                                                  <TableCell>
                                                    <Badge variant="outline" className="bg-terminal-success/20 text-terminal-success border-terminal-success font-mono text-xs">
                                                      NEW
                                                    </Badge>
                                                  </TableCell>
                                                  <TableCell>
                                                    <div className="flex gap-1">
                                                      <Button
                                                        size="sm"
                                                        onClick={() => handleSaveNewPriceBand(route.id)}
                                                        disabled={createPriceBand.isPending}
                                                        className="h-6 px-2 bg-terminal-success hover:bg-green-600 text-white font-mono"
                                                      >
                                                        <Save className="h-3 w-3" />
                                                      </Button>
                                                      <Button
                                                        size="sm"
                                                        onClick={() => handleCancelNewPriceBand(route.id)}
                                                        className="h-6 px-2 bg-terminal-dark border-2 border-terminal-border text-terminal-text hover:bg-terminal-panel font-mono"
                                                      >
                                                        <X className="h-3 w-3" />
                                                      </Button>
                                                    </div>
                                                  </TableCell>
                                                </TableRow>
                                              )
                                            })()}
                                          </TableBody>
                                        </Table>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
