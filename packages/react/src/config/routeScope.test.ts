import { describe, expect, it } from 'vitest';
import { resolveRouteSegment, subscribeToRouteChanges } from './routeScope';

describe('routeScope', () => {
  it('resolves the current path when no explicit value is provided', () => {
    window.history.replaceState({}, '', '/claims/open');
    expect(resolveRouteSegment()).toBe('claims-open');
    expect(resolveRouteSegment('explicit-route')).toBe('explicit-route');
  });

  it('notifies subscribers when history state changes', () => {
    const paths: string[] = [];
    const unsubscribe = subscribeToRouteChanges(() => {
      paths.push(window.location.pathname);
    });

    window.history.pushState({}, '', '/policies');
    window.history.replaceState({}, '', '/analytics');
    unsubscribe();
    window.history.pushState({}, '', '/claims');

    expect(paths).toEqual(['/policies', '/analytics']);
  });
});
