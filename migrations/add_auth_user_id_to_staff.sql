-- Add auth_user_id column to staff table
-- This column will link staff records to Supabase auth users

ALTER TABLE staff
ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add comment to explain the column
COMMENT ON COLUMN staff.auth_user_id IS 'Links staff member to Supabase auth user account';

-- Add index for better performance when looking up staff by auth user
CREATE INDEX idx_staff_auth_user_id ON staff(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- Make the auth_user_id unique to ensure one-to-one relationship
ALTER TABLE staff
ADD CONSTRAINT staff_auth_user_id_unique UNIQUE (auth_user_id);