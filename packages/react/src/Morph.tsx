import { useState, useEffect, useRef, useCallback } from 'react';
import type { MorphProps, MorphConfig, MorphMode } from './types';
import { ConfigProvider, useMorphContext } from './config/ConfigContext';
import { createAdapter } from './config/createAdapter';
import { EditModeProvider } from './editor/EditModeProvider';
import { MorphToggleButton } from './editor/MorphToggleButton';
import { decoratePaths, applyDomOverrides, cleanDomOverrides } from './tree/domDecorator';

function resolveViewId(explicit?: string): string {
  if (explicit) return explicit;
  if (typeof window === 'undefined') return 'default';
  const path = window.location.pathname;
  return path === '/' ? 'index' : path.replace(/^\/|\/$/g, '').replace(/\//g, '-');
}

export function Morph({
  userId,
  viewId: viewIdProp,
  apiUrl,
  mode,
  editable = false,
  onSave,
  onError,
  fallback,
  children,
}: MorphProps) {
  const viewId = resolveViewId(viewIdProp);
  const [config, setConfig] = useState<MorphConfig | null>(null);
  const [internalMode, setInternalMode] = useState<MorphMode>('view');
  const adapterRef = useRef(createAdapter(apiUrl));

  const isControlled = mode !== undefined;
  const activeMode: MorphMode = isControlled ? mode : (editable ? internalMode : 'view');

  const toggleMode = useCallback(() => {
    setInternalMode(prev => prev === 'view' ? 'edit' : 'view');
  }, []);

  const exposedToggle = (!isControlled && editable) ? toggleMode : null;

  useEffect(() => {
    let cancelled = false;

    adapterRef.current
      .getConfig(userId, viewId)
      .then((cfg) => {
        if (!cancelled) setConfig(cfg);
      })
      .catch((err) => {
        if (!cancelled) {
          setConfig({});
          onError?.(err instanceof Error ? err : new Error(String(err)));
        }
      });

    return () => { cancelled = true; };
  }, [userId, viewId, onError]);

  if (config === null && fallback) return <>{fallback}</>;

  return (
    <ConfigProvider
      mode={activeMode}
      editable={editable}
      toggleMode={exposedToggle}
      initial={config ?? {}}
      adapter={adapterRef.current}
      userId={userId}
      viewId={viewId}
      onSave={onSave}
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

  useEffect(() => {
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

  if (mode === 'edit') {
    return (
      <div ref={containerRef}>
        <EditModeProvider>{children}</EditModeProvider>
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      {children}
      {editable && toggleMode && <MorphToggleButton onClick={toggleMode} />}
    </div>
  );
}
