'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Package, Box, Layers, Ruler } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useProducts, usePackagingOptions, usePallets, useSizeOptions } from '@/hooks/use-products'

const productPackagingSpecSchema = z.object({
  // Product fields
  product_id: z.string().min(1, 'Product is required'),
  new_product: z.object({
    name: z.string().optional(),
    category: z.enum(['tomatoes', 'lettuce', 'babyleaf', 'citrus', 'greenhouse_crop', 'mushroom', 'grapes', 'carrots', 'potatoes', 'onions', 'fruit', 'vegetables']).optional(),
    intended_use: z.enum(['retail', 'process', 'industrial', 'wholesale']).optional(),
    sold_by: z.enum(['kg', 'piece', 'box', 'punnet']).optional(),
  }).optional(),
  
  // Packaging fields
  packaging_ids: z.array(z.string()).min(1, 'At least one packaging option is required'),
  new_packaging: z.object({
    label: z.string().optional(),
    unit_type: z.enum(['box', 'bag', 'container', 'crate', 'tray', 'bulk']).optional(),
    description: z.string().optional(),
    deposit_fee: z.string().optional(),
    rent_fee: z.string().optional(),
  }).optional(),
  
  // Pallet fields
  pallet_id: z.string().min(1, 'Pallet is required'),
  new_pallet: z.object({
    label: z.string().optional(),
    dimensions_cm: z.string().optional(),
    brutto_weight: z.string().optional(),
    pallets_per_truck: z.string().optional(),
    deposit_fee: z.string().optional(),
  }).optional(),
  
  // Size fields
  size_option_id: z.string().min(1, 'Size is required'),
  new_size: z.object({
    name: z.string().optional(),
  }).optional(),
  
  // Specification fields
  boxes_per_pallet: z.string().min(1, 'Boxes per pallet is required'),
  weight_per_box: z.string().optional(),
  weight_per_pallet: z.string().optional(),
  weight_unit: z.enum(['kg', 'g', 'ton']),
  pieces_per_box: z.string().optional(),
})

type ProductPackagingSpecFormValues = z.infer<typeof productPackagingSpecSchema>

export function ProductPackagingSpecForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [showNewProduct, setShowNewProduct] = useState(false)
  const [showNewPackaging, setShowNewPackaging] = useState(false)
  const [showNewPallet, setShowNewPallet] = useState(false)
  const [showNewSize, setShowNewSize] = useState(false)
  
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const { products } = useProducts()
  const { packagingOptions } = usePackagingOptions()
  const { pallets } = usePallets()
  const { sizeOptions } = useSizeOptions()

  const form = useForm<ProductPackagingSpecFormValues>({
    resolver: zodResolver(productPackagingSpecSchema),
    defaultValues: {
      product_id: '',
      packaging_ids: [],
      pallet_id: '',
      size_option_id: '',
      boxes_per_pallet: '',
      weight_per_box: '',
      weight_per_pallet: '',
      weight_unit: 'kg',
      pieces_per_box: '',
    },
  })

  // Auto-calculate weight per pallet
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'boxes_per_pallet' || name === 'weight_per_box') {
        const boxes = parseFloat(value.boxes_per_pallet || '0')
        const weightPerBox = parseFloat(value.weight_per_box || '0')
        
        if (boxes > 0 && weightPerBox > 0) {
          const totalWeight = (boxes * weightPerBox).toFixed(2)
          form.setValue('weight_per_pallet', totalWeight)
        }
      }
    })
    
    return () => subscription.unsubscribe()
  }, [form])

  const onSubmit = async (values: ProductPackagingSpecFormValues) => {
    setIsLoading(true)
    try {
      let productId = values.product_id
      const packagingIds = values.packaging_ids
      let palletId = values.pallet_id
      let sizeOptionId = values.size_option_id

      // Create new product if needed
      if (values.product_id === 'new' && values.new_product) {
        const { data: newProduct, error: productError } = await supabase
          .from('products')
          .insert([{
            name: values.new_product.name!,
            category: values.new_product.category!,
            intended_use: values.new_product.intended_use!,
            sold_by: values.new_product.sold_by!,
          }])
          .select()
          .single()

        if (productError) throw productError
        productId = newProduct.id
      }

      // Create new packaging if needed
      if (packagingIds.includes('new') && values.new_packaging) {
        const { data: newPackaging, error: packagingError } = await supabase
          .from('packaging_options')
          .insert([{
            label: values.new_packaging.label!,
            unit_type: values.new_packaging.unit_type!,
            description: values.new_packaging.description || null,
            deposit_fee: values.new_packaging.deposit_fee ? parseFloat(values.new_packaging.deposit_fee) : null,
            rent_fee: values.new_packaging.rent_fee ? parseFloat(values.new_packaging.rent_fee) : null,
          }])
          .select()
          .single()

        if (packagingError) throw packagingError
        
        // Replace 'new' with the actual ID in the array
        const newIndex = packagingIds.findIndex(id => id === 'new')
        packagingIds[newIndex] = newPackaging.id
      }

      // Create new pallet if needed
      if (values.pallet_id === 'new' && values.new_pallet) {
        const { data: newPallet, error: palletError } = await supabase
          .from('pallets')
          .insert([{
            label: values.new_pallet.label!,
            dimensions_cm: values.new_pallet.dimensions_cm || null,
            brutto_weight: values.new_pallet.brutto_weight ? parseFloat(values.new_pallet.brutto_weight) : null,
            pallets_per_truck: values.new_pallet.pallets_per_truck ? parseFloat(values.new_pallet.pallets_per_truck) : null,
            deposit_fee: values.new_pallet.deposit_fee ? parseFloat(values.new_pallet.deposit_fee) : null,
          }])
          .select()
          .single()

        if (palletError) throw palletError
        palletId = newPallet.id
      }

      // Create new size if needed
      if (values.size_option_id === 'new' && values.new_size) {
        const { data: newSize, error: sizeError } = await supabase
          .from('size_options')
          .insert([{
            name: values.new_size.name!,
          }])
          .select()
          .single()

        if (sizeError) throw sizeError
        sizeOptionId = newSize.id
      }

      // Create specifications for each packaging option
      const specifications = packagingIds.map(packagingId => ({
        product_id: productId,
        packaging_id: packagingId,
        pallet_id: palletId,
        size_option_id: sizeOptionId,
        boxes_per_pallet: parseInt(values.boxes_per_pallet),
        weight_per_box: values.weight_per_box ? parseFloat(values.weight_per_box) : null,
        weight_per_pallet: values.weight_per_pallet ? parseFloat(values.weight_per_pallet) : null,
        weight_unit: values.weight_unit,
        pieces_per_box: values.pieces_per_box ? parseInt(values.pieces_per_box) : null,
      }))

      const { error } = await supabase
        .from('product_packaging_specs')
        .insert(specifications)

      if (error) throw error

      toast({
        title: 'Success',
        description: `${packagingIds.length} product packaging specification${packagingIds.length > 1 ? 's' : ''} created successfully`,
      })

      // Refresh all related data
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['packaging-options'] })
      queryClient.invalidateQueries({ queryKey: ['pallets'] })
      queryClient.invalidateQueries({ queryKey: ['size-options'] })
      queryClient.invalidateQueries({ queryKey: ['product-specs'] })
      
      form.reset()
      setShowNewProduct(false)
      setShowNewPackaging(false)
      setShowNewPallet(false)
      setShowNewSize(false)
      
    } catch (error) {
      console.error('Error creating product packaging spec:', error)
      toast({
        title: 'Error',
        description: `Failed to create specification: ${error.message}`,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-6 w-6" />
          Create Product Packaging Specification
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Product Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Product Information</h3>
              </div>
              
              <FormField
                control={form.control}
                name="product_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product *</FormLabel>
                    <div className="flex gap-2">
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value)
                          setShowNewProduct(value === 'new')
                        }} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products?.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} ({product.category})
                            </SelectItem>
                          ))}
                          <SelectItem value="new">
                            <div className="flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              Add New Product
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showNewProduct && (
                <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                  <FormField
                    control={form.control}
                    name="new_product.name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Cherry Tomatoes" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="new_product.category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="tomatoes">Tomatoes</SelectItem>
                            <SelectItem value="lettuce">Lettuce</SelectItem>
                            <SelectItem value="babyleaf">Baby Leaf</SelectItem>
                            <SelectItem value="citrus">Citrus</SelectItem>
                            <SelectItem value="greenhouse_crop">Greenhouse Crop</SelectItem>
                            <SelectItem value="mushroom">Mushroom</SelectItem>
                            <SelectItem value="grapes">Grapes</SelectItem>
                            <SelectItem value="carrots">Carrots</SelectItem>
                            <SelectItem value="potatoes">Potatoes</SelectItem>
                            <SelectItem value="onions">Onions</SelectItem>
                            <SelectItem value="fruit">Fruit</SelectItem>
                            <SelectItem value="vegetables">Vegetables</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="new_product.intended_use"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Intended Use *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select intended use" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="retail">Retail</SelectItem>
                            <SelectItem value="process">Process</SelectItem>
                            <SelectItem value="industrial">Industrial</SelectItem>
                            <SelectItem value="wholesale">Wholesale</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="new_product.sold_by"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sold By *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select sold by unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="kg">Kg</SelectItem>
                            <SelectItem value="piece">Piece</SelectItem>
                            <SelectItem value="box">Box</SelectItem>
                            <SelectItem value="punnet">Punnet</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Packaging Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Box className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Packaging Information</h3>
              </div>
              
              <FormField
                control={form.control}
                name="packaging_ids"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Packaging Types *</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Select one or more packaging options for this product specification
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const allIds = packagingOptions?.map((pkg: any) => pkg.id) || []
                            form.setValue('packaging_ids', allIds)
                          }}
                        >
                          Select All
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => form.setValue('packaging_ids', [])}
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-3 max-h-60 overflow-y-auto border rounded-lg p-3">
                      {packagingOptions?.map((packaging: any) => (
                        <FormField
                          key={packaging.id}
                          control={form.control}
                          name="packaging_ids"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={packaging.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(packaging.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value || [], packaging.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== packaging.id
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal leading-5">
                                  {packaging.label} ({packaging.unit_type})
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                      
                      <FormField
                        control={form.control}
                        name="packaging_ids"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 border-t pt-3 mt-3">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes('new')}
                                onCheckedChange={(checked) => {
                                  const newValue = checked
                                    ? [...field.value || [], 'new']
                                    : field.value?.filter((value) => value !== 'new')
                                  field.onChange(newValue)
                                  setShowNewPackaging(checked === true)
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal leading-5 flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              Add New Packaging
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showNewPackaging && (
                <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                  <FormField
                    control={form.control}
                    name="new_packaging.label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Label *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 15kg Cardboard Box" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="new_packaging.unit_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="box">Box</SelectItem>
                            <SelectItem value="bag">Bag</SelectItem>
                            <SelectItem value="container">Container</SelectItem>
                            <SelectItem value="crate">Crate</SelectItem>
                            <SelectItem value="tray">Tray</SelectItem>
                            <SelectItem value="bulk">Bulk</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="new_packaging.description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input placeholder="Optional description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="new_packaging.deposit_fee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deposit Fee</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="new_packaging.rent_fee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rent Fee</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Pallet Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Pallet Information</h3>
              </div>
              
              <FormField
                control={form.control}
                name="pallet_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pallet Type *</FormLabel>
                    <div className="flex gap-2">
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value)
                          setShowNewPallet(value === 'new')
                        }} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select pallet" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {pallets?.map((pallet) => (
                            <SelectItem key={pallet.id} value={pallet.id}>
                              {pallet.label} {pallet.dimensions_cm && `(${pallet.dimensions_cm})`}
                            </SelectItem>
                          ))}
                          <SelectItem value="new">
                            <div className="flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              Add New Pallet
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showNewPallet && (
                <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                  <FormField
                    control={form.control}
                    name="new_pallet.label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pallet Label *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. EUR Pallet" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="new_pallet.dimensions_cm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dimensions (cm)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 120x80x15" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="new_pallet.brutto_weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brutto Weight</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" placeholder="25.0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="new_pallet.pallets_per_truck"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pallets per Truck</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="33" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="new_pallet.deposit_fee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deposit Fee</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Size Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Ruler className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Size Information</h3>
              </div>
              
              <FormField
                control={form.control}
                name="size_option_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Size Option *</FormLabel>
                    <div className="flex gap-2">
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value)
                          setShowNewSize(value === 'new')
                        }} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sizeOptions?.map((size) => (
                            <SelectItem key={size.id} value={size.id}>
                              {size.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="new">
                            <div className="flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              Add New Size
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showNewSize && (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <FormField
                    control={form.control}
                    name="new_size.name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Size Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Large, XL, 500g" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Specifications Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Packaging Specifications</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="boxes_per_pallet"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Boxes per Pallet *</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="48" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pieces_per_box"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pieces per Box (Optional)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="24" {...field} />
                      </FormControl>
                      <FormDescription>
                        Leave empty if not applicable
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="weight_per_box"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Weight per Box (Optional)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="15.5" {...field} />
                      </FormControl>
                      <FormDescription>
                        Leave empty if not applicable
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="weight_per_pallet"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Weight per Pallet</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          placeholder="Auto-calculated" 
                          {...field}
                          disabled={!!(form.watch('boxes_per_pallet') && form.watch('weight_per_box'))}
                        />
                      </FormControl>
                      <FormDescription>
                        Auto-calculated from boxes × weight per box
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="weight_unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight Unit *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select weight unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="kg">Kg</SelectItem>
                        <SelectItem value="g">Grams</SelectItem>
                        <SelectItem value="ton">Ton</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Specification'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}