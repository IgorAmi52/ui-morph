ALTER TABLE morph_configs
  ADD COLUMN IF NOT EXISTS session_id VARCHAR(255) NOT NULL DEFAULT 'default';

ALTER TABLE morph_configs
  DROP CONSTRAINT IF EXISTS morph_configs_user_id_view_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'morph_configs'
      AND column_name = 'route_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'morph_configs_user_view_session_key'
  ) THEN
    ALTER TABLE morph_configs
      ADD CONSTRAINT morph_configs_user_view_session_key
      UNIQUE (user_id, view_id, session_id);
  END IF;
END $$;

DROP INDEX IF EXISTS idx_morph_configs_user_view;

CREATE INDEX IF NOT EXISTS idx_morph_configs_user_view_session
  ON morph_configs (user_id, view_id, session_id);

ALTER TABLE morph_chat_history
  ADD COLUMN IF NOT EXISTS session_id VARCHAR(255) NOT NULL DEFAULT 'default';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'morph_chat_history'
      AND column_name = 'route_id'
  ) THEN
    ALTER TABLE morph_chat_history
      DROP CONSTRAINT IF EXISTS morph_chat_history_pkey;

    ALTER TABLE morph_chat_history
      ADD PRIMARY KEY (user_id, view_id, session_id);
  END IF;
END $$;

DROP INDEX IF EXISTS idx_morph_chat_history_user_view;

CREATE INDEX IF NOT EXISTS idx_morph_chat_history_user_view_session
  ON morph_chat_history (user_id, view_id, session_id);
