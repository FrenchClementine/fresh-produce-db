# Supplier Price Image Upload Implementation Plan

## Overview
Add the ability to upload product pictures for supplier prices, storing images in Supabase Storage and referencing them in the `supplier_prices` table.

## Architecture

### 1. Database Schema Changes

**Add new column to `supplier_prices` table:**
```sql
ALTER TABLE supplier_prices
ADD COLUMN image_url TEXT;
```

This will store the public URL or storage path to the uploaded image.

### 2. Supabase Storage Setup

**Create a new storage bucket:**
- Bucket name: `supplier-price-images`
- Public access: Yes (for easy image display)
- Allowed file types: `image/jpeg`, `image/png`, `image/webp`
- Max file size: 5MB
- File naming convention: `{supplier_id}/{price_id}_{timestamp}.{ext}`

**Storage policies:**
```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'supplier-price-images');

-- Allow public read access
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'supplier-price-images');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'supplier-price-images');
```

### 3. Frontend Implementation

#### A. Image Upload Component
Create `/src/components/ui/image-upload.tsx`:
- Drag & drop zone
- File type validation (images only)
- File size validation (max 5MB)
- Image preview before upload
- Loading state during upload
- Error handling

#### B. Update Manage Prices Mode
Modify `/src/app/trade/prices/components/manage-prices-mode.tsx`:

**Add image column to table:**
- Display thumbnail (50x50px) in a new "IMAGE" column
- Click to view full size in a modal/lightbox
- Show placeholder icon when no image exists
- Upload button in the actions column

**Add image upload to edit mode:**
- When editing a price, show current image if exists
- Allow uploading new image (replaces old one)
- Allow deleting image

#### C. Update Bulk Entry Mode
Modify `/src/app/trade/prices/components/bulk-entry-mode.tsx`:
- Add optional image upload field for each price entry
- Show preview of uploaded image
- Store image temporarily until price is saved

### 4. API/Hook Changes

#### Update TypeScript Interfaces
`/src/hooks/use-supplier-prices.ts`:
```typescript
export interface SupplierPrice {
  // ... existing fields
  image_url?: string | null  // ADD THIS
}

export interface CurrentSupplierPrice extends SupplierPrice {
  // ... existing fields (will inherit image_url)
}
```

#### Add Image Upload Hook
Create `/src/hooks/use-image-upload.ts`:
```typescript
export function useUploadSupplierPriceImage() {
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
      // 1. Validate file type and size
      // 2. Generate unique filename
      // 3. Upload to Supabase Storage
      // 4. Get public URL
      // 5. Return URL
    }
  })
}

export function useDeleteSupplierPriceImage() {
  return useMutation({
    mutationFn: async (imageUrl: string) => {
      // 1. Extract file path from URL
      // 2. Delete from Supabase Storage
    }
  })
}
```

#### Update Create/Update Price Mutations
Modify existing mutations in `/src/hooks/use-supplier-prices.ts`:
```typescript
// useCreateSupplierPrice - add image_url to insert
// useQuickUpdatePrice - preserve or update image_url
```

### 5. UI/UX Flow

#### Viewing Images
1. **In Price Table:**
   - Small thumbnail (50x50px) in IMAGE column
   - Placeholder icon when no image
   - Click thumbnail → open lightbox with full-size image

2. **In Trade Potential/Opportunities:**
   - Show small thumbnail next to product info
   - Tooltip on hover showing larger preview
   - Click to open full size

#### Uploading Images
1. **When Adding New Price:**
   - Optional "Upload Product Image" section
   - Drag & drop zone or file picker
   - Preview uploaded image before saving
   - Image uploads when price is saved

2. **When Editing Existing Price:**
   - Show current image if exists
   - "Replace Image" button → upload new one
   - "Delete Image" button → removes image
   - Changes save immediately or with price update

3. **Bulk Entry Mode:**
   - Each row has optional image upload
   - Upload stores temporary reference
   - All images upload when batch is saved

### 6. Image Processing

**Client-side optimization:**
- Resize large images to max 1920x1920px before upload
- Compress to ~80% quality for JPEG
- Convert HEIC to JPEG if needed
- Generate thumbnail (200x200px) for table display

**Implementation using `browser-image-compression`:**
```typescript
import imageCompression from 'browser-image-compression'

async function compressImage(file: File) {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true
  }
  return await imageCompression(file, options)
}
```

### 7. Database Migration

Create migration: `/supabase/migrations/YYYYMMDD_add_supplier_price_images.sql`
```sql
-- Add image_url column
ALTER TABLE supplier_prices
ADD COLUMN image_url TEXT;

-- Create storage bucket (via Supabase dashboard or CLI)
-- This is typically done via supabase CLI or dashboard

-- Add comment
COMMENT ON COLUMN supplier_prices.image_url IS 'URL/path to product image in Supabase Storage';
```

### 8. File Structure

```
/src
  /components
    /ui
      /image-upload.tsx          (NEW - reusable upload component)
      /image-lightbox.tsx        (NEW - fullscreen image viewer)
  /hooks
    /use-image-upload.ts         (NEW - image upload hooks)
    /use-supplier-prices.ts      (MODIFY - add image_url field)
  /app
    /trade
      /prices
        /components
          /manage-prices-mode.tsx    (MODIFY - add image column & upload)
          /bulk-entry-mode.tsx       (MODIFY - add image upload per row)
          /price-image-cell.tsx      (NEW - table cell component)
  /lib
    /image-utils.ts              (NEW - compression, validation helpers)
/supabase
  /migrations
    /YYYYMMDD_add_supplier_price_images.sql  (NEW)
```

### 9. Implementation Steps (Order)

1. **Database & Storage Setup**
   - Create migration to add `image_url` column
   - Create `supplier-price-images` bucket in Supabase
   - Set up storage policies

2. **Create Reusable Components**
   - Build `ImageUpload` component
   - Build `ImageLightbox` component
   - Build `PriceImageCell` component

3. **Create Upload Hook**
   - Implement `use-image-upload.ts`
   - Add compression utilities
   - Handle success/error states

4. **Update TypeScript Types**
   - Add `image_url` to `SupplierPrice` interface
   - Update all related types

5. **Modify Manage Prices Mode**
   - Add IMAGE column to table
   - Add upload button to actions
   - Add image preview/edit in edit mode

6. **Modify Bulk Entry Mode**
   - Add image upload field to each row
   - Handle batch uploads

7. **Update Create/Update Mutations**
   - Include `image_url` in create
   - Handle image updates in quick update

8. **Testing**
   - Test upload/delete/replace flows
   - Test file validation
   - Test compression
   - Test viewing in table and lightbox

### 10. Optional Enhancements

- **Auto-delete old images:** When price is updated/deleted, delete old image from storage
- **Multiple images:** Allow multiple images per price (carousel)
- **Image metadata:** Store upload date, uploaded by, original filename
- **AI descriptions:** Use AI to generate product descriptions from images
- **Watermarking:** Add company watermark to uploaded images

### 11. Security Considerations

- Validate file types on both client and server
- Limit file sizes to prevent abuse
- Sanitize filenames
- Use authenticated uploads only
- Set up rate limiting on uploads
- Regular cleanup of orphaned images

### 12. Performance Considerations

- Lazy load images in table (only load visible rows)
- Use progressive image loading
- Cache images in browser
- Implement CDN if needed
- Consider thumbnail generation on server side

## Benefits

✅ Visual confirmation of products
✅ Easier product identification
✅ Better communication with customers
✅ Professional appearance
✅ Historical photo record of products
✅ Quality control documentation

## Estimated Effort

- Database setup: 30 minutes
- Upload component: 2-3 hours
- Integration with prices: 3-4 hours
- Testing & polish: 2 hours
- **Total: ~8-10 hours**
