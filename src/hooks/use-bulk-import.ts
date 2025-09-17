import { supabase } from '@/lib/supabase'

interface ImportRow {
  product_name: string
  intended_use: string
  category: string
  packaging_label: string
  packaging_unit_type: string
  size_name: string
  boxes_per_pallet: number
  weight_per_box: number
  weight_per_pallet: number
  pieces_per_box: number
  pallet_dimensions: string
}

interface ImportResult {
  success: number
  errors: { row: number; message: string }[]
}

export function useBulkImport() {
  const importBulkData = async (
    data: ImportRow[],
    onProgress?: (progress: number) => void
  ): Promise<ImportResult> => {
    const result: ImportResult = {
      success: 0,
      errors: []
    }

    const totalRows = data.length
    let processedRows = 0

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const rowNumber = i + 1

      try {
        // Update progress
        onProgress?.(Math.round((processedRows / totalRows) * 100))

        // Start transaction-like operation
        let productId: string | null = null
        let packagingId: string | null = null
        let sizeId: string | null = null
        let palletId: string | null = null

        // 1. Create or get product
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .eq('name', row.product_name)
          .single()

        if (existingProduct) {
          productId = existingProduct.id
        } else {
          const { data: newProduct, error: productError } = await supabase
            .from('products')
            .insert({
              name: row.product_name,
              intended_use: row.intended_use || null,
              category: row.category,
              is_active: true
            })
            .select('id')
            .single()

          if (productError) throw productError
          productId = newProduct.id
        }

        // 2. Create or get packaging option
        const { data: existingPackaging } = await supabase
          .from('packaging_options')
          .select('id')
          .eq('label', row.packaging_label)
          .single()

        if (existingPackaging) {
          packagingId = existingPackaging.id
        } else {
          const { data: newPackaging, error: packagingError } = await supabase
            .from('packaging_options')
            .insert({
              label: row.packaging_label,
              unit_type: row.packaging_unit_type || 'kg'
            })
            .select('id')
            .single()

          if (packagingError) throw packagingError
          packagingId = newPackaging.id
        }

        // 3. Create or get size option
        const { data: existingSize } = await supabase
          .from('size_options')
          .select('id')
          .eq('name', row.size_name)
          .single()

        if (existingSize) {
          sizeId = existingSize.id
        } else {
          const { data: newSize, error: sizeError } = await supabase
            .from('size_options')
            .insert({
              name: row.size_name
            })
            .select('id')
            .single()

          if (sizeError) throw sizeError
          sizeId = newSize.id
        }

        // 4. Create or get pallet
        const { data: existingPallet } = await supabase
          .from('pallets')
          .select('id')
          .eq('dimensions_cm', row.pallet_dimensions)
          .single()

        if (existingPallet) {
          palletId = existingPallet.id
        } else {
          const { data: newPallet, error: palletError } = await supabase
            .from('pallets')
            .insert({
              label: `${row.pallet_dimensions}cm`,
              dimensions_cm: row.pallet_dimensions
            })
            .select('id')
            .single()

          if (palletError) throw palletError
          palletId = newPallet.id
        }

        // 5. Create product packaging spec
        const { data: existingSpec } = await supabase
          .from('product_packaging_specs')
          .select('id')
          .eq('product_id', productId)
          .eq('packaging_id', packagingId)
          .eq('size_option_id', sizeId)
          .eq('pallet_id', palletId)
          .single()

        if (!existingSpec) {
          const { error: specError } = await supabase
            .from('product_packaging_specs')
            .insert({
              product_id: productId,
              packaging_id: packagingId,
              pallet_id: palletId,
              size_option_id: sizeId,
              boxes_per_pallet: row.boxes_per_pallet,
              weight_per_box: row.weight_per_box,
              weight_per_pallet: row.weight_per_pallet,
              weight_unit: 'kg',
              pieces_per_box: row.pieces_per_box > 0 ? row.pieces_per_box : null
            })

          if (specError) throw specError
        }

        result.success++
        processedRows++

      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error)
        result.errors.push({
          row: rowNumber,
          message: (error as Error).message || 'Unknown error'
        })
        processedRows++
      }

      // Update progress
      onProgress?.(Math.round((processedRows / totalRows) * 100))

      // Add small delay to prevent overwhelming the database
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return result
  }

  return { importBulkData }
}