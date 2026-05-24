import { randomUUID } from 'node:crypto';
import { getPool } from '../db/client.js';
import type { MorphConfig, ShareMetadata } from '../types.js';
import { ValidationError, validateConfig } from './validationService.js';

const DEFAULT_SESSION_ID = 'default';

interface ShareRow {
  share_id: string;
  source_user_id: string;
  source_view_id: string;
  source_session_id: string;
  source_route_id: string;
  source_path: string | null;
  version: number;
  created_at: Date;
  updated_at: Date;
}

function metadataFromRow(row: ShareRow): ShareMetadata {
  return {
    shareId: row.share_id,
    userId: row.source_user_id,
    viewId: row.source_view_id,
    sessionId: row.source_session_id,
    routeId: row.source_route_id,
    sourcePath: row.source_path ?? undefined,
    version: row.version,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function parseConfig(raw: unknown): MorphConfig {
  if (raw === null || raw === undefined) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ValidationError('Stored shared overrides must be a JSON object');
  }
  return validateConfig(raw as Record<string, unknown>);
}

function requiredString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`${key} is required`);
  }
  return value.trim();
}

export function validateCreateShareBody(body: unknown): {
  userId: string;
  viewId: string;
  sessionId: string;
  routeId: string;
  sourcePath?: string;
  overrides: MorphConfig;
} {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ValidationError('Request body must be an object');
  }
  const b = body as Record<string, unknown>;
  const userId = requiredString(b, 'userId');
  const viewId = requiredString(b, 'viewId');
  const sessionId =
    typeof b.sessionId === 'string' && b.sessionId.trim()
      ? b.sessionId.trim()
      : DEFAULT_SESSION_ID;
  const routeId =
    typeof b.routeId === 'string' && b.routeId.trim() ? b.routeId.trim() : viewId;
  const sourcePath =
    typeof b.sourcePath === 'string' && b.sourcePath.trim()
      ? b.sourcePath.trim()
      : undefined;

  if (typeof b.overrides !== 'object' || b.overrides === null || Array.isArray(b.overrides)) {
    throw new ValidationError('overrides must be an object');
  }

  return {
    userId,
    viewId,
    sessionId,
    routeId,
    sourcePath,
    overrides: validateConfig(b.overrides as Record<string, unknown>),
  };
}

export function validateSaveShareBody(body: unknown): MorphConfig {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ValidationError('Request body must be an object');
  }
  const b = body as Record<string, unknown>;
  if (typeof b.overrides !== 'object' || b.overrides === null || Array.isArray(b.overrides)) {
    throw new ValidationError('overrides must be an object');
  }
  return validateConfig(b.overrides as Record<string, unknown>);
}

export async function createShare(
  input: {
    userId: string;
    viewId: string;
    sessionId: string;
    routeId: string;
    sourcePath?: string;
    overrides: MorphConfig;
  },
  actorSessionId: string,
): Promise<ShareMetadata> {
  const db = getPool();
  const shareId = randomUUID();
  const version = 1;
  const overrides = JSON.stringify(validateConfig(input.overrides));

  const result = await db.query<ShareRow>(
    `INSERT INTO morph_shares (
       share_id,
       source_user_id,
       source_view_id,
       source_session_id,
       source_route_id,
       source_path,
       overrides,
       version
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
     RETURNING share_id, source_user_id, source_view_id, source_session_id,
       source_route_id, source_path, version, created_at, updated_at`,
    [
      shareId,
      input.userId,
      input.viewId,
      input.sessionId,
      input.routeId,
      input.sourcePath ?? null,
      overrides,
      version,
    ],
  );

  await db.query(
    `INSERT INTO morph_share_actions (share_id, actor_session_id, action, version, overrides)
     VALUES ($1, $2, 'create', $3, $4::jsonb)`,
    [shareId, actorSessionId, version, overrides],
  );

  return metadataFromRow(result.rows[0]);
}

export async function getShareMetadata(shareId: string): Promise<ShareMetadata | null> {
  const db = getPool();
  const result = await db.query<ShareRow>(
    `SELECT share_id, source_user_id, source_view_id, source_session_id,
       source_route_id, source_path, version, created_at, updated_at
     FROM morph_shares
     WHERE share_id = $1`,
    [shareId],
  );
  if (result.rowCount === 0) return null;
  return metadataFromRow(result.rows[0]);
}

export async function getShareConfig(shareId: string): Promise<MorphConfig | null> {
  const db = getPool();
  const result = await db.query<{ overrides: unknown }>(
    `SELECT overrides FROM morph_shares WHERE share_id = $1`,
    [shareId],
  );
  if (result.rowCount === 0) return null;
  return parseConfig(result.rows[0].overrides);
}

export async function saveShareConfig(
  shareId: string,
  overrides: MorphConfig,
  actorSessionId: string,
): Promise<{ config: MorphConfig; metadata: ShareMetadata } | null> {
  const validated = validateConfig(overrides);
  const serialized = JSON.stringify(validated);
  const db = getPool();
  const result = await db.query<ShareRow>(
    `UPDATE morph_shares
     SET overrides = $2::jsonb, version = version + 1, updated_at = NOW()
     WHERE share_id = $1
     RETURNING share_id, source_user_id, source_view_id, source_session_id,
       source_route_id, source_path, version, created_at, updated_at`,
    [shareId, serialized],
  );
  if (result.rowCount === 0) return null;

  const metadata = metadataFromRow(result.rows[0]);
  await db.query(
    `INSERT INTO morph_share_actions (share_id, actor_session_id, action, version, overrides)
     VALUES ($1, $2, 'save', $3, $4::jsonb)`,
    [shareId, actorSessionId, metadata.version, serialized],
  );

  return { config: validated, metadata };
}
