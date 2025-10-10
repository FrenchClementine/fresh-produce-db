-- Auto-delete opportunities when supplier prices expire
-- This ensures opportunities are removed immediately when their price is no longer valid

-- Function to delete opportunities with expired prices
CREATE OR REPLACE FUNCTION delete_opportunities_with_expired_prices()
RETURNS TABLE(
  deleted_opportunity_id UUID,
  supplier_name TEXT,
  product_name TEXT,
  customer_name TEXT,
  expired_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH deleted AS (
    DELETE FROM opportunities o
    WHERE o.is_active = true
    AND o.supplier_price_id IN (
      SELECT sp.id
      FROM supplier_prices sp
      WHERE sp.valid_until < NOW()
    )
    RETURNING
      o.id,
      o.supplier_id,
      o.customer_id,
      o.product_packaging_spec_id,
      (SELECT sp.valid_until FROM supplier_prices sp WHERE sp.id = o.supplier_price_id) as valid_until
  )
  SELECT
    d.id as deleted_opportunity_id,
    s.name as supplier_name,
    p.name as product_name,
    c.name as customer_name,
    d.valid_until as expired_at
  FROM deleted d
  LEFT JOIN suppliers s ON s.id = d.supplier_id
  LEFT JOIN customers c ON c.id = d.customer_id
  LEFT JOIN product_packaging_specs pps ON pps.id = d.product_packaging_spec_id
  LEFT JOIN products p ON p.id = pps.product_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check and delete expired opportunities (can be called manually or via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_opportunities()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete opportunities where the supplier price has expired
  DELETE FROM opportunities
  WHERE is_active = true
  AND supplier_price_id IN (
    SELECT id
    FROM supplier_prices
    WHERE valid_until < NOW()
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE 'Deleted % opportunities with expired prices', deleted_count;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to automatically delete opportunities when supplier price expires
CREATE OR REPLACE FUNCTION trigger_delete_expired_opportunity()
RETURNS TRIGGER AS $$
BEGIN
  -- When a supplier price's valid_until is updated to be in the past,
  -- or when we're checking an existing price that's expired
  IF NEW.valid_until < NOW() THEN
    -- Delete any active opportunities using this price
    DELETE FROM opportunities
    WHERE supplier_price_id = NEW.id
    AND is_active = true;

    RAISE NOTICE 'Deleted opportunities for expired supplier price: %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on supplier_prices table
-- This fires whenever valid_until is updated
DROP TRIGGER IF EXISTS trigger_check_expired_price ON supplier_prices;
CREATE TRIGGER trigger_check_expired_price
  AFTER UPDATE OF valid_until ON supplier_prices
  FOR EACH ROW
  WHEN (NEW.valid_until < NOW() AND OLD.valid_until >= NOW())
  EXECUTE FUNCTION trigger_delete_expired_opportunity();

-- Grant permissions
GRANT EXECUTE ON FUNCTION delete_opportunities_with_expired_prices() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_opportunities() TO authenticated;

-- Run initial cleanup to remove any existing opportunities with expired prices
SELECT cleanup_expired_opportunities();

-- Add comment for documentation
COMMENT ON FUNCTION cleanup_expired_opportunities() IS 'Deletes opportunities where the supplier price has expired. Can be run manually or scheduled via pg_cron.';
COMMENT ON FUNCTION delete_opportunities_with_expired_prices() IS 'Deletes opportunities with expired prices and returns details of what was deleted.';
