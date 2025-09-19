-- OPTION 1: Disable RLS completely (simplest solution)
ALTER TABLE "public"."supplier_prices" DISABLE ROW LEVEL SECURITY;

-- OPTION 2: Enable RLS but allow all operations (if you prefer to keep RLS enabled)
-- ALTER TABLE "public"."supplier_prices" ENABLE ROW LEVEL SECURITY;

-- DROP any existing policies first
-- DROP POLICY IF EXISTS "Allow read access to supplier prices" ON "public"."supplier_prices";
-- DROP POLICY IF EXISTS "Allow insert access to supplier prices" ON "public"."supplier_prices";
-- DROP POLICY IF EXISTS "Allow update access to supplier prices" ON "public"."supplier_prices";
-- DROP POLICY IF EXISTS "Allow delete access to supplier prices" ON "public"."supplier_prices";

-- Allow all operations to everyone (removes all restrictions)
-- CREATE POLICY "Allow all operations on supplier prices" ON "public"."supplier_prices"
-- FOR ALL USING (true) WITH CHECK (true);

-- Grant access to the view
GRANT SELECT ON "public"."current_supplier_prices" TO authenticated;
GRANT SELECT ON "public"."current_supplier_prices" TO anon;