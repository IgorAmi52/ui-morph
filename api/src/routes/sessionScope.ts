import type { Request } from 'express';

export const DEFAULT_SESSION_ID = 'default';

function resolveTextScope(req: Request, headerName: string, queryName: string): string | null {
  const header = req.get(headerName);
  const query = req.query[queryName];
  const raw = header ?? (Array.isArray(query) ? query[0] : query);

  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

export function resolveSessionId(req: Request): string {
  return resolveTextScope(req, 'x-ui-morph-session-id', 'sessionId') ?? DEFAULT_SESSION_ID;
}

export function resolveRouteId(req: Request, fallback: string): string {
  return resolveTextScope(req, 'x-ui-morph-route-id', 'routeId') ?? fallback;
}
