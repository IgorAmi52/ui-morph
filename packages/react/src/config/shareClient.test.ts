import { afterEach, describe, expect, it, vi } from 'vitest';
import { createShare, createShareStorageAdapter, getShare } from './shareClient';

describe('shareClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates and fetches shares', async () => {
    const metadata = {
      shareId: 'share-1',
      userId: 'user-a',
      viewId: 'dashboard',
      sessionId: 'client-a',
      routeId: 'dashboard',
      sourcePath: '/dashboard',
      version: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => metadata,
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(createShare('http://localhost:3001', {
      userId: 'user-a',
      viewId: 'dashboard',
      sessionId: 'client-a',
      routeId: 'dashboard',
      sourcePath: '/dashboard',
      config: { 'morph.div:0': { hidden: true } },
    })).resolves.toEqual(metadata);
    await expect(getShare('http://localhost:3001', 'share-1')).resolves.toEqual(metadata);

    expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://localhost:3001/shares', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ui-morph-session-id': 'client-a',
      },
      body: JSON.stringify({
        userId: 'user-a',
        viewId: 'dashboard',
        sessionId: 'client-a',
        routeId: 'dashboard',
        sourcePath: '/dashboard',
        overrides: { 'morph.div:0': { hidden: true } },
      }),
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://localhost:3001/shares/share-1');
  });

  it('creates a storage adapter for shared config', async () => {
    const config = { 'morph.div:0': { text: 'Shared' } };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => config,
    });
    vi.stubGlobal('fetch', fetchMock);

    const adapter = createShareStorageAdapter('http://localhost:3001', 'share-1', 'client-b');

    await expect(adapter.getConfig('u', 'v')).resolves.toEqual(config);
    await expect(adapter.saveConfig('u', 'v', config)).resolves.toEqual(config);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/shares/share-1/config',
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3001/shares/share-1/config',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-ui-morph-session-id': 'client-b',
        },
        body: JSON.stringify({ overrides: config }),
      },
    );
  });
});
