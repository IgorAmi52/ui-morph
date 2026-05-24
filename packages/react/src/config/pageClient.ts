import type {
  AgentPageRequest,
  AgentPageResponse,
  GeneratedPage,
  GeneratedPageDefinition,
  GeneratedPageSourceSummary,
  MorphConfig,
  StorageAdapter,
} from '../types';

function baseUrl(apiUrl: string): string {
  return apiUrl.replace(/\/$/, '');
}

async function parsePageError(res: Response, fallback: string): Promise<never> {
  const body = await res.text().catch(() => '');
  try {
    const parsed = JSON.parse(body) as { error?: string };
    if (parsed.error) throw new Error(parsed.error);
  } catch (e) {
    if (e instanceof Error && e.message !== body) throw e;
  }
  throw new Error(body || fallback);
}

export async function generatePage(
  apiUrl: string,
  payload: AgentPageRequest,
): Promise<AgentPageResponse> {
  const res = await fetch(`${baseUrl(apiUrl)}/agent/page`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) await parsePageError(res, `Page generation failed: ${res.status}`);
  return res.json() as Promise<AgentPageResponse>;
}

export async function createPage(
  apiUrl: string,
  payload: {
    userId: string;
    sessionId: string;
    routeId: string;
    prompt: string;
    sources: GeneratedPageSourceSummary[];
    definition: GeneratedPageDefinition;
  },
): Promise<GeneratedPage> {
  const res = await fetch(`${baseUrl(apiUrl)}/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) await parsePageError(res, `Page create failed: ${res.status}`);
  return res.json() as Promise<GeneratedPage>;
}

export async function getPage(apiUrl: string, pageId: string): Promise<GeneratedPage> {
  const res = await fetch(`${baseUrl(apiUrl)}/pages/${encodeURIComponent(pageId)}`);
  if (!res.ok) await parsePageError(res, `Page fetch failed: ${res.status}`);
  return res.json() as Promise<GeneratedPage>;
}

export function createPageStorageAdapter(
  apiUrl: string,
  pageId: string,
): StorageAdapter {
  const configUrl = `${baseUrl(apiUrl)}/pages/${encodeURIComponent(pageId)}/config`;

  return {
    async getConfig() {
      const res = await fetch(configUrl);
      if (!res.ok) await parsePageError(res, `Generated page config fetch failed: ${res.status}`);
      return res.json() as Promise<MorphConfig>;
    },

    async saveConfig(_userId, _viewId, config) {
      const res = await fetch(configUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides: config }),
      });
      if (!res.ok) await parsePageError(res, `Generated page config save failed: ${res.status}`);
      return res.json() as Promise<MorphConfig>;
    },
  };
}
