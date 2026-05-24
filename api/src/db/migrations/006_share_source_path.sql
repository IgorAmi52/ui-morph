ALTER TABLE morph_shares
  ADD COLUMN IF NOT EXISTS source_path TEXT;
