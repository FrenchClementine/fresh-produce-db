-- Disable RLS on customer requests tables
ALTER TABLE customer_product_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE request_supplier_matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE request_activity_log DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Staff can view all customer requests" ON customer_product_requests;
DROP POLICY IF EXISTS "Staff can create customer requests" ON customer_product_requests;
DROP POLICY IF EXISTS "Staff can update customer requests" ON customer_product_requests;
DROP POLICY IF EXISTS "Staff can view all supplier matches" ON request_supplier_matches;
DROP POLICY IF EXISTS "Staff can create supplier matches" ON request_supplier_matches;
DROP POLICY IF EXISTS "Staff can update supplier matches" ON request_supplier_matches;
DROP POLICY IF EXISTS "Staff can view all activity logs" ON request_activity_log;
DROP POLICY IF EXISTS "Staff can create activity logs" ON request_activity_log;

-- Grant full access to authenticated users
GRANT ALL ON customer_product_requests TO authenticated;
GRANT ALL ON request_supplier_matches TO authenticated;
GRANT ALL ON request_activity_log TO authenticated;

-- Grant usage on sequences if they exist
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
