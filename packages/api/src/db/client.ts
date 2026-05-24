import pg from 'pg';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

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
  const sql = readFileSync(join(dir, 'migrations', '001_initial.sql'), 'utf8');
  await db.query(sql);
}
