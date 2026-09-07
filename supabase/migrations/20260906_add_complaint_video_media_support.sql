-- Migration: Add video media support and metadata for complaint proofs
-- Run this in your Supabase SQL Editor

-- 1. Add metadata columns to media table if they do not exist
ALTER TABLE media ADD COLUMN IF NOT EXISTS media_type TEXT; -- 'image' | 'video'
ALTER TABLE media ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE media ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;

-- 2. Update complaint-media bucket in storage.buckets:
--    - Raise file size limit to 50 MB (52,428,800 bytes) to accommodate short video clips
--    - Add video mime types: video/mp4, video/webm, video/quicktime, video/3gpp, video/x-matroska
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('complaint-media', 'complaint-media', true, 52428800,
    ARRAY[
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/3gpp',
      'video/x-matroska'
    ])
ON CONFLICT (id) DO UPDATE
  SET file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Ensure index exists on media table context and context_id
CREATE INDEX IF NOT EXISTS idx_media_context_context_id ON media(context, context_id);
