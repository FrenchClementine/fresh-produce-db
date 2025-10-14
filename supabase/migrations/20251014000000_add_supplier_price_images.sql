-- Migration: Add image support for supplier prices
-- Created: 2025-10-14
-- Description: Adds image_url column to supplier_prices table and sets up storage policies

-- ============================================================================
-- 1. Add image_urls column to supplier_prices table (supports multiple images)
-- ============================================================================

ALTER TABLE supplier_prices
ADD COLUMN IF NOT EXISTS image_urls TEXT[];

COMMENT ON COLUMN supplier_prices.image_urls IS
  'Array of URLs/paths to product images in Supabase Storage bucket: supplier-price-images';

-- Add index for faster queries filtering by images
CREATE INDEX IF NOT EXISTS idx_supplier_prices_has_images
ON supplier_prices USING GIN (image_urls)
WHERE image_urls IS NOT NULL AND array_length(image_urls, 1) > 0;

-- ============================================================================
-- 2. Update current_supplier_prices view to include image_urls
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
    -- The view will be recreated with the image_urls column included
    -- This assumes the view selects * from supplier_prices or needs explicit columns

    DROP VIEW IF EXISTS current_supplier_prices CASCADE;

    -- Recreate the view with image_urls included
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
      sp.image_urls,  -- NEW COLUMN (array)
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
        WHEN LOWER(p.sold_by::text) LIKE '%kg%' THEN pps.weight_per_pallet
        ELSE pps.boxes_per_pallet
      END as units_per_pallet
    FROM supplier_prices sp
    JOIN suppliers s ON s.id = sp.supplier_id
    JOIN hubs h ON h.id = sp.hub_id
    JOIN supplier_product_packaging_spec spps ON spps.id = sp.supplier_product_packaging_spec_id
    JOIN product_packaging_specs pps ON pps.id = spps.product_packaging_spec_id
    JOIN products p ON p.id = pps.product_id
    JOIN packaging_options po ON po.id = pps.packaging_id
    JOIN size_options so ON so.id = pps.size_option_id
    WHERE sp.is_active = true
    AND sp.valid_until >= CURRENT_DATE;

    -- Add comment to view
    COMMENT ON VIEW current_supplier_prices IS
      'Current active supplier prices with product details and image URLs (multiple images supported)';

    -- Grant permissions on the view
    GRANT SELECT ON current_supplier_prices TO authenticated;
    GRANT SELECT ON current_supplier_prices TO anon;
    GRANT SELECT ON current_supplier_prices TO service_role;

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
-- NOTE: All RLS policies removed - bucket should be configured as PUBLIC with no policies

-- ============================================================================
-- 4. Helper Functions
-- ============================================================================

-- Function to clean up orphaned images (images without associated prices)
CREATE OR REPLACE FUNCTION cleanup_orphaned_supplier_price_images()
RETURNS TABLE (deleted_count INTEGER) AS $$
DECLARE
  image_path TEXT;
  count INTEGER := 0;
  all_image_urls TEXT[];
BEGIN
  -- Collect all image URLs from all supplier_prices records
  SELECT array_agg(DISTINCT url)
  INTO all_image_urls
  FROM supplier_prices, unnest(image_urls) AS url
  WHERE image_urls IS NOT NULL;

  -- Find images in storage that don't have corresponding supplier_prices records
  FOR image_path IN
    SELECT name
    FROM storage.objects
    WHERE bucket_id = 'supplier-price-images'
    AND (all_image_urls IS NULL OR name != ALL(all_image_urls))
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
  'Removes images from storage that are no longer referenced by any supplier_prices records (supports multiple images)';

-- Function to automatically delete images when price is deleted
CREATE OR REPLACE FUNCTION delete_supplier_price_image_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  image_url TEXT;
BEGIN
  -- If the price had images, delete them from storage
  IF OLD.image_urls IS NOT NULL AND array_length(OLD.image_urls, 1) > 0 THEN
    FOREACH image_url IN ARRAY OLD.image_urls
    LOOP
      DELETE FROM storage.objects
      WHERE bucket_id = 'supplier-price-images'
      AND name = image_url;
    END LOOP;
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

-- Function to delete old images when updating with new images
CREATE OR REPLACE FUNCTION cleanup_old_supplier_price_image()
RETURNS TRIGGER AS $$
DECLARE
  old_image TEXT;
BEGIN
  -- If updating image_urls and old value exists
  IF OLD.image_urls IS NOT NULL
     AND OLD.image_urls IS DISTINCT FROM NEW.image_urls THEN
    -- Delete images that are in OLD but not in NEW
    FOREACH old_image IN ARRAY OLD.image_urls
    LOOP
      IF NEW.image_urls IS NULL OR NOT (old_image = ANY(NEW.image_urls)) THEN
        DELETE FROM storage.objects
        WHERE bucket_id = 'supplier-price-images'
        AND name = old_image;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to cleanup old images when updating
DROP TRIGGER IF EXISTS trigger_cleanup_old_supplier_price_image ON supplier_prices;
CREATE TRIGGER trigger_cleanup_old_supplier_price_image
BEFORE UPDATE ON supplier_prices
FOR EACH ROW
WHEN (OLD.image_urls IS DISTINCT FROM NEW.image_urls)
EXECUTE FUNCTION cleanup_old_supplier_price_image();

COMMENT ON TRIGGER trigger_cleanup_old_supplier_price_image ON supplier_prices IS
  'Automatically deletes old images from storage when a price record is updated with new images';

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
-- DROP INDEX IF EXISTS idx_supplier_prices_has_images;
-- ALTER TABLE supplier_prices DROP COLUMN IF EXISTS image_urls;
--
-- Then manually delete the storage bucket via Dashboard or CLI
