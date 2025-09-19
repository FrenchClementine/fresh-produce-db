-- First, drop any existing policies
DROP POLICY IF EXISTS "Allow read access to supplier prices" ON "public"."supplier_prices";
DROP POLICY IF EXISTS "Allow insert access to supplier prices" ON "public"."supplier_prices";
DROP POLICY IF EXISTS "Allow update access to supplier prices" ON "public"."supplier_prices";
DROP POLICY IF EXISTS "Allow delete access to supplier prices" ON "public"."supplier_prices";
DROP POLICY IF EXISTS "Allow all operations on supplier prices" ON "public"."supplier_prices";

-- Disable RLS completely on supplier_prices table
ALTER TABLE "public"."supplier_prices" DISABLE ROW LEVEL SECURITY;

-- Make sure the table is accessible to all roles
GRANT ALL ON "public"."supplier_prices" TO authenticated;
GRANT ALL ON "public"."supplier_prices" TO anon;
GRANT ALL ON "public"."supplier_prices" TO service_role;

-- Grant access to the view as well
GRANT SELECT ON "public"."current_supplier_prices" TO authenticated;
GRANT SELECT ON "public"."current_supplier_prices" TO anon;
GRANT SELECT ON "public"."current_supplier_prices" TO service_role;

-- If the view doesn't exist or has issues, create a simple one
DROP VIEW IF EXISTS "public"."current_supplier_prices";
CREATE VIEW "public"."current_supplier_prices" AS
SELECT
    sp.*,
    s.name as supplier_name,
    h.name as hub_name,
    h.hub_code,
    pps.product_id,
    p.name as product_name,
    p.sold_by,
    po.label as packaging_label,
    sz.name as size_name,
    pps.boxes_per_pallet,
    pps.weight_per_box,
    pps.weight_per_pallet,
    pps.weight_unit,
    -- Calculate units per pallet based on sold_by
    CASE
        WHEN p.sold_by = 'kg' THEN
            COALESCE(pps.weight_per_pallet, pps.boxes_per_pallet * pps.weight_per_box)
        WHEN p.sold_by = 'box' THEN
            pps.boxes_per_pallet
        ELSE
            NULL
    END as units_per_pallet,
    json_build_object(
        'products', json_build_object(
            'id', p.id,
            'name', p.name,
            'category', p.category,
            'sold_by', p.sold_by
        ),
        'weight_per_pallet', pps.weight_per_pallet,
        'boxes_per_pallet', pps.boxes_per_pallet,
        'weight_per_box', pps.weight_per_box,
        'weight_unit', pps.weight_unit
    ) as product_packaging_specs
FROM supplier_prices sp
JOIN suppliers s ON sp.supplier_id = s.id
JOIN hubs h ON sp.hub_id = h.id
JOIN supplier_product_packaging_spec spps ON sp.supplier_product_packaging_spec_id = spps.id
JOIN product_packaging_specs pps ON spps.product_packaging_spec_id = pps.id
JOIN products p ON pps.product_id = p.id
JOIN packaging_options po ON pps.packaging_id = po.id
JOIN size_options sz ON pps.size_option_id = sz.id
WHERE sp.is_active = true
AND sp.valid_from <= now()
AND sp.valid_until > now();

-- Grant access to the recreated view
GRANT SELECT ON "public"."current_supplier_prices" TO authenticated;
GRANT SELECT ON "public"."current_supplier_prices" TO anon;
GRANT SELECT ON "public"."current_supplier_prices" TO service_role;