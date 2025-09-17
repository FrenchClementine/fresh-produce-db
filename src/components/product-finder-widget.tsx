'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  SearchableSelect,
  createSearchableOptions,
} from '@/components/ui/searchable-select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  MapPin,
  Calendar,
  Truck,
  Building2,
  Clock,
  Package,
  CheckCircle2,
  AlertCircle,
  Filter,
  Loader2,
} from 'lucide-react'
import { useProducts, useHubs, useProductSizeOptions, useAvailableDeliveryHubs, useCustomerProducts, useCustomerDeliveryHubs } from '@/hooks/use-products'
import { useProductFinder, type SupplierResult, type ProductFinderCriteria } from '@/hooks/use-product-finder'
import { useActiveCustomers } from '@/hooks/use-customers'

export function ProductFinderWidget() {
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'ex_works'>('delivery')
  const [selectedDeliveryHub, setSelectedDeliveryHub] = useState<string>('')
  const [selectedSizeOption, setSelectedSizeOption] = useState<string>('')

  const { activeCustomers, isLoading: customersLoading } = useActiveCustomers()
  const { products, isLoading: productsLoading } = useProducts()
  const { customerProducts, isLoading: customerProductsLoading } = useCustomerProducts(selectedCustomer)
  const { customerDeliveryHubs, isLoading: customerDeliveryHubsLoading } = useCustomerDeliveryHubs(selectedCustomer)
  const { hubs, isLoading: hubsLoading } = useHubs()
  const { sizeOptions, isLoading: sizeOptionsLoading } = useProductSizeOptions(selectedProduct)
  const { deliveryHubs, isLoading: deliveryHubsLoading } = useAvailableDeliveryHubs(selectedProduct, selectedSizeOption)

  // Determine which products to show based on customer selection
  const availableProducts = selectedCustomer ? customerProducts : products

  // Determine if we can search
  const canSearch = selectedProduct && (
    deliveryMode === 'ex_works' ||
    (selectedCustomer && deliveryMode === 'delivery') || // Customer + product is enough for delivery mode
    selectedDeliveryHub // Or specific hub selected
  )

  // Create search criteria
  const searchCriteria: ProductFinderCriteria | null =
    canSearch
      ? {
          product_id: selectedProduct,
          delivery_hub_id: deliveryMode === 'delivery' ? selectedDeliveryHub : undefined,
          delivery_mode: deliveryMode,
          size_option_id: selectedSizeOption || undefined,
          customer_id: selectedCustomer || undefined,
        }
      : null

  // Use the product finder hook
  const { data: results = [], isLoading: isSearching, error } = useProductFinder(searchCriteria)

  // Create options for selects
  const customerOptions = createSearchableOptions(
    activeCustomers?.map(customer => ({
      value: customer.id,
      label: `${customer.name}${customer.city ? ` - ${customer.city}` : ''}`
    })) || []
  )

  const productOptions = createSearchableOptions(
    availableProducts?.map(product => ({
      value: product.id,
      label: `${product.name}${product.intended_use ? ` (${product.intended_use})` : ''}`
    })) || []
  )

  // Determine available hubs based on customer and product selection
  const availableHubs = (() => {
    if (deliveryMode !== 'delivery') return hubs

    // If both customer and product are selected, use product-filtered hubs
    if (selectedCustomer && selectedProduct) {
      return deliveryHubs
    }

    // If only customer is selected, use customer's delivery hubs
    if (selectedCustomer) {
      return customerDeliveryHubs
    }

    // If only product is selected, use product-filtered hubs
    if (selectedProduct) {
      return deliveryHubs
    }

    // Default to all hubs
    return hubs
  })()
  const hubOptions = createSearchableOptions(
    availableHubs?.map(hub => ({
      value: hub.id,
      label: `${hub.name} (${hub.city_name || 'Unknown'}, ${hub.country_code || 'N/A'})`
    })) || []
  )

  const sizeOptionsDropdown = createSearchableOptions(
    sizeOptions?.map((size: any) => ({
      value: size.id,
      label: size.name
    })) || []
  )

  const seasonOptions = createSearchableOptions([
    { value: 'spring', label: 'Spring' },
    { value: 'summer', label: 'Summer' },
    { value: 'autumn', label: 'Autumn' },
    { value: 'winter', label: 'Winter' },
    { value: 'year_round', label: 'Year Round' },
  ])

  const getDeliveryModeIcon = (mode: string) => {
    switch (mode) {
      case 'DELIVERY': return <Truck className="h-3 w-3" />
      case 'Ex Works': return <Building2 className="h-3 w-3" />
      case 'TRANSIT': return <MapPin className="h-3 w-3" />
      default: return <Package className="h-3 w-3" />
    }
  }

  const getDeliveryModeLabel = (mode: string) => {
    switch (mode) {
      case 'DELIVERY': return 'Direct Delivery'
      case 'Ex Works': return 'Ex Works'
      case 'TRANSIT': return 'Transit Hub'
      default: return mode
    }
  }

  const selectedCustomerName = activeCustomers?.find(c => c.id === selectedCustomer)?.name
  const selectedProductName = availableProducts?.find(p => p.id === selectedProduct)?.name
  const selectedHubName = hubs?.find(h => h.id === selectedDeliveryHub)?.name

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-6 w-6 text-green-600" />
          Product Finder
        </CardTitle>
        <CardDescription>
          Find growers and suppliers for your fresh produce with delivery options
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Customer</label>
            <SearchableSelect
              value={selectedCustomer}
              onValueChange={(value) => {
                setSelectedCustomer(value)
                setSelectedProduct('') // Reset product when customer changes
                setSelectedSizeOption('') // Reset size when customer changes
                setSelectedDeliveryHub('') // Reset delivery hub when customer changes
              }}
              options={customerOptions}
              placeholder="All customers"
              searchPlaceholder="Search customers..."
              disabled={customersLoading}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Product *</label>
            <SearchableSelect
              value={selectedProduct}
              onValueChange={(value) => {
                setSelectedProduct(value)
                setSelectedSizeOption('') // Reset size when product changes
                setSelectedDeliveryHub('') // Reset delivery hub when product changes
                // Don't clear customer - allow both flows
              }}
              options={productOptions}
              placeholder={
                selectedCustomer
                  ? customerProductsLoading
                    ? "Loading customer products..."
                    : customerProducts?.length === 0
                      ? "No products for customer"
                      : "Select product..."
                  : "Select product..."
              }
              searchPlaceholder="Search products..."
              disabled={productsLoading || customerProductsLoading}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Size</label>
            <SearchableSelect
              value={selectedSizeOption}
              onValueChange={(value) => {
                setSelectedSizeOption(value)
                setSelectedDeliveryHub('') // Reset delivery hub when size changes
              }}
              options={sizeOptionsDropdown}
              placeholder={selectedProduct ? "All sizes" : "Select product first"}
              searchPlaceholder="Search sizes..."
              disabled={!selectedProduct || sizeOptionsLoading}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Delivery Mode *</label>
            <Tabs value={deliveryMode} onValueChange={(value) => setDeliveryMode(value as 'delivery' | 'ex_works')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="delivery" className="flex items-center gap-2">
                  <Truck className="h-3 w-3" />
                  Delivery
                </TabsTrigger>
                <TabsTrigger value="ex_works" className="flex items-center gap-2">
                  <Building2 className="h-3 w-3" />
                  Ex Works
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {deliveryMode === 'delivery' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Delivery Location *</label>
              <SearchableSelect
                value={selectedDeliveryHub}
                onValueChange={setSelectedDeliveryHub}
                options={hubOptions}
                placeholder={
                  (!selectedCustomer && !selectedProduct)
                    ? "Select customer or product first"
                    : (selectedCustomer && !selectedProduct)
                      ? customerDeliveryHubsLoading
                        ? "Loading customer locations..."
                        : customerDeliveryHubs?.length === 0
                          ? "No delivery locations for customer"
                          : "Select customer delivery location..."
                      : (!selectedCustomer && selectedProduct)
                        ? deliveryHubsLoading
                          ? "Loading product locations..."
                          : deliveryHubs?.length === 0
                            ? "No delivery locations for product"
                            : "Select delivery location..."
                        : (selectedCustomer && selectedProduct)
                          ? deliveryHubsLoading
                            ? "Loading available locations..."
                            : availableHubs?.length === 0
                              ? "No locations available"
                              : "Select delivery location..."
                          : "Select delivery location..."
                }
                searchPlaceholder="Search locations..."
                disabled={Boolean(
                  (!selectedCustomer && !selectedProduct) ||
                  (selectedCustomer && customerDeliveryHubsLoading) ||
                  (selectedProduct && deliveryHubsLoading)
                )}
              />
              {selectedProduct && availableHubs?.length === 0 && !deliveryHubsLoading && (
                <p className="text-xs text-muted-foreground">
                  No suppliers offer delivery for this product. Try "Ex Works" mode.
                </p>
              )}
            </div>
          )}

          {deliveryMode === 'ex_works' && (
            <div className="space-y-2 flex items-end">
              <div className="text-center text-sm text-muted-foreground w-full">
                {selectedProduct ? (
                  isSearching ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching...
                    </div>
                  ) : (
                    `Found ${results.length} pickup location${results.length !== 1 ? 's' : ''}`
                  )
                ) : (
                  'Select product above'
                )}
              </div>
            </div>
          )}
        </div>

        {/* Search Summary */}
        {selectedProductName && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Search Criteria:</h4>
            <div className="flex flex-wrap gap-2">
              {selectedCustomerName && (
                <Badge variant="secondary">
                  <Building2 className="h-3 w-3 mr-1" />
                  {selectedCustomerName}
                </Badge>
              )}
              <Badge variant="secondary">
                <Package className="h-3 w-3 mr-1" />
                {selectedProductName}
              </Badge>
              <Badge variant="secondary">
                {deliveryMode === 'delivery' ? (
                  <><Truck className="h-3 w-3 mr-1" />Delivery</>
                ) : (
                  <><Building2 className="h-3 w-3 mr-1" />Ex Works</>
                )}
              </Badge>
              {deliveryMode === 'delivery' && selectedHubName && (
                <Badge variant="secondary">
                  <MapPin className="h-3 w-3 mr-1" />
                  To: {selectedHubName}
                </Badge>
              )}
              {deliveryMode === 'ex_works' && (
                <Badge variant="secondary">
                  <MapPin className="h-3 w-3 mr-1" />
                  Pickup Locations
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Search Error</span>
            </div>
            <p className="text-sm text-red-600 mt-1">
              {error.message || 'An error occurred while searching for suppliers'}
            </p>
          </div>
        )}

        {/* Loading State */}
        {isSearching && canSearch && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Searching for suppliers...</p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && !isSearching && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">
                Found {results.length} supplier{results.length !== 1 ? 's' : ''}
              </h3>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter Results
              </Button>
            </div>

            <div className="space-y-3">
              {results.map((supplier) => (
                <Card key={supplier.id} className={`border-l-4 ${
                  supplier.is_currently_available ? 'border-l-green-500' : 'border-l-red-500'
                }`}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header Row */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <div>
                              <h4 className="font-semibold text-base">{supplier.name}</h4>
                              {supplier.agent && (
                                <div className="text-sm text-blue-600 font-medium">
                                  Agent: {supplier.agent.name} {supplier.agent.role && `(${supplier.agent.role})`}
                                </div>
                              )}
                            </div>
                            {supplier.is_currently_available ? (
                              <Badge variant="default" className="bg-green-500 text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Available
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="bg-red-500 text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Not Available
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {supplier.location}
                          </p>
                        </div>
                        {supplier.certifications.length > 0 && (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {supplier.certifications.map(cert => (
                              <Badge key={cert} variant="outline" className="text-xs">
                                {cert}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Key Information Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {/* Product Specs */}
                        {supplier.product_specs.length > 0 && supplier.product_specs[0] && (
                          <div className="bg-muted/30 p-2 rounded">
                            <div className="text-xs font-medium mb-1">Product Specs</div>
                            <div className="text-xs space-y-0.5">
                              <div>{supplier.product_specs[0].packaging_type} - {supplier.product_specs[0].size_option}</div>
                              <div className="font-medium">{supplier.product_specs[0].boxes_per_pallet} boxes/pallet</div>
                              {supplier.product_specs[0].pieces_per_box > 0 && (
                                <div>{supplier.product_specs[0].pieces_per_box} pieces/box</div>
                              )}
                              <div className="font-medium text-green-700">{supplier.product_specs[0].weight_per_pallet}kg/pallet</div>
                            </div>
                          </div>
                        )}

                        {/* Origin Hub */}
                        <div className="bg-muted/30 p-2 rounded">
                          <div className="text-xs font-medium mb-1">Origin Hub</div>
                          <div className="text-xs">
                            <div className="font-medium">{supplier.available_from_hub.name}</div>
                            <div className="text-muted-foreground">
                              {supplier.available_from_hub.city}, {supplier.available_from_hub.country_code}
                            </div>
                          </div>
                        </div>

                        {/* Delivery Modes */}
                        <div className="bg-muted/30 p-2 rounded">
                          <div className="text-xs font-medium mb-1">Delivery Modes</div>
                          <div className="text-xs space-y-0.5">
                            {supplier.delivery_modes.map(mode => (
                              <div key={mode} className="flex items-center gap-1">
                                {getDeliveryModeIcon(mode)}
                                <span>{mode === 'Ex Works' ? 'Ex Works' : 'Delivery'}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Seasonal Availability */}
                        <div className="bg-muted/30 p-2 rounded">
                          <div className="text-xs font-medium mb-1">Seasonal Availability</div>
                          <div className="text-xs">
                            {supplier.seasonal_availability.map(s => 
                              s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')
                            ).join(', ')}
                          </div>
                        </div>
                      </div>

                      {/* Delivery Details */}
                      {supplier.delivery_to_hub && (
                        <div className="border-t pt-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-green-600" />
                              <div>
                                <div className="text-xs font-medium text-green-700">
                                  {supplier.delivery_to_hub.is_supplier_transport 
                                    ? 'Direct Delivery Available' 
                                    : `Delivery via ${supplier.delivery_to_hub.transporter_name || 'Third-party Transport'}`}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  To: {supplier.delivery_to_hub.name}, {supplier.delivery_to_hub.city} • {supplier.delivery_to_hub.transport_days} days transit
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              {supplier.delivery_to_hub.pricing_bands && supplier.delivery_to_hub.pricing_bands.length > 0 ? (
                                <div className="space-y-1">
                                  <div className="text-xs font-medium text-muted-foreground">Transport Rates</div>
                                  {supplier.delivery_to_hub.pricing_bands.map((band, index) => (
                                    <div key={index} className="text-xs bg-muted/50 px-2 py-1 rounded">
                                      <div className="font-medium">€{band.price_per_pallet}/pallet</div>
                                      <div className="text-muted-foreground">
                                        {band.min_pallets}{band.max_pallets ? `-${band.max_pallets}` : '+'} pallets ({band.pallet_dimensions}cm)
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : supplier.delivery_to_hub.cost_estimate ? (
                                <div className="text-sm font-medium">€{supplier.delivery_to_hub.cost_estimate}/pallet</div>
                              ) : null}
                            </div>
                          </div>

                          {/* Multi-hop Route Details */}
                          {supplier.delivery_to_hub.multi_hop_route && (
                            <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-md border-l-4 border-blue-400">
                              <h4 className="font-medium text-blue-900 flex items-center text-sm mb-3">
                                🚛 Multi-hop Transport
                                <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                  {supplier.delivery_to_hub.transport_days} days total
                                </span>
                              </h4>

                              <div className="space-y-2">
                                {/* First Leg - Supplier Delivery */}
                                <div className="flex items-center text-sm">
                                  <div className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0">
                                    1
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="font-medium text-gray-900 text-xs">
                                      {supplier.delivery_to_hub.multi_hop_route.first_leg.from_hub}
                                    </span>
                                    <span className="mx-1">→</span>
                                    <span className="font-medium text-blue-700 text-xs">
                                      {supplier.delivery_to_hub.multi_hop_route.first_leg.to_hub}
                                    </span>
                                    <div className="text-xs text-gray-500 mt-1">
                                      Supplier delivery ({supplier.delivery_to_hub.multi_hop_route.first_leg.mode}) •
                                      {supplier.delivery_to_hub.multi_hop_route.first_leg.duration_days} days
                                    </div>
                                  </div>
                                </div>

                                {/* Transshipment Hub */}
                                <div className="flex items-center text-sm bg-yellow-50 p-2 rounded">
                                  <div className="w-5 h-5 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs mr-2 flex-shrink-0">
                                    🔄
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="font-medium text-yellow-800 text-xs">
                                      Transshipment at {supplier.delivery_to_hub.multi_hop_route.transshipment_hub.name}
                                    </span>
                                    <div className="text-xs text-yellow-600 mt-1">
                                      Handling: {supplier.delivery_to_hub.multi_hop_route.transshipment_hub.handling_time_hours}h •
                                      €{supplier.delivery_to_hub.multi_hop_route.transshipment_hub.handling_cost_per_pallet}/pallet
                                    </div>
                                  </div>
                                </div>

                                {/* Second Leg - Transporter Delivery */}
                                <div className="flex items-center text-sm">
                                  <div className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0">
                                    2
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="font-medium text-blue-700 text-xs">
                                      {supplier.delivery_to_hub.multi_hop_route.second_leg.from_hub}
                                    </span>
                                    <span className="mx-1">→</span>
                                    <span className="font-medium text-gray-900 text-xs">
                                      {supplier.delivery_to_hub.multi_hop_route.second_leg.to_hub}
                                    </span>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {supplier.delivery_to_hub.multi_hop_route.second_leg.transporter_name} •
                                      {supplier.delivery_to_hub.multi_hop_route.second_leg.duration_days} days •
                                      €{supplier.delivery_to_hub.multi_hop_route.second_leg.cost_per_pallet}/pallet
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-2 pt-2 border-t border-blue-200">
                                <div className="flex justify-between text-sm">
                                  <span className="font-medium text-blue-900 text-xs">Total Cost Estimate:</span>
                                  <span className="font-bold text-blue-900 text-xs">€{supplier.delivery_to_hub.cost_estimate}/pallet</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {results.length === 0 && canSearch && !isSearching && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No suppliers found for the selected criteria</p>
            <p className="text-sm mt-1">Try adjusting your search parameters or check back later</p>
          </div>
        )}

        {/* Initial State */}
        {!canSearch && !isSearching && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>
              {selectedCustomer
                ? "Select a product to find suppliers"
                : "Select a customer or product to begin"
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}