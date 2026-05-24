import 'dotenv/config';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { closePool, getPool, resetPool, runMigrations } from '../db/client.js';

const defaultDatabaseUrl =
  'postgresql://ui_morph:ui_morph@localhost:5432/ui_morph';

beforeAll(async () => {
  process.env.DATABASE_URL ??= defaultDatabaseUrl;
  resetPool();
  await runMigrations();
});

beforeEach(async () => {
  await getPool().query(
    'TRUNCATE morph_configs, morph_chat_history, morph_share_actions, morph_shares, morph_pages RESTART IDENTITY',
  );
});

afterAll(async () => {
  await closePool();
});
