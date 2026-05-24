CREATE TABLE IF NOT EXISTS morph_pages (
  page_id          VARCHAR(64) PRIMARY KEY,
  owner_user_id    VARCHAR(255) NOT NULL,
  owner_session_id VARCHAR(255) NOT NULL,
  source_route_id  VARCHAR(255) NOT NULL,
  view_id          VARCHAR(255) NOT NULL,
  route_id         VARCHAR(255) NOT NULL,
  title            VARCHAR(255) NOT NULL,
  prompt           TEXT NOT NULL,
  sources          JSONB NOT NULL DEFAULT '[]',
  definition       JSONB NOT NULL,
  overrides        JSONB NOT NULL DEFAULT '{}',
  version          INTEGER NOT NULL DEFAULT 1,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_morph_pages_owner_created
  ON morph_pages (owner_user_id, owner_session_id, created_at DESC);
