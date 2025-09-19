-- Add valid_till column to transporter_route_price_bands table
ALTER TABLE public.transporter_route_price_bands
ADD COLUMN valid_till DATE;

-- Set a default valid_till date for existing records (30 days from now)
UPDATE public.transporter_route_price_bands
SET valid_till = CURRENT_DATE + INTERVAL '30 days'
WHERE valid_till IS NULL;

-- Add a comment to document the column
COMMENT ON COLUMN public.transporter_route_price_bands.valid_till IS 'Date until which this price band is valid';

-- Create an index on valid_till for efficient filtering
CREATE INDEX idx_transporter_route_price_bands_valid_till
ON public.transporter_route_price_bands(valid_till)
WHERE valid_till IS NOT NULL;

-- Add a check constraint to ensure valid_till is in the future (optional)
-- This constraint ensures new prices can't be set with past validity dates
ALTER TABLE public.transporter_route_price_bands
ADD CONSTRAINT check_valid_till_future
CHECK (valid_till IS NULL OR valid_till >= CURRENT_DATE);