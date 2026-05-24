import type { StorageAdapter } from '../types';

function configUrl(
  apiUrl: string,
  userId: string,
  viewId: string,
  sessionId?: string,
  routeId?: string,
): string {
  const base = `${apiUrl.replace(/\/$/, '')}/config/${encodeURIComponent(userId)}/${encodeURIComponent(viewId)}`;
  const params = new URLSearchParams();
  if (sessionId) params.set('sessionId', sessionId);
  if (routeId) params.set('routeId', routeId);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export const transientStorageAdapter: StorageAdapter = {
  async getConfig() {
    return {};
  },

  async saveConfig(_userId, _viewId, config) {
    return config;
  },
};

export function createHttpAdapter(apiUrl: string): StorageAdapter {
  return {
    async getConfig(userId, viewId, sessionId, routeId) {
      const res = await fetch(configUrl(apiUrl, userId, viewId, sessionId, routeId));
      if (!res.ok) throw new Error(`Failed to fetch config: ${res.status}`);
      return res.json();
    },

    async saveConfig(userId, viewId, config, sessionId, routeId) {
      const res = await fetch(configUrl(apiUrl, userId, viewId, sessionId, routeId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides: config }),
      });
      if (!res.ok) throw new Error(`Failed to save config: ${res.status}`);
      return res.json();
    },
  };
}
