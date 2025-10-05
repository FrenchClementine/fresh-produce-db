-- Add price change status tracking to opportunities table
ALTER TABLE opportunities
ADD COLUMN price_status TEXT CHECK (price_status IN ('current', 'changed', 'expired', 'reviewed')) DEFAULT 'current',
ADD COLUMN price_change_detected_at TIMESTAMPTZ,
ADD COLUMN price_change_notes TEXT;

-- Add index for efficient querying of opportunities with price changes
CREATE INDEX idx_opportunities_price_status ON opportunities(price_status) WHERE price_status IN ('changed', 'expired');

-- Add comments for documentation
COMMENT ON COLUMN opportunities.price_status IS 'Tracks if the supplier price referenced by this opportunity has changed: current=no change, changed=supplier updated price, expired=supplier price expired, reviewed=manually reviewed by staff';
COMMENT ON COLUMN opportunities.price_change_detected_at IS 'Timestamp when the price change was first detected';
COMMENT ON COLUMN opportunities.price_change_notes IS 'Notes about the price change or review actions taken';

-- Function to detect price changes for opportunities
CREATE OR REPLACE FUNCTION detect_opportunity_price_changes()
RETURNS TABLE(
  opportunity_id UUID,
  current_price_status TEXT,
  supplier_price_active BOOLEAN,
  supplier_price_expired BOOLEAN,
  current_supplier_price NUMERIC,
  new_supplier_price NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id as opportunity_id,
    o.price_status as current_price_status,
    COALESCE(sp.is_active, false) as supplier_price_active,
    CASE
      WHEN sp.valid_until IS NOT NULL AND sp.valid_until < NOW()
      THEN true
      ELSE false
    END as supplier_price_expired,
    o.supplier_price_per_unit as current_supplier_price,
    COALESCE(csp.price_per_unit, 0) as new_supplier_price
  FROM opportunities o
  LEFT JOIN supplier_prices sp ON sp.id = o.supplier_price_id
  LEFT JOIN current_supplier_prices csp ON (
    csp.supplier_id = o.supplier_id
    AND csp.product_packaging_spec_id = (
      SELECT product_id FROM product_packaging_specs
      WHERE id = o.product_packaging_spec_id
    )
  )
  WHERE o.is_active = true
  AND o.price_status IN ('current', 'changed')
  AND (
    -- Price reference is no longer active
    COALESCE(sp.is_active, false) = false
    -- OR price has expired
    OR (sp.valid_until IS NOT NULL AND sp.valid_until < NOW())
    -- OR there's a newer active price with different amount
    OR (csp.price_per_unit IS NOT NULL AND csp.price_per_unit != o.supplier_price_per_unit)
  );
END;
$$ LANGUAGE plpgsql;

-- Function to update opportunities with price change status
CREATE OR REPLACE FUNCTION update_opportunity_price_status(
  p_opportunity_id UUID,
  p_new_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE opportunities
  SET
    price_status = p_new_status,
    price_change_detected_at = CASE
      WHEN p_new_status IN ('changed', 'expired') AND price_change_detected_at IS NULL
      THEN NOW()
      ELSE price_change_detected_at
    END,
    price_change_notes = COALESCE(p_notes, price_change_notes),
    updated_at = NOW()
  WHERE id = p_opportunity_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION detect_opportunity_price_changes() TO authenticated;
GRANT EXECUTE ON FUNCTION update_opportunity_price_status(UUID, TEXT, TEXT) TO authenticated;