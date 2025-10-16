-- Migration: Add delivery hub support to opportunities table
-- Purpose: Track the final delivery/pickup hub for opportunities with transport to customer hubs
-- Date: 2025-10-16

-- Add delivery_hub_id column to opportunities table
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS delivery_hub_id UUID REFERENCES hubs(id);

-- Add comment to explain the column
COMMENT ON COLUMN opportunities.delivery_hub_id IS 'Final delivery/pickup hub for this opportunity. Used when goods are delivered to a customer transit hub (e.g., third-party transport to customer hub, or supplier delivery to hub). NULL for direct delivery to customer location.';

-- Create index for efficient filtering by delivery hub
CREATE INDEX IF NOT EXISTS idx_opportunities_delivery_hub
ON opportunities (delivery_hub_id);

-- Verify the changes
DO $$
BEGIN
  RAISE NOTICE 'Migration complete. Added delivery_hub_id column to opportunities table.';
END $$;
