import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import type { GeneratedPage, MorphProps, MorphConfig, MorphMode, ShareMetadata, StorageAdapter } from './types';
import { ConfigProvider, useMorphContext } from './config/ConfigContext';
import { createAdapter } from './config/createAdapter';
import { resolveSessionId } from './config/clientSession';
import { subscribeToRouteChanges, useRouteScope } from './config/routeScope';
import { createPageStorageAdapter, getPage } from './config/pageClient';
import { readPageSnapshots, upsertPageSnapshot } from './config/pageSnapshots';
import { createShare, createShareStorageAdapter, getShare } from './config/shareClient';
import { serializeLayoutSnapshot } from './agent/serializeLayoutSnapshot';
import { CreatePageModal } from './editor/CreatePageModal';
import { EditModeProvider } from './editor/EditModeProvider';
import { GeneratedPageView } from './editor/GeneratedPageView';
import { MorphToggleButton } from './editor/MorphToggleButton';
import { decoratePaths, applyDomOverrides, cleanDomOverrides } from './tree/domDecorator';

const EMPTY_CONFIG: MorphConfig = {};
const SHARE_QUERY_PARAM = 'uiMorphShare';
const PAGE_QUERY_PARAM = 'uiMorphPage';

interface ShareRouteState {
  shareId: string | null;
  share: ShareMetadata | null;
  loading: boolean;
}

interface PageRouteState {
  pageId: string | null;
  page: GeneratedPage | null;
  loading: boolean;
}

function queryParamFromLocation(param: string): string | null {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const fromSearch = url.searchParams.get(param);
  if (fromSearch?.trim()) return fromSearch.trim();

  const hashQueryIndex = url.hash.indexOf('?');
  if (hashQueryIndex === -1) return null;
  const hashParams = new URLSearchParams(url.hash.slice(hashQueryIndex + 1));
  const fromHash = hashParams.get(param);
  return fromHash?.trim() || null;
}

function shareIdFromLocation(): string | null {
  return queryParamFromLocation(SHARE_QUERY_PARAM);
}

function pageIdFromLocation(): string | null {
  return queryParamFromLocation(PAGE_QUERY_PARAM);
}

function removeMorphParamsFromHash(hash: string): string {
  const queryIndex = hash.indexOf('?');
  if (queryIndex === -1) return hash;
  const path = hash.slice(0, queryIndex);
  const query = hash.slice(queryIndex + 1);
  const params = new URLSearchParams(query);
  params.delete(SHARE_QUERY_PARAM);
  params.delete(PAGE_QUERY_PARAM);
  const nextQuery = params.toString();
  return nextQuery ? `${path}?${nextQuery}` : path;
}

function currentSourcePath(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const url = new URL(window.location.href);
  url.searchParams.delete(SHARE_QUERY_PARAM);
  url.searchParams.delete(PAGE_QUERY_PARAM);
  const hash = removeMorphParamsFromHash(url.hash);
  return `${url.pathname}${url.search}${hash}`;
}

function buildShareUrl(shareId: string, sourcePath?: string): string {
  if (typeof window === 'undefined') return sourcePath ?? '';
  const url = new URL(sourcePath || currentSourcePath() || '/', window.location.origin);
  url.searchParams.set(SHARE_QUERY_PARAM, shareId);
  return url.toString();
}

function buildPageUrl(pageId: string): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(currentSourcePath() || '/', window.location.origin);
  url.searchParams.set(PAGE_QUERY_PARAM, pageId);
  return url.toString();
}

async function copyShareUrl(url: string): Promise<boolean> {
  const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
  if (!clipboard?.writeText) return false;
  await clipboard.writeText(url);
  return true;
}

function useShareRoute(apiUrl?: string, onError?: (error: Error) => void): ShareRouteState {
  const [shareId, setShareId] = useState(shareIdFromLocation);
  const [state, setState] = useState<ShareRouteState>(() => ({
    shareId,
    share: null,
    loading: Boolean(apiUrl && shareId),
  }));

  useEffect(() => subscribeToRouteChanges(() => {
    setShareId(shareIdFromLocation());
  }), []);

  useEffect(() => {
    if (!apiUrl || !shareId) {
      setState({ shareId, share: null, loading: false });
      return undefined;
    }

    let cancelled = false;
    setState({ shareId, share: null, loading: true });

    void getShare(apiUrl, shareId)
      .then((share) => {
        if (!cancelled) setState({ shareId, share, loading: false });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ shareId, share: null, loading: false });
          onError?.(err instanceof Error ? err : new Error(String(err)));
        }
      });

    return () => { cancelled = true; };
  }, [apiUrl, onError, shareId]);

  return state;
}

function usePageRoute(apiUrl?: string, onError?: (error: Error) => void): PageRouteState {
  const [pageId, setPageId] = useState(pageIdFromLocation);
  const [state, setState] = useState<PageRouteState>(() => ({
    pageId,
    page: null,
    loading: Boolean(apiUrl && pageId),
  }));

  useEffect(() => subscribeToRouteChanges(() => {
    setPageId(pageIdFromLocation());
  }), []);

  useEffect(() => {
    if (!apiUrl || !pageId) {
      setState({ pageId, page: null, loading: false });
      return undefined;
    }

    let cancelled = false;
    setState({ pageId, page: null, loading: true });

    void getPage(apiUrl, pageId)
      .then((page) => {
        if (!cancelled) setState({ pageId, page, loading: false });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ pageId, page: null, loading: false });
          onError?.(err instanceof Error ? err : new Error(String(err)));
        }
      });

    return () => { cancelled = true; };
  }, [apiUrl, onError, pageId]);

  return state;
}

export function Morph({
  userId,
  viewId: viewIdProp,
  sessionId: sessionIdProp,
  routeId: routeIdProp,
  apiUrl,
  storageAdapter,
  mode,
  editable = false,
  onShare,
  onSave,
  onError,
  fallback,
  children,
}: MorphProps) {
  const { viewId, routeId } = useRouteScope(viewIdProp, routeIdProp);
  const sessionId = useState(() => resolveSessionId(sessionIdProp))[0];
  const shareRoute = useShareRoute(apiUrl, onError);
  const pageRoute = usePageRoute(apiUrl, onError);
  const sharedAdapter = useMemo(
    () => (apiUrl && shareRoute.share
      ? createShareStorageAdapter(apiUrl, shareRoute.share.shareId, sessionId)
      : null),
    [apiUrl, sessionId, shareRoute.share],
  );
  const pageAdapter = useMemo(
    () => (apiUrl && pageRoute.page
      ? createPageStorageAdapter(apiUrl, pageRoute.page.pageId)
      : null),
    [apiUrl, pageRoute.page],
  );
  const sourceShareId = shareRoute.shareId;
  const sourcePageId = pageRoute.pageId;
  const isSharedRoute = Boolean(apiUrl && sourceShareId);
  const isPageRoute = Boolean(apiUrl && sourcePageId);

  if (isSharedRoute && (shareRoute.loading || !shareRoute.share || !sharedAdapter)) {
    return fallback ? <>{fallback}</> : null;
  }
  if (isPageRoute && (pageRoute.loading || !pageRoute.page || !pageAdapter)) {
    return fallback ? <>{fallback}</> : null;
  }

  const scopedUserId = pageRoute.page
    ? `page:${pageRoute.page.pageId}`
    : shareRoute.share
      ? `share:${shareRoute.share.shareId}`
      : userId;
  const scopedViewId = pageRoute.page?.viewId ?? shareRoute.share?.viewId ?? viewId;
  const scopedRouteId = pageRoute.page?.routeId ?? shareRoute.share?.routeId ?? routeId;
  const scopedChildren = pageRoute.page
    ? <GeneratedPageView definition={pageRoute.page.definition} />
    : children;

  return (
    <MorphScoped
      userId={scopedUserId}
      viewId={scopedViewId}
      sessionId={sessionId}
      routeId={scopedRouteId}
      apiUrl={apiUrl}
      storageAdapter={pageAdapter ?? sharedAdapter ?? storageAdapter}
      mode={mode}
      editable={editable}
      onShare={onShare}
      onSave={onSave}
      onError={onError}
      fallback={fallback}
      children={scopedChildren}
    />
  );
}

function MorphScoped({
  userId,
  viewId,
  sessionId,
  routeId,
  apiUrl,
  storageAdapter,
  mode,
  editable = false,
  onShare,
  onSave,
  onError,
  fallback,
  children,
}: Omit<MorphProps, 'viewId' | 'routeId' | 'sessionId' | 'storageAdapter'> & {
  viewId: string;
  routeId: string;
  sessionId: string;
  storageAdapter?: StorageAdapter | null;
}) {
  const usesRemoteConfig = Boolean(apiUrl || storageAdapter);
  const scopeKey = `${apiUrl ?? ''}\u0000${userId}\u0000${viewId}\u0000${sessionId}\u0000${routeId}`;
  const [configState, setConfigState] = useState<{
    scopeKey: string;
    config: MorphConfig | null;
  }>(() => ({
    scopeKey,
    config: usesRemoteConfig ? null : EMPTY_CONFIG,
  }));
  const config = configState.scopeKey === scopeKey ? configState.config : null;
  const [internalMode, setInternalMode] = useState<MorphMode>('view');
  const fallbackAdapter = useMemo(() => createAdapter(apiUrl), [apiUrl]);
  const adapter = storageAdapter ?? fallbackAdapter;

  const isControlled = mode !== undefined;
  const activeMode: MorphMode = isControlled ? mode : (editable ? internalMode : 'view');

  const toggleMode = useCallback(() => {
    setInternalMode(prev => prev === 'view' ? 'edit' : 'view');
  }, []);

  const exposedToggle = (!isControlled && editable) ? toggleMode : null;

  const handleSave = useCallback((saved: MorphConfig) => {
    setConfigState({ scopeKey, config: saved });
    onSave?.(saved);
  }, [onSave, scopeKey]);

  useEffect(() => {
    if (!usesRemoteConfig) {
      setConfigState({ scopeKey, config: EMPTY_CONFIG });
      return;
    }

    let cancelled = false;
    setConfigState({ scopeKey, config: null });

    adapter
      .getConfig(userId, viewId, sessionId, routeId)
      .then((cfg) => {
        if (!cancelled) setConfigState({ scopeKey, config: cfg });
      })
      .catch((err) => {
        if (!cancelled) {
          setConfigState({ scopeKey, config: {} });
          onError?.(err instanceof Error ? err : new Error(String(err)));
        }
      });

    return () => { cancelled = true; };
  }, [adapter, usesRemoteConfig, userId, viewId, sessionId, routeId, scopeKey, onError]);

  if (config === null) return fallback ? <>{fallback}</> : null;

  return (
    <ConfigProvider
      key={scopeKey}
      mode={activeMode}
      editable={editable}
      toggleMode={exposedToggle}
      initial={config ?? EMPTY_CONFIG}
      adapter={adapter}
      userId={userId}
      viewId={viewId}
      sessionId={sessionId}
      routeId={routeId}
      apiUrl={apiUrl}
      onSave={handleSave}
      onError={onError}
    >
      <MorphInner onShare={onShare}>{children}</MorphInner>
    </ConfigProvider>
  );
}

function MorphInner({
  children,
  onShare,
}: {
  children: React.ReactNode;
  onShare?: MorphProps['onShare'];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { config, mode, editable, toggleMode, selectElement, userId, viewId, sessionId, routeId, apiUrl, onError } =
    useMorphContext();
  const [sharing, setSharing] = useState(false);
  const [shareNotice, setShareNotice] = useState<{ message: string; url?: string } | null>(null);
  const [pageModalOpen, setPageModalOpen] = useState(false);
  const [pageSources, setPageSources] = useState(() => readPageSnapshots(userId, sessionId));

  const captureCurrentPage = useCallback(() => {
    const container = containerRef.current;
    if (!container || userId.startsWith('page:') || userId.startsWith('share:')) {
      return readPageSnapshots(userId, sessionId);
    }
    const snapshotContainer =
      container.querySelector<HTMLElement>('[data-morph-passthrough]') ?? container;
    const snapshot = serializeLayoutSnapshot(snapshotContainer, {
      viewId,
      config,
      detail: 'content',
    });
    return upsertPageSnapshot(userId, sessionId, {
      viewId,
      routeId,
      path: currentSourcePath() ?? '/',
      snapshot,
      container: snapshotContainer,
    });
  }, [config, routeId, sessionId, userId, viewId]);

  const handleOpenPageComposer = useCallback(() => {
    setPageSources(captureCurrentPage());
    setPageModalOpen(true);
  }, [captureCurrentPage]);

  const handlePageCreated = useCallback((pageId: string) => {
    setPageModalOpen(false);
    if (typeof window === 'undefined') return;
    window.history.pushState({}, '', buildPageUrl(pageId));
  }, []);

  const handleShare = useCallback(async () => {
    if (sharing) return;
    const sourcePath = currentSourcePath();
    setSharing(true);
    try {
      if (onShare) {
        await onShare({ userId, viewId, sessionId, routeId, config, sourcePath });
        return;
      }

      if (!apiUrl) return;
      const share = await createShare(apiUrl, {
        userId,
        viewId,
        sessionId,
        routeId,
        config,
        sourcePath,
      });
      const url = buildShareUrl(share.shareId, share.sourcePath ?? sourcePath);
      const copied = await copyShareUrl(url);
      setShareNotice({
        message: copied ? 'Share link copied' : 'Share link ready',
        url,
      });
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setSharing(false);
    }
  }, [apiUrl, config, onError, onShare, routeId, sessionId, sharing, userId, viewId]);

  useEffect(() => {
    if (!shareNotice) return undefined;
    const id = window.setTimeout(() => setShareNotice(null), 4000);
    return () => window.clearTimeout(id);
  }, [shareNotice]);

  useEffect(() => {
    if (mode === 'view') selectElement(null);
  }, [mode, selectElement]);

  useEffect(() => {
    if (!editable || mode !== 'view') return undefined;
    const id = window.setTimeout(() => {
      setPageSources(captureCurrentPage());
    }, 0);
    return () => window.clearTimeout(id);
  }, [captureCurrentPage, editable, mode]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new MutationObserver((mutations) => {
      const hasContentMutation = mutations.some((m) => {
        const t = m.target;
        if (t instanceof HTMLElement && t.closest('[data-morph-editor]')) return false;
        if (m.type === 'childList') {
          const allEditor = (nodes: NodeList) =>
            Array.from(nodes).every(
              (n) => !(n instanceof HTMLElement) || n.hasAttribute('data-morph-editor'),
            );
          if (allEditor(m.addedNodes) && allEditor(m.removedNodes)) return false;
        }
        return true;
      });
      if (!hasContentMutation) return;

      observer.disconnect();
      cleanDomOverrides(container);
      decoratePaths(container, 'morph');
      applyDomOverrides(container, config, mode);
      observer.observe(container, { childList: true, subtree: true });
    });

    cleanDomOverrides(container);
    decoratePaths(container, 'morph');
    applyDomOverrides(container, config, mode);
    observer.observe(container, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [config, mode]);

  return (
    <div ref={containerRef}>
      <EditModeProvider active={mode === 'edit'}>{children}</EditModeProvider>
      {mode === 'view' && editable && toggleMode && (
        <MorphToggleButton
          onClick={toggleMode}
          onCreatePage={apiUrl ? handleOpenPageComposer : undefined}
          onShare={(onShare || apiUrl) ? () => void handleShare() : undefined}
          sharing={sharing}
        />
      )}
      {pageModalOpen && apiUrl && (
        <CreatePageModal
          apiUrl={apiUrl}
          userId={userId}
          viewId={viewId}
          sessionId={sessionId}
          routeId={routeId}
          sources={pageSources}
          onClose={() => setPageModalOpen(false)}
          onCreated={handlePageCreated}
          onError={onError}
        />
      )}
      {shareNotice && (
        <div
          data-morph-editor
          role="status"
          title={shareNotice.url}
          style={{
            position: 'fixed',
            top: 58,
            right: 16,
            zIndex: 9999,
            maxWidth: 320,
            padding: '8px 10px',
            background: '#0f172a',
            color: '#fff',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(15,23,42,0.22)',
            fontSize: 13,
            fontWeight: 500,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {shareNotice.message}
        </div>
      )}
    </div>
  );
}
