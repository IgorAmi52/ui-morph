CREATE TABLE IF NOT EXISTS morph_chat_history (
  user_id     VARCHAR(255) NOT NULL,
  view_id     VARCHAR(255) NOT NULL,
  messages    JSONB NOT NULL DEFAULT '[]',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, view_id)
);

CREATE INDEX IF NOT EXISTS idx_morph_chat_history_user_view
  ON morph_chat_history (user_id, view_id);
