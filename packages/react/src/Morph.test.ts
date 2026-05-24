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
});
