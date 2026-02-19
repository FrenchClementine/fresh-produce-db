-- ============================================================
-- PSE WhatsApp Knowledge Base - Complete SQL Setup
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 2. Create whatsapp_messages table
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text UNIQUE NOT NULL,        -- WhatsApp message ID (prevents duplicates)
  group_id text NOT NULL,                  -- WhatsApp group JID (e.g. 120363000000000000@g.us)
  group_name text NOT NULL,               -- Human-readable group name (e.g. "PSE Office")
  sender_jid text NOT NULL,              -- Sender's WhatsApp JID
  sender_name text NOT NULL,             -- Sender's display name
  body text NOT NULL,                    -- Message text content
  timestamp timestamptz NOT NULL,        -- When the message was sent
  embedding vector(1536),               -- OpenAI text-embedding-3-small
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 3. Indexes for performance
-- ============================================================

-- Vector similarity search index (ivfflat for cosine similarity)
CREATE INDEX IF NOT EXISTS whatsapp_messages_embedding_idx
  ON whatsapp_messages USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Group filtering
CREATE INDEX IF NOT EXISTS whatsapp_messages_group_idx
  ON whatsapp_messages(group_id);

-- Timestamp ordering
CREATE INDEX IF NOT EXISTS whatsapp_messages_timestamp_idx
  ON whatsapp_messages(timestamp DESC);

-- Full-text search
CREATE INDEX IF NOT EXISTS whatsapp_messages_fts_idx
  ON whatsapp_messages USING gin(to_tsvector('english', body));

-- Sender filtering
CREATE INDEX IF NOT EXISTS whatsapp_messages_sender_idx
  ON whatsapp_messages(sender_name);

-- ============================================================
-- 4. hybrid_search function
-- Combines 70% semantic + 30% keyword search
-- ============================================================
CREATE OR REPLACE FUNCTION hybrid_search(
  search_query text,
  query_embedding vector(1536),
  match_count int DEFAULT 20,
  filter_group text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  message_id text,
  group_name text,
  sender_name text,
  body text,
  "timestamp" timestamptz,
  similarity float,
  keyword_rank float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH semantic AS (
    SELECT
      wm.id,
      wm.message_id,
      wm.group_name,
      wm.sender_name,
      wm.body,
      wm.timestamp,
      (1 - (wm.embedding <=> query_embedding))::float AS semantic_score
    FROM whatsapp_messages wm
    WHERE
      wm.embedding IS NOT NULL
      AND (filter_group IS NULL OR wm.group_name ILIKE '%' || filter_group || '%')
    ORDER BY wm.embedding <=> query_embedding
    LIMIT match_count * 3
  ),
  keyword AS (
    SELECT
      wm.id,
      ts_rank_cd(
        to_tsvector('english', wm.body),
        plainto_tsquery('english', search_query)
      )::float AS kw_score
    FROM whatsapp_messages wm
    WHERE
      to_tsvector('english', wm.body) @@ plainto_tsquery('english', search_query)
      AND (filter_group IS NULL OR wm.group_name ILIKE '%' || filter_group || '%')
  )
  SELECT
    s.id,
    s.message_id,
    s.group_name,
    s.sender_name,
    s.body,
    s.timestamp,
    (0.7 * s.semantic_score + 0.3 * COALESCE(k.kw_score, 0))::float AS similarity,
    COALESCE(k.kw_score, 0)::float AS keyword_rank
  FROM semantic s
  LEFT JOIN keyword k ON k.id = s.id
  ORDER BY (0.7 * s.semantic_score + 0.3 * COALESCE(k.kw_score, 0)) DESC
  LIMIT match_count;
END;
$$;

-- ============================================================
-- 5. context_search function (MAIN search function)
-- Runs entity + keyword + semantic in parallel, deduplicates
-- ============================================================
CREATE OR REPLACE FUNCTION context_search(
  search_query text,
  query_embedding vector(1536),
  match_count int DEFAULT 20,
  filter_group text DEFAULT NULL,
  time_window_hours int DEFAULT 24
)
RETURNS TABLE(
  id uuid,
  message_id text,
  group_name text,
  sender_name text,
  body text,
  "timestamp" timestamptz,
  similarity float,
  match_type text,
  media_url text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH
  -- Entity matches: exact phrase/name match (highest confidence)
  -- Split query into individual words for AND matching
  query_words AS (
    SELECT array_agg(w) AS words, count(*) AS word_count
    FROM UNNEST(regexp_split_to_array(trim(lower(search_query)), '\s+')) AS w
    WHERE length(w) > 1
  ),
  entity_matches AS (
    SELECT
      wm.id,
      wm.message_id,
      wm.group_name,
      wm.sender_name,
      wm.body,
      wm.timestamp,
      -- Exact phrase = 0.99, all-words-present = 0.95
      CASE WHEN lower(wm.body) LIKE '%' || lower(search_query) || '%' THEN 0.99::float
           ELSE 0.95::float END AS score,
      'entity'::text AS match_type,
      wm.media_url
    FROM whatsapp_messages wm, query_words qw
    WHERE
      -- ALL query words must appear in the body (Obsidian-style AND)
      (SELECT COUNT(*) FROM UNNEST(qw.words) AS w WHERE lower(wm.body) LIKE '%' || w || '%') = qw.word_count
      AND (filter_group IS NULL OR wm.group_name ILIKE '%' || filter_group || '%')
    ORDER BY score DESC, wm.timestamp DESC
    LIMIT match_count
  ),
  -- Keyword matches: full-text search + partial word-coverage fallback
  keyword_matches AS (
    SELECT
      wm.id,
      wm.message_id,
      wm.group_name,
      wm.sender_name,
      wm.body,
      wm.timestamp,
      GREATEST(
        -- Full-text rank (handles stemming, etc.)
        COALESCE(ts_rank_cd(
          to_tsvector('english', wm.body),
          plainto_tsquery('english', search_query)
        )::float, 0),
        -- Partial ILIKE coverage: fraction of words that match
        (SELECT COUNT(*)::float FROM UNNEST(qw.words) AS w WHERE lower(wm.body) LIKE '%' || w || '%')
          / NULLIF(qw.word_count::float, 0) * 0.5
      ) AS score,
      'keyword'::text AS match_type,
      wm.media_url
    FROM whatsapp_messages wm, query_words qw
    WHERE
      -- At least ONE word matches (broader net than entity_matches)
      (
        to_tsvector('english', wm.body) @@ plainto_tsquery('english', search_query)
        OR (SELECT COUNT(*) FROM UNNEST(qw.words) AS w WHERE lower(wm.body) LIKE '%' || w || '%') >= 1
      )
      AND wm.id NOT IN (SELECT em.id FROM entity_matches em)
      AND (filter_group IS NULL OR wm.group_name ILIKE '%' || filter_group || '%')
    ORDER BY score DESC
    LIMIT match_count
  ),
  -- Semantic matches: vector similarity search
  semantic_matches AS (
    SELECT
      wm.id,
      wm.message_id,
      wm.group_name,
      wm.sender_name,
      wm.body,
      wm.timestamp,
      (1 - (wm.embedding <=> query_embedding))::float AS score,
      'semantic'::text AS match_type,
      wm.media_url
    FROM whatsapp_messages wm
    WHERE
      wm.embedding IS NOT NULL
      AND wm.id NOT IN (SELECT em.id FROM entity_matches em)
      AND wm.id NOT IN (SELECT km.id FROM keyword_matches km)
      AND (filter_group IS NULL OR wm.group_name ILIKE '%' || filter_group || '%')
    ORDER BY wm.embedding <=> query_embedding
    LIMIT match_count
  ),
  combined AS (
    SELECT * FROM entity_matches
    UNION ALL
    SELECT * FROM keyword_matches
    UNION ALL
    SELECT * FROM semantic_matches
  )
  SELECT
    c.id,
    c.message_id,
    c.group_name,
    c.sender_name,
    c.body,
    c.timestamp,
    c.score AS similarity,
    c.match_type,
    c.media_url
  FROM combined c
  ORDER BY
    CASE c.match_type
      WHEN 'entity'   THEN 1
      WHEN 'keyword'  THEN 2
      ELSE                 3
    END,
    c.score DESC
  LIMIT match_count;
END;
$$;

-- ============================================================
-- 6. get_thread_context function
-- Given a message ID, returns surrounding messages in same group
-- ============================================================
CREATE OR REPLACE FUNCTION get_thread_context(
  target_message_id uuid,
  context_window_minutes int DEFAULT 30,
  max_messages int DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  message_id text,
  group_name text,
  sender_name text,
  body text,
  "timestamp" timestamptz,
  is_target boolean,
  media_url text
)
LANGUAGE plpgsql
AS $$
DECLARE
  target_timestamp timestamptz;
  target_group_id text;
BEGIN
  -- Get target message details
  SELECT wm.timestamp, wm.group_id
  INTO target_timestamp, target_group_id
  FROM whatsapp_messages wm
  WHERE wm.id = target_message_id;

  IF target_timestamp IS NULL THEN
    RETURN; -- Message not found
  END IF;

  RETURN QUERY
  SELECT
    wm.id,
    wm.message_id,
    wm.group_name,
    wm.sender_name,
    wm.body,
    wm.timestamp,
    (wm.id = target_message_id) AS is_target,
    wm.media_url
  FROM whatsapp_messages wm
  WHERE
    wm.group_id = target_group_id
    AND wm.timestamp BETWEEN
      (target_timestamp - (context_window_minutes || ' minutes')::interval)
      AND
      (target_timestamp + (context_window_minutes || ' minutes')::interval)
  ORDER BY wm.timestamp ASC
  LIMIT max_messages;
END;
$$;

-- ============================================================
-- 7. Row Level Security (RLS)
-- ============================================================
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read messages
CREATE POLICY "Authenticated users can read messages"
  ON whatsapp_messages FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can insert (scraper uses service role key)
CREATE POLICY "Service role can insert messages"
  ON whatsapp_messages FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================
-- 8. Grant permissions
-- ============================================================
-- Read access for search (anon key used by the search API)
GRANT SELECT ON whatsapp_messages TO anon, authenticated;

-- Write access for the upload/ingest API (uses service_role key)
GRANT INSERT, UPDATE, DELETE ON whatsapp_messages TO service_role;

-- Function execution
GRANT EXECUTE ON FUNCTION hybrid_search TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION context_search TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_thread_context TO anon, authenticated, service_role;

-- ============================================================
-- DONE. Run the above in Supabase SQL Editor.
-- Next: deploy the edge function + run the WhatsApp scraper.
-- ============================================================
