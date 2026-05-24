CREATE TABLE IF NOT EXISTS morph_shares (
  share_id          VARCHAR(64) PRIMARY KEY,
  source_user_id    VARCHAR(255) NOT NULL,
  source_view_id    VARCHAR(255) NOT NULL,
  source_session_id VARCHAR(255) NOT NULL,
  source_route_id   VARCHAR(255) NOT NULL,
  overrides         JSONB NOT NULL DEFAULT '{}',
  version           INTEGER NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS morph_share_actions (
  id               SERIAL PRIMARY KEY,
  share_id         VARCHAR(64) NOT NULL REFERENCES morph_shares (share_id) ON DELETE CASCADE,
  actor_session_id VARCHAR(255) NOT NULL,
  action           VARCHAR(32) NOT NULL,
  version          INTEGER NOT NULL,
  overrides        JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (action IN ('create', 'save'))
);

CREATE INDEX IF NOT EXISTS idx_morph_share_actions_share_created
  ON morph_share_actions (share_id, created_at);
