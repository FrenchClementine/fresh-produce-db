'use client'

import { useState, useRef, DragEvent } from 'react'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { validateImage, compressImage, createThumbnail, formatFileSize } from '@/lib/image-utils'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  onImageSelected: (file: File, preview: string) => void
  onImageRemoved?: (preview: string) => void
  currentImageUrls?: string[] | null
  disabled?: boolean
  className?: string
  maxSizeMB?: number
  maxImages?: number
}

export function ImageUpload({
  onImageSelected,
  onImageRemoved,
  currentImageUrls,
  disabled = false,
  className,
  maxSizeMB = 5,
  maxImages = 5
}: ImageUploadProps) {
  const [previews, setPreviews] = useState<string[]>(currentImageUrls || [])
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processImage = async (file: File) => {
    // Check if we've reached the max images limit
    if (previews.length >= maxImages) {
      setError(`Maximum ${maxImages} images allowed`)
      return
    }

    // Validate image
    const validation = validateImage(file)
    if (!validation.valid) {
      setError(validation.error || 'Invalid image')
      return
    }

    setError(null)
    setIsProcessing(true)

    try {
      // Compress image
      const compressedFile = await compressImage(file)

      // Create preview thumbnail
      const thumbnailUrl = await createThumbnail(compressedFile, 200)

      // Add to previews
      setPreviews(prev => [...prev, thumbnailUrl])

      // Notify parent
      onImageSelected(compressedFile, thumbnailUrl)
    } catch (err) {
      console.error('Error processing image:', err)
      setError('Failed to process image')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processImage(file)
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      processImage(file)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleRemove = (previewUrl: string) => {
    setPreviews(prev => prev.filter(p => p !== previewUrl))
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onImageRemoved?.(previewUrl)
  }

  const handleClick = () => {
    if (!disabled && !isProcessing) {
      fileInputRef.current?.click()
    }
  }

  const canAddMore = previews.length < maxImages

  return (
    <div className={cn('space-y-2', className)}>
      {/* Upload Area - Show if no previews or can add more */}
      {canAddMore && (
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            'relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer',
            'flex flex-col items-center justify-center',
            isDragging
              ? 'border-terminal-accent bg-terminal-accent/10'
              : 'border-terminal-border hover:border-terminal-accent/50 bg-terminal-dark',
            disabled && 'opacity-50 cursor-not-allowed',
            isProcessing && 'pointer-events-none'
          )}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-10 w-10 text-terminal-accent animate-spin mb-2" />
              <p className="text-sm text-terminal-text font-mono">Processing image...</p>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-terminal-muted mb-2" />
              <p className="text-sm text-terminal-text font-mono mb-1">
                <span className="text-terminal-accent">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-terminal-muted font-mono">
                PNG, JPG, or WebP (max {maxSizeMB}MB) • {previews.length}/{maxImages} images
              </p>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            disabled={disabled || isProcessing}
            className="hidden"
          />
        </div>
      )}

      {/* Preview Images Grid */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {previews.map((previewUrl, index) => (
            <div
              key={index}
              className="relative border-2 border-terminal-border rounded-lg p-2 bg-terminal-dark"
            >
              <div className="flex items-center gap-2">
                {/* Preview Image */}
                <div className="relative w-16 h-16 rounded-md overflow-hidden bg-terminal-panel border border-terminal-border flex-shrink-0">
                  <img
                    src={previewUrl}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-terminal-text font-medium">
                    Image {index + 1}
                  </p>
                  <p className="text-xs font-mono text-terminal-muted">
                    Ready
                  </p>
                </div>

                {/* Remove Button */}
                {!disabled && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemove(previewUrl)}
                    className="flex-shrink-0 h-6 w-6 p-0 hover:bg-red-600/20 hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-600/20 border border-red-600/50 p-3">
          <p className="text-xs font-mono text-red-400">{error}</p>
        </div>
      )}
    </div>
  )
}

export default ImageUpload
