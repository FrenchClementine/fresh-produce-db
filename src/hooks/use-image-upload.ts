'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { generateImageFilename, extractStoragePath } from '@/lib/image-utils'

const BUCKET_NAME = 'supplier-price-images'

/**
 * Hook to upload a supplier price image to Supabase Storage
 */
export function useUploadSupplierPriceImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      file,
      supplierId,
      priceId
    }: {
      file: File
      supplierId: string
      priceId?: string
    }) => {
      // Generate unique filename
      const filename = generateImageFilename(supplierId, file.name, priceId)

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: false // Don't overwrite existing files
        })

      if (error) {
        console.error('Upload error:', error)
        throw new Error(`Failed to upload image: ${error.message}`)
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filename)

      return {
        path: filename,
        url: publicUrl
      }
    },
    onSuccess: () => {
      // Image uploaded, but we don't update the database here
      // That will be done by the calling component when saving the price
    },
    onError: (error: any) => {
      toast.error(`Failed to upload image: ${error.message}`)
    }
  })
}

/**
 * Hook to update a supplier price with image URLs (supports multiple images)
 */
export function useUpdateSupplierPriceImages() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      priceId,
      imageUrls
    }: {
      priceId: string
      imageUrls: string[] | null
    }) => {
      const { data, error } = await supabase
        .from('supplier_prices')
        .update({ image_urls: imageUrls })
        .eq('id', priceId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-supplier-prices'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-hub-prices'] })
      toast.success('Images updated successfully')
    },
    onError: (error: any) => {
      toast.error(`Failed to update images: ${error.message}`)
    }
  })
}

/**
 * Hook to add a single image to existing images array
 */
export function useAddSupplierPriceImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      priceId,
      imageUrl,
      existingImageUrls
    }: {
      priceId: string
      imageUrl: string
      existingImageUrls?: string[] | null
    }) => {
      const currentImages = existingImageUrls || []
      const newImages = [...currentImages, imageUrl]

      const { data, error } = await supabase
        .from('supplier_prices')
        .update({ image_urls: newImages })
        .eq('id', priceId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-supplier-prices'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-hub-prices'] })
      toast.success('Image added successfully')
    },
    onError: (error: any) => {
      toast.error(`Failed to add image: ${error.message}`)
    }
  })
}

/**
 * Hook to delete a single image from supplier price images
 */
export function useDeleteSupplierPriceImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      imageUrl,
      priceId,
      existingImageUrls
    }: {
      imageUrl: string
      priceId?: string
      existingImageUrls?: string[] | null
    }) => {
      // Extract storage path from URL
      const path = extractStoragePath(imageUrl)

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([path])

      if (storageError) {
        console.error('Storage delete error:', storageError)
        throw new Error(`Failed to delete image from storage: ${storageError.message}`)
      }

      // If priceId provided, update database to remove image from array
      if (priceId && existingImageUrls) {
        const updatedImages = existingImageUrls.filter(url => url !== imageUrl)

        const { error: dbError } = await supabase
          .from('supplier_prices')
          .update({ image_urls: updatedImages.length > 0 ? updatedImages : null })
          .eq('id', priceId)

        if (dbError) {
          console.error('Database update error:', dbError)
          throw new Error(`Failed to update database: ${dbError.message}`)
        }
      }

      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-supplier-prices'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-hub-prices'] })
      toast.success('Image deleted successfully')
    },
    onError: (error: any) => {
      toast.error(`Failed to delete image: ${error.message}`)
    }
  })
}

/**
 * Hook to delete all images for a supplier price
 */
export function useDeleteAllSupplierPriceImages() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      priceId,
      imageUrls
    }: {
      priceId: string
      imageUrls: string[]
    }) => {
      // Extract storage paths from URLs
      const paths = imageUrls.map(url => extractStoragePath(url))

      // Delete all from storage
      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(paths)

      if (storageError) {
        console.error('Storage delete error:', storageError)
        throw new Error(`Failed to delete images from storage: ${storageError.message}`)
      }

      // Update database to clear image array
      const { error: dbError } = await supabase
        .from('supplier_prices')
        .update({ image_urls: null })
        .eq('id', priceId)

      if (dbError) {
        console.error('Database update error:', dbError)
        throw new Error(`Failed to update database: ${dbError.message}`)
      }

      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-supplier-prices'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-hub-prices'] })
      toast.success('All images deleted successfully')
    },
    onError: (error: any) => {
      toast.error(`Failed to delete images: ${error.message}`)
    }
  })
}

/**
 * Hook to get the public URL for an image
 */
export function getSupplierPriceImageUrl(path: string): string {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path)

  return data.publicUrl
}
