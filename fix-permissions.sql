-- ============================================================================
-- FIX ALL PERMISSIONS - Remove RLS and grant access to everything
-- ============================================================================

-- 1. Disable RLS on supplier_prices table
ALTER TABLE supplier_prices DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies on supplier_prices
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'supplier_prices') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON supplier_prices';
    END LOOP;
END $$;

-- 3. Grant full permissions on supplier_prices table
GRANT ALL ON supplier_prices TO authenticated;
GRANT ALL ON supplier_prices TO anon;
GRANT ALL ON supplier_prices TO service_role;
GRANT ALL ON supplier_prices TO postgres;

-- 4. Grant permissions on the view
GRANT SELECT ON current_supplier_prices TO authenticated;
GRANT SELECT ON current_supplier_prices TO anon;
GRANT SELECT ON current_supplier_prices TO service_role;
GRANT SELECT ON current_supplier_prices TO postgres;

-- 5. Grant permissions on related tables used in the view
GRANT SELECT ON suppliers TO authenticated;
GRANT SELECT ON suppliers TO anon;
GRANT SELECT ON suppliers TO service_role;

GRANT SELECT ON hubs TO authenticated;
GRANT SELECT ON hubs TO anon;
GRANT SELECT ON hubs TO service_role;

GRANT SELECT ON supplier_product_packaging_spec TO authenticated;
GRANT SELECT ON supplier_product_packaging_spec TO anon;
GRANT SELECT ON supplier_product_packaging_spec TO service_role;

GRANT SELECT ON product_packaging_specs TO authenticated;
GRANT SELECT ON product_packaging_specs TO anon;
GRANT SELECT ON product_packaging_specs TO service_role;

GRANT SELECT ON products TO authenticated;
GRANT SELECT ON products TO anon;
GRANT SELECT ON products TO service_role;

GRANT SELECT ON packaging_options TO authenticated;
GRANT SELECT ON packaging_options TO anon;
GRANT SELECT ON packaging_options TO service_role;

GRANT SELECT ON size_options TO authenticated;
GRANT SELECT ON size_options TO anon;
GRANT SELECT ON size_options TO service_role;

-- 6. Grant USAGE on sequences (if any)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 7. Verify permissions
SELECT
    'supplier_prices' as table_name,
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'supplier_prices';

SELECT
    'current_supplier_prices' as view_name,
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'current_supplier_prices';
