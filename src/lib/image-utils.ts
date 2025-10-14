import imageCompression from 'browser-image-compression'

// Allowed image MIME types
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
]

// Maximum file size in bytes (5MB)
export const MAX_FILE_SIZE = 5 * 1024 * 1024

/**
 * Validates if a file is an allowed image type
 */
export function isValidImageType(file: File): boolean {
  return ALLOWED_IMAGE_TYPES.includes(file.type)
}

/**
 * Validates if a file is within the size limit
 */
export function isValidImageSize(file: File): boolean {
  return file.size <= MAX_FILE_SIZE
}

/**
 * Validates both type and size of an image file
 * @returns Object with valid flag and error message if invalid
 */
export function validateImage(file: File): { valid: boolean; error?: string } {
  if (!isValidImageType(file)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.'
    }
  }

  if (!isValidImageSize(file)) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit.`
    }
  }

  return { valid: true }
}

/**
 * Compresses an image file for optimal storage and display
 * @param file - The original image file
 * @returns Compressed image file
 */
export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1, // Target max size of 1MB
    maxWidthOrHeight: 1920, // Max dimension
    useWebWorker: true, // Use web worker for better performance
    fileType: file.type as any // Preserve original file type
  }

  try {
    const compressedFile = await imageCompression(file, options)
    return compressedFile
  } catch (error) {
    console.error('Error compressing image:', error)
    // If compression fails, return original file
    return file
  }
}

/**
 * Creates a thumbnail from an image file
 * @param file - The original image file
 * @returns Thumbnail as a data URL
 */
export async function createThumbnail(
  file: File,
  maxSize: number = 200
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height
            height = maxSize
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL(file.type))
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Generates a unique filename for an image
 * @param supplierId - The supplier ID
 * @param priceId - The price ID (optional, for existing prices)
 * @param originalFilename - The original filename
 * @returns Formatted filename
 */
export function generateImageFilename(
  supplierId: string,
  originalFilename: string,
  priceId?: string
): string {
  const timestamp = Date.now()
  const extension = originalFilename.split('.').pop()?.toLowerCase() || 'jpg'
  const prefix = priceId || 'temp'

  // Format: supplierId/priceId_timestamp.ext
  return `${supplierId}/${prefix}_${timestamp}.${extension}`
}

/**
 * Extracts the storage path from a Supabase public URL
 * @param url - The full public URL
 * @returns The storage path (e.g., "supplierId/filename.jpg")
 */
export function extractStoragePath(url: string): string {
  // Extract path after "supplier-price-images/"
  const match = url.match(/supplier-price-images\/(.+)$/)
  return match ? match[1] : url
}

/**
 * Formats file size for display
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
