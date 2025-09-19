-- Create a simple RPC function for finding transport routes for trade opportunities
-- This is simpler than the existing find_direct_routes function

CREATE OR REPLACE FUNCTION find_trade_transport_routes(
  p_origin_hub_id UUID,
  p_destination_hub_id UUID
)
RETURNS TABLE (
  route_id UUID,
  transporter_name TEXT,
  agent_name TEXT,
  transport_days INTEGER,
  price_per_pallet NUMERIC,
  pallet_dimensions TEXT,
  min_pallets INTEGER,
  max_pallets INTEGER
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    tr.id as route_id,
    t.name as transporter_name,
    COALESCE(s.name, 'Unknown') as agent_name,
    tr.transport_duration_days as transport_days,
    pb.price_per_pallet,
    pb.pallet_dimensions,
    pb.min_pallets,
    pb.max_pallets
  FROM transporter_routes tr
  JOIN transporters t ON tr.transporter_id = t.id
  LEFT JOIN staff s ON t.agent_id = s.id
  JOIN transporter_route_price_bands pb ON tr.id = pb.transporter_route_id
  WHERE tr.origin_hub_id = p_origin_hub_id
    AND tr.destination_hub_id = p_destination_hub_id
    AND tr.is_active = true
    AND t.is_active = true
    AND pb.pallet_dimensions = '120x100'  -- Standard pallet size for trade opportunities
  ORDER BY pb.price_per_pallet ASC;
$$;