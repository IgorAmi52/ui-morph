import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.js';

/**
 * Mirrors @ui-morph/react createHttpAdapter — ensures the API matches the client contract.
 */
function createHttpAdapter(baseUrl: string) {
  return {
    async getConfig(userId: string, viewId: string) {
      const res = await fetch(`${baseUrl}/config/${userId}/${viewId}`);
      if (!res.ok) throw new Error(`Failed to fetch config: ${res.status}`);
      return res.json();
    },

    async saveConfig(userId: string, viewId: string, config: Record<string, unknown>) {
      const res = await fetch(`${baseUrl}/config/${userId}/${viewId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides: config }),
      });
      if (!res.ok) throw new Error(`Failed to save config: ${res.status}`);
      return res.json();
    },
  };
}

describe('React HTTP adapter contract', () => {
  let server: Server;
  let baseUrl: string;
  const adapter = () => createHttpAdapter(baseUrl);

  beforeAll(async () => {
    const app = createApp();
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('GET returns empty object for missing config', async () => {
    await expect(adapter().getConfig('contract-user', 'dashboard')).resolves.toEqual({});
  });

  it('PUT then GET round-trips overrides', async () => {
    const overrides = {
      'morph.div:0.h1:0': { style: { color: 'blue', fontSize: '20px' } },
      'morph.div:1': { hidden: true },
    };

    await expect(adapter().saveConfig('contract-user', 'dashboard', overrides)).resolves.toEqual(
      overrides,
    );
    await expect(adapter().getConfig('contract-user', 'dashboard')).resolves.toEqual(overrides);
  });

  it('rejects invalid overrides with fetch error', async () => {
    await expect(
      adapter().saveConfig('contract-user', 'dashboard', {
        'morph.div:0': { style: { color: 'javascript:alert(1)' } },
      }),
    ).rejects.toThrow('Failed to save config: 400');
  });
});
