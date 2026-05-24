import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Morph } from './Morph';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('Morph loading behavior', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
      .IS_REACT_ACT_ENVIRONMENT = true;
    globalThis.MutationObserver = window.MutationObserver;
    window.history.replaceState({}, '', '/');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  it('renders nothing while remote config is loading without fallback', async () => {
    const pending = deferred<Response>();
    vi.stubGlobal('fetch', vi.fn(() => pending.promise));

    await act(async () => {
      root.render(createElement(
        Morph,
        {
          userId: 'user-a',
          apiUrl: 'http://localhost:3001',
          children: createElement('div', null, 'Loaded UI'),
        },
      ));
    });

    expect(container.textContent).toBe('');
  });

  it('renders fallback while remote config is loading', async () => {
    const pending = deferred<Response>();
    vi.stubGlobal('fetch', vi.fn(() => pending.promise));

    await act(async () => {
      root.render(createElement(
        Morph,
        {
          userId: 'user-a',
          apiUrl: 'http://localhost:3001',
          fallback: createElement('div', null, 'Loading'),
          children: createElement('div', null, 'Loaded UI'),
        },
      ));
    });

    expect(container.textContent).toBe('Loading');
  });

  it('renders children after remote config loads', async () => {
    const pending = deferred<Response>();
    vi.stubGlobal('fetch', vi.fn(() => pending.promise));

    await act(async () => {
      root.render(createElement(
        Morph,
        {
          userId: 'user-a',
          apiUrl: 'http://localhost:3001',
          children: createElement('div', null, 'Loaded UI'),
        },
      ));
    });

    await act(async () => {
      pending.resolve({
        ok: true,
        json: async () => ({}),
      } as Response);
      await pending.promise;
    });

    expect(container.textContent).toContain('Loaded UI');
  });

  it('renders children immediately without apiUrl', async () => {
    await act(async () => {
      root.render(createElement(
        Morph,
        {
          userId: 'user-a',
          children: createElement('div', null, 'Local UI'),
        },
      ));
    });

    expect(container.textContent).toContain('Local UI');
  });

  it('loads config from a custom storage adapter', async () => {
    const adapter = {
      getConfig: vi.fn().mockResolvedValue({}),
      saveConfig: vi.fn().mockResolvedValue({}),
    };

    await act(async () => {
      root.render(createElement(
        Morph,
        {
          userId: 'user-a',
          storageAdapter: adapter,
          children: createElement('div', null, 'Shared UI'),
        },
      ));
    });

    expect(adapter.getConfig).toHaveBeenCalled();
    expect(container.textContent).toContain('Shared UI');
  });

  it('calls onShare with current scoped config', async () => {
    const onShare = vi.fn();
    window.history.replaceState({}, '', '/dashboard');

    await act(async () => {
      root.render(createElement(
        Morph,
        {
          userId: 'user-a',
          viewId: 'dashboard',
          sessionId: 'client-a',
          routeId: 'dashboard',
          editable: true,
          onShare,
          children: createElement('div', null, 'Shareable UI'),
        },
      ));
    });

    const button = container.querySelector<HTMLButtonElement>('[aria-label="Share view"]');
    expect(button).not.toBeNull();

    await act(async () => {
      button?.click();
    });

    expect(onShare).toHaveBeenCalledWith({
      userId: 'user-a',
      viewId: 'dashboard',
      sessionId: 'client-a',
      routeId: 'dashboard',
      config: {},
      sourcePath: '/dashboard',
    });
  });

  it('creates a share by default when apiUrl is configured', async () => {
    window.history.replaceState({}, '', '/claims?tab=open');
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url === 'http://localhost:3001/config/user-a/claims?sessionId=client-a&routeId=claims') {
        return Promise.resolve({
          ok: true,
          json: async () => ({}),
        } as Response);
      }
      if (url === 'http://localhost:3001/shares' && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            shareId: 'share-1',
            userId: 'user-a',
            viewId: 'claims',
            sessionId: 'client-a',
            routeId: 'claims',
            sourcePath: '/claims?tab=open',
            version: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }),
        } as Response);
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await act(async () => {
      root.render(createElement(
        Morph,
        {
          userId: 'user-a',
          sessionId: 'client-a',
          apiUrl: 'http://localhost:3001',
          editable: true,
          children: createElement('div', null, 'Shareable UI'),
        },
      ));
    });

    await act(async () => {
      await Promise.resolve();
    });

    const button = container.querySelector<HTMLButtonElement>('[aria-label="Share view"]');
    expect(button).not.toBeNull();

    await act(async () => {
      button?.click();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/shares', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-a',
        viewId: 'claims',
        sessionId: 'client-a',
        routeId: 'claims',
        sourcePath: '/claims?tab=open',
        overrides: {},
      }),
    }));
    expect(writeText).toHaveBeenCalledWith('http://localhost/claims?tab=open&uiMorphShare=share-1');
    expect(container.textContent).toContain('Share link copied');
  });

  it('loads a shared config from the current route query', async () => {
    window.history.replaceState({}, '', '/claims?uiMorphShare=share-1');
    const fetchMock = vi.fn((url: string) => {
      if (url === 'http://localhost:3001/shares/share-1') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            shareId: 'share-1',
            userId: 'user-a',
            viewId: 'claims',
            sessionId: 'client-a',
            routeId: 'claims',
            sourcePath: '/claims',
            version: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }),
        } as Response);
      }
      if (url === 'http://localhost:3001/shares/share-1/config') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ 'morph.div:0': { text: 'Shared copy' } }),
        } as Response);
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    await act(async () => {
      root.render(createElement(
        Morph,
        {
          userId: 'user-b',
          apiUrl: 'http://localhost:3001',
          fallback: createElement('div', null, 'Loading shared'),
          children: createElement('div', null, 'Original copy'),
        },
      ));
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/shares/share-1');
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/shares/share-1/config');
    expect(container.textContent).toContain('Shared copy');
  });
});
