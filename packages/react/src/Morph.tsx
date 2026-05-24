import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import type { MorphProps, MorphConfig, MorphMode } from './types';
import { ConfigProvider, useMorphContext } from './config/ConfigContext';
import { createAdapter } from './config/createAdapter';
import { resolveSessionId } from './config/clientSession';
import { useRouteScope } from './config/routeScope';
import { EditModeProvider } from './editor/EditModeProvider';
import { MorphToggleButton } from './editor/MorphToggleButton';
import { decoratePaths, applyDomOverrides, cleanDomOverrides } from './tree/domDecorator';

const EMPTY_CONFIG: MorphConfig = {};

export function Morph({
  userId,
  viewId: viewIdProp,
  sessionId: sessionIdProp,
  routeId: routeIdProp,
  apiUrl,
  mode,
  editable = false,
  onSave,
  onError,
  fallback,
  children,
}: MorphProps) {
  const { viewId, routeId } = useRouteScope(viewIdProp, routeIdProp);
  const sessionId = useState(() => resolveSessionId(sessionIdProp))[0];
  const usesRemoteConfig = Boolean(apiUrl);
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
  const adapterRef = useRef(createAdapter(apiUrl));

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

    adapterRef.current
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
  }, [usesRemoteConfig, userId, viewId, sessionId, routeId, scopeKey, onError]);

  if (config === null) return fallback ? <>{fallback}</> : null;

  return (
    <ConfigProvider
      key={scopeKey}
      mode={activeMode}
      editable={editable}
      toggleMode={exposedToggle}
      initial={config ?? EMPTY_CONFIG}
      adapter={adapterRef.current}
      userId={userId}
      viewId={viewId}
      sessionId={sessionId}
      routeId={routeId}
      apiUrl={apiUrl}
      onSave={handleSave}
      onError={onError}
    >
      <MorphInner>{children}</MorphInner>
    </ConfigProvider>
  );
}

function MorphInner({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { config, mode, editable, toggleMode, selectElement } = useMorphContext();

  useEffect(() => {
    if (mode === 'view') selectElement(null);
  }, [mode, selectElement]);

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
      {mode === 'view' && editable && toggleMode && <MorphToggleButton onClick={toggleMode} />}
    </div>
  );
}
