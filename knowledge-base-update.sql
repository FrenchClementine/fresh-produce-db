-- ============================================================
-- PSE Knowledge Base — Media & Source columns migration
-- Run AFTER knowledge-base.sql
-- ============================================================

ALTER TABLE whatsapp_messages
  ADD COLUMN IF NOT EXISTS has_media   BOOLEAN  DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS media_type  TEXT,       -- 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'gif' | 'contact' | 'file'
  ADD COLUMN IF NOT EXISTS source      TEXT DEFAULT 'live'; -- 'live' | 'export'

-- Index for filtering by source or media
CREATE INDEX IF NOT EXISTS whatsapp_messages_source_idx ON whatsapp_messages(source);
CREATE INDEX IF NOT EXISTS whatsapp_messages_has_media_idx ON whatsapp_messages(has_media) WHERE has_media = TRUE;

-- Comment for reference
COMMENT ON COLUMN whatsapp_messages.has_media  IS 'True when the message contained an attachment (image, video, document, etc.)';
COMMENT ON COLUMN whatsapp_messages.media_type IS 'Type of attachment: image, video, audio, document, sticker, gif, contact, file';
COMMENT ON COLUMN whatsapp_messages.source     IS 'live = captured in real-time by scraper, export = imported from WhatsApp export file';
