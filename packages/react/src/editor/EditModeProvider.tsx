import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { injectEditorStyles, removeEditorStyles } from './editorStyles';
import { SelectionOverlay } from './SelectionOverlay';
import { PropertyPanel } from './PropertyPanel';
import { PanelReopenButton } from './PanelReopenButton';
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

export function EditModeProvider({ active, children }: EditModeProviderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { selectElement, saveConfig, toggleMode, userId, viewId, apiUrl, config, selectedPath } =
    useMorphContext();
  const [isDragging, setIsDragging] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  const { suggestions, suggestionsRefreshing } = useLayoutSuggestions({
    enabled: active && panelOpen && Boolean(apiUrl),
    apiUrl,
    containerRef,
    userId,
    viewId,
    config,
    selectedPath,
  });

  useLayoutEffect(() => {
    if (!active) return;
    injectEditorStyles();
    return () => removeEditorStyles();
  }, [active]);

  useEffect(() => {
    if (!active) setIsDragging(false);
  }, [active]);

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
              {panelOpen ? (
                <PropertyPanel
                  onClose={closePanel}
                  suggestions={suggestions}
                  suggestionsRefreshing={suggestionsRefreshing}
                />
              ) : (
                <PanelReopenButton onClick={() => setPanelOpen(true)} />
              )}
              <div data-morph-editor className="morph-editor-toolbar">
                {toggleMode && (
                  <button className="morph-editor-btn" onClick={toggleMode} aria-label="Exit edit mode">
                    Exit
                  </button>
                )}
                <button
                  className="morph-editor-btn morph-editor-btn--primary"
                  onClick={async () => {
                    const ok = await saveConfig();
                    if (ok) toggleMode?.();
                  }}
                >
                  Save
                </button>
              </div>
            </>
          )}
        </DndSortManager>
      </div>
    </EditorContainerProvider>
  );
}
