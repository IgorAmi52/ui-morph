import { useEffect, useState } from 'react';

const ROUTE_CHANGE_EVENT = 'ui-morph:route-change';

let historyPatched = false;

function locationPath(): string {
  if (typeof window === 'undefined') return '/';
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function routeSegment(pathname: string): string {
  return pathname === '/' ? 'index' : pathname.replace(/^\/|\/$/g, '').replace(/\//g, '-');
}

function dispatchRouteChange(): void {
  window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT));
}

function patchHistory(): void {
  if (historyPatched || typeof window === 'undefined') return;
  historyPatched = true;

  const patch = (method: 'pushState' | 'replaceState') => {
    const original = window.history[method];
    window.history[method] = function patchedHistoryMethod(this: History, ...args) {
      const result = original.apply(this, args);
      dispatchRouteChange();
      return result;
    } as History[typeof method];
  };

  patch('pushState');
  patch('replaceState');
}

export function resolveRouteSegment(explicit?: string): string {
  if (explicit?.trim()) return explicit.trim();
  if (typeof window === 'undefined') return 'default';
  return routeSegment(window.location.pathname);
}

export function subscribeToRouteChanges(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;

  patchHistory();

  const notify = () => listener();
  window.addEventListener(ROUTE_CHANGE_EVENT, notify);
  window.addEventListener('popstate', notify);
  window.addEventListener('hashchange', notify);

  return () => {
    window.removeEventListener(ROUTE_CHANGE_EVENT, notify);
    window.removeEventListener('popstate', notify);
    window.removeEventListener('hashchange', notify);
  };
}

export function useRouteScope(viewIdProp?: string, routeIdProp?: string): {
  viewId: string;
  routeId: string;
} {
  const [routePath, setRoutePath] = useState(locationPath);

  useEffect(() => {
    if (viewIdProp && routeIdProp) return undefined;

    return subscribeToRouteChanges(() => {
      setRoutePath(locationPath());
    });
  }, [viewIdProp, routeIdProp]);

  void routePath;

  return {
    viewId: resolveRouteSegment(viewIdProp),
    routeId: resolveRouteSegment(routeIdProp),
  };
}
