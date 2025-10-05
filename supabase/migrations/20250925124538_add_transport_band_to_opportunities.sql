-- Add transport band selection and per-unit cost columns to opportunities table
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS selected_transport_band_id TEXT,
ADD COLUMN IF NOT EXISTS transport_cost_per_unit NUMERIC(10,4);

-- Add comment to document the new columns
COMMENT ON COLUMN opportunities.selected_transport_band_id IS 'ID of the selected transport price band for this opportunity';
COMMENT ON COLUMN opportunities.transport_cost_per_unit IS 'Transport cost per unit (calculated from transport cost per pallet / units per pallet)';