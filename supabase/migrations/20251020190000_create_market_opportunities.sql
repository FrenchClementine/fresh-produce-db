-- ============================================
-- MARKET OPPORTUNITIES
-- Purpose: Track active market opportunities for hubs (like opportunities but hub-based)
-- Date: 2025-10-20
-- ============================================

-- Create market_opportunities table
CREATE TABLE market_opportunities (
  -- Primary Keys
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core Relationships (HUB instead of CUSTOMER)
  hub_id UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  product_packaging_spec_id UUID NOT NULL REFERENCES product_packaging_specs(id) ON DELETE CASCADE,

  -- Supplier Product Relationship
  supplier_product_packaging_spec_id UUID NOT NULL REFERENCES supplier_product_packaging_spec(id) ON DELETE CASCADE,

  -- Selected Options
  selected_supplier_id UUID REFERENCES suppliers(id),
  selected_transporter_id UUID REFERENCES transporters(id),
  selected_route_id UUID REFERENCES transporter_routes(id),
  selected_transport_band_id UUID REFERENCES transporter_route_price_bands(id),

  -- Price Source (which hub the supplier price is from)
  price_source_hub_id UUID REFERENCES hubs(id),

  -- Pricing Information (snapshot at creation)
  supplier_price_id UUID REFERENCES supplier_prices(id),
  supplier_price_per_unit NUMERIC(10,4),
  transport_cost_per_unit NUMERIC(10,4),
  transport_cost_per_pallet NUMERIC(10,2),
  diesel_surcharge_per_pallet NUMERIC(10,2),

  -- Market Pricing
  margin_percentage NUMERIC(5,2) DEFAULT 15.00,
  custom_markup NUMERIC(10,2),
  delivered_price_per_unit NUMERIC(10,4), -- Final price at hub

  -- Validity and Lifecycle
  valid_till DATE,
  is_active BOOLEAN DEFAULT TRUE,

  -- Status Management
  status TEXT CHECK (status IN ('draft', 'active', 'suspended', 'cancelled', 'expired')) DEFAULT 'draft',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',

  -- Notes
  internal_notes TEXT,
  supplier_notes TEXT,

  -- Metadata
  created_by UUID REFERENCES staff(id),
  assigned_to UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_market_opportunities_status ON market_opportunities(status);
CREATE INDEX idx_market_opportunities_hub ON market_opportunities(hub_id);
CREATE INDEX idx_market_opportunities_supplier ON market_opportunities(supplier_id);
CREATE INDEX idx_market_opportunities_assigned ON market_opportunities(assigned_to);
CREATE INDEX idx_market_opportunities_created_at ON market_opportunities(created_at DESC);
CREATE INDEX idx_market_opportunities_active ON market_opportunities(is_active);
CREATE INDEX idx_market_opportunities_valid_till ON market_opportunities(valid_till) WHERE valid_till IS NOT NULL;

-- Unique index to prevent duplicate active opportunities for same hub-supplier-product
CREATE UNIQUE INDEX idx_market_opportunities_unique_active
ON market_opportunities(hub_id, supplier_id, product_packaging_spec_id)
WHERE is_active = TRUE;

-- Update trigger
CREATE TRIGGER update_market_opportunities_updated_at
    BEFORE UPDATE ON market_opportunities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE market_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view market_opportunities" ON market_opportunities
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to create market_opportunities" ON market_opportunities
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update market_opportunities" ON market_opportunities
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to delete market_opportunities" ON market_opportunities
    FOR DELETE TO authenticated USING (true);

-- Grant permissions
GRANT ALL ON market_opportunities TO authenticated;
GRANT ALL ON market_opportunities TO anon;
GRANT ALL ON market_opportunities TO service_role;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE market_opportunities IS 'Active market opportunities for hubs - product catalog management';
COMMENT ON COLUMN market_opportunities.hub_id IS 'Hub where products will be delivered';
COMMENT ON COLUMN market_opportunities.price_source_hub_id IS 'Hub where the supplier price originates from';
COMMENT ON COLUMN market_opportunities.delivered_price_per_unit IS 'Final calculated price at destination hub';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Market opportunities table created successfully';
END $$;
