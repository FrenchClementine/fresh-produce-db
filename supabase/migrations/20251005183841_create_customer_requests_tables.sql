-- Customer Request Tracking System Migration
-- Creates tables for logging customer product requests and tracking supplier matches

-- Main customer requests table
CREATE TABLE IF NOT EXISTS customer_product_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Customer information
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id),

  -- Product details
  product_id UUID NOT NULL REFERENCES products(id),
  variety TEXT,

  -- Packaging requirements
  packaging_type_id UUID REFERENCES packaging_options(id),
  units_per_package INTEGER,
  packages_per_pallet INTEGER,

  -- Quality & Certification requirements
  quality_class TEXT CHECK (quality_class IN ('Class I', 'Class II', 'Extra')),
  certifications TEXT[], -- Array of certification names

  -- Pricing & Logistics
  target_price_per_unit DECIMAL(10,2),
  target_currency TEXT DEFAULT 'EUR',
  delivery_mode TEXT NOT NULL CHECK (delivery_mode IN ('DELIVERY', 'EX_WORKS')),
  delivery_hub_id UUID REFERENCES hubs(id),

  -- Timeline
  needed_by_date DATE,
  availability_window_start DATE,
  availability_window_end DATE,

  -- Request details
  quantity_needed INTEGER,
  frequency TEXT CHECK (frequency IN ('one-time', 'weekly', 'monthly', 'seasonal')),
  notes TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'matched', 'quoted', 'closed')),

  -- Match tracking
  suppliers_checked INTEGER DEFAULT 0,
  potential_matches INTEGER DEFAULT 0,
  quotes_sent INTEGER DEFAULT 0
);

-- Supplier match tracking table
CREATE TABLE IF NOT EXISTS request_supplier_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  request_id UUID NOT NULL REFERENCES customer_product_requests(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  supplier_price_id UUID REFERENCES supplier_prices(id),

  -- Match quality
  match_score INTEGER CHECK (match_score >= 0 AND match_score <= 100),
  match_notes TEXT,

  -- Match details
  price_match BOOLEAN DEFAULT false,
  quality_match BOOLEAN DEFAULT false,
  certification_match BOOLEAN DEFAULT false,
  logistics_match BOOLEAN DEFAULT false,

  -- Actions taken
  quote_sent BOOLEAN DEFAULT false,
  quote_sent_at TIMESTAMPTZ,
  customer_response TEXT CHECK (customer_response IN ('interested', 'not_interested', 'pending')),

  UNIQUE(request_id, supplier_id)
);

-- Activity log for audit trail
CREATE TABLE IF NOT EXISTS request_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  request_id UUID NOT NULL REFERENCES customer_product_requests(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id),

  action_type TEXT NOT NULL CHECK (action_type IN (
    'created',
    'updated',
    'supplier_checked',
    'match_found',
    'quote_sent',
    'customer_feedback',
    'status_changed',
    'closed'
  )),

  details JSONB,
  notes TEXT
);

-- Indexes for performance
CREATE INDEX idx_customer_requests_customer ON customer_product_requests(customer_id);
CREATE INDEX idx_customer_requests_product ON customer_product_requests(product_id);
CREATE INDEX idx_customer_requests_status ON customer_product_requests(status);
CREATE INDEX idx_customer_requests_staff ON customer_product_requests(staff_id);
CREATE INDEX idx_customer_requests_needed_by ON customer_product_requests(needed_by_date);

CREATE INDEX idx_supplier_matches_request ON request_supplier_matches(request_id);
CREATE INDEX idx_supplier_matches_supplier ON request_supplier_matches(supplier_id);
CREATE INDEX idx_supplier_matches_score ON request_supplier_matches(match_score DESC);

CREATE INDEX idx_activity_log_request ON request_activity_log(request_id);
CREATE INDEX idx_activity_log_created ON request_activity_log(created_at DESC);

-- Updated_at trigger for customer_product_requests
CREATE OR REPLACE FUNCTION update_customer_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_requests_updated_at
  BEFORE UPDATE ON customer_product_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_requests_updated_at();

-- Auto-log creation activity
CREATE OR REPLACE FUNCTION log_request_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO request_activity_log (request_id, staff_id, action_type, details)
  VALUES (
    NEW.id,
    NEW.staff_id,
    'created',
    jsonb_build_object(
      'customer_id', NEW.customer_id,
      'product_id', NEW.product_id,
      'quantity_needed', NEW.quantity_needed,
      'needed_by_date', NEW.needed_by_date
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_request_creation
  AFTER INSERT ON customer_product_requests
  FOR EACH ROW
  EXECUTE FUNCTION log_request_creation();

-- Auto-log status changes
CREATE OR REPLACE FUNCTION log_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO request_activity_log (request_id, staff_id, action_type, details)
    VALUES (
      NEW.id,
      NEW.staff_id,
      'status_changed',
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_request_status_change
  AFTER UPDATE ON customer_product_requests
  FOR EACH ROW
  EXECUTE FUNCTION log_request_status_change();

-- RLS Policies
ALTER TABLE customer_product_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_supplier_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_activity_log ENABLE ROW LEVEL SECURITY;

-- Staff can view all requests
CREATE POLICY "Staff can view all customer requests"
  ON customer_product_requests FOR SELECT
  TO authenticated
  USING (true);

-- Staff can insert requests
CREATE POLICY "Staff can create customer requests"
  ON customer_product_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Staff can update requests
CREATE POLICY "Staff can update customer requests"
  ON customer_product_requests FOR UPDATE
  TO authenticated
  USING (true);

-- Staff can view all supplier matches
CREATE POLICY "Staff can view all supplier matches"
  ON request_supplier_matches FOR SELECT
  TO authenticated
  USING (true);

-- Staff can create supplier matches
CREATE POLICY "Staff can create supplier matches"
  ON request_supplier_matches FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Staff can update supplier matches
CREATE POLICY "Staff can update supplier matches"
  ON request_supplier_matches FOR UPDATE
  TO authenticated
  USING (true);

-- Staff can view all activity logs
CREATE POLICY "Staff can view all activity logs"
  ON request_activity_log FOR SELECT
  TO authenticated
  USING (true);

-- Staff can create activity logs
CREATE POLICY "Staff can create activity logs"
  ON request_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE customer_product_requests IS 'Logs customer product requests that need to be matched with suppliers';
COMMENT ON TABLE request_supplier_matches IS 'Tracks which suppliers have been checked and matched for each request';
COMMENT ON TABLE request_activity_log IS 'Audit trail of all actions taken on customer requests';

COMMENT ON COLUMN customer_product_requests.suppliers_checked IS 'Count of suppliers checked for this request';
COMMENT ON COLUMN customer_product_requests.potential_matches IS 'Count of potential supplier matches found';
COMMENT ON COLUMN customer_product_requests.quotes_sent IS 'Count of quotes sent to customer';

COMMENT ON COLUMN request_supplier_matches.match_score IS 'Overall match score 0-100 based on price, quality, certs, logistics';
