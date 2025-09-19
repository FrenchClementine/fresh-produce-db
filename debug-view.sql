-- Debug the current supplier prices to see what values we're getting
SELECT
    p.name as product_name,
    p.sold_by,
    pps.boxes_per_pallet,
    pps.weight_per_box,
    pps.weight_per_pallet,
    pps.weight_unit,
    CASE
        WHEN p.sold_by = 'kg' THEN
            COALESCE(pps.weight_per_pallet, pps.boxes_per_pallet * pps.weight_per_box)
        WHEN p.sold_by = 'box' THEN
            pps.boxes_per_pallet
        ELSE
            NULL
    END as calculated_units_per_pallet
FROM supplier_prices sp
JOIN supplier_product_packaging_spec spps ON sp.supplier_product_packaging_spec_id = spps.id
JOIN product_packaging_specs pps ON spps.product_packaging_spec_id = pps.id
JOIN products p ON pps.product_id = p.id
WHERE sp.is_active = true
LIMIT 5;