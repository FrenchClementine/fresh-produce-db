-- Check if Rocket product exists
SELECT id, name FROM products WHERE name ILIKE '%rocket%' AND is_active = true;

-- Check if there are packaging specs for Rocket
SELECT pps.id, pps.product_id, p.name as product_name
FROM product_packaging_specs pps
JOIN products p ON p.id = pps.product_id
WHERE p.name ILIKE '%rocket%';

-- Check if there are suppliers for Rocket
SELECT
  s.name as supplier_name,
  s.country,
  s.city,
  spps.id as supplier_product_spec_id
FROM supplier_product_packaging_spec spps
JOIN suppliers s ON s.id = spps.supplier_id
JOIN product_packaging_specs pps ON pps.id = spps.product_packaging_spec_id
JOIN products p ON p.id = pps.product_id
WHERE p.name ILIKE '%rocket%';
