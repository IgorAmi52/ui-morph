DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'morph_configs'
      AND column_name = 'route_id'
  ) THEN
    ALTER TABLE morph_configs
      ADD COLUMN route_id VARCHAR(255) NOT NULL DEFAULT 'default';

    UPDATE morph_configs
    SET route_id = view_id
    WHERE route_id = 'default';
  END IF;
END $$;

ALTER TABLE morph_configs
  DROP CONSTRAINT IF EXISTS morph_configs_user_view_session_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'morph_configs_user_view_session_route_key'
  ) THEN
    ALTER TABLE morph_configs
      ADD CONSTRAINT morph_configs_user_view_session_route_key
      UNIQUE (user_id, view_id, session_id, route_id);
  END IF;
END $$;

DROP INDEX IF EXISTS idx_morph_configs_user_view_session;

CREATE INDEX IF NOT EXISTS idx_morph_configs_user_view_session_route
  ON morph_configs (user_id, view_id, session_id, route_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'morph_chat_history'
      AND column_name = 'route_id'
  ) THEN
    ALTER TABLE morph_chat_history
      ADD COLUMN route_id VARCHAR(255) NOT NULL DEFAULT 'default';

    UPDATE morph_chat_history
    SET route_id = view_id
    WHERE route_id = 'default';
  END IF;
END $$;

ALTER TABLE morph_chat_history
  DROP CONSTRAINT IF EXISTS morph_chat_history_pkey;

ALTER TABLE morph_chat_history
  ADD PRIMARY KEY (user_id, view_id, session_id, route_id);

DROP INDEX IF EXISTS idx_morph_chat_history_user_view_session;

CREATE INDEX IF NOT EXISTS idx_morph_chat_history_user_view_session_route
  ON morph_chat_history (user_id, view_id, session_id, route_id);
