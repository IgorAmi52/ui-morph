CREATE TABLE IF NOT EXISTS morph_share_links (
  token       VARCHAR(64) PRIMARY KEY,
  user_id     VARCHAR(255) NOT NULL,
  view_id     VARCHAR(255) NOT NULL,
  overrides   JSONB NOT NULL DEFAULT '{}',
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_morph_share_links_expires
  ON morph_share_links (expires_at);
