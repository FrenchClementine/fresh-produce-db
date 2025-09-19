-- Fix current_supplier_prices view to include product_packaging_spec_id for proper matching
DROP VIEW IF EXISTS "public"."current_supplier_prices";

CREATE VIEW "public"."current_supplier_prices" AS
SELECT
    sp.*,
    s.name as supplier_name,
    h.name as hub_name,
    h.hub_code,
    h.id as hub_id,
    pps.id as product_packaging_spec_id, -- This is the key field for matching with customer requirements
    pps.product_id,
    p.name as product_name,
    p.sold_by,
    po.label as packaging_label,
    sz.name as size_name,
    pps.boxes_per_pallet,
    pps.weight_per_box,
    pps.weight_per_pallet,
    pps.weight_unit,
    -- Simplified calculation with better fallbacks
    CASE
        WHEN p.sold_by ILIKE '%kg%' OR p.sold_by = 'kg' THEN
            COALESCE(pps.weight_per_pallet, pps.boxes_per_pallet * pps.weight_per_box, 0)
        WHEN p.sold_by ILIKE '%box%' OR p.sold_by = 'box' THEN
            COALESCE(pps.boxes_per_pallet, 0)
        ELSE
            COALESCE(pps.boxes_per_pallet, 0)
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

-- Grant permissions
GRANT SELECT ON "public"."current_supplier_prices" TO authenticated;
GRANT SELECT ON "public"."current_supplier_prices" TO anon;
GRANT SELECT ON "public"."current_supplier_prices" TO service_role;