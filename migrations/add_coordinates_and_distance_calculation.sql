-- Add coordinates and distance calculation capabilities
-- This enables automatic geocoding and distance calculations between hubs, suppliers, and customers

-- ================================================
-- Add coordinate columns to all relevant tables
-- ================================================

-- Add coordinates to hubs table
ALTER TABLE hubs
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8),
ADD COLUMN coordinates_last_updated TIMESTAMPTZ,
ADD COLUMN coordinates_source TEXT DEFAULT 'geocoding_api';

-- Add coordinates to suppliers table
ALTER TABLE suppliers
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8),
ADD COLUMN coordinates_last_updated TIMESTAMPTZ,
ADD COLUMN coordinates_source TEXT DEFAULT 'geocoding_api';

-- Add coordinates to customers table
ALTER TABLE customers
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8),
ADD COLUMN coordinates_last_updated TIMESTAMPTZ,
ADD COLUMN coordinates_source TEXT DEFAULT 'geocoding_api';

-- ================================================
-- Add indexes for coordinate-based queries
-- ================================================

-- Indexes for hubs coordinates
CREATE INDEX idx_hubs_coordinates ON hubs(latitude, longitude);
CREATE INDEX idx_hubs_coordinates_not_null ON hubs(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Indexes for suppliers coordinates
CREATE INDEX idx_suppliers_coordinates ON suppliers(latitude, longitude);
CREATE INDEX idx_suppliers_coordinates_not_null ON suppliers(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Indexes for customers coordinates
CREATE INDEX idx_customers_coordinates ON customers(latitude, longitude);
CREATE INDEX idx_customers_coordinates_not_null ON customers(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ================================================
-- Distance calculation functions using Haversine formula
-- ================================================

-- Core function to calculate distance between two coordinate points
CREATE OR REPLACE FUNCTION calculate_distance_km(
    lat1 DECIMAL(10,8),
    lon1 DECIMAL(11,8),
    lat2 DECIMAL(10,8),
    lon2 DECIMAL(11,8)
) RETURNS DECIMAL(8,2) AS $$
DECLARE
    earth_radius DECIMAL := 6371; -- Earth's radius in kilometers
    dlat DECIMAL;
    dlon DECIMAL;
    a DECIMAL;
    c DECIMAL;
    lat1_rad DECIMAL;
    lat2_rad DECIMAL;
BEGIN
    -- Handle NULL values
    IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
        RETURN NULL;
    END IF;

    -- If coordinates are the same, distance is 0
    IF lat1 = lat2 AND lon1 = lon2 THEN
        RETURN 0;
    END IF;

    -- Convert to radians
    lat1_rad := radians(lat1);
    lat2_rad := radians(lat2);
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);

    -- Haversine formula
    a := sin(dlat/2) * sin(dlat/2) +
         cos(lat1_rad) * cos(lat2_rad) *
         sin(dlon/2) * sin(dlon/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));

    RETURN ROUND(earth_radius * c, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get distances from any entity to all hubs
CREATE OR REPLACE FUNCTION calculate_distances_to_hubs(
    entity_lat DECIMAL(10,8),
    entity_lng DECIMAL(11,8)
) RETURNS TABLE(
    hub_id UUID,
    hub_name TEXT,
    hub_code TEXT,
    hub_city TEXT,
    hub_country TEXT,
    distance_km DECIMAL(8,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        h.id,
        h.name,
        h.hub_code,
        h.city_name,
        h.country_code,
        calculate_distance_km(entity_lat, entity_lng, h.latitude, h.longitude) as distance_km
    FROM hubs h
    WHERE h.latitude IS NOT NULL
      AND h.longitude IS NOT NULL
      AND h.is_active = true
    ORDER BY distance_km ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Function to find nearest hubs within a specified distance
CREATE OR REPLACE FUNCTION find_nearest_hubs(
    entity_lat DECIMAL(10,8),
    entity_lng DECIMAL(11,8),
    max_distance_km INTEGER DEFAULT 500,
    limit_count INTEGER DEFAULT 10
) RETURNS TABLE(
    hub_id UUID,
    hub_name TEXT,
    hub_code TEXT,
    hub_city TEXT,
    hub_country TEXT,
    distance_km DECIMAL(8,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        h.id,
        h.name,
        h.hub_code,
        h.city_name,
        h.country_code,
        calculate_distance_km(entity_lat, entity_lng, h.latitude, h.longitude) as distance_km
    FROM hubs h
    WHERE h.latitude IS NOT NULL
      AND h.longitude IS NOT NULL
      AND h.is_active = true
      AND calculate_distance_km(entity_lat, entity_lng, h.latitude, h.longitude) <= max_distance_km
    ORDER BY distance_km ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get supplier distances to hubs (for logistics capabilities)
CREATE OR REPLACE FUNCTION get_supplier_hub_distances(
    supplier_id_param UUID
) RETURNS TABLE(
    hub_id UUID,
    hub_name TEXT,
    hub_code TEXT,
    distance_km DECIMAL(8,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        h.id,
        h.name,
        h.hub_code,
        calculate_distance_km(s.latitude, s.longitude, h.latitude, h.longitude) as distance_km
    FROM hubs h, suppliers s
    WHERE s.id = supplier_id_param
      AND h.latitude IS NOT NULL
      AND h.longitude IS NOT NULL
      AND s.latitude IS NOT NULL
      AND s.longitude IS NOT NULL
      AND h.is_active = true
    ORDER BY distance_km ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Function to get customer distances to hubs (for logistics preferences)
CREATE OR REPLACE FUNCTION get_customer_hub_distances(
    customer_id_param UUID
) RETURNS TABLE(
    hub_id UUID,
    hub_name TEXT,
    hub_code TEXT,
    distance_km DECIMAL(8,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        h.id,
        h.name,
        h.hub_code,
        calculate_distance_km(c.latitude, c.longitude, h.latitude, h.longitude) as distance_km
    FROM hubs h, customers c
    WHERE c.id = customer_id_param
      AND h.latitude IS NOT NULL
      AND h.longitude IS NOT NULL
      AND c.latitude IS NOT NULL
      AND c.longitude IS NOT NULL
      AND h.is_active = true
    ORDER BY distance_km ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Function to find optimal hub for supplier-customer pair
CREATE OR REPLACE FUNCTION find_optimal_hub_for_route(
    supplier_id_param UUID,
    customer_id_param UUID,
    max_total_distance INTEGER DEFAULT 1000
) RETURNS TABLE(
    hub_id UUID,
    hub_name TEXT,
    hub_code TEXT,
    supplier_to_hub_km DECIMAL(8,2),
    hub_to_customer_km DECIMAL(8,2),
    total_distance_km DECIMAL(8,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        h.id,
        h.name,
        h.hub_code,
        calculate_distance_km(s.latitude, s.longitude, h.latitude, h.longitude) as supplier_to_hub_km,
        calculate_distance_km(h.latitude, h.longitude, c.latitude, c.longitude) as hub_to_customer_km,
        (calculate_distance_km(s.latitude, s.longitude, h.latitude, h.longitude) +
         calculate_distance_km(h.latitude, h.longitude, c.latitude, c.longitude)) as total_distance_km
    FROM hubs h, suppliers s, customers c
    WHERE s.id = supplier_id_param
      AND c.id = customer_id_param
      AND h.latitude IS NOT NULL
      AND h.longitude IS NOT NULL
      AND s.latitude IS NOT NULL
      AND s.longitude IS NOT NULL
      AND c.latitude IS NOT NULL
      AND c.longitude IS NOT NULL
      AND h.is_active = true
      AND (calculate_distance_km(s.latitude, s.longitude, h.latitude, h.longitude) +
           calculate_distance_km(h.latitude, h.longitude, c.latitude, c.longitude)) <= max_total_distance
    ORDER BY total_distance_km ASC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- Add comments for documentation
-- ================================================

COMMENT ON COLUMN hubs.latitude IS 'Latitude coordinate for hub location (WGS84)';
COMMENT ON COLUMN hubs.longitude IS 'Longitude coordinate for hub location (WGS84)';
COMMENT ON COLUMN hubs.coordinates_last_updated IS 'Timestamp when coordinates were last updated';
COMMENT ON COLUMN hubs.coordinates_source IS 'Source of coordinate data (e.g., geocoding_api, manual)';

COMMENT ON COLUMN suppliers.latitude IS 'Latitude coordinate for supplier location (WGS84)';
COMMENT ON COLUMN suppliers.longitude IS 'Longitude coordinate for supplier location (WGS84)';
COMMENT ON COLUMN suppliers.coordinates_last_updated IS 'Timestamp when coordinates were last updated';
COMMENT ON COLUMN suppliers.coordinates_source IS 'Source of coordinate data (e.g., geocoding_api, manual)';

COMMENT ON COLUMN customers.latitude IS 'Latitude coordinate for customer location (WGS84)';
COMMENT ON COLUMN customers.longitude IS 'Longitude coordinate for customer location (WGS84)';
COMMENT ON COLUMN customers.coordinates_last_updated IS 'Timestamp when coordinates were last updated';
COMMENT ON COLUMN customers.coordinates_source IS 'Source of coordinate data (e.g., geocoding_api, manual)';

COMMENT ON FUNCTION calculate_distance_km(DECIMAL, DECIMAL, DECIMAL, DECIMAL) IS 'Calculates distance in kilometers between two coordinate points using Haversine formula';
COMMENT ON FUNCTION calculate_distances_to_hubs(DECIMAL, DECIMAL) IS 'Returns distances from given coordinates to all active hubs';
COMMENT ON FUNCTION find_nearest_hubs(DECIMAL, DECIMAL, INTEGER, INTEGER) IS 'Finds nearest hubs within specified distance limit';
COMMENT ON FUNCTION get_supplier_hub_distances(UUID) IS 'Gets distances from specific supplier to all hubs';
COMMENT ON FUNCTION get_customer_hub_distances(UUID) IS 'Gets distances from specific customer to all hubs';
COMMENT ON FUNCTION find_optimal_hub_for_route(UUID, UUID, INTEGER) IS 'Finds optimal hub for supplier-customer routing based on total distance';