-- ============================================================
-- PSE Knowledge Base — Media URL column + Storage bucket
-- Run AFTER knowledge-base-update.sql
-- ============================================================

-- 1. Add media_url column for storing links to actual media files
ALTER TABLE whatsapp_messages
  ADD COLUMN IF NOT EXISTS media_url TEXT; -- Public URL to media in Supabase Storage

COMMENT ON COLUMN whatsapp_messages.media_url IS
  'Public URL to the actual media file in Supabase Storage (whatsapp-media bucket)';

-- 2. Create the Storage bucket via the Supabase dashboard:
--    Storage → New bucket → Name: "whatsapp-media" → Public: ON
--    (Buckets cannot be created via SQL)

-- 3. Storage bucket policies — run these AFTER creating the bucket in the dashboard
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read whatsapp media"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'whatsapp-media');

CREATE POLICY "Service role upload whatsapp media"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'whatsapp-media');

CREATE POLICY "Service role update whatsapp media"
  ON storage.objects FOR UPDATE
  TO service_role
  USING (bucket_id = 'whatsapp-media');
