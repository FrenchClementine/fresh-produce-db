'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Search,
  Plus,
  Truck,
  Edit,
  Trash2,
  DollarSign,
  ChevronDown,
  ChevronUp,
  MapPin,
  Phone,
  Mail,
  Package
} from 'lucide-react'
import { useTransporters, useDeleteTransporter } from '@/hooks/use-transporters'
import { TransporterForm } from './transporter-form'
import { toast } from 'sonner'

export function TransporterListTerminal() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingTransporter, setEditingTransporter] = useState<string | null>(null)
  const [expandedTransporters, setExpandedTransporters] = useState<Set<string>>(new Set())
  const [isHovering, setIsHovering] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const { data: transporters, isLoading, error } = useTransporters()
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

  const toggleTransporter = (transporterId: string) => {
    const newExpanded = new Set(expandedTransporters)
    if (newExpanded.has(transporterId)) {
      newExpanded.delete(transporterId)
    } else {
      newExpanded.add(transporterId)
    }
    setExpandedTransporters(newExpanded)
  }

  const filteredTransporters = transporters?.filter(transporter =>
    transporter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transporter.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transporter.city?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  // Auto-scroll functionality
  useEffect(() => {
    if (!scrollContainerRef.current || isHovering || filteredTransporters.length === 0) return

    const container = scrollContainerRef.current
    let scrollAmount = 0
    const scrollSpeed = 0.5 // pixels per interval

    const interval = setInterval(() => {
      if (container.scrollTop + container.clientHeight >= container.scrollHeight) {
        // Reset to top when reaching bottom
        container.scrollTop = 0
        scrollAmount = 0
      } else {
        scrollAmount += scrollSpeed
        container.scrollTop = scrollAmount
      }
    }, 30) // Update every 30ms for smooth scrolling

    return () => clearInterval(interval)
  }, [isHovering, filteredTransporters])

  if (isLoading) {
    return (
      <Card className="bg-terminal-panel border-terminal-border h-[calc(100vh-16rem)]">
        <CardContent className="pt-6">
          <div className="text-center py-8 text-terminal-muted font-mono">Loading transporters...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-terminal-panel border-terminal-border h-[calc(100vh-16rem)]">
        <CardContent className="p-6">
          <p className="text-terminal-alert font-mono">Error loading transporters. Please try again.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-terminal-panel border-terminal-border h-[calc(100vh-16rem)]">
      <CardHeader className="border-b border-terminal-border pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-terminal-text font-mono text-sm flex items-center gap-2">
            <Truck className="h-4 w-4 text-terminal-accent" />
            TRANSPORTER SYSTEM
            <Badge variant="secondary" className="bg-terminal-success/20 text-terminal-success border-terminal-success font-mono">
              {filteredTransporters.length}
            </Badge>
          </CardTitle>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Add Transporter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-terminal-dark border-terminal-border">
              <DialogHeader>
                <DialogTitle className="text-terminal-text font-mono">Add New Transporter</DialogTitle>
                <DialogDescription className="text-terminal-muted font-mono">
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
      <CardContent className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-terminal-muted" />
          <Input
            placeholder="Search transporters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-terminal-dark border-terminal-border text-terminal-text font-mono text-xs placeholder:text-terminal-muted h-9"
          />
        </div>

        {/* Transporters List */}
        <div
          ref={scrollContainerRef}
          className="max-h-[calc(100vh-28rem)] overflow-y-auto scroll-smooth divide-y divide-terminal-border border border-terminal-border rounded-md"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {filteredTransporters.length === 0 ? (
            <div className="text-center py-8 text-terminal-muted font-mono text-xs">
              {searchTerm ? 'No transporters found matching your search.' : 'No transporters added yet.'}
            </div>
          ) : (
            filteredTransporters.map((transporter) => {
              const isExpanded = expandedTransporters.has(transporter.id)

              return (
                <div key={transporter.id} className="border-l-2 border-transparent hover:border-terminal-accent transition-colors">
                  {/* Collapsed Header */}
                  <div
                    className="p-3 hover:bg-terminal-dark cursor-pointer"
                    onClick={() => toggleTransporter(transporter.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Truck className="h-4 w-4 text-terminal-accent" />
                          <span className="text-terminal-text text-sm font-mono font-semibold">
                            {transporter.name}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-terminal-muted" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-terminal-muted" />
                          )}
                        </div>

                        {!isExpanded && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-3 text-xs font-mono text-terminal-muted">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {[transporter.city, transporter.country].filter(Boolean).join(', ') || 'Location not specified'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                Diesel: {transporter.diesel_surcharge_percentage}%
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <Badge
                        variant={transporter.is_active ? "default" : "secondary"}
                        className={`${
                          transporter.is_active
                            ? 'bg-terminal-success/20 text-terminal-success border-terminal-success'
                            : 'bg-terminal-muted/20 text-terminal-muted border-terminal-muted'
                        } font-mono text-xs`}
                      >
                        {transporter.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-terminal-border/50 bg-terminal-dark/30">
                      <div className="p-3 ml-6 space-y-3">
                        {/* Location Details */}
                        {(transporter.city || transporter.country || transporter.address) && (
                          <div className="space-y-1">
                            <div className="text-xs font-mono text-terminal-muted font-semibold">Location</div>
                            <div className="text-sm font-mono text-terminal-text">
                              {[transporter.city, transporter.country].filter(Boolean).join(', ')}
                            </div>
                            {transporter.address && (
                              <div className="text-xs font-mono text-terminal-muted">
                                {transporter.address}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Contact Details */}
                        {(transporter.email || transporter.phone_number) && (
                          <div className="space-y-1">
                            <div className="text-xs font-mono text-terminal-muted font-semibold">Contact</div>
                            <div className="space-y-1">
                              {transporter.email && (
                                <div className="flex items-center gap-2 text-xs font-mono text-terminal-text">
                                  <Mail className="h-3 w-3 text-terminal-accent" />
                                  {transporter.email}
                                </div>
                              )}
                              {transporter.phone_number && (
                                <div className="flex items-center gap-2 text-xs font-mono text-terminal-text">
                                  <Phone className="h-3 w-3 text-terminal-accent" />
                                  {transporter.phone_number}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Diesel Surcharge */}
                        <div className="space-y-1">
                          <div className="text-xs font-mono text-terminal-muted font-semibold">Diesel Surcharge</div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-terminal-warning/20 text-terminal-warning border-terminal-warning font-mono text-xs">
                              {transporter.diesel_surcharge_percentage}%
                            </Badge>
                          </div>
                        </div>

                        {/* Notes */}
                        {transporter.notes && (
                          <div className="space-y-1">
                            <div className="text-xs font-mono text-terminal-muted font-semibold">Notes</div>
                            <div className="text-xs font-mono text-terminal-text">
                              {transporter.notes}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-2 border-t border-terminal-border/50">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingTransporter(transporter.id)
                            }}
                            className="flex-1 h-7 bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono text-xs"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(transporter.id)
                            }}
                            className="flex-1 h-7 bg-terminal-alert hover:bg-red-700 text-white font-mono text-xs"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {filteredTransporters.length > 0 && (
          <div className="text-xs text-terminal-muted font-mono">
            Showing {filteredTransporters.length} of {transporters?.length} transporters
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editingTransporter} onOpenChange={() => setEditingTransporter(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-terminal-dark border-terminal-border">
          <DialogHeader>
            <DialogTitle className="text-terminal-text font-mono">Edit Transporter</DialogTitle>
            <DialogDescription className="text-terminal-muted font-mono">
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
