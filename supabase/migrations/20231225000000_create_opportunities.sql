-- Create opportunities table for tracking trade opportunities
CREATE TABLE opportunities (
  -- Primary Keys
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core Relationships
  customer_id UUID NOT NULL REFERENCES customers(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  product_packaging_spec_id UUID NOT NULL REFERENCES product_packaging_specs(id),

  -- Selected Options
  selected_supplier_id UUID REFERENCES suppliers(id), -- Can be different from supplier_id for multi-supplier scenarios
  selected_transporter_id UUID REFERENCES transporters(id),
  selected_route_id UUID REFERENCES transporter_routes(id),

  -- Pricing Information (snapshot at creation)
  supplier_price_id UUID REFERENCES supplier_prices(id),
  supplier_price_per_unit NUMERIC(10,4),
  transport_cost_per_pallet NUMERIC(10,2),
  estimated_total_cost NUMERIC(10,2), -- Auto-calculated from supplier + transport costs

  -- Quote/Offer Information
  offer_price_per_unit NUMERIC(10,4), -- Price we want to offer to customer
  offer_currency TEXT DEFAULT 'EUR',
  quote_sent_date TIMESTAMPTZ,
  quote_feedback TEXT, -- Customer feedback on our quote

  -- Validity and Lifecycle
  valid_till DATE, -- When this opportunity expires
  is_active BOOLEAN DEFAULT TRUE, -- Active/Inactive toggle

  -- Status Management
  status TEXT CHECK (status IN ('draft', 'active', 'negotiating', 'offered', 'confirmed', 'cancelled', 'completed')),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Notes and Communication
  internal_notes TEXT,
  customer_requirements TEXT,
  supplier_notes TEXT,

  -- Metadata
  created_by UUID REFERENCES staff(id),
  assigned_to UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Conversion Tracking
  converted_to_order BOOLEAN DEFAULT FALSE,
  order_reference TEXT,

  -- Basic unique constraint to prevent exact duplicates
  CONSTRAINT unique_opportunity UNIQUE (customer_id, supplier_id, product_packaging_spec_id, is_active)
);

-- Indexes for performance
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_opportunities_customer ON opportunities(customer_id);
CREATE INDEX idx_opportunities_supplier ON opportunities(supplier_id);
CREATE INDEX idx_opportunities_assigned ON opportunities(assigned_to);
CREATE INDEX idx_opportunities_created_at ON opportunities(created_at DESC);
CREATE INDEX idx_opportunities_active ON opportunities(is_active);
CREATE INDEX idx_opportunities_valid_till ON opportunities(valid_till) WHERE valid_till IS NOT NULL;

-- Partial unique index to prevent duplicate active opportunities
CREATE UNIQUE INDEX idx_opportunities_unique_active
ON opportunities(customer_id, supplier_id, product_packaging_spec_id)
WHERE is_active = TRUE;

-- Update trigger
CREATE TRIGGER update_opportunities_updated_at
    BEFORE UPDATE ON opportunities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all opportunities
CREATE POLICY "Allow authenticated users to view opportunities" ON opportunities
    FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to create opportunities
CREATE POLICY "Allow authenticated users to create opportunities" ON opportunities
    FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to update opportunities
CREATE POLICY "Allow authenticated users to update opportunities" ON opportunities
    FOR UPDATE TO authenticated USING (true);

-- Allow authenticated users to delete opportunities (soft delete via is_active)
CREATE POLICY "Allow authenticated users to delete opportunities" ON opportunities
    FOR DELETE TO authenticated USING (true);

-- Grant permissions
GRANT ALL ON opportunities TO authenticated;
GRANT ALL ON opportunities TO anon;