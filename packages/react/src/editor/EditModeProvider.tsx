import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { injectEditorStyles, removeEditorStyles } from './editorStyles';
import { SelectionOverlay } from './SelectionOverlay';
import { PropertyPanel } from './PropertyPanel';
import { DndSortManager } from './DndSortManager';
import { DragHandleLayer } from './DragHandleLayer';
import { useMorphContext } from '../config/ConfigContext';
import { EditorContainerProvider } from './EditorContainerContext';
import { useLayoutSuggestions } from './useLayoutSuggestions';

interface EditModeProviderProps {
  active: boolean;
  children: ReactNode;
}

const TEXT_TARGET_SELECTOR = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'span',
  'a',
  'button',
  'label',
  'td',
  'th',
  'li',
  '[role="heading"]',
].join(',');

function hasDirectText(el: HTMLElement): boolean {
  return Array.from(el.childNodes).some(
    (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim().length > 0,
  );
}

function containsPoint(el: HTMLElement, clientX: number, clientY: number): boolean {
  const rect = el.getBoundingClientRect();
  return clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom;
}

function resolveSelectionElement(target: HTMLElement, clientX: number, clientY: number): HTMLElement | null {
  const morphEl = target.closest<HTMLElement>('[data-morph-path]');
  if (!morphEl) return null;
  if (hasDirectText(morphEl)) return morphEl;

  const textTargets = morphEl.querySelectorAll<HTMLElement>(TEXT_TARGET_SELECTOR);
  for (const textTarget of textTargets) {
    if (textTarget.hasAttribute('data-morph-path') &&
      hasDirectText(textTarget) &&
      containsPoint(textTarget, clientX, clientY)) {
      return textTarget;
    }
  }

  return morphEl;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

export function EditModeProvider({ active, children }: EditModeProviderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    selectElement,
    saveConfig,
    discardChanges,
    toggleMode,
    undo,
    redo,
    canUndo,
    canRedo,
    userId,
    viewId,
    apiUrl,
  } = useMorphContext();
  const [isDragging, setIsDragging] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'error'>('idle');

  const { suggestions, suggestionsRefreshing } = useLayoutSuggestions({
    enabled: active && panelOpen && Boolean(apiUrl),
    apiUrl,
    containerRef,
    userId,
    viewId,
  });

  useLayoutEffect(() => {
    if (!active) return;
    injectEditorStyles();
    return () => removeEditorStyles();
  }, [active]);

  useEffect(() => {
    if (!active) setIsDragging(false);
  }, [active]);

  useEffect(() => {
    if (!active) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return;

      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (canUndo) undo();
        return;
      }
      if (key === 'z' && event.shiftKey) {
        event.preventDefault();
        if (canRedo) redo();
        return;
      }
      if (key === 'y') {
        event.preventDefault();
        if (canRedo) redo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, canUndo, canRedo, undo, redo]);

  const handleSelectElement = useCallback(
    (path: string | null) => {
      selectElement(path);
      if (path) setPanelOpen(true);
    },
    [selectElement],
  );

  const closePanel = useCallback(() => {
    selectElement(null);
    setPanelOpen(false);
  }, [selectElement]);

  const handleSave = useCallback(async () => {
    setSaveState('saving');
    const ok = await saveConfig();
    if (ok) {
      setSaveState('idle');
      toggleMode?.();
      return;
    }
    setSaveState('error');
    window.setTimeout(() => setSaveState('idle'), 2500);
  }, [saveConfig, toggleMode]);

  const handleClickCapture = useCallback((e: React.MouseEvent) => {
    if (!active) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-morph-editor]')) return;

    e.preventDefault();
    e.stopPropagation();

    const morphEl = resolveSelectionElement(target, e.clientX, e.clientY);
    const path = morphEl?.getAttribute('data-morph-path');
    handleSelectElement(path ?? null);
  }, [active, handleSelectElement]);

  const suppressEvent = useCallback((e: React.SyntheticEvent) => {
    if (!active) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-morph-editor]')) return;
    e.preventDefault();
    e.stopPropagation();
  }, [active]);

  return (
    <EditorContainerProvider containerRef={containerRef}>
      <div
        ref={containerRef}
        data-morph-passthrough
        className={active && isDragging ? 'morph-editor-dragging' : undefined}
        onClickCapture={active ? handleClickCapture : undefined}
        onSubmitCapture={active ? suppressEvent : undefined}
        onDoubleClickCapture={active ? suppressEvent : undefined}
        style={active ? { position: 'relative' } : undefined}
      >
        <DndSortManager active={active} containerRef={containerRef} onDragActiveChange={setIsDragging}>
          {children}
          {active && (
            <>
              <DragHandleLayer containerRef={containerRef} />
              <SelectionOverlay containerRef={containerRef} />
              {panelOpen && (
                <PropertyPanel
                  onClose={closePanel}
                  suggestions={suggestions}
                  suggestionsRefreshing={suggestionsRefreshing}
                />
              )}
              <div data-morph-editor className="morph-editor-toolbar">
                <div className="morph-editor-toolbar__history">
                  <button
                    type="button"
                    className="morph-editor-btn morph-editor-btn--icon"
                    onClick={undo}
                    disabled={!canUndo}
                    aria-label="Undo"
                    title="Undo (Ctrl+Z)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M9 7H5v4M5 11c1.5-3 4.5-5 8-5 4.4 0 8 3.6 8 8s-3.6 8-8 8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="morph-editor-btn morph-editor-btn--icon"
                    onClick={redo}
                    disabled={!canRedo}
                    aria-label="Redo"
                    title="Redo (Ctrl+Shift+Z)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M15 7h4v4M19 11c-1.5-3-4.5-5-8-5-4.4 0-8 3.6-8 8s3.6 8 8 8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
                <div className="morph-editor-toolbar__actions">
                  {toggleMode && (
                    <button
                      type="button"
                      className="morph-editor-btn"
                      onClick={() => {
                        discardChanges();
                        toggleMode();
                      }}
                      aria-label="Exit edit mode without saving"
                    >
                      Exit
                    </button>
                  )}
                  <button
                    type="button"
                    className="morph-editor-btn morph-editor-btn--primary"
                    onClick={() => void handleSave()}
                    disabled={saveState === 'saving'}
                  >
                    {saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save failed' : 'Save'}
                  </button>
                </div>
              </div>
            </>
          )}
        </DndSortManager>
      </div>
    </EditorContainerProvider>
  );
}
