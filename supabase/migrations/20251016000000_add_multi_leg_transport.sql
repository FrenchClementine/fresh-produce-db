-- Migration: Add multi-leg transport support to opportunities table
-- Purpose: Store 2-leg transport routes with detailed leg information
-- Date: 2025-10-16

-- Add columns to opportunities table for multi-leg transport routes
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS transport_route_legs JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_transport_legs INTEGER DEFAULT 1;

-- Add comment to explain JSONB structure
COMMENT ON COLUMN opportunities.transport_route_legs IS 'Stores multi-leg transport route details. Structure: { total_legs, total_cost_per_pallet, total_duration_days, legs: [{ leg, route_id, origin_hub_id, origin_hub_name, destination_hub_id, destination_hub_name, transporter_id, transporter_name, cost_per_pallet, duration_days }] }. NULL for single-leg routes.';

COMMENT ON COLUMN opportunities.total_transport_legs IS 'Number of transport legs (1 for direct, 2+ for multi-leg). Quick filter field.';

-- Create GIN index for JSONB queries (allows efficient filtering by leg details)
CREATE INDEX IF NOT EXISTS idx_opportunities_transport_legs
ON opportunities USING GIN (transport_route_legs);

-- Create index on total_transport_legs for efficient filtering
CREATE INDEX IF NOT EXISTS idx_opportunities_total_transport_legs
ON opportunities (total_transport_legs);

-- Enable transshipment on key hubs
-- These hubs can now serve as intermediate stops in 2-leg routes
UPDATE hubs
SET can_transship = true
WHERE name IN ('Verona', 'Rotterdam', 'Padova');

-- Verify the changes
DO $$
DECLARE
  transship_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO transship_count
  FROM hubs
  WHERE can_transship = true;

  RAISE NOTICE 'Migration complete. % hubs enabled as transshipment points.', transship_count;
END $$;
