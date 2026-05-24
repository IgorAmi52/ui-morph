import type { CreateSharePayload, MorphConfig, ShareMetadata, StorageAdapter } from '../types';

function baseUrl(apiUrl: string): string {
  return apiUrl.replace(/\/$/, '');
}

async function parseShareError(res: Response, fallback: string): Promise<never> {
  const body = await res.text().catch(() => '');
  try {
    const parsed = JSON.parse(body) as { error?: string };
    if (parsed.error) throw new Error(parsed.error);
  } catch (e) {
    if (e instanceof Error && e.message !== body) throw e;
  }
  throw new Error(body || fallback);
}

export async function createShare(
  apiUrl: string,
  payload: CreateSharePayload,
): Promise<ShareMetadata> {
  const res = await fetch(`${baseUrl(apiUrl)}/shares`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-ui-morph-session-id': payload.sessionId,
    },
    body: JSON.stringify({
      userId: payload.userId,
      viewId: payload.viewId,
      sessionId: payload.sessionId,
      routeId: payload.routeId,
      sourcePath: payload.sourcePath,
      overrides: payload.config,
    }),
  });

  if (!res.ok) await parseShareError(res, `Share create failed: ${res.status}`);
  return res.json() as Promise<ShareMetadata>;
}

export async function getShare(apiUrl: string, shareId: string): Promise<ShareMetadata> {
  const res = await fetch(`${baseUrl(apiUrl)}/shares/${encodeURIComponent(shareId)}`);
  if (!res.ok) await parseShareError(res, `Share fetch failed: ${res.status}`);
  return res.json() as Promise<ShareMetadata>;
}

export function createShareStorageAdapter(
  apiUrl: string,
  shareId: string,
  actorSessionId?: string,
): StorageAdapter {
  const configUrl = `${baseUrl(apiUrl)}/shares/${encodeURIComponent(shareId)}/config`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (actorSessionId) headers['x-ui-morph-session-id'] = actorSessionId;

  return {
    async getConfig() {
      const res = await fetch(configUrl);
      if (!res.ok) await parseShareError(res, `Shared config fetch failed: ${res.status}`);
      return res.json() as Promise<MorphConfig>;
    },

    async saveConfig(_userId, _viewId, config) {
      const res = await fetch(configUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ overrides: config }),
      });
      if (!res.ok) await parseShareError(res, `Shared config save failed: ${res.status}`);
      return res.json() as Promise<MorphConfig>;
    },
  };
}
