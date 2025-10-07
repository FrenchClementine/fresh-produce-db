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
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Package, Box, Layers, Ruler, Check, ChevronsUpDown, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import {
  useProducts,
  usePackagingOptions,
  usePallets,
  useSizeOptions,
  useProductSpecsByProduct
} from '@/hooks/use-products'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'

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

  // Size fields - now supports multiple selections
  size_option_ids: z.array(z.string()).min(1, 'At least one size is required'),
  new_size: z.object({
    name: z.string().optional(),
  }).optional(),

  // Specification fields
  boxes_per_pallet: z.number().min(1, 'Boxes per pallet is required'),
  weight_per_box: z.number().optional(),
  weight_per_pallet: z.number().optional(),
  weight_unit: z.enum(['kg', 'g', 'ton']),
  pieces_per_box: z.number().optional(),
})

type ProductPackagingSpecFormValues = z.infer<typeof productPackagingSpecSchema>

interface ProductPackagingSpecFormProps {
  onCancel?: () => void
}

export function ProductPackagingSpecForm({ onCancel }: ProductPackagingSpecFormProps = {}) {
  const [isLoading, setIsLoading] = useState(false)
  const [showNewProduct, setShowNewProduct] = useState(false)
  const [showNewPackaging, setShowNewPackaging] = useState(false)
  const [showNewPallet, setShowNewPallet] = useState(false)
  const [showNewSize, setShowNewSize] = useState(false)
  const [productPopoverOpen, setProductPopoverOpen] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [selectedProductId, setSelectedProductId] = useState<string>('')

  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { products } = useProducts()
  const { packagingOptions } = usePackagingOptions()
  const { pallets } = usePallets()
  const { sizeOptions } = useSizeOptions()
  const { productSpecs: existingSpecs } = useProductSpecsByProduct(selectedProductId)

  const form = useForm<ProductPackagingSpecFormValues>({
    resolver: zodResolver(productPackagingSpecSchema),
    defaultValues: {
      product_id: '',
      packaging_ids: [],
      pallet_id: '',
      size_option_ids: [],
      boxes_per_pallet: undefined,
      weight_per_box: undefined,
      weight_per_pallet: undefined,
      weight_unit: 'kg',
      pieces_per_box: undefined,
    },
  })

  // Auto-calculate weight per pallet
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'boxes_per_pallet' || name === 'weight_per_box') {
        const boxes = value.boxes_per_pallet || 0
        const weightPerBox = value.weight_per_box || 0

        if (boxes > 0 && weightPerBox > 0) {
          const totalWeight = parseFloat((boxes * weightPerBox).toFixed(2))
          form.setValue('weight_per_pallet', totalWeight)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [form])

  // Update selected product ID when product_id changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'product_id' && value.product_id !== 'new') {
        setSelectedProductId(value.product_id || '')
      } else if (name === 'product_id' && value.product_id === 'new') {
        setSelectedProductId('')
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
      let sizeOptionIds = values.size_option_ids

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
      if (sizeOptionIds.includes('new') && values.new_size) {
        const { data: newSize, error: sizeError } = await supabase
          .from('size_options')
          .insert([{
            name: values.new_size.name!,
          }])
          .select()
          .single()

        if (sizeError) throw sizeError

        // Replace 'new' with the actual ID in the array
        const newIndex = sizeOptionIds.findIndex(id => id === 'new')
        sizeOptionIds[newIndex] = newSize.id
      }

      // Create specifications for each combination of packaging and size
      const specifications = []
      for (const packagingId of packagingIds) {
        for (const sizeOptionId of sizeOptionIds) {
          specifications.push({
            product_id: productId,
            packaging_id: packagingId,
            pallet_id: palletId,
            size_option_id: sizeOptionId,
            boxes_per_pallet: values.boxes_per_pallet,
            weight_per_box: values.weight_per_box || null,
            weight_per_pallet: values.weight_per_pallet || null,
            weight_unit: values.weight_unit,
            pieces_per_box: values.pieces_per_box || null,
          })
        }
      }

      const { error } = await supabase
        .from('product_packaging_specs')
        .insert(specifications)

      if (error) throw error

      toast({
        title: 'Success',
        description: `${specifications.length} product packaging specification${specifications.length > 1 ? 's' : ''} created successfully`,
      })

      // Refresh all related data
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['packaging-options'] })
      queryClient.invalidateQueries({ queryKey: ['pallets'] })
      queryClient.invalidateQueries({ queryKey: ['size-options'] })
      queryClient.invalidateQueries({ queryKey: ['product-specs'] })
      queryClient.invalidateQueries({ queryKey: ['product-specs-by-product'] })

      form.reset()
      setShowNewProduct(false)
      setShowNewPackaging(false)
      setShowNewPallet(false)
      setShowNewSize(false)
      setSelectedProductId('')

    } catch (error) {
      console.error('Error creating product packaging spec:', error)
      toast({
        title: 'Error',
        description: `Failed to create specification: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-terminal-dark p-6 space-y-6">
      <Card className="w-full max-w-6xl mx-auto bg-terminal-panel border-terminal-border">
        <CardHeader className="border-b border-terminal-border">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-terminal-text font-mono text-xl">
              <Package className="h-6 w-6 text-terminal-accent" />
              CREATE PRODUCT PACKAGING SPECIFICATION
            </CardTitle>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel font-mono"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to List
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* Product Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-terminal-border pb-2">
                  <Package className="h-5 w-5 text-terminal-accent" />
                  <h3 className="text-lg font-mono font-bold text-terminal-text">PRODUCT INFORMATION</h3>
                </div>

                <FormField
                  control={form.control}
                  name="product_id"
                  render={({ field }) => {
                    const selectedProduct = products?.find((product) => product.id === field.value)

                    const formatIntendedUse = (value?: string | null) => {
                      if (!value) return ''
                      return value
                        .toString()
                        .replace(/_/g, ' ')
                        .split(' ')
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ')
                    }

                    const triggerLabel = field.value === 'new'
                      ? 'Add New Product'
                      : selectedProduct
                        ? `${selectedProduct.name}${selectedProduct.intended_use ? ` (${formatIntendedUse(selectedProduct.intended_use)})` : ''}`
                        : 'Select product'

                    return (
                      <FormItem>
                        <FormLabel className="text-terminal-muted font-mono">PRODUCT *</FormLabel>
                        <Popover open={productPopoverOpen} onOpenChange={(open) => {
                          setProductPopoverOpen(open)
                          if (!open) setProductSearch('')
                        }}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={productPopoverOpen}
                                className="w-full justify-between bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-dark/80 font-mono"
                              >
                                {triggerLabel}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[480px] p-0 bg-terminal-panel border-terminal-border" align="start">
                            <Command className="bg-terminal-panel">
                              <CommandInput
                                placeholder="Search products..."
                                value={productSearch}
                                onValueChange={setProductSearch}
                                className="font-mono"
                              />
                              <CommandEmpty className="text-terminal-muted font-mono">
                                {productSearch.length === 0
                                  ? 'Type to search products...'
                                  : 'No products found.'}
                              </CommandEmpty>
                              <CommandGroup className="max-h-72 overflow-y-auto overflow-x-hidden">
                                {products?.map((product) => {
                                  const intendedUseLabel = formatIntendedUse(product.intended_use)
                                  return (
                                    <CommandItem
                                      key={product.id}
                                      value={`${product.name} ${intendedUseLabel} ${product.category}`}
                                      onSelect={() => {
                                        field.onChange(product.id)
                                        setShowNewProduct(false)
                                        setProductPopoverOpen(false)
                                        setProductSearch('')
                                      }}
                                      className="font-mono"
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${field.value === product.id ? 'opacity-100 text-terminal-success' : 'opacity-0'}`}
                                      />
                                      <div className="flex flex-col">
                                        <span className="font-medium text-terminal-text">{product.name}</span>
                                        {intendedUseLabel && (
                                          <span className="text-sm text-terminal-muted">{intendedUseLabel}</span>
                                        )}
                                      </div>
                                    </CommandItem>
                                  )
                                })}
                                <CommandItem
                                  value="add-new-product"
                                  onSelect={() => {
                                    field.onChange('new')
                                    setShowNewProduct(true)
                                    setProductPopoverOpen(false)
                                    setProductSearch('')
                                  }}
                                  className="font-mono border-t border-terminal-border"
                                >
                                  <Plus className="mr-2 h-4 w-4 text-terminal-accent" />
                                  Add New Product
                                </CommandItem>
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />

                {showNewProduct && (
                  <div className="grid grid-cols-2 gap-4 p-4 border border-terminal-border rounded-lg bg-terminal-dark/50">
                    <FormField
                      control={form.control}
                      name="new_product.name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-terminal-muted font-mono">PRODUCT NAME *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Cherry Tomatoes"
                              {...field}
                              className="bg-terminal-dark border-terminal-border text-terminal-text font-mono"
                            />
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
                          <FormLabel className="text-terminal-muted font-mono">CATEGORY *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text font-mono">
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
                          <FormLabel className="text-terminal-muted font-mono">INTENDED USE *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text font-mono">
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
                          <FormLabel className="text-terminal-muted font-mono">SOLD BY *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text font-mono">
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

                {/* Existing Specs Display */}
                {selectedProductId && existingSpecs && existingSpecs.length > 0 && (
                  <div className="border border-terminal-accent/30 rounded-lg p-4 bg-terminal-dark/30">
                    <h4 className="text-terminal-accent font-mono font-bold mb-3">
                      EXISTING SPECIFICATIONS FOR THIS PRODUCT ({existingSpecs.length})
                    </h4>
                    <div className="border border-terminal-border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-terminal-border bg-terminal-dark/50">
                            <TableHead className="text-terminal-muted font-mono">PACKAGING</TableHead>
                            <TableHead className="text-terminal-muted font-mono">SIZE</TableHead>
                            <TableHead className="text-terminal-muted font-mono">PALLET</TableHead>
                            <TableHead className="text-terminal-muted font-mono">BOXES/PALLET</TableHead>
                            <TableHead className="text-terminal-muted font-mono">WEIGHT/BOX</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {existingSpecs.map((spec: any) => (
                            <TableRow key={spec.id} className="border-terminal-border">
                              <TableCell className="text-terminal-text font-mono text-sm">
                                {spec.packaging_options?.label}
                              </TableCell>
                              <TableCell className="text-terminal-text font-mono text-sm">
                                <Badge variant="outline" className="font-mono border-terminal-accent text-terminal-accent">
                                  {spec.size_options?.name}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-terminal-text font-mono text-sm">
                                {spec.pallets?.label}
                              </TableCell>
                              <TableCell className="text-terminal-text font-mono text-sm">
                                {spec.boxes_per_pallet}
                              </TableCell>
                              <TableCell className="text-terminal-text font-mono text-sm">
                                {spec.weight_per_box ? `${spec.weight_per_box} ${spec.weight_unit}` : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>

              {/* Packaging Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-terminal-border pb-2">
                  <Box className="h-5 w-5 text-terminal-accent" />
                  <h3 className="text-lg font-mono font-bold text-terminal-text">PACKAGING INFORMATION</h3>
                </div>

                <FormField
                  control={form.control}
                  name="packaging_ids"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-terminal-muted font-mono">PACKAGING TYPES *</FormLabel>
                        <div className="text-sm text-terminal-muted font-mono mt-1">
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
                            className="bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel font-mono"
                          >
                            Select All
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => form.setValue('packaging_ids', [])}
                            className="bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel font-mono"
                          >
                            Clear All
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-3 max-h-60 overflow-y-auto border border-terminal-border rounded-lg p-3 bg-terminal-dark/30">
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
                                  <FormLabel className="text-sm font-mono text-terminal-text font-normal leading-5">
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
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 border-t border-terminal-border pt-3 mt-3">
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
                              <FormLabel className="text-sm font-mono text-terminal-accent font-normal leading-5 flex items-center gap-2">
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
                  <div className="grid grid-cols-2 gap-4 p-4 border border-terminal-border rounded-lg bg-terminal-dark/50">
                    <FormField
                      control={form.control}
                      name="new_packaging.label"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-terminal-muted font-mono">LABEL *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. 15kg Cardboard Box"
                              {...field}
                              className="bg-terminal-dark border-terminal-border text-terminal-text font-mono"
                            />
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
                          <FormLabel className="text-terminal-muted font-mono">UNIT TYPE *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-terminal-dark border-terminal-border text-terminal-text font-mono">
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
                            <FormLabel className="text-terminal-muted font-mono">DESCRIPTION</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Optional description"
                                {...field}
                                className="bg-terminal-dark border-terminal-border text-terminal-text font-mono"
                              />
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
                          <FormLabel className="text-terminal-muted font-mono">DEPOSIT FEE</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={field.value || ''}
                              onChange={(e) => {
                                const value = e.target.value
                                field.onChange(value === '' ? undefined : parseFloat(value))
                              }}
                              onFocus={(e) => e.target.select()}
                              className="bg-terminal-dark border-terminal-border text-terminal-text font-mono"
                            />
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
                          <FormLabel className="text-terminal-muted font-mono">RENT FEE</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={field.value || ''}
                              onChange={(e) => {
                                const value = e.target.value
                                field.onChange(value === '' ? undefined : parseFloat(value))
                              }}
                              onFocus={(e) => e.target.select()}
                              className="bg-terminal-dark border-terminal-border text-terminal-text font-mono"
                            />
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
                <div className="flex items-center gap-2 border-b border-terminal-border pb-2">
                  <Layers className="h-5 w-5 text-terminal-accent" />
                  <h3 className="text-lg font-mono font-bold text-terminal-text">PALLET INFORMATION</h3>
                </div>

                <FormField
                  control={form.control}
                  name="pallet_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-terminal-muted font-mono">PALLET TYPE *</FormLabel>
                      <div className="flex gap-2">
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value)
                            setShowNewPallet(value === 'new')
                          }}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="flex-1 bg-terminal-dark border-terminal-border text-terminal-text font-mono">
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
                  <div className="grid grid-cols-2 gap-4 p-4 border border-terminal-border rounded-lg bg-terminal-dark/50">
                    <FormField
                      control={form.control}
                      name="new_pallet.label"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-terminal-muted font-mono">PALLET LABEL *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. EUR Pallet"
                              {...field}
                              className="bg-terminal-dark border-terminal-border text-terminal-text font-mono"
                            />
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
                          <FormLabel className="text-terminal-muted font-mono">DIMENSIONS (cm)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. 120x80x15"
                              {...field}
                              className="bg-terminal-dark border-terminal-border text-terminal-text font-mono"
                            />
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
                          <FormLabel className="text-terminal-muted font-mono">BRUTTO WEIGHT</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="25.0"
                              value={field.value || ''}
                              onChange={(e) => {
                                const value = e.target.value
                                field.onChange(value === '' ? undefined : parseFloat(value))
                              }}
                              onFocus={(e) => e.target.select()}
                              className="bg-terminal-dark border-terminal-border text-terminal-text font-mono"
                            />
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
                          <FormLabel className="text-terminal-muted font-mono">PALLETS PER TRUCK</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="33"
                              value={field.value || ''}
                              onChange={(e) => {
                                const value = e.target.value
                                field.onChange(value === '' ? undefined : parseInt(value))
                              }}
                              onFocus={(e) => e.target.select()}
                              className="bg-terminal-dark border-terminal-border text-terminal-text font-mono"
                            />
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
                          <FormLabel className="text-terminal-muted font-mono">DEPOSIT FEE</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={field.value || ''}
                              onChange={(e) => {
                                const value = e.target.value
                                field.onChange(value === '' ? undefined : parseFloat(value))
                              }}
                              onFocus={(e) => e.target.select()}
                              className="bg-terminal-dark border-terminal-border text-terminal-text font-mono"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              {/* Size Section - Now with Multi-Select */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-terminal-border pb-2">
                  <Ruler className="h-5 w-5 text-terminal-accent" />
                  <h3 className="text-lg font-mono font-bold text-terminal-text">SIZE INFORMATION</h3>
                </div>

                <FormField
                  control={form.control}
                  name="size_option_ids"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-terminal-muted font-mono">SIZE OPTIONS *</FormLabel>
                        <div className="text-sm text-terminal-muted font-mono mt-1">
                          Select one or more size options to create multiple specifications at once
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const allIds = sizeOptions?.map((size: any) => size.id) || []
                              form.setValue('size_option_ids', allIds)
                            }}
                            className="bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel font-mono"
                          >
                            Select All
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => form.setValue('size_option_ids', [])}
                            className="bg-terminal-dark border-terminal-border text-terminal-text hover:bg-terminal-panel font-mono"
                          >
                            Clear All
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-3 max-h-60 overflow-y-auto border border-terminal-border rounded-lg p-3 bg-terminal-dark/30">
                        {sizeOptions?.map((size: any) => (
                          <FormField
                            key={size.id}
                            control={form.control}
                            name="size_option_ids"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={size.id}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(size.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value || [], size.id])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== size.id
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-mono text-terminal-text font-normal leading-5">
                                    {size.name}
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}

                        <FormField
                          control={form.control}
                          name="size_option_ids"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 border-t border-terminal-border pt-3 mt-3">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes('new')}
                                  onCheckedChange={(checked) => {
                                    const newValue = checked
                                      ? [...field.value || [], 'new']
                                      : field.value?.filter((value) => value !== 'new')
                                    field.onChange(newValue)
                                    setShowNewSize(checked === true)
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-mono text-terminal-accent font-normal leading-5 flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Add New Size
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {showNewSize && (
                  <div className="p-4 border border-terminal-border rounded-lg bg-terminal-dark/50">
                    <FormField
                      control={form.control}
                      name="new_size.name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-terminal-muted font-mono">SIZE NAME *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Large, XL, 500g"
                              {...field}
                              className="bg-terminal-dark border-terminal-border text-terminal-text font-mono"
                            />
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
                <div className="flex items-center gap-2 border-b border-terminal-border pb-2">
                  <h3 className="text-lg font-mono font-bold text-terminal-text">PACKAGING SPECIFICATIONS</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="boxes_per_pallet"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-terminal-muted font-mono">BOXES PER PALLET *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="48"
                            value={field.value || ''}
                            onChange={(e) => {
                              const value = e.target.value
                              field.onChange(value === '' ? undefined : parseInt(value))
                            }}
                            onFocus={(e) => e.target.select()}
                            className="bg-terminal-dark border-terminal-border text-terminal-text font-mono"
                          />
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
                        <FormLabel className="text-terminal-muted font-mono">PIECES PER BOX (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="24"
                            value={field.value || ''}
                            onChange={(e) => {
                              const value = e.target.value
                              field.onChange(value === '' ? undefined : parseInt(value))
                            }}
                            onFocus={(e) => e.target.select()}
                            className="bg-terminal-dark border-terminal-border text-terminal-text font-mono"
                          />
                        </FormControl>
                        <FormDescription className="text-terminal-muted font-mono text-xs">
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
                        <FormLabel className="text-terminal-muted font-mono">ESTIMATED WEIGHT PER BOX (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="15.5"
                            value={field.value || ''}
                            onChange={(e) => {
                              const value = e.target.value
                              field.onChange(value === '' ? undefined : parseFloat(value))
                            }}
                            onFocus={(e) => e.target.select()}
                            className="bg-terminal-dark border-terminal-border text-terminal-text font-mono"
                          />
                        </FormControl>
                        <FormDescription className="text-terminal-muted font-mono text-xs">
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
                        <FormLabel className="text-terminal-muted font-mono">ESTIMATED WEIGHT PER PALLET</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="Auto-calculated"
                            value={field.value || ''}
                            onChange={(e) => {
                              const value = e.target.value
                              field.onChange(value === '' ? undefined : parseFloat(value))
                            }}
                            onFocus={(e) => e.target.select()}
                            disabled={!!(form.watch('boxes_per_pallet') && form.watch('weight_per_box'))}
                            className="bg-terminal-dark border-terminal-border text-terminal-text font-mono"
                          />
                        </FormControl>
                        <FormDescription className="text-terminal-muted font-mono text-xs">
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
                      <FormLabel className="text-terminal-muted font-mono">WEIGHT UNIT *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-48 bg-terminal-dark border-terminal-border text-terminal-text font-mono">
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

              <div className="flex justify-end gap-2 pt-4 border-t border-terminal-border">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-terminal-accent hover:bg-terminal-accent/90 text-terminal-dark font-mono font-bold"
                >
                  {isLoading ? 'CREATING...' : 'CREATE SPECIFICATION'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
