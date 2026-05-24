const STORAGE_KEY = 'ui-morph:client-session-id';
const DEFAULT_SESSION_ID = 'default';

function createSessionId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return `client:${cryptoApi.randomUUID()}`;
  }
  return `client:${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function resolveSessionId(explicit?: string): string {
  if (explicit?.trim()) return explicit.trim();
  if (typeof window === 'undefined') return DEFAULT_SESSION_ID;

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing?.trim()) return existing;

    const next = createSessionId();
    window.localStorage.setItem(STORAGE_KEY, next);
    return next;
  } catch {
    return DEFAULT_SESSION_ID;
  }
}
