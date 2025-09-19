-- Option 1: Make created_by_staff_id nullable for development
ALTER TABLE "public"."supplier_prices" ALTER COLUMN "created_by_staff_id" DROP NOT NULL;

-- Option 2: Create a default staff member for system operations
-- (Run this if you prefer to have a real staff member)
-- INSERT INTO staff (id, name, email)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'System User', 'system@example.com')
-- ON CONFLICT (id) DO NOTHING;