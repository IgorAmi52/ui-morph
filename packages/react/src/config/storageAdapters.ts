import type { StorageAdapter, MorphConfig } from '../types';

const STORAGE_PREFIX = 'ui-morph:';

function storageKey(userId: string, viewId: string): string {
  return `${STORAGE_PREFIX}${userId}:${viewId}`;
}

export const localStorageAdapter: StorageAdapter = {
  async getConfig(userId, viewId) {
    try {
      const raw = localStorage.getItem(storageKey(userId, viewId));
      return raw ? (JSON.parse(raw) as MorphConfig) : {};
    } catch {
      return {};
    }
  },

  async saveConfig(userId, viewId, config) {
    localStorage.setItem(storageKey(userId, viewId), JSON.stringify(config));
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
