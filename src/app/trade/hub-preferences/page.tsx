'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Loader2,
  Plus,
  Heart,
  Trash2,
  AlertCircle,
  Package,
  TrendingUp
} from 'lucide-react'
import { useHubPreferences, useAddHubPreference, useDeleteHubPreference } from '@/hooks/use-hub-preferences'
import { useProducts, useProductSpecs } from '@/hooks/use-products'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export default function HubPreferencesPage() {
  const [selectedHubId, setSelectedHubId] = useState<string>('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  // Fetch hubs
  const { data: hubs, isLoading: hubsLoading } = useQuery({
    queryKey: ['hubs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hubs')
        .select('id, name, hub_code, city_name, country_code')
        .order('name')

      if (error) throw error
      return data
    },
  })

  const { data: preferences, isLoading: prefsLoading } = useHubPreferences(selectedHubId || undefined)
  const deleteMutation = useDeleteHubPreference()

  const selectedHub = hubs?.find(h => h.id === selectedHubId)

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this product preference?')) return
    deleteMutation.mutate(id)
  }

  const getPriorityBadge = (priority: string) => {
    const colors = {
      urgent: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-blue-100 text-blue-800 border-blue-200',
      low: 'bg-gray-100 text-gray-800 border-gray-200',
    }
    return colors[priority as keyof typeof colors] || colors.medium
  }

  if (hubsLoading) {
    return (
      <div className="min-h-screen bg-terminal-dark flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-terminal-accent mx-auto mb-4" />
          <p className="text-terminal-muted font-mono">Loading hubs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-terminal-dark px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-terminal-border pb-4">
        <div className="flex items-center gap-4">
          <Heart className="h-8 w-8 text-terminal-accent" />
          <div>
            <h1 className="text-2xl font-mono font-bold text-terminal-text tracking-wider">
              HUB PRODUCT PREFERENCES
            </h1>
            <p className="text-terminal-muted font-mono text-sm">
              Configure which products each hub wants to source
            </p>
          </div>
        </div>
      </div>

      {/* Hub Selection */}
      <div className="bg-terminal-panel border border-terminal-border rounded-lg p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <Label className="font-mono text-sm text-terminal-muted">Select Hub</Label>
            <Select value={selectedHubId} onValueChange={setSelectedHubId}>
              <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text font-mono">
                <SelectValue placeholder="Choose a hub to configure preferences" />
              </SelectTrigger>
              <SelectContent className="bg-terminal-panel border-terminal-border">
                {hubs && hubs.map((hub) => (
                  <SelectItem
                    key={hub.id}
                    value={hub.id}
                    className="font-mono text-terminal-text hover:bg-terminal-dark"
                  >
                    {hub.name} ({hub.hub_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedHubId && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono mt-6">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </DialogTrigger>
              <AddProductDialog
                hubId={selectedHubId}
                onClose={() => setIsAddDialogOpen(false)}
              />
            </Dialog>
          )}
        </div>

        {selectedHub && (
          <div className="mt-4 pt-4 border-t border-terminal-border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-mono text-terminal-muted">Hub: </span>
                <span className="font-mono text-terminal-text">
                  {selectedHub.name}
                </span>
              </div>
              <div>
                <span className="font-mono text-terminal-muted">Location: </span>
                <span className="font-mono text-terminal-text">
                  {selectedHub.city_name}, {selectedHub.country_code}
                </span>
              </div>
              <div>
                <span className="font-mono text-terminal-muted">Preferences: </span>
                <span className="font-mono text-green-400">
                  {preferences?.length || 0}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preferences Table */}
      {selectedHubId ? (
        prefsLoading ? (
          <div className="bg-terminal-panel border border-terminal-border rounded-lg p-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-terminal-accent mx-auto mb-4" />
            <p className="font-mono text-terminal-muted">Loading preferences...</p>
          </div>
        ) : preferences && preferences.length > 0 ? (
          <div className="bg-terminal-panel border border-terminal-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-terminal-border hover:bg-terminal-dark">
                  <TableHead className="font-mono text-terminal-text">Product</TableHead>
                  <TableHead className="font-mono text-terminal-text">Packaging</TableHead>
                  <TableHead className="font-mono text-terminal-text">Priority</TableHead>
                  <TableHead className="font-mono text-terminal-text">Volume/Week</TableHead>
                  <TableHead className="font-mono text-terminal-text">Suppliers Available</TableHead>
                  <TableHead className="font-mono text-terminal-text">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preferences.map((pref) => (
                  <TableRow
                    key={pref.preference_id}
                    className="border-terminal-border hover:bg-terminal-dark"
                  >
                    {/* Product */}
                    <TableCell className="font-mono text-terminal-text">
                      <div>
                        <div className="font-semibold">{pref.product_name}</div>
                        <div className="text-xs text-terminal-muted">{pref.product_category}</div>
                      </div>
                    </TableCell>

                    {/* Packaging */}
                    <TableCell className="font-mono text-terminal-muted text-sm">
                      {pref.packaging_label && pref.size_name ? (
                        <div>
                          <div>{pref.packaging_label}</div>
                          <div className="text-xs">{pref.size_name}</div>
                        </div>
                      ) : (
                        <span className="text-terminal-muted">Any</span>
                      )}
                    </TableCell>

                    {/* Priority */}
                    <TableCell>
                      <Badge className={`${getPriorityBadge(pref.priority)} font-mono text-xs`}>
                        {pref.priority.toUpperCase()}
                      </Badge>
                    </TableCell>

                    {/* Volume */}
                    <TableCell className="font-mono text-terminal-muted text-sm">
                      {pref.estimated_volume_per_week ? (
                        `${pref.estimated_volume_per_week} ${pref.volume_unit || 'pallets'}`
                      ) : (
                        <span className="text-terminal-muted">-</span>
                      )}
                    </TableCell>

                    {/* Suppliers Available */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-green-400" />
                        <span className="font-mono text-green-400 font-semibold">
                          {pref.available_supplier_count}
                        </span>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(pref.preference_id)}
                        disabled={deleteMutation.isPending}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="bg-terminal-panel border border-terminal-border rounded-lg p-12 text-center">
            <AlertCircle className="h-12 w-12 text-terminal-muted mx-auto mb-4" />
            <p className="font-mono text-terminal-muted mb-4">
              No product preferences configured for this hub
            </p>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Product
            </Button>
          </div>
        )
      ) : (
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-12 text-center">
          <Heart className="h-16 w-16 text-terminal-muted mx-auto mb-4" />
          <h3 className="text-lg font-mono font-semibold text-terminal-text mb-2">
            Select a Hub
          </h3>
          <p className="text-sm font-mono text-terminal-muted">
            Choose a hub from the dropdown above to configure product preferences
          </p>
        </div>
      )}
    </div>
  )
}

// Add Product Dialog Component
function AddProductDialog({ hubId, onClose }: { hubId: string; onClose: () => void }) {
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedSpecId, setSelectedSpecId] = useState('')
  const [priority, setPriority] = useState('medium')
  const [volume, setVolume] = useState('')
  const [volumeUnit, setVolumeUnit] = useState('pallets')
  const [notes, setNotes] = useState('')

  const { products } = useProducts()
  const { productSpecs } = useProductSpecs()
  const addMutation = useAddHubPreference()

  const filteredSpecs = productSpecs?.filter(spec =>
    (spec.products as any)?.id === selectedProductId
  )

  const handleAdd = async () => {
    if (!selectedProductId) {
      toast.error('Please select a product')
      return
    }

    const data = {
      hub_id: hubId,
      product_id: selectedProductId,
      product_packaging_spec_id: selectedSpecId && selectedSpecId !== 'any' ? selectedSpecId : null,
      priority,
      estimated_volume_per_week: volume ? parseFloat(volume) : null,
      volume_unit: volumeUnit,
      notes: notes || null,
    }

    await addMutation.mutateAsync(data)
    onClose()
  }

  return (
    <DialogContent className="bg-terminal-panel border-terminal-border text-terminal-text max-w-2xl">
      <DialogHeader>
        <DialogTitle className="font-mono text-terminal-text">Add Product Preference</DialogTitle>
        <DialogDescription className="font-mono text-terminal-muted">
          Configure which products this hub wants to source
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {/* Product Selection */}
        <div className="space-y-2">
          <Label className="font-mono text-sm">Product *</Label>
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger className="bg-terminal-dark border-terminal-border">
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent className="bg-terminal-panel border-terminal-border">
              {products?.map((product) => (
                <SelectItem key={product.id} value={product.id} className="font-mono">
                  {product.name} ({product.category})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Packaging Spec (Optional) */}
        {selectedProductId && filteredSpecs && filteredSpecs.length > 0 && (
          <div className="space-y-2">
            <Label className="font-mono text-sm">Specific Packaging (Optional)</Label>
            <Select value={selectedSpecId} onValueChange={setSelectedSpecId}>
              <SelectTrigger className="bg-terminal-dark border-terminal-border">
                <SelectValue placeholder="Any packaging" />
              </SelectTrigger>
              <SelectContent className="bg-terminal-panel border-terminal-border">
                <SelectItem value="any" className="font-mono">Any packaging</SelectItem>
                {filteredSpecs.map((spec) => (
                  <SelectItem key={spec.id} value={spec.id} className="font-mono">
                    {(spec.packaging_options as any)?.label} - {(spec.size_options as any)?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Priority */}
        <div className="space-y-2">
          <Label className="font-mono text-sm">Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="bg-terminal-dark border-terminal-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-terminal-panel border-terminal-border">
              <SelectItem value="low" className="font-mono">Low</SelectItem>
              <SelectItem value="medium" className="font-mono">Medium</SelectItem>
              <SelectItem value="high" className="font-mono">High</SelectItem>
              <SelectItem value="urgent" className="font-mono">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Volume */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="font-mono text-sm">Estimated Volume/Week</Label>
            <Input
              type="number"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              placeholder="50"
              className="bg-terminal-dark border-terminal-border font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-mono text-sm">Unit</Label>
            <Select value={volumeUnit} onValueChange={setVolumeUnit}>
              <SelectTrigger className="bg-terminal-dark border-terminal-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-terminal-panel border-terminal-border">
                <SelectItem value="pallets" className="font-mono">Pallets</SelectItem>
                <SelectItem value="kg" className="font-mono">Kilograms</SelectItem>
                <SelectItem value="boxes" className="font-mono">Boxes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label className="font-mono text-sm">Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Quality requirements, certifications, etc."
            className="bg-terminal-dark border-terminal-border font-mono"
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel font-mono"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={addMutation.isPending || !selectedProductId}
            className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono"
          >
            {addMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Preference
              </>
            )}
          </Button>
        </div>
      </div>
    </DialogContent>
  )
}
