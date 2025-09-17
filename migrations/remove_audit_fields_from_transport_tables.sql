-- Remove all audit fields and related functions from transport tables
-- Rollback migration: Remove created_by, updated_by, and updated_at fields

-- Drop triggers first
DROP TRIGGER IF EXISTS update_transporter_routes_updated_at ON public.transporter_routes;
DROP TRIGGER IF EXISTS update_transporter_route_price_bands_updated_at ON public.transporter_route_price_bands;

-- Drop the function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS idx_transporter_routes_created_by;
DROP INDEX IF EXISTS idx_transporter_routes_updated_by;
DROP INDEX IF EXISTS idx_transporter_routes_updated_at;
DROP INDEX IF EXISTS idx_transporter_route_price_bands_created_by;
DROP INDEX IF EXISTS idx_transporter_route_price_bands_updated_by;

-- Remove audit columns from transporter_routes table
ALTER TABLE public.transporter_routes
DROP COLUMN IF EXISTS created_by,
DROP COLUMN IF EXISTS updated_by,
DROP COLUMN IF EXISTS updated_at;

-- Remove audit columns from transporter_route_price_bands table
ALTER TABLE public.transporter_route_price_bands
DROP COLUMN IF EXISTS created_by,
DROP COLUMN IF EXISTS updated_by;

-- Note: We keep the existing last_updated_at column in price_bands as it was there originally