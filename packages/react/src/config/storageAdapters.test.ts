import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHttpAdapter, transientStorageAdapter } from './storageAdapters';

describe('transientStorageAdapter', () => {
  it('returns empty config', async () => {
    await expect(transientStorageAdapter.getConfig('user-a', 'dashboard')).resolves.toEqual({});
  });

  it('returns saved config from saveConfig result without persisting', async () => {
    const config = { 'morph.div:0': { hidden: true } };
    await expect(
      transientStorageAdapter.saveConfig('user-a', 'dashboard', config),
    ).resolves.toEqual(config);
    await expect(transientStorageAdapter.getConfig('user-a', 'dashboard')).resolves.toEqual({});
  });
});

describe('createHttpAdapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches config from GET /config/:userId/:viewId', async () => {
    const config = { 'morph.div:0': { hidden: true } };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => config,
    });
    vi.stubGlobal('fetch', fetchMock);

    const adapter = createHttpAdapter('http://localhost:3001');
    await expect(adapter.getConfig('user-a', 'dashboard')).resolves.toEqual(config);

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/config/user-a/dashboard');
  });

  it('saves config via PUT with overrides wrapper', async () => {
    const config = { 'morph.div:0': { style: { color: 'red' } } };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => config,
    });
    vi.stubGlobal('fetch', fetchMock);

    const adapter = createHttpAdapter('http://localhost:3001');
    await expect(adapter.saveConfig('user-a', 'settings', config)).resolves.toEqual(config);

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/config/user-a/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ overrides: config }),
    });
  });

  it('throws when GET fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const adapter = createHttpAdapter('http://localhost:3001');
    await expect(adapter.getConfig('user-a', 'dashboard')).rejects.toThrow(
      'Failed to fetch config: 500',
    );
  });

  it('throws when PUT fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }));

    const adapter = createHttpAdapter('http://localhost:3001');
    await expect(adapter.saveConfig('user-a', 'dashboard', {})).rejects.toThrow(
      'Failed to save config: 400',
    );
  });
});
