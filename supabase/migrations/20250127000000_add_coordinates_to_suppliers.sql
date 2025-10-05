-- Add latitude and longitude to suppliers table for weather tracking
ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add comment
COMMENT ON COLUMN suppliers.latitude IS 'Latitude coordinate for weather API integration';
COMMENT ON COLUMN suppliers.longitude IS 'Longitude coordinate for weather API integration';

-- Example data for Spain (you can update these with actual coordinates)
-- Valencia, Spain: 39.4699, -0.3763
-- Murcia, Spain: 37.9922, -1.1307
-- Almeria, Spain: 36.8381, -2.4597
