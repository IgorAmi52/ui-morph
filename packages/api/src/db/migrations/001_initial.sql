CREATE TABLE IF NOT EXISTS morph_configs (
  id          SERIAL PRIMARY KEY,
  user_id     VARCHAR(255) NOT NULL,
  view_id     VARCHAR(255) NOT NULL,
  overrides   JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, view_id)
);

CREATE INDEX IF NOT EXISTS idx_morph_configs_user_view
  ON morph_configs (user_id, view_id);
