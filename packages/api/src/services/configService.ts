import { getPool } from '../db/client.js';
import type { ElementOverride, MorphConfig } from '../types.js';
import { mergeOverride } from '../agent/toolExecutors.js';
import { validateConfig, validateOverride, ValidationError } from './validationService.js';

function parseOverrides(raw: unknown): MorphConfig {
  if (raw === null || raw === undefined) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ValidationError('Stored overrides must be a JSON object');
  }
  return validateConfig(raw as Record<string, unknown>);
}

export async function getConfig(userId: string, viewId: string): Promise<MorphConfig> {
  const db = getPool();
  const result = await db.query<{ overrides: unknown }>(
    `SELECT overrides FROM morph_configs WHERE user_id = $1 AND view_id = $2`,
    [userId, viewId],
  );

  if (result.rowCount === 0) return {};
  return parseOverrides(result.rows[0].overrides);
}

export async function saveConfig(
  userId: string,
  viewId: string,
  overrides: MorphConfig,
): Promise<MorphConfig> {
  const validated = validateConfig(overrides);
  const db = getPool();

  await db.query(
    `INSERT INTO morph_configs (user_id, view_id, overrides)
     VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (user_id, view_id)
     DO UPDATE SET
       overrides = EXCLUDED.overrides,
       updated_at = NOW()`,
    [userId, viewId, JSON.stringify(validated)],
  );

  return validated;
}

export async function applyOverride(
  userId: string,
  viewId: string,
  path: string,
  changes: ElementOverride,
): Promise<MorphConfig> {
  validateOverride(changes);
  const current = await getConfig(userId, viewId);
  const next = mergeOverride(current, path, changes);
  return saveConfig(userId, viewId, next);
}

export async function applyAiPrompt(
  userId: string,
  viewId: string,
  path: string,
  _prompt: string,
): Promise<MorphConfig> {
  // AI processing is out of scope; accept the prompt and return current config unchanged.
  void path;
  return getConfig(userId, viewId);
}
