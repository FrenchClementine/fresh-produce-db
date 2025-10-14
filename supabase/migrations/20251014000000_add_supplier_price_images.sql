-- Migration: Add image support for supplier prices
-- Created: 2025-10-14
-- Description: Adds image_url column to supplier_prices table and sets up storage policies

-- ============================================================================
-- 1. Add image_url column to supplier_prices table
-- ============================================================================

ALTER TABLE supplier_prices
ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN supplier_prices.image_url IS
  'URL or storage path to product image in Supabase Storage bucket: supplier-price-images';

-- Add index for faster queries filtering by images
CREATE INDEX IF NOT EXISTS idx_supplier_prices_has_image
ON supplier_prices (image_url)
WHERE image_url IS NOT NULL;

-- ============================================================================
-- 2. Update current_supplier_prices view to include image_url
-- ============================================================================

-- Note: If the view exists, we need to recreate it to include the new column
-- First, check if the view exists and drop it if needed

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public'
    AND table_name = 'current_supplier_prices'
  ) THEN
    -- Store the view definition for reference
    -- The view will be recreated with the image_url column included
    -- This assumes the view selects * from supplier_prices or needs explicit columns

    DROP VIEW IF EXISTS current_supplier_prices CASCADE;

    -- Recreate the view with image_url included
    -- Note: Adjust this based on your actual view definition
    CREATE OR REPLACE VIEW current_supplier_prices AS
    SELECT
      sp.id,
      sp.supplier_id,
      sp.supplier_product_packaging_spec_id,
      sp.hub_id,
      sp.price_per_unit,
      sp.currency,
      sp.delivery_mode,
      sp.valid_from,
      sp.valid_until,
      sp.is_active,
      sp.created_by_staff_id,
      sp.notes,
      sp.created_at,
      sp.image_url,  -- NEW COLUMN
      s.name as supplier_name,
      h.name as hub_name,
      h.hub_code,
      h.city_name as hub_city,
      h.country_code as hub_country,
      pps.id as product_packaging_spec_id,
      p.id as product_id,
      p.name as product_name,
      p.sold_by,
      po.label as packaging_label,
      so.name as size_name,
      pps.boxes_per_pallet,
      pps.weight_per_box,
      pps.weight_per_pallet,
      pps.weight_unit,
      CASE
        WHEN LOWER(p.sold_by) LIKE '%kg%' THEN pps.weight_per_pallet
        ELSE pps.boxes_per_pallet
      END as units_per_pallet
    FROM supplier_prices sp
    JOIN suppliers s ON s.id = sp.supplier_id
    JOIN hubs h ON h.id = sp.hub_id
    JOIN supplier_product_packaging_spec spps ON spps.id = sp.supplier_product_packaging_spec_id
    JOIN product_packaging_specs pps ON pps.id = spps.product_packaging_spec_id
    JOIN products p ON p.id = pps.product_id
    JOIN packaging_options po ON po.id = pps.packaging_id
    JOIN size_options so ON so.id = pps.size_id
    WHERE sp.is_active = true
    AND sp.valid_until >= CURRENT_DATE;

    -- Add comment to view
    COMMENT ON VIEW current_supplier_prices IS
      'Current active supplier prices with product details and image URLs';

  END IF;
END $$;

-- ============================================================================
-- 3. Storage Bucket Setup Instructions
-- ============================================================================

-- NOTE: Storage buckets cannot be created via SQL migrations.
-- You must create the bucket using one of these methods:
--
-- METHOD 1: Supabase Dashboard
-- 1. Go to Storage in Supabase Dashboard
-- 2. Click "New Bucket"
-- 3. Name: supplier-price-images
-- 4. Public bucket: Yes
-- 5. File size limit: 5MB
-- 6. Allowed MIME types: image/jpeg, image/png, image/webp
--
-- METHOD 2: Supabase CLI
-- Run: npx supabase storage create supplier-price-images --public
--
-- After creating the bucket, the policies below will be applied automatically.

-- ============================================================================
-- 4. Storage Policies for supplier-price-images bucket
-- ============================================================================

-- Allow authenticated users to upload images
CREATE POLICY IF NOT EXISTS "Allow authenticated users to upload supplier price images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'supplier-price-images'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM suppliers
  )
);

-- Allow public access to view images (since bucket is public)
CREATE POLICY IF NOT EXISTS "Allow public read access to supplier price images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'supplier-price-images'
);

-- Allow authenticated users to update their images
CREATE POLICY IF NOT EXISTS "Allow authenticated users to update supplier price images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'supplier-price-images'
)
WITH CHECK (
  bucket_id = 'supplier-price-images'
);

-- Allow authenticated users to delete images
CREATE POLICY IF NOT EXISTS "Allow authenticated users to delete supplier price images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'supplier-price-images'
);

-- ============================================================================
-- 5. Helper Functions
-- ============================================================================

-- Function to clean up orphaned images (images without associated prices)
CREATE OR REPLACE FUNCTION cleanup_orphaned_supplier_price_images()
RETURNS TABLE (deleted_count INTEGER) AS $$
DECLARE
  image_path TEXT;
  count INTEGER := 0;
BEGIN
  -- Find images in storage that don't have corresponding supplier_prices records
  FOR image_path IN
    SELECT name
    FROM storage.objects
    WHERE bucket_id = 'supplier-price-images'
    AND name NOT IN (
      SELECT image_url
      FROM supplier_prices
      WHERE image_url IS NOT NULL
    )
  LOOP
    -- Delete the orphaned image
    DELETE FROM storage.objects
    WHERE bucket_id = 'supplier-price-images'
    AND name = image_path;

    count := count + 1;
  END LOOP;

  RETURN QUERY SELECT count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_orphaned_supplier_price_images() IS
  'Removes images from storage that are no longer referenced by any supplier_prices records';

-- Function to automatically delete image when price is deleted
CREATE OR REPLACE FUNCTION delete_supplier_price_image_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- If the price had an image, delete it from storage
  IF OLD.image_url IS NOT NULL THEN
    DELETE FROM storage.objects
    WHERE bucket_id = 'supplier-price-images'
    AND name = OLD.image_url;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-delete images when price is hard-deleted
DROP TRIGGER IF EXISTS trigger_delete_supplier_price_image ON supplier_prices;
CREATE TRIGGER trigger_delete_supplier_price_image
BEFORE DELETE ON supplier_prices
FOR EACH ROW
EXECUTE FUNCTION delete_supplier_price_image_on_delete();

COMMENT ON TRIGGER trigger_delete_supplier_price_image ON supplier_prices IS
  'Automatically deletes associated image from storage when a price record is deleted';

-- Function to delete old image when updating with new image
CREATE OR REPLACE FUNCTION cleanup_old_supplier_price_image()
RETURNS TRIGGER AS $$
BEGIN
  -- If updating image_url and old value exists and is different
  IF OLD.image_url IS NOT NULL
     AND OLD.image_url IS DISTINCT FROM NEW.image_url THEN
    -- Delete the old image from storage
    DELETE FROM storage.objects
    WHERE bucket_id = 'supplier-price-images'
    AND name = OLD.image_url;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to cleanup old image when updating
DROP TRIGGER IF EXISTS trigger_cleanup_old_supplier_price_image ON supplier_prices;
CREATE TRIGGER trigger_cleanup_old_supplier_price_image
BEFORE UPDATE ON supplier_prices
FOR EACH ROW
WHEN (OLD.image_url IS DISTINCT FROM NEW.image_url)
EXECUTE FUNCTION cleanup_old_supplier_price_image();

COMMENT ON TRIGGER trigger_cleanup_old_supplier_price_image ON supplier_prices IS
  'Automatically deletes old image from storage when a price record is updated with a new image';

-- ============================================================================
-- 6. Grant permissions
-- ============================================================================

-- Ensure authenticated users can call the cleanup function
GRANT EXECUTE ON FUNCTION cleanup_orphaned_supplier_price_images() TO authenticated;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback this migration, run:
--
-- DROP TRIGGER IF EXISTS trigger_delete_supplier_price_image ON supplier_prices;
-- DROP TRIGGER IF EXISTS trigger_cleanup_old_supplier_price_image ON supplier_prices;
-- DROP FUNCTION IF EXISTS delete_supplier_price_image_on_delete();
-- DROP FUNCTION IF EXISTS cleanup_old_supplier_price_image();
-- DROP FUNCTION IF EXISTS cleanup_orphaned_supplier_price_images();
-- DROP INDEX IF EXISTS idx_supplier_prices_has_image;
-- ALTER TABLE supplier_prices DROP COLUMN IF EXISTS image_url;
--
-- Then manually delete the storage bucket via Dashboard or CLI
