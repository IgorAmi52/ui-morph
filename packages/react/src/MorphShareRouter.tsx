import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Morph } from './Morph';
import { resolveSessionId } from './config/clientSession';
import { subscribeToRouteChanges } from './config/routeScope';
import { createShareStorageAdapter, getShare } from './config/shareClient';
import type { ShareMetadata } from './types';

interface MorphShareRouterProps {
  apiUrl: string;
  children: ReactNode;
  renderSharedRoute: (share: ShareMetadata) => ReactNode;
  sharedPath?: string;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}

function normalizeSharedPath(path: string): string {
  const trimmed = path.trim() || '/shared';
  return trimmed === '/' ? '' : trimmed.replace(/\/+$/, '');
}

function currentShareId(sharedPath: string): string | null {
  if (typeof window === 'undefined') return null;
  const base = normalizeSharedPath(sharedPath);
  const pathname = window.location.pathname.replace(/\/+$/, '');
  const prefix = `${base}/`;
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length);
  if (!rest || rest.includes('/')) return null;
  return decodeURIComponent(rest);
}

export function MorphShareRouter({
  apiUrl,
  children,
  renderSharedRoute,
  sharedPath = '/shared',
  fallback = null,
  onError,
}: MorphShareRouterProps) {
  const [shareId, setShareId] = useState(() => currentShareId(sharedPath));
  const [share, setShare] = useState<ShareMetadata | null>(null);
  const [loadKey, setLoadKey] = useState(0);
  const actorSessionId = useState(() => resolveSessionId())[0];

  useEffect(() => {
    return subscribeToRouteChanges(() => {
      setShareId(currentShareId(sharedPath));
      setLoadKey((v) => v + 1);
    });
  }, [sharedPath]);

  useEffect(() => {
    if (!shareId) {
      setShare(null);
      return;
    }

    let cancelled = false;
    setShare(null);
    void getShare(apiUrl, shareId)
      .then((metadata) => {
        if (!cancelled) setShare(metadata);
      })
      .catch((err) => {
        if (!cancelled) {
          onError?.(err instanceof Error ? err : new Error(String(err)));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiUrl, loadKey, onError, shareId]);

  const storageAdapter = useMemo(
    () => (shareId ? createShareStorageAdapter(apiUrl, shareId, actorSessionId) : null),
    [actorSessionId, apiUrl, shareId],
  );

  if (!shareId) return <>{children}</>;
  if (!share || !storageAdapter) return <>{fallback}</>;

  return (
    <Morph
      userId={`share:${share.shareId}`}
      viewId={share.viewId}
      sessionId={actorSessionId}
      routeId={share.routeId}
      apiUrl={apiUrl}
      storageAdapter={storageAdapter}
      editable
      fallback={fallback}
      onError={onError}
    >
      {renderSharedRoute(share)}
    </Morph>
  );
}
