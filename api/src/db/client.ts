import pg from 'pg';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;

const defaultDatabaseUrl =
  'postgresql://ui_morph:ui_morph@localhost:5432/ui_morph';

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL ?? defaultDatabaseUrl;

  pool = new Pool({ connectionString });
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/** Test-only: drop cached pool so the next getPool() uses current env. */
export function resetPool(): void {
  pool = null;
}

export async function runMigrations(): Promise<void> {
  const db = getPool();
  const dir = dirname(fileURLToPath(import.meta.url));
  const migrationsDir = join(dir, 'migrations');
  const migrationFiles = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    await db.query(sql);
  }
}
