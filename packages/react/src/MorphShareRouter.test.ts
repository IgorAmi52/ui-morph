import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MorphShareRouter } from './MorphShareRouter';

describe('MorphShareRouter', () => {
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

  it('renders children on normal routes', async () => {
    await act(async () => {
      root.render(createElement(
        MorphShareRouter,
        {
          apiUrl: 'http://localhost:3001',
          renderSharedRoute: () => createElement('div', null, 'Shared'),
          children: createElement('div', null, 'Normal app'),
        },
      ));
    });

    expect(container.textContent).toContain('Normal app');
  });

  it('intercepts shared routes and renders shared content', async () => {
    window.history.replaceState({}, '', '/shared/share-1');
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
    const fetchMock = vi.fn((url: string) => Promise.resolve({
      ok: true,
      json: async () => (url.endsWith('/config') ? {} : metadata),
    } as Response));
    vi.stubGlobal('fetch', fetchMock);

    await act(async () => {
      root.render(createElement(
        MorphShareRouter,
        {
          apiUrl: 'http://localhost:3001',
          fallback: createElement('div', null, 'Loading shared'),
          renderSharedRoute: (share) => createElement('div', null, `Shared ${share.shareId}`),
          children: createElement('div', null, 'Normal app'),
        },
      ));
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Shared share-1');
    expect(container.textContent).not.toContain('Normal app');
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/shares/share-1');
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/shares/share-1/config');
  });
});
