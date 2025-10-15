'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useCurrentSupplierPrices, useDeactivateSupplierPrice, useQuickUpdatePrice, useExtendPriceByDay } from '@/hooks/use-supplier-prices'
import { Trash2, Edit2, Save, X, Search, Package, Plus, Clock, ChevronDown, ChevronRight, Image as ImageIcon, Upload } from 'lucide-react'
import { format } from 'date-fns'
import { useCurrentStaffMember } from '@/hooks/use-staff'
import { ImageUpload } from '@/components/ui/image-upload'
import { useUploadSupplierPriceImage, useAddSupplierPriceImage, useDeleteSupplierPriceImage } from '@/hooks/use-image-upload'

interface ManagePricesModeProps {
  onAddNew?: (supplierId?: string) => void
}

export function ManagePricesMode({ onAddNew }: ManagePricesModeProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [editValidUntil, setEditValidUntil] = useState('')
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set())
  const [viewImageUrls, setViewImageUrls] = useState<string[]>([])
  const [viewImageIndex, setViewImageIndex] = useState(0)
  const [uploadingImageFor, setUploadingImageFor] = useState<string | null>(null)
  const [tempImageFiles, setTempImageFiles] = useState<Map<string, File>>(new Map())
  const [tempImagePreviews, setTempImagePreviews] = useState<string[]>([])

  const { data: prices, isLoading } = useCurrentSupplierPrices()
  const deactivatePrice = useDeactivateSupplierPrice()
  const updatePrice = useQuickUpdatePrice()
  const extendPrice = useExtendPriceByDay()
  const { data: currentStaff } = useCurrentStaffMember()
  const uploadImage = useUploadSupplierPriceImage()
  const addImage = useAddSupplierPriceImage()
  const deleteImage = useDeleteSupplierPriceImage()

  // Get unique suppliers for filter
  const uniqueSuppliers = Array.from(
    new Set(prices?.map(p => ({ id: p.supplier_id, name: p.supplier_name })) || [])
  ).reduce((acc, curr) => {
    if (!acc.find(s => s.id === curr.id)) acc.push(curr)
    return acc
  }, [] as { id: string; name: string }[])

  // Filter prices
  const filteredPrices = prices?.filter(price => {
    const matchesSearch = !searchTerm ||
      price.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      price.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesSupplier = supplierFilter === 'all' || price.supplier_id === supplierFilter

    return matchesSearch && matchesSupplier
  })

  // Group prices by supplier
  const pricesBySupplier = useMemo(() => {
    if (!filteredPrices) return []

    const grouped = filteredPrices.reduce((acc, price) => {
      const supplierId = price.supplier_id
      if (!acc[supplierId]) {
        acc[supplierId] = {
          supplierId,
          supplierName: price.supplier_name,
          prices: []
        }
      }
      acc[supplierId].prices.push(price)
      return acc
    }, {} as Record<string, { supplierId: string; supplierName: string; prices: any[] }>)

    return Object.values(grouped).sort((a, b) => a.supplierName.localeCompare(b.supplierName))
  }, [filteredPrices])

  const toggleSupplier = (supplierId: string) => {
    const newExpanded = new Set(expandedSuppliers)
    if (newExpanded.has(supplierId)) {
      newExpanded.delete(supplierId)
    } else {
      newExpanded.add(supplierId)
    }
    setExpandedSuppliers(newExpanded)
  }

  const handleEdit = (price: any) => {
    setEditingId(price.id)
    setEditPrice(price.price_per_unit.toString())
    setEditValidUntil(price.valid_until?.split('T')[0] || '')
  }

  const handleSave = async (priceId: string) => {
    await updatePrice.mutateAsync({
      priceId,
      newPrice: parseFloat(editPrice),
      validUntil: new Date(editValidUntil).toISOString(),
      currentUserId: currentStaff?.id
    })
    setEditingId(null)
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditPrice('')
    setEditValidUntil('')
  }

  const handleDelete = async (priceId: string) => {
    if (confirm('Are you sure you want to deactivate this price?')) {
      await deactivatePrice.mutateAsync(priceId)
    }
  }

  const handleImageUpload = async (price: any) => {
    setUploadingImageFor(price.id)
    setTempImageFiles(new Map())
    setTempImagePreviews(price.image_urls || [])
  }

  const handleImageSelected = (file: File, preview: string) => {
    setTempImageFiles(prev => new Map(prev).set(preview, file))
    // Previews are managed by the ImageUpload component state
  }

  const handleImageRemoved = (preview: string) => {
    setTempImageFiles(prev => {
      const newMap = new Map(prev)
      newMap.delete(preview)
      return newMap
    })
  }

  const handleImageSave = async (priceId: string, supplierId: string) => {
    if (tempImageFiles.size === 0) return

    try {
      const price = prices?.find(p => p.id === priceId)
      const existingUrls = price?.image_urls || []

      // Upload all new images and add them to the price
      for (const [preview, file] of tempImageFiles.entries()) {
        // Upload image to storage
        const { url } = await uploadImage.mutateAsync({
          file,
          supplierId,
          priceId
        })

        // Add image URL to the existing array
        await addImage.mutateAsync({
          priceId,
          imageUrl: url,
          existingImageUrls: existingUrls
        })
      }

      // Reset state
      setUploadingImageFor(null)
      setTempImageFiles(new Map())
      setTempImagePreviews([])
    } catch (error) {
      console.error('Error saving images:', error)
    }
  }

  const handleImageDelete = async (priceId: string, imageUrl: string, existingImageUrls: string[]) => {
    if (confirm('Are you sure you want to delete this image?')) {
      await deleteImage.mutateAsync({ imageUrl, priceId, existingImageUrls })
    }
  }

  const handleImageCancel = () => {
    setUploadingImageFor(null)
    setTempImageFiles(new Map())
    setTempImagePreviews([])
  }

  const handleViewImages = (imageUrls: string[], startIndex: number = 0) => {
    setViewImageUrls(imageUrls)
    setViewImageIndex(startIndex)
  }

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <Card className="bg-terminal-panel border-terminal-border">
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="text-terminal-muted font-mono text-xs mb-2 block">SEARCH</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-terminal-muted" />
                <Input
                  placeholder="Search products or suppliers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-terminal-dark border-terminal-border text-terminal-text font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-terminal-muted font-mono text-xs mb-2 block">SUPPLIER</label>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-terminal-dark border-terminal-border">
                  <SelectItem value="all" className="font-mono text-terminal-text">All Suppliers</SelectItem>
                  {uniqueSuppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id} className="font-mono text-terminal-text">
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => {
                  setSearchTerm('')
                  setSupplierFilter('all')
                }}
                className="bg-terminal-dark border-2 border-terminal-border text-terminal-text hover:bg-terminal-panel hover:border-terminal-accent font-mono"
              >
                Clear Filters
              </Button>
            </div>
            <div className="flex items-end justify-end">
              <Button
                onClick={() => onAddNew?.(supplierFilter !== 'all' ? supplierFilter : undefined)}
                className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono font-bold"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Price
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prices Table */}
      <Card className="bg-terminal-panel border-terminal-border">
        <CardHeader className="border-b border-terminal-border">
          <CardTitle className="flex items-center gap-2 font-mono text-sm text-terminal-text">
            <Package className="h-4 w-4 text-terminal-accent" />
            RECENT PRICES
            {filteredPrices && (
              <Badge variant="secondary" className="bg-terminal-success/20 text-terminal-success border-terminal-success font-mono">
                {filteredPrices.length} item{filteredPrices.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
          <p className="text-xs text-terminal-muted font-mono mt-1">
            Showing active and recently expired prices (within 7 days)
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8 text-terminal-muted font-mono">Loading prices...</div>
          ) : !pricesBySupplier || pricesBySupplier.length === 0 ? (
            <div className="text-center py-8 text-terminal-muted font-mono">No prices found</div>
          ) : (
            <div className="space-y-2">
              {pricesBySupplier.map((supplierGroup) => {
                const isExpanded = expandedSuppliers.has(supplierGroup.supplierId)
                return (
                  <div key={supplierGroup.supplierId} className="rounded-md border border-terminal-border bg-terminal-dark/30">
                    {/* Supplier Header - Clickable */}
                    <button
                      onClick={() => toggleSupplier(supplierGroup.supplierId)}
                      className="w-full flex items-center justify-between p-4 hover:bg-terminal-dark/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-terminal-accent" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-terminal-muted" />
                        )}
                        <Package className="h-5 w-5 text-terminal-accent" />
                        <span className="font-mono font-bold text-terminal-text text-lg">
                          {supplierGroup.supplierName}
                        </span>
                        <Badge variant="secondary" className="bg-terminal-success/20 text-terminal-success border-terminal-success font-mono">
                          {supplierGroup.prices.length} price{supplierGroup.prices.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onAddNew?.(supplierGroup.supplierId)
                        }}
                        className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Price
                      </Button>
                    </button>

                    {/* Expanded Prices Table */}
                    {isExpanded && (
                      <div className="border-t border-terminal-border">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-terminal-border hover:bg-terminal-dark">
                              <TableHead className="font-mono text-terminal-muted text-xs w-[60px]">IMAGE</TableHead>
                              <TableHead className="font-mono text-terminal-muted text-xs">PRODUCT</TableHead>
                              <TableHead className="font-mono text-terminal-muted text-xs">HUB</TableHead>
                              <TableHead className="font-mono text-terminal-muted text-xs">PRICE/UNIT</TableHead>
                              <TableHead className="font-mono text-terminal-muted text-xs">DELIVERY</TableHead>
                              <TableHead className="font-mono text-terminal-muted text-xs">VALID UNTIL</TableHead>
                              <TableHead className="font-mono text-terminal-muted text-xs">ACTIONS</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {supplierGroup.prices.map((price) => {
                              const isEditing = editingId === price.id
                              const isExpired = new Date(price.valid_until) < new Date()

                              const isUploadingImage = uploadingImageFor === price.id

                              return (
                                <TableRow key={price.id} className={`border-terminal-border hover:bg-terminal-dark/50 ${isExpired ? 'opacity-60' : ''}`}>
                                  {/* Image Cell - Show multiple thumbnails */}
                                  <TableCell className="p-2">
                                    {price.image_urls && price.image_urls.length > 0 ? (
                                      <div className="flex gap-1">
                                        {price.image_urls.slice(0, 2).map((imageUrl: string, idx: number) => (
                                          <button
                                            key={idx}
                                            onClick={() => handleViewImages(price.image_urls, idx)}
                                            className="relative w-10 h-10 rounded border border-terminal-border overflow-hidden hover:border-terminal-accent transition-colors group flex-shrink-0"
                                          >
                                            <img
                                              src={imageUrl}
                                              alt={`${price.product_name} ${idx + 1}`}
                                              className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                              <ImageIcon className="h-3 w-3 text-white" />
                                            </div>
                                          </button>
                                        ))}
                                        {price.image_urls.length > 2 && (
                                          <button
                                            onClick={() => handleViewImages(price.image_urls, 0)}
                                            className="relative w-10 h-10 rounded border border-terminal-border bg-terminal-panel hover:border-terminal-accent transition-colors flex items-center justify-center"
                                          >
                                            <span className="text-xs font-mono text-terminal-accent">
                                              +{price.image_urls.length - 2}
                                            </span>
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="w-12 h-12 rounded border border-terminal-border bg-terminal-panel flex items-center justify-center">
                                        <ImageIcon className="h-5 w-5 text-terminal-muted" />
                                      </div>
                                    )}
                                  </TableCell>

                                  <TableCell className="font-mono text-terminal-text text-sm">
                                    <div className="font-semibold">{price.product_name}</div>
                                    <div className="text-xs text-terminal-muted">
                                      {price.packaging_label} - {price.size_name}
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-mono text-terminal-text text-sm">
                                    {price.hub_name} ({price.hub_code})
                                  </TableCell>
                                  <TableCell className="font-mono text-terminal-text text-sm">
                                    {isEditing ? (
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={editPrice}
                                        onChange={(e) => setEditPrice(e.target.value)}
                                        className="w-24 bg-terminal-dark border-terminal-border text-terminal-text font-mono"
                                      />
                                    ) : (
                                      `€${price.price_per_unit.toFixed(2)}`
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="font-mono text-xs border-terminal-border text-terminal-text">
                                      {price.delivery_mode === 'DELIVERY' ? 'DELIVERY' : 'Ex Works'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="font-mono text-terminal-text text-sm">
                                    {isEditing ? (
                                      <Input
                                        type="date"
                                        value={editValidUntil}
                                        onChange={(e) => setEditValidUntil(e.target.value)}
                                        className="w-36 bg-terminal-dark border-terminal-border text-terminal-text font-mono"
                                      />
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        {price.valid_until ? format(new Date(price.valid_until), 'dd MMM yyyy') : '-'}
                                        {isExpired && (
                                          <Badge variant="outline" className="bg-terminal-alert/20 text-terminal-alert border-terminal-alert font-mono text-xs">
                                            EXPIRED
                                          </Badge>
                                        )}
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-2 flex-wrap">
                                      {isEditing ? (
                                        <>
                                          <Button
                                            size="sm"
                                            onClick={() => handleSave(price.id)}
                                            className="bg-terminal-success hover:bg-green-600 text-white font-mono"
                                          >
                                            <Save className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            onClick={handleCancel}
                                            className="bg-terminal-dark border-2 border-terminal-border text-terminal-text hover:bg-terminal-panel font-mono"
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          {isExpired && (
                                            <Button
                                              size="sm"
                                              onClick={() => extendPrice.mutate(price.id)}
                                              disabled={extendPrice.isPending}
                                              className="bg-terminal-warning hover:bg-yellow-600 text-terminal-dark font-mono"
                                              title="Extend by 1 day"
                                            >
                                              <Clock className="h-3 w-3" />
                                            </Button>
                                          )}
                                          <Button
                                            size="sm"
                                            onClick={() => handleImageUpload(price)}
                                            className="bg-purple-600 hover:bg-purple-700 text-white font-mono"
                                            title={price.image_urls && price.image_urls.length > 0 ? `Add images (${price.image_urls.length}/5)` : "Upload images"}
                                          >
                                            {price.image_urls && price.image_urls.length > 0 ? (
                                              <><ImageIcon className="h-3 w-3 mr-1" />{price.image_urls.length}</>
                                            ) : (
                                              <Upload className="h-3 w-3" />
                                            )}
                                          </Button>
                                          <Button
                                            size="sm"
                                            onClick={() => handleEdit(price)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white font-mono"
                                          >
                                            <Edit2 className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            onClick={() => handleDelete(price.id)}
                                            className="bg-red-600 hover:bg-red-700 text-white font-mono"
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
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Upload Dialog */}
      {uploadingImageFor && (
        <Dialog open={!!uploadingImageFor} onOpenChange={(open) => !open && handleImageCancel()}>
          <DialogContent className="bg-terminal-panel border-terminal-border max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-mono text-terminal-text">Manage Product Images</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Show existing images with delete buttons */}
              {tempImagePreviews.length > 0 && (
                <div>
                  <p className="text-xs font-mono text-terminal-muted mb-2">Existing Images:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {tempImagePreviews.map((imageUrl, idx) => (
                      <div key={idx} className="relative border-2 border-terminal-border rounded-lg p-2 bg-terminal-dark">
                        <div className="relative w-full h-24 rounded-md overflow-hidden bg-terminal-panel border border-terminal-border mb-2">
                          <img
                            src={imageUrl}
                            alt={`Image ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const price = prices?.find(p => p.id === uploadingImageFor)
                            if (price) {
                              handleImageDelete(price.id, imageUrl, price.image_urls || [])
                            }
                          }}
                          disabled={deleteImage.isPending}
                          className="w-full h-6 text-xs hover:bg-red-600/20 hover:text-red-400 font-mono"
                        >
                          Delete
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload new images */}
              <div>
                <p className="text-xs font-mono text-terminal-muted mb-2">Add New Images:</p>
                <ImageUpload
                  onImageSelected={handleImageSelected}
                  onImageRemoved={handleImageRemoved}
                  currentImageUrls={[]}
                  maxImages={5 - tempImagePreviews.length}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  onClick={handleImageCancel}
                  className="bg-terminal-dark border-2 border-terminal-border text-terminal-text hover:bg-terminal-panel font-mono"
                >
                  Close
                </Button>
                {tempImageFiles.size > 0 && (
                  <Button
                    onClick={() => {
                      const price = prices?.find(p => p.id === uploadingImageFor)
                      if (price) {
                        handleImageSave(uploadingImageFor, price.supplier_id)
                      }
                    }}
                    disabled={uploadImage.isPending}
                    className="bg-terminal-success hover:bg-green-600 text-white font-mono"
                  >
                    {uploadImage.isPending ? 'Uploading...' : `Save ${tempImageFiles.size} Image${tempImageFiles.size > 1 ? 's' : ''}`}
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Image View Dialog - Gallery with navigation */}
      {viewImageUrls.length > 0 && (
        <Dialog open={viewImageUrls.length > 0} onOpenChange={(open) => !open && setViewImageUrls([])}>
          <DialogContent className="bg-terminal-panel border-terminal-border max-w-4xl">
            <DialogHeader>
              <DialogTitle className="font-mono text-terminal-text">
                Product Images {viewImageUrls.length > 1 && `(${viewImageIndex + 1}/${viewImageUrls.length})`}
              </DialogTitle>
            </DialogHeader>
            <div className="relative w-full max-h-[70vh] bg-terminal-dark rounded-lg">
              <img
                src={viewImageUrls[viewImageIndex]}
                alt={`Product ${viewImageIndex + 1}`}
                className="w-full h-auto object-contain"
              />
              {/* Navigation buttons */}
              {viewImageUrls.length > 1 && (
                <>
                  <Button
                    size="sm"
                    onClick={() => setViewImageIndex(prev => (prev > 0 ? prev - 1 : viewImageUrls.length - 1))}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white font-mono"
                  >
                    ←
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setViewImageIndex(prev => (prev < viewImageUrls.length - 1 ? prev + 1 : 0))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white font-mono"
                  >
                    →
                  </Button>
                </>
              )}
            </div>
            {/* Thumbnail navigation */}
            {viewImageUrls.length > 1 && (
              <div className="flex gap-2 mt-4 overflow-x-auto">
                {viewImageUrls.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setViewImageIndex(idx)}
                    className={`relative w-16 h-16 rounded border-2 overflow-hidden flex-shrink-0 transition-all ${
                      idx === viewImageIndex
                        ? 'border-terminal-accent scale-110'
                        : 'border-terminal-border hover:border-terminal-accent/50'
                    }`}
                  >
                    <img
                      src={url}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
