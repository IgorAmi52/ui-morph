import type { MorphConfig } from '../types';

export interface CreateShareLinkRequest {
  userId: string;
  viewId: string;
  overrides: MorphConfig;
  origin?: string;
}

export interface CreateShareLinkResponse {
  url: string;
  token: string;
  expiresAt: string;
}

export interface ShareByTokenResponse {
  userId: string;
  viewId: string;
  config: MorphConfig;
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

export async function createShareLink(
  apiUrl: string,
  request: CreateShareLinkRequest,
): Promise<CreateShareLinkResponse> {
  const base = apiUrl.replace(/\/$/, '');
  const res = await fetch(`${base}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...request,
      origin: request.origin ?? (typeof window !== 'undefined' ? window.location.origin : undefined),
    }),
  });

  if (!res.ok) {
    await parseShareError(res, `Share link request failed: ${res.status}`);
  }

  return res.json() as Promise<CreateShareLinkResponse>;
}

export async function fetchShareByToken(
  apiUrl: string,
  token: string,
): Promise<ShareByTokenResponse> {
  const base = apiUrl.replace(/\/$/, '');
  const res = await fetch(`${base}/share/${encodeURIComponent(token)}`);

  if (!res.ok) {
    await parseShareError(res, `Share link not found: ${res.status}`);
  }

  return res.json() as Promise<ShareByTokenResponse>;
}
