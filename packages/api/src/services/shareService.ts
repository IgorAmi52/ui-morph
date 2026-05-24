import { randomBytes } from 'node:crypto';
import { getPool } from '../db/client.js';
import type { MorphConfig } from '../types.js';
import { validateConfig } from './validationService.js';
import { HttpError } from '../middleware/errorHandler.js';

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface ShareLinkRecord {
  token: string;
  userId: string;
  viewId: string;
  overrides: MorphConfig;
  expiresAt: Date;
}

function generateToken(): string {
  return randomBytes(24).toString('hex');
}

export async function createShareLink(
  userId: string,
  viewId: string,
  overrides: MorphConfig,
): Promise<ShareLinkRecord> {
  const validated = validateConfig(overrides);
  const token = generateToken();
  const expiresAt = new Date(Date.now() + DEFAULT_TTL_MS);
  const db = getPool();

  await db.query(
    `INSERT INTO morph_share_links (token, user_id, view_id, overrides, expires_at)
     VALUES ($1, $2, $3, $4::jsonb, $5)`,
    [token, userId, viewId, JSON.stringify(validated), expiresAt],
  );

  return { token, userId, viewId, overrides: validated, expiresAt };
}

export async function getShareByToken(token: string): Promise<ShareLinkRecord> {
  const db = getPool();
  const result = await db.query<{
    user_id: string;
    view_id: string;
    overrides: unknown;
    expires_at: Date;
  }>(
    `SELECT user_id, view_id, overrides, expires_at
     FROM morph_share_links
     WHERE token = $1`,
    [token],
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, 'Share link not found');
  }

  const row = result.rows[0];
  if (row.expires_at.getTime() <= Date.now()) {
    throw new HttpError(404, 'Share link has expired');
  }

  return {
    token,
    userId: row.user_id,
    viewId: row.view_id,
    overrides: validateConfig(row.overrides as Record<string, unknown>),
    expiresAt: row.expires_at,
  };
}
