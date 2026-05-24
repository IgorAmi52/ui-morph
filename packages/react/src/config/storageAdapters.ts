import type { StorageAdapter } from '../types';

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
    async getConfig(userId, viewId) {
      const res = await fetch(`${apiUrl}/config/${userId}/${viewId}`);
      if (!res.ok) throw new Error(`Failed to fetch config: ${res.status}`);
      return res.json();
    },

    async saveConfig(userId, viewId, config) {
      const res = await fetch(`${apiUrl}/config/${userId}/${viewId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides: config }),
      });
      if (!res.ok) throw new Error(`Failed to save config: ${res.status}`);
      return res.json();
    },
  };
}
