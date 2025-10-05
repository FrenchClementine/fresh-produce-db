-- Create table for marking trade potentials as non-viable/excluded
CREATE TABLE excluded_trade_potentials (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core Relationships (unique combination that defines a trade potential)
  customer_id UUID NOT NULL REFERENCES customers(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  product_packaging_spec_id UUID NOT NULL REFERENCES product_packaging_specs(id),

  -- Exclusion Information
  reason TEXT CHECK (reason IN (
    'business_decision',
    'quality_concerns',
    'pricing_issues',
    'logistics_problems',
    'certification_mismatch',
    'capacity_constraints',
    'relationship_issues',
    'other'
  )) NOT NULL,

  notes TEXT,

  -- Metadata
  excluded_by UUID REFERENCES staff(id),
  excluded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one exclusion per combination
  CONSTRAINT unique_excluded_potential UNIQUE (customer_id, supplier_id, product_packaging_spec_id)
);

-- Indexes for performance
CREATE INDEX idx_excluded_potentials_customer ON excluded_trade_potentials(customer_id);
CREATE INDEX idx_excluded_potentials_supplier ON excluded_trade_potentials(supplier_id);
CREATE INDEX idx_excluded_potentials_product ON excluded_trade_potentials(product_packaging_spec_id);
CREATE INDEX idx_excluded_potentials_reason ON excluded_trade_potentials(reason);
CREATE INDEX idx_excluded_potentials_excluded_by ON excluded_trade_potentials(excluded_by);
CREATE INDEX idx_excluded_potentials_excluded_at ON excluded_trade_potentials(excluded_at DESC);

-- Composite index for quick exclusion checking
CREATE INDEX idx_excluded_potentials_combo ON excluded_trade_potentials(customer_id, supplier_id, product_packaging_spec_id);

-- Update trigger
CREATE TRIGGER update_excluded_potentials_updated_at
    BEFORE UPDATE ON excluded_trade_potentials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE excluded_trade_potentials ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all exclusions
CREATE POLICY "Allow authenticated users to view excluded potentials" ON excluded_trade_potentials
    FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to create exclusions
CREATE POLICY "Allow authenticated users to create excluded potentials" ON excluded_trade_potentials
    FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to update exclusions
CREATE POLICY "Allow authenticated users to update excluded potentials" ON excluded_trade_potentials
    FOR UPDATE TO authenticated USING (true);

-- Allow authenticated users to delete exclusions (re-enable potentials)
CREATE POLICY "Allow authenticated users to delete excluded potentials" ON excluded_trade_potentials
    FOR DELETE TO authenticated USING (true);

-- Grant permissions
GRANT ALL ON excluded_trade_potentials TO authenticated;
GRANT ALL ON excluded_trade_potentials TO anon;

-- Comments for documentation
COMMENT ON TABLE excluded_trade_potentials IS 'Stores customer-supplier-product combinations that should be excluded from trade potential matching';
COMMENT ON COLUMN excluded_trade_potentials.reason IS 'Reason for excluding this trade potential combination';
COMMENT ON COLUMN excluded_trade_potentials.notes IS 'Additional notes about why this combination was excluded';
COMMENT ON COLUMN excluded_trade_potentials.excluded_by IS 'Staff member who marked this potential as non-viable';