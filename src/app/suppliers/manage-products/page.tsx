'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Building2,
  Package,
  Plus,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  Truck,
  Clock,
  Eye
} from 'lucide-react'
import { toast } from 'sonner'
import { useSuppliers, useSupplierWithProducts, useSupplierLogistics } from '@/hooks/use-suppliers'

export default function ManageSupplierProductsPage() {
  const [selectedSupplier, setSelectedSupplier] = useState('')

  // Fetch data
  const { data: suppliers = [] } = useSuppliers()
  const { data: supplierData } = useSupplierWithProducts(selectedSupplier)
  const { data: logistics = [] } = useSupplierLogistics(selectedSupplier)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Supplier Products</h1>
        <p className="text-muted-foreground">
          Overview and management of supplier product capabilities and logistics
        </p>
      </div>

      <div className="space-y-6">
        {/* Supplier Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Select Supplier
            </CardTitle>
            <CardDescription>
              Choose a supplier to view and manage their product portfolio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {supplier.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Supplier Overview */}
        {selectedSupplier && supplierData && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Supplier Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Supplier Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h3 className="font-semibold">{supplierData.name}</h3>
                  <p className="text-sm text-gray-600">{supplierData.city}, {supplierData.country}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {supplierData.delivery_modes.map((mode, idx) => (
                    <Badge key={idx} variant="outline">
                      {mode}
                    </Badge>
                  ))}
                </div>
                {supplierData.notes && (
                  <p className="text-sm text-gray-600">{supplierData.notes}</p>
                )}
              </CardContent>
            </Card>

            {/* Logistics Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-purple-600" />
                  Logistics Capabilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                {logistics.length > 0 ? (
                  <div className="space-y-3">
                    {logistics.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span className="text-sm">
                            {(item.origin_hub as any)?.name} ({(item.origin_hub as any)?.hub_code})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{item.mode}</Badge>
                          {item.typical_lead_time_days && (
                            <span className="text-xs text-gray-500">
                              {item.typical_lead_time_days}d
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No logistics capabilities configured</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Products Table */}
        {selectedSupplier && supplierData && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-green-600" />
                    Product Portfolio
                  </CardTitle>
                  <CardDescription>
                    Products and specifications offered by this supplier
                  </CardDescription>
                </div>
                <Button onClick={() => toast.info('Add product feature coming soon')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {supplierData.supplier_product_packaging_spec.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Packaging</TableHead>
                      <TableHead>Season</TableHead>
                      <TableHead>Specifications</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierData.supplier_product_packaging_spec.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            <div>
                              <div>{item.product_packaging_specs.products.name}</div>
                              <div className="text-xs text-gray-500">
                                {item.product_packaging_specs.products.category}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm font-medium">
                              {item.product_packaging_specs.packaging_options.label}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.product_packaging_specs.size_options.name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.season ? (
                            <Badge variant="outline">
                              {item.season.replace('_', ' ')}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{item.product_packaging_specs.boxes_per_pallet} boxes/pallet</div>
                            <div className="text-xs text-gray-500">
                              {item.product_packaging_specs.weight_per_box}{item.product_packaging_specs.weight_unit} per box
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toast.info('Edit product feature coming soon')}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toast.info('View details feature coming soon')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toast.info('Remove product feature coming soon')}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Products</h3>
                  <p className="text-gray-500 mb-4">This supplier has no products configured yet.</p>
                  <Button onClick={() => toast.info('Add product feature coming soon')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Product
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Summary Stats */}
        {selectedSupplier && supplierData && (
          <Card>
            <CardHeader>
              <CardTitle>Overview Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {supplierData.supplier_product_packaging_spec.length}
                  </div>
                  <div className="text-sm text-blue-600">Products</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {logistics.length}
                  </div>
                  <div className="text-sm text-green-600">Hub Connections</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {[...new Set(logistics.map(l => l.mode))].length}
                  </div>
                  <div className="text-sm text-purple-600">Delivery Modes</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {supplierData.supplier_product_packaging_spec.filter(p => p.season).length}
                  </div>
                  <div className="text-sm text-orange-600">Seasonal Products</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}