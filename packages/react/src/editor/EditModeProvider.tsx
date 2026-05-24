import { useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { injectEditorStyles, removeEditorStyles } from './editorStyles';
import { SelectionOverlay } from './SelectionOverlay';
import { PropertyPanel } from './PropertyPanel';
import { DndSortManager } from './DndSortManager';
import { DragHandleLayer } from './DragHandleLayer';
import { useMorphContext } from '../config/ConfigContext';

interface EditModeProviderProps {
  children: ReactNode;
}

export function EditModeProvider({ children }: EditModeProviderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { selectElement, saveConfig, toggleMode } = useMorphContext();
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    injectEditorStyles();
    return () => removeEditorStyles();
  }, []);

  const handleClickCapture = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-morph-editor]')) return;

    e.preventDefault();
    e.stopPropagation();

    const morphEl = target.closest('[data-morph-path]');
    const path = morphEl?.getAttribute('data-morph-path');
    selectElement(path ?? null);
  }, [selectElement]);

  const suppressEvent = useCallback((e: React.SyntheticEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-morph-editor]')) return;
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <div
      ref={containerRef}
      data-morph-passthrough
      className={isDragging ? 'morph-editor-dragging' : undefined}
      onClickCapture={handleClickCapture}
      onSubmitCapture={suppressEvent}
      onDoubleClickCapture={suppressEvent}
      style={{ position: 'relative' }}
    >
      <DndSortManager containerRef={containerRef} onDragActiveChange={setIsDragging}>
        {children}
        <DragHandleLayer containerRef={containerRef} />
        <SelectionOverlay containerRef={containerRef} />
        <PropertyPanel />
        <div data-morph-editor className="morph-editor-toolbar">
          {toggleMode && (
            <button className="morph-editor-btn" onClick={toggleMode} aria-label="Exit edit mode">
              Exit
            </button>
          )}
          <button className="morph-editor-btn morph-editor-btn--primary" onClick={async () => {
            const ok = await saveConfig();
            if (ok) toggleMode?.();
          }}>
            Save
          </button>
        </div>
      </DndSortManager>
    </div>
  );
}
