-- =============================================================
-- TRANSPORTER SYSTEM FOR INTERNAL LOGISTICS PLANNING
-- =============================================================
-- Features:
-- - Transporter management with contact details
-- - Route-based pricing with groupage/full truck bands
-- - Diesel surcharge as percentage of route price
-- - Customs costs per shipment for international routes
-- - Price history tracking with last_updated timestamps
-- - Route chaining for multi-hop logistics planning
-- - Automatic hub creation for new transporter locations
-- =============================================================

-- Transporters table
CREATE TABLE "public"."transporters" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone_number" TEXT,
    "address" TEXT,
    "city" TEXT,
    "zip_code" TEXT,
    "country" TEXT,
    "diesel_surcharge_percentage" NUMERIC(5,2) DEFAULT 0.00 CHECK (diesel_surcharge_percentage >= 0 AND diesel_surcharge_percentage <= 100),
    "notes" TEXT,
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Transporter routes (hub-to-hub)
CREATE TABLE "public"."transporter_routes" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "transporter_id" UUID NOT NULL REFERENCES transporters(id) ON DELETE CASCADE,
    "origin_hub_id" UUID NOT NULL REFERENCES hubs(id),
    "destination_hub_id" UUID NOT NULL REFERENCES hubs(id),
    "transport_duration_days" INTEGER NOT NULL CHECK (transport_duration_days > 0),
    "fixed_departure_days" day_of_week_enum[], -- e.g. ['monday', 'wednesday', 'friday']
    "customs_cost_per_shipment" NUMERIC(10,2) DEFAULT 0.00 CHECK (customs_cost_per_shipment >= 0),
    "customs_description" TEXT, -- Optional description of customs requirements
    "notes" TEXT,
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(transporter_id, origin_hub_id, destination_hub_id),
    CHECK (origin_hub_id != destination_hub_id)
);

-- Price bands for different pallet quantities and dimensions (groupage vs full truck)
CREATE TABLE "public"."transporter_route_price_bands" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "transporter_route_id" UUID NOT NULL REFERENCES transporter_routes(id) ON DELETE CASCADE,
    "pallet_dimensions" TEXT NOT NULL CHECK (pallet_dimensions IN ('120x80', '120x100')), -- Standard dimensions in cm
    "min_pallets" INTEGER NOT NULL CHECK (min_pallets > 0),
    "max_pallets" INTEGER CHECK (max_pallets IS NULL OR max_pallets >= min_pallets),
    "price_per_pallet" NUMERIC(10,2) NOT NULL CHECK (price_per_pallet > 0),
    "created_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    "last_updated_at" TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(transporter_route_id, pallet_dimensions, min_pallets) -- Prevent overlapping bands for same pallet size
);

-- =============================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================

-- Transporters indexes
CREATE INDEX "idx_transporters_is_active" ON "public"."transporters"(is_active);
CREATE INDEX "idx_transporters_country" ON "public"."transporters"(country);
CREATE INDEX "idx_transporters_city" ON "public"."transporters"(city);

-- Transporter routes indexes  
CREATE INDEX "idx_transporter_routes_transporter_id" ON "public"."transporter_routes"(transporter_id);
CREATE INDEX "idx_transporter_routes_origin_hub" ON "public"."transporter_routes"(origin_hub_id);
CREATE INDEX "idx_transporter_routes_destination_hub" ON "public"."transporter_routes"(destination_hub_id);
CREATE INDEX "idx_transporter_routes_is_active" ON "public"."transporter_routes"(is_active);
CREATE INDEX "idx_transporter_routes_departure_days" ON "public"."transporter_routes" USING GIN(fixed_departure_days);

-- Price bands indexes
CREATE INDEX "idx_transporter_route_price_bands_route_id" ON "public"."transporter_route_price_bands"(transporter_route_id);
CREATE INDEX "idx_transporter_route_price_bands_dimensions" ON "public"."transporter_route_price_bands"(pallet_dimensions);
CREATE INDEX "idx_transporter_route_price_bands_pallets" ON "public"."transporter_route_price_bands"(min_pallets, max_pallets);
CREATE INDEX "idx_transporter_route_price_bands_updated" ON "public"."transporter_route_price_bands"(last_updated_at DESC);
CREATE INDEX "idx_transporter_route_price_bands_composite" ON "public"."transporter_route_price_bands"(transporter_route_id, pallet_dimensions);

-- =============================================================
-- PERMISSIONS (following existing pattern)
-- =============================================================

-- Grant permissions to all roles for development
GRANT ALL ON TABLE "public"."transporters" TO "anon";
GRANT ALL ON TABLE "public"."transporters" TO "authenticated"; 
GRANT ALL ON TABLE "public"."transporters" TO "service_role";

GRANT ALL ON TABLE "public"."transporter_routes" TO "anon";
GRANT ALL ON TABLE "public"."transporter_routes" TO "authenticated";
GRANT ALL ON TABLE "public"."transporter_routes" TO "service_role";

GRANT ALL ON TABLE "public"."transporter_route_price_bands" TO "anon";
GRANT ALL ON TABLE "public"."transporter_route_price_bands" TO "authenticated";
GRANT ALL ON TABLE "public"."transporter_route_price_bands" TO "service_role";

-- =============================================================
-- HELPER FUNCTIONS FOR LOGISTICS PLANNING
-- =============================================================

-- Function to calculate total cost including diesel surcharge and customs costs for specific pallet dimensions
CREATE OR REPLACE FUNCTION calculate_route_cost(
    p_route_id UUID,
    p_pallet_count INTEGER,
    p_pallet_dimensions TEXT DEFAULT '120x100'
) RETURNS TABLE (
    pallet_dimensions TEXT,
    base_cost NUMERIC(10,2),
    diesel_surcharge NUMERIC(10,2),
    customs_cost NUMERIC(10,2),
    total_cost NUMERIC(10,2),
    price_age_days INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pb.pallet_dimensions,
        (pb.price_per_pallet * p_pallet_count) as base_cost,
        (pb.price_per_pallet * p_pallet_count * t.diesel_surcharge_percentage / 100) as diesel_surcharge,
        tr.customs_cost_per_shipment as customs_cost,
        (pb.price_per_pallet * p_pallet_count * (1 + t.diesel_surcharge_percentage / 100) + tr.customs_cost_per_shipment) as total_cost,
        EXTRACT(DAY FROM NOW() - pb.last_updated_at)::INTEGER as price_age_days
    FROM transporter_route_price_bands pb
    JOIN transporter_routes tr ON pb.transporter_route_id = tr.id
    JOIN transporters t ON tr.transporter_id = t.id
    WHERE tr.id = p_route_id
    AND pb.pallet_dimensions = p_pallet_dimensions
    AND pb.min_pallets <= p_pallet_count
    AND (pb.max_pallets IS NULL OR pb.max_pallets >= p_pallet_count)
    ORDER BY pb.price_per_pallet ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to find direct routes between hubs for specific pallet dimensions
CREATE OR REPLACE FUNCTION find_direct_routes(
    p_origin_hub_id UUID,
    p_destination_hub_id UUID,
    p_pallet_count INTEGER DEFAULT NULL,
    p_pallet_dimensions TEXT DEFAULT '120x100'
) RETURNS TABLE (
    transporter_name TEXT,
    route_id UUID,
    pallet_dimensions TEXT,
    transport_days INTEGER,
    departure_days day_of_week_enum[],
    base_cost NUMERIC(10,2),
    diesel_surcharge NUMERIC(10,2),
    customs_cost NUMERIC(10,2),
    total_cost NUMERIC(10,2),
    price_age_days INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.name as transporter_name,
        tr.id as route_id,
        COALESCE(costs.pallet_dimensions, 'N/A') as pallet_dimensions,
        tr.transport_duration_days as transport_days,
        tr.fixed_departure_days as departure_days,
        COALESCE(costs.base_cost, 0) as base_cost,
        COALESCE(costs.diesel_surcharge, 0) as diesel_surcharge,
        COALESCE(costs.customs_cost, 0) as customs_cost,
        COALESCE(costs.total_cost, 0) as total_cost,
        COALESCE(costs.price_age_days, 999) as price_age_days
    FROM transporter_routes tr
    JOIN transporters t ON tr.transporter_id = t.id
    LEFT JOIN LATERAL calculate_route_cost(tr.id, COALESCE(p_pallet_count, 1), p_pallet_dimensions) costs ON true
    WHERE tr.origin_hub_id = p_origin_hub_id
    AND tr.destination_hub_id = p_destination_hub_id
    AND tr.is_active = true
    AND t.is_active = true
    AND (p_pallet_dimensions IS NULL OR costs.pallet_dimensions IS NOT NULL)
    ORDER BY costs.total_cost ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql;


-- =============================================================
-- COMMON QUERIES FOR LOGISTICS PLANNING
-- =============================================================

/*
-- 1. Find all direct routes from hub A to hub B with costs
SELECT * FROM find_direct_routes(
    'origin-hub-uuid',
    'destination-hub-uuid', 
    10  -- for 10 pallets
);

-- 2. Get all routes for a specific transporter with current pricing
SELECT 
    t.name as transporter,
    oh.name as origin_hub,
    dh.name as destination_hub,
    tr.transport_duration_days,
    tr.fixed_departure_days,
    pb.min_pallets,
    pb.max_pallets,
    pb.price_per_pallet,
    tr.customs_cost_per_shipment,
    tr.customs_description,
    EXTRACT(DAY FROM NOW() - pb.last_updated_at) as price_age_days,
    t.diesel_surcharge_percentage
FROM transporters t
JOIN transporter_routes tr ON t.id = tr.transporter_id
JOIN hubs oh ON tr.origin_hub_id = oh.id
JOIN hubs dh ON tr.destination_hub_id = dh.id
JOIN transporter_route_price_bands pb ON tr.id = pb.transporter_route_id
WHERE t.name = 'European Express Logistics'
AND tr.is_active = true
ORDER BY oh.name, dh.name, pb.min_pallets;

-- 3. Find routes with outdated pricing (older than 30 days)
SELECT 
    t.name as transporter,
    oh.name as origin,
    dh.name as destination,
    pb.last_updated_at,
    EXTRACT(DAY FROM NOW() - pb.last_updated_at) as days_old
FROM transporter_route_price_bands pb
JOIN transporter_routes tr ON pb.transporter_route_id = tr.id
JOIN transporters t ON tr.transporter_id = t.id
JOIN hubs oh ON tr.origin_hub_id = oh.id  
JOIN hubs dh ON tr.destination_hub_id = dh.id
WHERE pb.last_updated_at < NOW() - INTERVAL '30 days'
ORDER BY pb.last_updated_at ASC;

-- 4. Route chaining query (find 2-hop routes when no direct route exists)
WITH possible_connections AS (
    SELECT DISTINCT
        tr1.origin_hub_id as start_hub,
        tr1.destination_hub_id as intermediate_hub,
        tr2.destination_hub_id as end_hub,
        tr1.id as first_route_id,
        tr2.id as second_route_id,
        (tr1.transport_duration_days + tr2.transport_duration_days) as total_days
    FROM transporter_routes tr1
    JOIN transporter_routes tr2 ON tr1.destination_hub_id = tr2.origin_hub_id
    WHERE tr1.is_active = true 
    AND tr2.is_active = true
    AND tr1.origin_hub_id != tr2.destination_hub_id
)
SELECT 
    oh.name as origin_hub,
    ih.name as intermediate_hub, 
    dh.name as destination_hub,
    pc.total_days,
    t1.name as first_transporter,
    t2.name as second_transporter
FROM possible_connections pc
JOIN hubs oh ON pc.start_hub = oh.id
JOIN hubs ih ON pc.intermediate_hub = ih.id
JOIN hubs dh ON pc.end_hub = dh.id
JOIN transporter_routes tr1 ON pc.first_route_id = tr1.id
JOIN transporter_routes tr2 ON pc.second_route_id = tr2.id
JOIN transporters t1 ON tr1.transporter_id = t1.id
JOIN transporters t2 ON tr2.transporter_id = t2.id
WHERE pc.start_hub = 'your-origin-hub-uuid'
AND pc.end_hub = 'your-destination-hub-uuid'
ORDER BY pc.total_days ASC;
*/