-- Add automatic coordinate system with Nominatim geocoding
-- This enables real-time distance calculations for hub assignments

-- ================================================
-- Add coordinate columns to all location tables
-- ================================================

-- Add coordinates to hubs table
ALTER TABLE hubs
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8),
ADD COLUMN coordinates_last_updated TIMESTAMPTZ,
ADD COLUMN coordinates_source TEXT DEFAULT 'nominatim',
ADD COLUMN geocoding_failed BOOLEAN DEFAULT false,
ADD COLUMN geocoding_attempts INTEGER DEFAULT 0;

-- Add coordinates to suppliers table
ALTER TABLE suppliers
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8),
ADD COLUMN coordinates_last_updated TIMESTAMPTZ,
ADD COLUMN coordinates_source TEXT DEFAULT 'nominatim',
ADD COLUMN geocoding_failed BOOLEAN DEFAULT false,
ADD COLUMN geocoding_attempts INTEGER DEFAULT 0;

-- Add coordinates to customers table
ALTER TABLE customers
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8),
ADD COLUMN coordinates_last_updated TIMESTAMPTZ,
ADD COLUMN coordinates_source TEXT DEFAULT 'nominatim',
ADD COLUMN geocoding_failed BOOLEAN DEFAULT false,
ADD COLUMN geocoding_attempts INTEGER DEFAULT 0;

-- ================================================
-- Add indexes for performance
-- ================================================

-- Coordinate indexes for spatial queries
CREATE INDEX idx_hubs_coordinates ON hubs(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX idx_suppliers_coordinates ON suppliers(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX idx_customers_coordinates ON customers(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Indexes for geocoding status tracking
CREATE INDEX idx_hubs_needs_geocoding ON hubs(geocoding_failed, coordinates_last_updated) WHERE latitude IS NULL;
CREATE INDEX idx_suppliers_needs_geocoding ON suppliers(geocoding_failed, coordinates_last_updated) WHERE latitude IS NULL;
CREATE INDEX idx_customers_needs_geocoding ON customers(geocoding_failed, coordinates_last_updated) WHERE latitude IS NULL;

-- ================================================
-- Distance calculation function
-- ================================================

-- Calculate distance between coordinates using Haversine formula
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

-- ================================================
-- Helper functions for distance queries
-- ================================================

-- Get distance from supplier to specific hub
CREATE OR REPLACE FUNCTION get_supplier_hub_distance(
    supplier_id_param UUID,
    hub_id_param UUID
) RETURNS DECIMAL(8,2) AS $$
DECLARE
    distance_km DECIMAL(8,2);
BEGIN
    SELECT calculate_distance_km(s.latitude, s.longitude, h.latitude, h.longitude)
    INTO distance_km
    FROM suppliers s, hubs h
    WHERE s.id = supplier_id_param
      AND h.id = hub_id_param
      AND s.latitude IS NOT NULL
      AND s.longitude IS NOT NULL
      AND h.latitude IS NOT NULL
      AND h.longitude IS NOT NULL;

    RETURN distance_km;
END;
$$ LANGUAGE plpgsql;

-- Get distance from customer to specific hub
CREATE OR REPLACE FUNCTION get_customer_hub_distance(
    customer_id_param UUID,
    hub_id_param UUID
) RETURNS DECIMAL(8,2) AS $$
DECLARE
    distance_km DECIMAL(8,2);
BEGIN
    SELECT calculate_distance_km(c.latitude, c.longitude, h.latitude, h.longitude)
    INTO distance_km
    FROM customers c, hubs h
    WHERE c.id = customer_id_param
      AND h.id = hub_id_param
      AND c.latitude IS NOT NULL
      AND c.longitude IS NOT NULL
      AND h.latitude IS NOT NULL
      AND h.longitude IS NOT NULL;

    RETURN distance_km;
END;
$$ LANGUAGE plpgsql;

-- Get all hubs with distances for a supplier (for Ex Works logistics)
CREATE OR REPLACE FUNCTION get_supplier_hub_distances(
    supplier_id_param UUID
) RETURNS TABLE(
    hub_id UUID,
    hub_name TEXT,
    hub_code TEXT,
    hub_city TEXT,
    hub_country TEXT,
    distance_km DECIMAL(8,2),
    is_long_distance BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        h.id,
        h.name,
        h.hub_code,
        h.city_name,
        h.country_code,
        calculate_distance_km(s.latitude, s.longitude, h.latitude, h.longitude) as distance_km,
        (calculate_distance_km(s.latitude, s.longitude, h.latitude, h.longitude) > 150) as is_long_distance
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

-- Get all hubs with distances for a customer (for delivery logistics)
CREATE OR REPLACE FUNCTION get_customer_hub_distances(
    customer_id_param UUID
) RETURNS TABLE(
    hub_id UUID,
    hub_name TEXT,
    hub_code TEXT,
    hub_city TEXT,
    hub_country TEXT,
    distance_km DECIMAL(8,2),
    is_long_distance BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        h.id,
        h.name,
        h.hub_code,
        h.city_name,
        h.country_code,
        calculate_distance_km(c.latitude, c.longitude, h.latitude, h.longitude) as distance_km,
        (calculate_distance_km(c.latitude, c.longitude, h.latitude, h.longitude) > 150) as is_long_distance
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

-- ================================================
-- Triggers for automatic coordinate resolution
-- ================================================

-- Function to mark entities for geocoding when location data changes
CREATE OR REPLACE FUNCTION trigger_geocoding_on_location_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if location-related fields have changed
    IF (TG_TABLE_NAME = 'hubs' AND (
        OLD.city_name IS DISTINCT FROM NEW.city_name OR
        OLD.country_code IS DISTINCT FROM NEW.country_code
    )) OR
    (TG_TABLE_NAME IN ('suppliers', 'customers') AND (
        OLD.city IS DISTINCT FROM NEW.city OR
        OLD.country IS DISTINCT FROM NEW.country
    )) THEN
        -- Reset coordinates and mark for re-geocoding
        NEW.latitude := NULL;
        NEW.longitude := NULL;
        NEW.coordinates_last_updated := NULL;
        NEW.coordinates_source := 'nominatim';
        NEW.geocoding_failed := false;
        NEW.geocoding_attempts := 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all location tables
CREATE TRIGGER trigger_hub_geocoding
    BEFORE UPDATE ON hubs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_geocoding_on_location_change();

CREATE TRIGGER trigger_supplier_geocoding
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION trigger_geocoding_on_location_change();

CREATE TRIGGER trigger_customer_geocoding
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION trigger_geocoding_on_location_change();

-- ================================================
-- Views for easy distance queries
-- ================================================

-- View: Suppliers with their nearest hubs
CREATE OR REPLACE VIEW supplier_nearest_hubs AS
SELECT DISTINCT ON (s.id)
    s.id as supplier_id,
    s.name as supplier_name,
    s.city as supplier_city,
    s.country as supplier_country,
    h.id as nearest_hub_id,
    h.name as nearest_hub_name,
    h.hub_code as nearest_hub_code,
    calculate_distance_km(s.latitude, s.longitude, h.latitude, h.longitude) as distance_km
FROM suppliers s
CROSS JOIN hubs h
WHERE s.latitude IS NOT NULL
  AND s.longitude IS NOT NULL
  AND h.latitude IS NOT NULL
  AND h.longitude IS NOT NULL
  AND h.is_active = true
ORDER BY s.id, calculate_distance_km(s.latitude, s.longitude, h.latitude, h.longitude) ASC;

-- View: Customers with their nearest hubs
CREATE OR REPLACE VIEW customer_nearest_hubs AS
SELECT DISTINCT ON (c.id)
    c.id as customer_id,
    c.name as customer_name,
    c.city as customer_city,
    c.country as customer_country,
    h.id as nearest_hub_id,
    h.name as nearest_hub_name,
    h.hub_code as nearest_hub_code,
    calculate_distance_km(c.latitude, c.longitude, h.latitude, h.longitude) as distance_km
FROM customers c
CROSS JOIN hubs h
WHERE c.latitude IS NOT NULL
  AND c.longitude IS NOT NULL
  AND h.latitude IS NOT NULL
  AND h.longitude IS NOT NULL
  AND h.is_active = true
ORDER BY c.id, calculate_distance_km(c.latitude, c.longitude, h.latitude, h.longitude) ASC;

-- ================================================
-- Comments for documentation
-- ================================================

COMMENT ON COLUMN hubs.latitude IS 'Latitude coordinate (WGS84) automatically geocoded from city_name and country_code';
COMMENT ON COLUMN hubs.longitude IS 'Longitude coordinate (WGS84) automatically geocoded from city_name and country_code';
COMMENT ON COLUMN hubs.coordinates_last_updated IS 'Timestamp when coordinates were last successfully geocoded';
COMMENT ON COLUMN hubs.coordinates_source IS 'Source of geocoding (nominatim)';
COMMENT ON COLUMN hubs.geocoding_failed IS 'True if geocoding attempts have failed';
COMMENT ON COLUMN hubs.geocoding_attempts IS 'Number of geocoding attempts made';

COMMENT ON COLUMN suppliers.latitude IS 'Latitude coordinate (WGS84) automatically geocoded from city and country';
COMMENT ON COLUMN suppliers.longitude IS 'Longitude coordinate (WGS84) automatically geocoded from city and country';
COMMENT ON COLUMN suppliers.coordinates_last_updated IS 'Timestamp when coordinates were last successfully geocoded';
COMMENT ON COLUMN suppliers.coordinates_source IS 'Source of geocoding (nominatim)';
COMMENT ON COLUMN suppliers.geocoding_failed IS 'True if geocoding attempts have failed';
COMMENT ON COLUMN suppliers.geocoding_attempts IS 'Number of geocoding attempts made';

COMMENT ON COLUMN customers.latitude IS 'Latitude coordinate (WGS84) automatically geocoded from city and country';
COMMENT ON COLUMN customers.longitude IS 'Longitude coordinate (WGS84) automatically geocoded from city and country';
COMMENT ON COLUMN customers.coordinates_last_updated IS 'Timestamp when coordinates were last successfully geocoded';
COMMENT ON COLUMN customers.coordinates_source IS 'Source of geocoding (nominatim)';
COMMENT ON COLUMN customers.geocoding_failed IS 'True if geocoding attempts have failed';
COMMENT ON COLUMN customers.geocoding_attempts IS 'Number of geocoding attempts made';

COMMENT ON FUNCTION calculate_distance_km(DECIMAL, DECIMAL, DECIMAL, DECIMAL) IS 'Haversine distance calculation between two coordinate points in kilometers';
COMMENT ON FUNCTION get_supplier_hub_distance(UUID, UUID) IS 'Get distance between specific supplier and hub';
COMMENT ON FUNCTION get_customer_hub_distance(UUID, UUID) IS 'Get distance between specific customer and hub';
COMMENT ON FUNCTION get_supplier_hub_distances(UUID) IS 'Get distances from supplier to all hubs with 150km warning flag';
COMMENT ON FUNCTION get_customer_hub_distances(UUID) IS 'Get distances from customer to all hubs with 150km warning flag';