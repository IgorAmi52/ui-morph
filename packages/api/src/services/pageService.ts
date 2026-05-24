import { randomUUID } from 'node:crypto';
import { getPool } from '../db/client.js';
import type {
  GeneratedPage,
  GeneratedPageDefinition,
  GeneratedPageMetadata,
  GeneratedPageSourceSummary,
  MorphConfig,
} from '../types.js';
import {
  ValidationError,
  validateConfig,
  validateGeneratedPageDefinition,
  validateGeneratedPageSources,
} from './validationService.js';

interface PageRow {
  page_id: string;
  owner_user_id: string;
  owner_session_id: string;
  source_route_id: string;
  view_id: string;
  route_id: string;
  title: string;
  prompt: string;
  sources: unknown;
  definition: unknown;
  version: number;
  created_at: Date;
  updated_at: Date;
}

function metadataFromRow(row: PageRow): GeneratedPageMetadata {
  return {
    pageId: row.page_id,
    userId: row.owner_user_id,
    sessionId: row.owner_session_id,
    viewId: row.view_id,
    routeId: row.route_id,
    title: row.title,
    prompt: row.prompt,
    sources: validateGeneratedPageSources(row.sources),
    version: row.version,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function pageFromRow(row: PageRow): GeneratedPage {
  return {
    ...metadataFromRow(row),
    definition: validateGeneratedPageDefinition(row.definition),
  };
}

function requiredString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`${key} is required`);
  }
  return value.trim();
}

function parseConfig(raw: unknown): MorphConfig {
  if (raw === null || raw === undefined) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ValidationError('Stored generated page overrides must be a JSON object');
  }
  return validateConfig(raw as Record<string, unknown>);
}

export function validateCreatePageBody(body: unknown): {
  userId: string;
  sessionId: string;
  routeId: string;
  prompt: string;
  sources: GeneratedPageSourceSummary[];
  definition: GeneratedPageDefinition;
} {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ValidationError('Request body must be an object');
  }
  const b = body as Record<string, unknown>;
  return {
    userId: requiredString(b, 'userId'),
    sessionId: typeof b.sessionId === 'string' && b.sessionId.trim() ? b.sessionId.trim() : 'default',
    routeId: typeof b.routeId === 'string' && b.routeId.trim() ? b.routeId.trim() : 'default',
    prompt: requiredString(b, 'prompt'),
    sources: validateGeneratedPageSources(b.sources),
    definition: validateGeneratedPageDefinition(b.definition),
  };
}

export function validateSavePageBody(body: unknown): MorphConfig {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ValidationError('Request body must be an object');
  }
  const b = body as Record<string, unknown>;
  if (typeof b.overrides !== 'object' || b.overrides === null || Array.isArray(b.overrides)) {
    throw new ValidationError('overrides must be an object');
  }
  return validateConfig(b.overrides as Record<string, unknown>);
}

export async function createPage(input: {
  userId: string;
  sessionId: string;
  routeId: string;
  prompt: string;
  sources: GeneratedPageSourceSummary[];
  definition: GeneratedPageDefinition;
}): Promise<GeneratedPage> {
  const db = getPool();
  const pageId = randomUUID();
  const viewId = `page:${pageId}`;
  const routeId = `page:${pageId}`;
  const definition = validateGeneratedPageDefinition(input.definition);

  const result = await db.query<PageRow>(
    `INSERT INTO morph_pages (
       page_id,
       owner_user_id,
       owner_session_id,
       source_route_id,
       view_id,
       route_id,
       title,
       prompt,
       sources,
       definition
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb)
     RETURNING page_id, owner_user_id, owner_session_id, source_route_id,
       view_id, route_id, title, prompt, sources, definition, version, created_at, updated_at`,
    [
      pageId,
      input.userId,
      input.sessionId,
      input.routeId,
      viewId,
      routeId,
      definition.title,
      input.prompt,
      JSON.stringify(input.sources),
      JSON.stringify(definition),
    ],
  );

  return pageFromRow(result.rows[0]);
}

export async function getPage(pageId: string): Promise<GeneratedPage | null> {
  const db = getPool();
  const result = await db.query<PageRow>(
    `SELECT page_id, owner_user_id, owner_session_id, source_route_id,
       view_id, route_id, title, prompt, sources, definition, version, created_at, updated_at
     FROM morph_pages
     WHERE page_id = $1`,
    [pageId],
  );
  if (result.rowCount === 0) return null;
  return pageFromRow(result.rows[0]);
}

export async function getPageConfig(pageId: string): Promise<MorphConfig | null> {
  const db = getPool();
  const result = await db.query<{ overrides: unknown }>(
    `SELECT overrides FROM morph_pages WHERE page_id = $1`,
    [pageId],
  );
  if (result.rowCount === 0) return null;
  return parseConfig(result.rows[0].overrides);
}

export async function savePageConfig(
  pageId: string,
  overrides: MorphConfig,
): Promise<MorphConfig | null> {
  const validated = validateConfig(overrides);
  const result = await getPool().query<{ overrides: unknown }>(
    `UPDATE morph_pages
     SET overrides = $2::jsonb, version = version + 1, updated_at = NOW()
     WHERE page_id = $1
     RETURNING overrides`,
    [pageId, JSON.stringify(validated)],
  );
  if (result.rowCount === 0) return null;
  return parseConfig(result.rows[0].overrides);
}
