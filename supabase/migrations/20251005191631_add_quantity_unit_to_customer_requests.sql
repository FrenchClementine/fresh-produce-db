-- Add quantity_unit field to customer_product_requests
ALTER TABLE customer_product_requests
ADD COLUMN quantity_unit TEXT CHECK (quantity_unit IN ('units', 'pallets', 'packages'));

-- Set default to 'units' for existing records
UPDATE customer_product_requests SET quantity_unit = 'units' WHERE quantity_unit IS NULL;

-- Make it NOT NULL with default
ALTER TABLE customer_product_requests
ALTER COLUMN quantity_unit SET DEFAULT 'units';

COMMENT ON COLUMN customer_product_requests.quantity_unit IS 'Unit type for quantity_needed: units, pallets, or packages';
