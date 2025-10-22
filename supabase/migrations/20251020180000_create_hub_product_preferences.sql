-- ============================================
-- HUB PRODUCT PREFERENCES
-- Purpose: Track which products each hub wants to source
-- Date: 2025-10-20
-- ============================================

-- Create hub_product_preferences table
CREATE TABLE hub_product_preferences (
  -- Primary Keys
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core Relationships
  hub_id UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- Packaging preferences (optional - can prefer specific packaging)
  packaging_option_id UUID REFERENCES packaging_options(id),
  size_option_id UUID REFERENCES size_options(id),

  -- If they want a specific product_packaging_spec
  product_packaging_spec_id UUID REFERENCES product_packaging_specs(id),

  -- Priority and Status
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  is_active BOOLEAN DEFAULT TRUE,

  -- Volume Requirements
  estimated_volume_per_week NUMERIC(10,2),
  volume_unit TEXT, -- 'kg', 'pallets', 'boxes'

  -- Notes
  notes TEXT,
  requirements TEXT, -- Quality requirements, certifications needed, etc.

  -- Metadata
  added_by UUID REFERENCES staff(id),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_hub_product_preferences_hub ON hub_product_preferences(hub_id);
CREATE INDEX idx_hub_product_preferences_product ON hub_product_preferences(product_id);
CREATE INDEX idx_hub_product_preferences_spec ON hub_product_preferences(product_packaging_spec_id);
CREATE INDEX idx_hub_product_preferences_active ON hub_product_preferences(is_active) WHERE is_active = true;
CREATE INDEX idx_hub_product_preferences_priority ON hub_product_preferences(priority);

-- Partial unique index to prevent duplicate active preferences for same hub+product+spec
CREATE UNIQUE INDEX idx_hub_product_preferences_unique_active
ON hub_product_preferences(hub_id, product_id, COALESCE(product_packaging_spec_id, '00000000-0000-0000-0000-000000000000'::uuid))
WHERE is_active = TRUE;

-- Update trigger
CREATE TRIGGER update_hub_product_preferences_updated_at
    BEFORE UPDATE ON hub_product_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE hub_product_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view hub_product_preferences" ON hub_product_preferences
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to create hub_product_preferences" ON hub_product_preferences
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update hub_product_preferences" ON hub_product_preferences
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete hub_product_preferences" ON hub_product_preferences
    FOR DELETE TO authenticated USING (true);

-- Grant permissions
GRANT ALL ON hub_product_preferences TO authenticated;
GRANT ALL ON hub_product_preferences TO anon;
GRANT ALL ON hub_product_preferences TO service_role;

-- Create detailed view
CREATE OR REPLACE VIEW v_hub_product_preferences_detailed AS
SELECT
    hpp.id as preference_id,
    hpp.hub_id,
    h.name as hub_name,
    h.hub_code,
    h.city_name as hub_city,
    h.country_code as hub_country,

    hpp.product_id,
    p.name as product_name,
    p.category as product_category,
    p.sold_by,

    hpp.product_packaging_spec_id,
    pps.boxes_per_pallet,
    pps.weight_per_pallet,
    pps.weight_unit,

    hpp.packaging_option_id,
    po.label as packaging_label,

    hpp.size_option_id,
    so.name as size_name,

    hpp.priority,
    hpp.is_active,
    hpp.estimated_volume_per_week,
    hpp.volume_unit,
    hpp.notes,
    hpp.requirements,

    hpp.added_by,
    hpp.added_at,
    hpp.updated_at,

    -- Count how many suppliers can provide this
    (
        SELECT COUNT(DISTINCT spps.supplier_id)
        FROM supplier_product_packaging_spec spps
        WHERE (hpp.product_packaging_spec_id IS NULL OR spps.product_packaging_spec_id = hpp.product_packaging_spec_id)
        AND spps.product_packaging_spec_id IN (
            SELECT id FROM product_packaging_specs
            WHERE product_id = hpp.product_id
        )
        AND EXISTS (
            SELECT 1 FROM suppliers s
            WHERE s.id = spps.supplier_id
            AND s.is_active = true
        )
    ) as available_supplier_count

FROM hub_product_preferences hpp
JOIN hubs h ON hpp.hub_id = h.id
JOIN products p ON hpp.product_id = p.id
LEFT JOIN product_packaging_specs pps ON hpp.product_packaging_spec_id = pps.id
LEFT JOIN packaging_options po ON hpp.packaging_option_id = po.id
LEFT JOIN size_options so ON hpp.size_option_id = so.id
WHERE hpp.is_active = true;

GRANT SELECT ON v_hub_product_preferences_detailed TO authenticated;
GRANT SELECT ON v_hub_product_preferences_detailed TO anon;
GRANT SELECT ON v_hub_product_preferences_detailed TO service_role;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE hub_product_preferences IS 'Tracks which products each hub wants to source';
COMMENT ON VIEW v_hub_product_preferences_detailed IS 'Detailed view of hub product preferences with counts';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Hub product preferences table created successfully';
  RAISE NOTICE 'View v_hub_product_preferences_detailed created';
END $$;
