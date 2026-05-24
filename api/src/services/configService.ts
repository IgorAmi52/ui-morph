import { getPool } from '../db/client.js';
import type { ElementOverride, MorphConfig } from '../types.js';
import { mergeOverride } from '../agent/toolExecutors.js';
import { validateConfig, validateOverride, ValidationError } from './validationService.js';

const DEFAULT_SESSION_ID = 'default';

function parseOverrides(raw: unknown): MorphConfig {
  if (raw === null || raw === undefined) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ValidationError('Stored overrides must be a JSON object');
  }
  return validateConfig(raw as Record<string, unknown>);
}

export async function getConfig(
  userId: string,
  viewId: string,
  sessionId = DEFAULT_SESSION_ID,
  routeId = viewId,
): Promise<MorphConfig> {
  const db = getPool();
  const result = await db.query<{ overrides: unknown }>(
    `SELECT overrides FROM morph_configs
     WHERE user_id = $1 AND view_id = $2 AND session_id = $3 AND route_id = $4`,
    [userId, viewId, sessionId, routeId],
  );

  if (result.rowCount === 0) return {};
  return parseOverrides(result.rows[0].overrides);
}

export async function saveConfig(
  userId: string,
  viewId: string,
  overrides: MorphConfig,
  sessionId = DEFAULT_SESSION_ID,
  routeId = viewId,
): Promise<MorphConfig> {
  const validated = validateConfig(overrides);
  const db = getPool();

  await db.query(
    `INSERT INTO morph_configs (user_id, view_id, session_id, route_id, overrides)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     ON CONFLICT (user_id, view_id, session_id, route_id)
     DO UPDATE SET
       overrides = EXCLUDED.overrides,
       updated_at = NOW()`,
    [userId, viewId, sessionId, routeId, JSON.stringify(validated)],
  );

  return validated;
}

export async function applyOverride(
  userId: string,
  viewId: string,
  path: string,
  changes: ElementOverride,
  sessionId = DEFAULT_SESSION_ID,
  routeId = viewId,
): Promise<MorphConfig> {
  validateOverride(changes);
  const current = await getConfig(userId, viewId, sessionId, routeId);
  const next = mergeOverride(current, path, changes);
  return saveConfig(userId, viewId, next, sessionId, routeId);
}

export async function applyAiPrompt(
  userId: string,
  viewId: string,
  path: string,
  _prompt: string,
  sessionId = DEFAULT_SESSION_ID,
  routeId = viewId,
): Promise<MorphConfig> {
  // AI processing is out of scope; accept the prompt and return current config unchanged.
  void path;
  return getConfig(userId, viewId, sessionId, routeId);
}
